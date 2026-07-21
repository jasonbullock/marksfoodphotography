import copy
import re

import requests


STAGE_TYPES = {"start", "active", "waiting", "blocked", "complete", "cancelled"}
STAGE_KEY_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DEFAULT_TEMPLATE_NAME = "Merchandise Review"
DEFAULT_TEMPLATE_DESCRIPTION = "Default Work workflow used for merchandise review Work Orders."

DEFAULT_STAGE_DEFINITIONS = [
    {
        "name": "Review",
        "stageKey": "new-review",
        "displayOrder": 10,
        "colorToken": "blue",
        "stageType": "start",
        "isComplete": False,
        "isTerminal": False,
        "active": True,
        "description": "Newly received merchandise awaiting Work Order review.",
    },
    {
        "name": "Waiting for Information",
        "stageKey": "waiting-information",
        "displayOrder": 20,
        "colorToken": "orange",
        "stageType": "waiting",
        "isComplete": False,
        "isTerminal": False,
        "active": True,
        "description": "Required product, identifier, artwork, or client fields need attention.",
    },
    {
        "name": "Send to THR3D",
        "stageKey": "send-thr3d",
        "displayOrder": 30,
        "colorToken": "purple",
        "stageType": "active",
        "isComplete": False,
        "isTerminal": False,
        "active": True,
        "description": "Merchandise routed into the THR3D workflow branch.",
    },
    {
        "name": "Waiting for Activation",
        "stageKey": "waiting-activation",
        "displayOrder": 40,
        "colorToken": "amber",
        "stageType": "waiting",
        "isComplete": False,
        "isTerminal": False,
        "active": True,
        "description": "Ready except for activation or campaign assignment.",
    },
    {
        "name": "Ready for Production",
        "stageKey": "ready-production",
        "displayOrder": 50,
        "colorToken": "green",
        "stageType": "complete",
        "isComplete": True,
        "isTerminal": True,
        "active": True,
        "description": "All required gates are satisfied.",
    },
]


class WorkflowValidationError(ValueError):
    pass


def _as_list(value):
    if not value:
        return []
    return value if isinstance(value, list) else [value]


def _truthy(value):
    return bool(value)


def _stage_order(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return 0


def _slug_from_name(name):
    key = re.sub(r"[^a-z0-9]+", "-", str(name or "").strip().lower()).strip("-")
    return key or "stage"


class WorkflowTemplateService:
    def __init__(self, airtable, config):
        self.airtable = airtable
        self.config = config

    def list_templates(self, *, seed=True):
        if seed:
            self.ensure_default_template()
        templates = [self.shape_template(record) for record in self._list_template_records()]
        stages = [self.shape_stage(record) for record in self._list_stage_records()]
        stages_by_template = {}
        for stage in stages:
            for template_id in stage.get("workflowTemplateIds", []):
                stages_by_template.setdefault(template_id, []).append(stage)
        for template in templates:
            template_stages = sorted(stages_by_template.get(template["id"], []), key=lambda item: item["displayOrder"])
            template["stages"] = template_stages
            template["stageCount"] = len([stage for stage in template_stages if stage.get("active", True)])
        templates.sort(key=lambda item: (not item.get("default"), not item.get("active", True), item.get("name", "")))
        return templates

    def get_template(self, template_id):
        self.ensure_default_template()
        record = self.airtable.get_record(self.config.WORKFLOW_TEMPLATES_TABLE, template_id, by_field_id=False)
        template = self.shape_template(record)
        template["stages"] = [
            stage
            for stage in self.list_stages(template_id=template_id)
            if template_id in stage.get("workflowTemplateIds", [])
        ]
        template["stageCount"] = len([stage for stage in template["stages"] if stage.get("active", True)])
        return template

    def create_template(self, payload):
        name = self._required_text(payload.get("name"), "Template name is required.")
        active = bool(payload.get("active", True))
        default = bool(payload.get("default", False))
        if default and not active:
            raise WorkflowValidationError("Default workflow template must be active.")
        fields = {
            self.config.F_WORKFLOW_TEMPLATE_NAME: name,
            self.config.F_WORKFLOW_TEMPLATE_DESCRIPTION: str(payload.get("description") or "").strip(),
            self.config.F_WORKFLOW_TEMPLATE_ACTIVE: active,
            self.config.F_WORKFLOW_TEMPLATE_DEFAULT: default,
            self.config.F_WORKFLOW_TEMPLATE_VERSION: int(payload.get("version") or 1),
        }
        if default:
            self._clear_other_defaults()
        record = self.airtable.create_record(self.config.WORKFLOW_TEMPLATES_TABLE, fields, by_field_id=False)
        return self.get_template(record["id"])

    def update_template(self, template_id, payload):
        current = self.get_template(template_id)
        fields = {}
        if "name" in payload:
            fields[self.config.F_WORKFLOW_TEMPLATE_NAME] = self._required_text(payload.get("name"), "Template name is required.")
        if "description" in payload:
            fields[self.config.F_WORKFLOW_TEMPLATE_DESCRIPTION] = str(payload.get("description") or "").strip()
        active = current.get("active", True)
        if "active" in payload:
            active = bool(payload.get("active"))
            fields[self.config.F_WORKFLOW_TEMPLATE_ACTIVE] = active
        make_default = bool(payload.get("default")) if "default" in payload else current.get("default", False)
        if make_default and not active:
            raise WorkflowValidationError("Default workflow template must be active.")
        if "default" in payload:
            fields[self.config.F_WORKFLOW_TEMPLATE_DEFAULT] = make_default
            if make_default:
                self._clear_other_defaults(except_id=template_id)
        if "version" in payload:
            fields[self.config.F_WORKFLOW_TEMPLATE_VERSION] = int(payload.get("version") or current.get("version") or 1)
        if not fields:
            return current
        updated = self.airtable.update_record(self.config.WORKFLOW_TEMPLATES_TABLE, template_id, fields, by_field_id=False)
        return self.get_template(updated["id"])

    def duplicate_template(self, template_id):
        source = self.get_template(template_id)
        copy_record = self.airtable.create_record(self.config.WORKFLOW_TEMPLATES_TABLE, {
            self.config.F_WORKFLOW_TEMPLATE_NAME: f"{source['name']} Copy",
            self.config.F_WORKFLOW_TEMPLATE_DESCRIPTION: source.get("description", ""),
            self.config.F_WORKFLOW_TEMPLATE_ACTIVE: False,
            self.config.F_WORKFLOW_TEMPLATE_DEFAULT: False,
            self.config.F_WORKFLOW_TEMPLATE_VERSION: int(source.get("version") or 1),
        }, by_field_id=False)
        for stage in source.get("stages", []):
            self.airtable.create_record(self.config.WORKFLOW_STAGES_TABLE, self._stage_fields({
                **stage,
                "workflowTemplateId": copy_record["id"],
            }, copy_record["id"]), by_field_id=False)
        return self.get_template(copy_record["id"])

    def list_stages(self, *, template_id=None):
        stages = [self.shape_stage(record) for record in self._list_stage_records()]
        if template_id:
            stages = [stage for stage in stages if template_id in stage.get("workflowTemplateIds", [])]
        stages.sort(key=lambda item: item["displayOrder"])
        return stages

    def create_stage(self, template_id, payload):
        template = self.get_template(template_id)
        if not template.get("active", True):
            raise WorkflowValidationError("Cannot add stages to an inactive workflow template.")
        fields = self._stage_fields(payload, template_id)
        self._validate_unique_stage_key(template_id, fields[self.config.F_WORKFLOW_STAGE_KEY])
        record = self.airtable.create_record(self.config.WORKFLOW_STAGES_TABLE, fields, by_field_id=False)
        return self.shape_stage(record)

    def update_stage(self, stage_id, payload):
        current_record = self.airtable.get_record(self.config.WORKFLOW_STAGES_TABLE, stage_id, by_field_id=False)
        current = self.shape_stage(current_record)
        template_id = (_as_list(current.get("workflowTemplateIds")) or [""])[0]
        fields = {}
        candidate = {**current, **payload}
        if "name" in payload:
            fields[self.config.F_WORKFLOW_STAGE_NAME] = self._required_text(payload.get("name"), "Stage name is required.")
        if "stageKey" in payload:
            key = self._validate_stage_key(payload.get("stageKey"))
            self._validate_unique_stage_key(template_id, key, except_id=stage_id)
            fields[self.config.F_WORKFLOW_STAGE_KEY] = key
        if "displayOrder" in payload:
            fields[self.config.F_WORKFLOW_STAGE_DISPLAY_ORDER] = self._validate_display_order(payload.get("displayOrder"))
        if "colorToken" in payload:
            fields[self.config.F_WORKFLOW_STAGE_COLOR_TOKEN] = str(payload.get("colorToken") or "").strip()
        if "stageType" in payload:
            fields[self.config.F_WORKFLOW_STAGE_TYPE] = self._validate_stage_type(payload.get("stageType"))
        if "isComplete" in payload:
            fields[self.config.F_WORKFLOW_STAGE_IS_COMPLETE] = bool(payload.get("isComplete"))
        if "isTerminal" in payload:
            fields[self.config.F_WORKFLOW_STAGE_IS_TERMINAL] = bool(payload.get("isTerminal"))
        if "active" in payload:
            fields[self.config.F_WORKFLOW_STAGE_ACTIVE] = bool(payload.get("active"))
        if "description" in payload:
            fields[self.config.F_WORKFLOW_STAGE_DESCRIPTION] = str(payload.get("description") or "").strip()
        self._validate_stage_logic(candidate)
        if not fields:
            return current
        updated = self.airtable.update_record(self.config.WORKFLOW_STAGES_TABLE, stage_id, fields, by_field_id=False)
        return self.shape_stage(updated)

    def deactivate_stage(self, stage_id):
        current = self.shape_stage(self.airtable.get_record(self.config.WORKFLOW_STAGES_TABLE, stage_id, by_field_id=False))
        linked_count = self._active_work_order_count_for_stage(current)
        if linked_count:
            raise WorkflowValidationError(f"Cannot deactivate a stage linked to {linked_count} active Work Order(s).")
        updated = self.airtable.update_record(
            self.config.WORKFLOW_STAGES_TABLE,
            stage_id,
            {self.config.F_WORKFLOW_STAGE_ACTIVE: False},
            by_field_id=False,
        )
        return self.shape_stage(updated)

    def ensure_default_template(self):
        templates = self._list_template_records()
        default = next((record for record in templates if record.get("fields", {}).get(self.config.F_WORKFLOW_TEMPLATE_DEFAULT)), None)
        if not default:
            default = next(
                (record for record in templates if record.get("fields", {}).get(self.config.F_WORKFLOW_TEMPLATE_NAME) == DEFAULT_TEMPLATE_NAME),
                None,
            )
        if default:
            default_id = default["id"]
            update_fields = {}
            fields = default.get("fields", {})
            if not fields.get(self.config.F_WORKFLOW_TEMPLATE_ACTIVE, True):
                update_fields[self.config.F_WORKFLOW_TEMPLATE_ACTIVE] = True
            if not fields.get(self.config.F_WORKFLOW_TEMPLATE_DEFAULT, False):
                update_fields[self.config.F_WORKFLOW_TEMPLATE_DEFAULT] = True
            if update_fields:
                default = self.airtable.update_record(self.config.WORKFLOW_TEMPLATES_TABLE, default_id, update_fields, by_field_id=False)
        else:
            default = self.airtable.create_record(self.config.WORKFLOW_TEMPLATES_TABLE, {
                self.config.F_WORKFLOW_TEMPLATE_NAME: DEFAULT_TEMPLATE_NAME,
                self.config.F_WORKFLOW_TEMPLATE_DESCRIPTION: DEFAULT_TEMPLATE_DESCRIPTION,
                self.config.F_WORKFLOW_TEMPLATE_ACTIVE: True,
                self.config.F_WORKFLOW_TEMPLATE_DEFAULT: True,
                self.config.F_WORKFLOW_TEMPLATE_VERSION: 1,
            }, by_field_id=False)
        self._clear_other_defaults(except_id=default["id"])
        existing_stages = self.list_stages(template_id=default["id"])
        existing_keys = {stage["stageKey"]: stage for stage in existing_stages}
        for definition in DEFAULT_STAGE_DEFINITIONS:
            if definition["stageKey"] in existing_keys:
                continue
            self.airtable.create_record(
                self.config.WORKFLOW_STAGES_TABLE,
                self._stage_fields(definition, default["id"]),
                by_field_id=False,
            )
        return self.get_template_without_seed(default["id"])

    def get_template_without_seed(self, template_id):
        record = self.airtable.get_record(self.config.WORKFLOW_TEMPLATES_TABLE, template_id, by_field_id=False)
        template = self.shape_template(record)
        template["stages"] = self.list_stages(template_id=template_id)
        template["stageCount"] = len([stage for stage in template["stages"] if stage.get("active", True)])
        return template

    def default_template_and_stage(self, stage_key="new-review"):
        try:
            default = next((template for template in self.list_templates(seed=True) if template.get("default")), None)
        except requests.HTTPError:
            return None, None
        if not default:
            return None, None
        stage = next((item for item in default.get("stages", []) if item.get("stageKey") == stage_key and item.get("active", True)), None)
        return default, stage

    def fields_for_work_order_stage(self, stage_key):
        template, stage = self.default_template_and_stage(stage_key)
        if not template or not stage:
            return {}
        return {
            self.config.F_WORK_ORDER_WORKFLOW_TEMPLATE: [template["id"]],
            self.config.F_WORK_ORDER_CURRENT_WORKFLOW_STAGE: [stage["id"]],
        }

    def shape_template(self, record):
        fields = record.get("fields", {})
        return {
            "id": record["id"],
            "name": fields.get(self.config.F_WORKFLOW_TEMPLATE_NAME, ""),
            "description": fields.get(self.config.F_WORKFLOW_TEMPLATE_DESCRIPTION, ""),
            "active": fields.get(self.config.F_WORKFLOW_TEMPLATE_ACTIVE, True),
            "default": fields.get(self.config.F_WORKFLOW_TEMPLATE_DEFAULT, False),
            "version": fields.get(self.config.F_WORKFLOW_TEMPLATE_VERSION, 1),
            "createdAt": fields.get(self.config.F_WORKFLOW_TEMPLATE_CREATED_AT, ""),
            "updatedAt": fields.get(self.config.F_WORKFLOW_TEMPLATE_UPDATED_AT, ""),
            "stages": [],
            "stageCount": 0,
        }

    def shape_stage(self, record):
        fields = record.get("fields", {})
        return {
            "id": record["id"],
            "name": fields.get(self.config.F_WORKFLOW_STAGE_NAME, ""),
            "workflowTemplateIds": _as_list(fields.get(self.config.F_WORKFLOW_STAGE_TEMPLATE, [])),
            "stageKey": fields.get(self.config.F_WORKFLOW_STAGE_KEY, ""),
            "displayOrder": _stage_order(fields.get(self.config.F_WORKFLOW_STAGE_DISPLAY_ORDER)),
            "colorToken": fields.get(self.config.F_WORKFLOW_STAGE_COLOR_TOKEN, ""),
            "stageType": fields.get(self.config.F_WORKFLOW_STAGE_TYPE, "active"),
            "isComplete": _truthy(fields.get(self.config.F_WORKFLOW_STAGE_IS_COMPLETE, False)),
            "isTerminal": _truthy(fields.get(self.config.F_WORKFLOW_STAGE_IS_TERMINAL, False)),
            "active": fields.get(self.config.F_WORKFLOW_STAGE_ACTIVE, True),
            "description": fields.get(self.config.F_WORKFLOW_STAGE_DESCRIPTION, ""),
        }

    def stage_maps(self):
        try:
            stages = self.list_stages()
        except requests.HTTPError:
            return {}, {}
        return {stage["id"]: stage for stage in stages}, {stage["stageKey"]: stage for stage in stages}

    def _list_template_records(self):
        data = self.airtable.list_records(self.config.WORKFLOW_TEMPLATES_TABLE, by_field_id=False)
        return data.get("records", [])

    def _list_stage_records(self):
        data = self.airtable.list_records(self.config.WORKFLOW_STAGES_TABLE, by_field_id=False)
        return data.get("records", [])

    def _required_text(self, value, message):
        text = str(value or "").strip()
        if not text:
            raise WorkflowValidationError(message)
        return text

    def _validate_stage_key(self, value):
        key = str(value or "").strip().lower()
        if not STAGE_KEY_PATTERN.match(key):
            raise WorkflowValidationError("Stage Key must use lowercase letters, numbers, and hyphens.")
        return key

    def _validate_stage_type(self, value):
        stage_type = str(value or "").strip()
        if stage_type not in STAGE_TYPES:
            raise WorkflowValidationError("Invalid Stage Type.")
        return stage_type

    def _validate_display_order(self, value):
        try:
            return int(value)
        except (TypeError, ValueError):
            raise WorkflowValidationError("Display Order must be a number.") from None

    def _validate_stage_logic(self, stage):
        stage_type = stage.get("stageType") or "active"
        is_complete = bool(stage.get("isComplete"))
        is_terminal = bool(stage.get("isTerminal"))
        if stage_type == "complete" and not is_complete:
            raise WorkflowValidationError("Complete stages must set Is Complete.")
        if is_terminal and stage_type not in {"complete", "cancelled"}:
            raise WorkflowValidationError("Only complete or cancelled stages can be terminal.")

    def _stage_fields(self, payload, template_id):
        name = self._required_text(payload.get("name"), "Stage name is required.")
        stage_key = self._validate_stage_key(payload.get("stageKey") or _slug_from_name(name))
        stage_type = self._validate_stage_type(payload.get("stageType") or "active")
        candidate = {
            "stageType": stage_type,
            "isComplete": bool(payload.get("isComplete", stage_type == "complete")),
            "isTerminal": bool(payload.get("isTerminal", False)),
        }
        self._validate_stage_logic(candidate)
        return {
            self.config.F_WORKFLOW_STAGE_NAME: name,
            self.config.F_WORKFLOW_STAGE_TEMPLATE: [template_id],
            self.config.F_WORKFLOW_STAGE_KEY: stage_key,
            self.config.F_WORKFLOW_STAGE_DISPLAY_ORDER: self._validate_display_order(payload.get("displayOrder", 10)),
            self.config.F_WORKFLOW_STAGE_COLOR_TOKEN: str(payload.get("colorToken") or "").strip(),
            self.config.F_WORKFLOW_STAGE_TYPE: stage_type,
            self.config.F_WORKFLOW_STAGE_IS_COMPLETE: candidate["isComplete"],
            self.config.F_WORKFLOW_STAGE_IS_TERMINAL: candidate["isTerminal"],
            self.config.F_WORKFLOW_STAGE_ACTIVE: bool(payload.get("active", True)),
            self.config.F_WORKFLOW_STAGE_DESCRIPTION: str(payload.get("description") or "").strip(),
        }

    def _validate_unique_stage_key(self, template_id, stage_key, *, except_id=None):
        for stage in self.list_stages(template_id=template_id):
            if stage["id"] != except_id and stage.get("stageKey") == stage_key:
                raise WorkflowValidationError("Stage Key must be unique within a workflow template.")

    def _clear_other_defaults(self, *, except_id=None):
        for record in self._list_template_records():
            if record["id"] == except_id:
                continue
            if record.get("fields", {}).get(self.config.F_WORKFLOW_TEMPLATE_DEFAULT, False):
                self.airtable.update_record(
                    self.config.WORKFLOW_TEMPLATES_TABLE,
                    record["id"],
                    {self.config.F_WORKFLOW_TEMPLATE_DEFAULT: False},
                    by_field_id=False,
                )

    def _active_work_order_count_for_stage(self, stage):
        count = 0
        stage_id = stage.get("id")
        stage_key = stage.get("stageKey")
        try:
            data = self.airtable.list_records(self.config.WORK_ORDERS_TABLE, by_field_id=False)
        except requests.HTTPError:
            return 0
        for record in data.get("records", []):
            fields = record.get("fields", {})
            status = str(fields.get(self.config.F_WORK_ORDER_CURRENT_STATUS, "")).lower()
            if status in {"cancelled", "complete", "completed"}:
                continue
            linked_stage_ids = _as_list(fields.get(self.config.F_WORK_ORDER_CURRENT_WORKFLOW_STAGE, []))
            if stage_id in linked_stage_ids or fields.get(self.config.F_WORK_ORDER_CURRENT_STAGE) == stage_key:
                count += 1
        return count


def cloned_default_stage_definitions():
    return copy.deepcopy(DEFAULT_STAGE_DEFINITIONS)
