import re

import requests

from workflow_templates import WorkflowTemplateService


TYPE_KEY_PATTERN = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
DEFAULT_WORK_ORDER_TYPE_KEY = "merchandise-review"
DEFAULT_WORK_ORDER_TYPE_NAME = "Merchandise Review"
DEFAULT_WORK_ORDER_TYPE_DESCRIPTION = "Review incoming merchandise, resolve required information, determine routing, and prepare it for production."


class WorkOrderTypeValidationError(ValueError):
    pass


def _as_list(value):
    if not value:
        return []
    return value if isinstance(value, list) else [value]


def _truthy(value):
    return bool(value)


def _number(value, default=0):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _slug(value):
    return re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower()).strip("-")


class WorkOrderTypeService:
    def __init__(self, airtable, config, workflow_service=None):
        self.airtable = airtable
        self.config = config
        self.workflow_service = workflow_service or WorkflowTemplateService(airtable, config)

    def list_types(self, *, seed=True):
        if seed:
            self.ensure_default_type()
        records = [self.shape_type(record) for record in self._list_type_records()]
        templates = {template["id"]: template for template in self.workflow_service.list_templates(seed=True)}
        for record in records:
            template = templates.get(record.get("workflowTemplateId"))
            record["workflowTemplate"] = template
            record["workflowTemplateName"] = (template or {}).get("name", "")
        records.sort(key=lambda item: (item["sortOrder"], item["name"]))
        return records

    def get_type(self, record_id):
        self.ensure_default_type()
        record = self.shape_type(self.airtable.get_record(self.config.WORK_ORDER_TYPES_TABLE, record_id, by_field_id=False))
        template = self._template_for_type(record)
        record["workflowTemplate"] = template
        record["workflowTemplateName"] = (template or {}).get("name", "")
        return record

    def create_type(self, payload):
        key = self._validate_key(payload.get("key") or _slug(payload.get("name")))
        self._validate_unique_key(key)
        fields = self._fields_from_payload(payload, require_template=bool(payload.get("active", True)))
        if fields[self.config.F_WORK_ORDER_TYPE_DEFAULT]:
            if not fields[self.config.F_WORK_ORDER_TYPE_ACTIVE]:
                raise WorkOrderTypeValidationError("Default Work Order Type must be active.")
            self._clear_other_defaults()
        record = self.airtable.create_record(self.config.WORK_ORDER_TYPES_TABLE, fields, by_field_id=False)
        return self.get_type(record["id"])

    def update_type(self, record_id, payload):
        current = self.get_type(record_id)
        fields = {}
        if "name" in payload:
            fields[self.config.F_WORK_ORDER_TYPE_NAME] = self._required_text(payload.get("name"), "Name is required.")
        if "key" in payload:
            key = self._validate_key(payload.get("key"))
            if key != current["key"] and self._active_work_order_count_for_type(current):
                raise WorkOrderTypeValidationError("Cannot change the key for a Work Order Type used by active Work Orders.")
            self._validate_unique_key(key, except_id=record_id)
            fields[self.config.F_WORK_ORDER_TYPE_KEY] = key
        for body_key, field_name in [
            ("description", self.config.F_WORK_ORDER_TYPE_DESCRIPTION),
            ("icon", self.config.F_WORK_ORDER_TYPE_ICON),
            ("color", self.config.F_WORK_ORDER_TYPE_COLOR),
            ("defaultAssigneeRole", self.config.F_WORK_ORDER_TYPE_DEFAULT_ASSIGNEE_ROLE),
        ]:
            if body_key in payload:
                fields[field_name] = str(payload.get(body_key) or "").strip()
        if "workflowTemplateId" in payload:
            template_id = self._first_id(payload.get("workflowTemplateId"))
            if not template_id:
                raise WorkOrderTypeValidationError("Active Work Order Types must reference a Workflow Template.")
            self._validate_workflow_template(template_id)
            fields[self.config.F_WORK_ORDER_TYPE_WORKFLOW_TEMPLATE] = [template_id]
        if "sortOrder" in payload:
            fields[self.config.F_WORK_ORDER_TYPE_SORT_ORDER] = self._validate_sort_order(payload.get("sortOrder"))
        if "allowMultiplePerMerchandise" in payload:
            fields[self.config.F_WORK_ORDER_TYPE_ALLOW_MULTIPLE] = bool(payload.get("allowMultiplePerMerchandise"))
        if "autoCreate" in payload:
            fields[self.config.F_WORK_ORDER_TYPE_AUTO_CREATE] = bool(payload.get("autoCreate"))

        active = current.get("active", True)
        if "active" in payload:
            active = bool(payload.get("active"))
            if not active and current.get("default"):
                raise WorkOrderTypeValidationError("The active default Work Order Type cannot be deactivated.")
            fields[self.config.F_WORK_ORDER_TYPE_ACTIVE] = active
        make_default = current.get("default", False)
        if "default" in payload or "isDefault" in payload:
            make_default = bool(payload.get("default", payload.get("isDefault")))
            fields[self.config.F_WORK_ORDER_TYPE_DEFAULT] = make_default
        template_id = self._first_id(fields.get(self.config.F_WORK_ORDER_TYPE_WORKFLOW_TEMPLATE)) or current.get("workflowTemplateId")
        if active:
            self._validate_workflow_template(template_id)
        if make_default and not active:
            raise WorkOrderTypeValidationError("Default Work Order Type must be active.")
        if make_default:
            self._clear_other_defaults(except_id=record_id)
        if not fields:
            return current
        updated = self.airtable.update_record(self.config.WORK_ORDER_TYPES_TABLE, record_id, fields, by_field_id=False)
        return self.get_type(updated["id"])

    def duplicate_type(self, record_id):
        source = self.get_type(record_id)
        key = self._unique_copy_key(source["key"])
        record = self.airtable.create_record(self.config.WORK_ORDER_TYPES_TABLE, {
            self.config.F_WORK_ORDER_TYPE_NAME: f"{source['name']} Copy",
            self.config.F_WORK_ORDER_TYPE_KEY: key,
            self.config.F_WORK_ORDER_TYPE_DESCRIPTION: source.get("description", ""),
            self.config.F_WORK_ORDER_TYPE_WORKFLOW_TEMPLATE: [source["workflowTemplateId"]] if source.get("workflowTemplateId") else [],
            self.config.F_WORK_ORDER_TYPE_ACTIVE: False,
            self.config.F_WORK_ORDER_TYPE_DEFAULT: False,
            self.config.F_WORK_ORDER_TYPE_SORT_ORDER: source.get("sortOrder", 10),
            self.config.F_WORK_ORDER_TYPE_ICON: source.get("icon", ""),
            self.config.F_WORK_ORDER_TYPE_COLOR: source.get("color", ""),
            self.config.F_WORK_ORDER_TYPE_DEFAULT_ASSIGNEE_ROLE: source.get("defaultAssigneeRole", ""),
            self.config.F_WORK_ORDER_TYPE_ALLOW_MULTIPLE: source.get("allowMultiplePerMerchandise", False),
            self.config.F_WORK_ORDER_TYPE_AUTO_CREATE: source.get("autoCreate", False),
        }, by_field_id=False)
        return self.get_type(record["id"])

    def set_default(self, record_id):
        current = self.get_type(record_id)
        if not current.get("active", True):
            raise WorkOrderTypeValidationError("Default Work Order Type must be active.")
        self._validate_workflow_template(current.get("workflowTemplateId"))
        self._clear_other_defaults(except_id=record_id)
        updated = self.airtable.update_record(
            self.config.WORK_ORDER_TYPES_TABLE,
            record_id,
            {self.config.F_WORK_ORDER_TYPE_DEFAULT: True, self.config.F_WORK_ORDER_TYPE_ACTIVE: True},
            by_field_id=False,
        )
        return self.get_type(updated["id"])

    def activate(self, record_id):
        current = self.get_type(record_id)
        self._validate_workflow_template(current.get("workflowTemplateId"))
        updated = self.airtable.update_record(
            self.config.WORK_ORDER_TYPES_TABLE,
            record_id,
            {self.config.F_WORK_ORDER_TYPE_ACTIVE: True},
            by_field_id=False,
        )
        return self.get_type(updated["id"])

    def deactivate(self, record_id):
        current = self.get_type(record_id)
        if current.get("default"):
            raise WorkOrderTypeValidationError("The active default Work Order Type cannot be deactivated.")
        linked_count = self._active_work_order_count_for_type(current)
        if linked_count:
            raise WorkOrderTypeValidationError(f"Cannot deactivate a Work Order Type linked to {linked_count} active Work Order(s).")
        updated = self.airtable.update_record(
            self.config.WORK_ORDER_TYPES_TABLE,
            record_id,
            {self.config.F_WORK_ORDER_TYPE_ACTIVE: False},
            by_field_id=False,
        )
        return self.get_type(updated["id"])

    def ensure_default_type(self):
        template = self.workflow_service.ensure_default_template()
        records = self._list_type_records()
        existing = next((record for record in records if record.get("fields", {}).get(self.config.F_WORK_ORDER_TYPE_KEY) == DEFAULT_WORK_ORDER_TYPE_KEY), None)
        active_default = next(
            (
                record for record in records
                if record.get("fields", {}).get(self.config.F_WORK_ORDER_TYPE_DEFAULT)
                and record.get("fields", {}).get(self.config.F_WORK_ORDER_TYPE_ACTIVE, True)
            ),
            None,
        )
        desired = {
            self.config.F_WORK_ORDER_TYPE_NAME: DEFAULT_WORK_ORDER_TYPE_NAME,
            self.config.F_WORK_ORDER_TYPE_KEY: DEFAULT_WORK_ORDER_TYPE_KEY,
            self.config.F_WORK_ORDER_TYPE_DESCRIPTION: DEFAULT_WORK_ORDER_TYPE_DESCRIPTION,
            self.config.F_WORK_ORDER_TYPE_WORKFLOW_TEMPLATE: [template["id"]],
            self.config.F_WORK_ORDER_TYPE_ACTIVE: True,
            self.config.F_WORK_ORDER_TYPE_DEFAULT: active_default is None or (existing and active_default["id"] == existing["id"]),
            self.config.F_WORK_ORDER_TYPE_SORT_ORDER: 10,
            self.config.F_WORK_ORDER_TYPE_ICON: "clipboard-check",
            self.config.F_WORK_ORDER_TYPE_COLOR: "",
            self.config.F_WORK_ORDER_TYPE_DEFAULT_ASSIGNEE_ROLE: "",
            self.config.F_WORK_ORDER_TYPE_ALLOW_MULTIPLE: False,
            self.config.F_WORK_ORDER_TYPE_AUTO_CREATE: True,
        }
        if existing:
            update = {}
            fields = existing.get("fields", {})
            for field, value in desired.items():
                if field in {
                    self.config.F_WORK_ORDER_TYPE_NAME,
                    self.config.F_WORK_ORDER_TYPE_KEY,
                    self.config.F_WORK_ORDER_TYPE_WORKFLOW_TEMPLATE,
                    self.config.F_WORK_ORDER_TYPE_ACTIVE,
                    self.config.F_WORK_ORDER_TYPE_DEFAULT,
                } and fields.get(field) != value:
                    update[field] = value
            if update:
                existing = self.airtable.update_record(self.config.WORK_ORDER_TYPES_TABLE, existing["id"], update, by_field_id=False)
        else:
            existing = self.airtable.create_record(self.config.WORK_ORDER_TYPES_TABLE, desired, by_field_id=False)
        if desired[self.config.F_WORK_ORDER_TYPE_DEFAULT]:
            self._clear_other_defaults(except_id=existing["id"])
        return self.get_type_without_seed(existing["id"])

    def get_type_without_seed(self, record_id):
        return self.shape_type(self.airtable.get_record(self.config.WORK_ORDER_TYPES_TABLE, record_id, by_field_id=False))

    def default_type(self):
        try:
            records = self.list_types(seed=True)
        except requests.HTTPError:
            return None
        return next((record for record in records if record.get("default") and record.get("active")), None)

    def fields_for_new_work_order(self, stage_key="new-review"):
        default = self.default_type()
        if not default:
            return self.workflow_service.fields_for_work_order_stage(stage_key)
        fields = {self.config.F_WORK_ORDER_TYPE: [default["id"]]}
        template = default.get("workflowTemplate")
        if template:
            fields[self.config.F_WORK_ORDER_WORKFLOW_TEMPLATE] = [template["id"]]
            stage = next((item for item in template.get("stages", []) if item.get("stageKey") == stage_key and item.get("active", True)), None)
            if stage:
                fields[self.config.F_WORK_ORDER_CURRENT_WORKFLOW_STAGE] = [stage["id"]]
        if self.config.F_WORK_ORDER_WORKFLOW_TEMPLATE not in fields:
            fields.update(self.workflow_service.fields_for_work_order_stage(stage_key))
        return fields

    def effective_workflow_for_work_order(self, fields):
        type_id = (_as_list(fields.get(self.config.F_WORK_ORDER_TYPE)) or [""])[0]
        if type_id:
            try:
                work_order_type = self.get_type(type_id)
                template = work_order_type.get("workflowTemplate")
                if template:
                    return work_order_type, template
            except requests.HTTPError:
                pass
        template_id = (_as_list(fields.get(self.config.F_WORK_ORDER_WORKFLOW_TEMPLATE)) or [""])[0]
        if template_id:
            try:
                template = self.workflow_service.get_template(template_id)
                return None, template
            except requests.HTTPError:
                pass
        default = self.default_type()
        if default and default.get("workflowTemplate"):
            return default, default["workflowTemplate"]
        try:
            template, _stage = self.workflow_service.default_template_and_stage(fields.get(self.config.F_WORK_ORDER_CURRENT_STAGE) or "new-review")
            return None, template
        except requests.HTTPError:
            return None, None

    def shape_type(self, record):
        fields = record.get("fields", {})
        template_ids = _as_list(fields.get(self.config.F_WORK_ORDER_TYPE_WORKFLOW_TEMPLATE, []))
        return {
            "id": record["id"],
            "name": fields.get(self.config.F_WORK_ORDER_TYPE_NAME, ""),
            "key": fields.get(self.config.F_WORK_ORDER_TYPE_KEY, ""),
            "description": fields.get(self.config.F_WORK_ORDER_TYPE_DESCRIPTION, ""),
            "workflowTemplateIds": template_ids,
            "workflowTemplateId": template_ids[0] if template_ids else "",
            "workflowTemplate": None,
            "workflowTemplateName": "",
            "active": fields.get(self.config.F_WORK_ORDER_TYPE_ACTIVE, True),
            "default": fields.get(self.config.F_WORK_ORDER_TYPE_DEFAULT, False),
            "sortOrder": _number(fields.get(self.config.F_WORK_ORDER_TYPE_SORT_ORDER), 0),
            "icon": fields.get(self.config.F_WORK_ORDER_TYPE_ICON, ""),
            "color": fields.get(self.config.F_WORK_ORDER_TYPE_COLOR, ""),
            "defaultAssigneeRole": fields.get(self.config.F_WORK_ORDER_TYPE_DEFAULT_ASSIGNEE_ROLE, ""),
            "allowMultiplePerMerchandise": _truthy(fields.get(self.config.F_WORK_ORDER_TYPE_ALLOW_MULTIPLE, False)),
            "autoCreate": _truthy(fields.get(self.config.F_WORK_ORDER_TYPE_AUTO_CREATE, False)),
            "createdAt": fields.get(self.config.F_WORK_ORDER_TYPE_CREATED_AT, ""),
            "updatedAt": fields.get(self.config.F_WORK_ORDER_TYPE_UPDATED_AT, ""),
        }

    def _fields_from_payload(self, payload, *, require_template=True):
        name = self._required_text(payload.get("name"), "Name is required.")
        key = self._validate_key(payload.get("key") or _slug(name))
        template_id = self._first_id(payload.get("workflowTemplateId") or payload.get("workflowTemplateIds"))
        active = bool(payload.get("active", True))
        default = bool(payload.get("default", payload.get("isDefault", False)))
        if active or require_template:
            self._validate_workflow_template(template_id)
        if default and not active:
            raise WorkOrderTypeValidationError("Default Work Order Type must be active.")
        return {
            self.config.F_WORK_ORDER_TYPE_NAME: name,
            self.config.F_WORK_ORDER_TYPE_KEY: key,
            self.config.F_WORK_ORDER_TYPE_DESCRIPTION: str(payload.get("description") or "").strip(),
            self.config.F_WORK_ORDER_TYPE_WORKFLOW_TEMPLATE: [template_id] if template_id else [],
            self.config.F_WORK_ORDER_TYPE_ACTIVE: active,
            self.config.F_WORK_ORDER_TYPE_DEFAULT: default,
            self.config.F_WORK_ORDER_TYPE_SORT_ORDER: self._validate_sort_order(payload.get("sortOrder", 0)),
            self.config.F_WORK_ORDER_TYPE_ICON: str(payload.get("icon") or "").strip(),
            self.config.F_WORK_ORDER_TYPE_COLOR: str(payload.get("color") or "").strip(),
            self.config.F_WORK_ORDER_TYPE_DEFAULT_ASSIGNEE_ROLE: str(payload.get("defaultAssigneeRole") or "").strip(),
            self.config.F_WORK_ORDER_TYPE_ALLOW_MULTIPLE: bool(payload.get("allowMultiplePerMerchandise", False)),
            self.config.F_WORK_ORDER_TYPE_AUTO_CREATE: bool(payload.get("autoCreate", False)),
        }

    def _template_for_type(self, work_order_type):
        template_id = work_order_type.get("workflowTemplateId")
        if not template_id:
            return None
        return self.workflow_service.get_template(template_id)

    def _list_type_records(self):
        return self.airtable.list_records(self.config.WORK_ORDER_TYPES_TABLE, by_field_id=False).get("records", [])

    def _required_text(self, value, message):
        text = str(value or "").strip()
        if not text:
            raise WorkOrderTypeValidationError(message)
        return text

    def _validate_key(self, value):
        key = str(value or "").strip().lower()
        if not key:
            raise WorkOrderTypeValidationError("Key is required.")
        if not TYPE_KEY_PATTERN.match(key):
            raise WorkOrderTypeValidationError("Key must use lowercase letters, numbers, and hyphens.")
        return key

    def _validate_unique_key(self, key, *, except_id=None):
        for record in self.list_types(seed=False):
            if record["id"] != except_id and record.get("key") == key:
                raise WorkOrderTypeValidationError("Key must be unique.")

    def _validate_workflow_template(self, template_id):
        if not template_id:
            raise WorkOrderTypeValidationError("Active Work Order Types must reference a Workflow Template.")
        template = self.workflow_service.get_template(template_id)
        if not template.get("active", True):
            raise WorkOrderTypeValidationError("Active Work Order Types must reference an active Workflow Template.")
        return template

    def _validate_sort_order(self, value):
        try:
            return int(value)
        except (TypeError, ValueError):
            raise WorkOrderTypeValidationError("Sort Order must be numeric.") from None

    def _first_id(self, value):
        values = _as_list(value)
        return str(values[0]).strip() if values else ""

    def _clear_other_defaults(self, *, except_id=None):
        for record in self._list_type_records():
            if record["id"] == except_id:
                continue
            if record.get("fields", {}).get(self.config.F_WORK_ORDER_TYPE_DEFAULT, False):
                self.airtable.update_record(
                    self.config.WORK_ORDER_TYPES_TABLE,
                    record["id"],
                    {self.config.F_WORK_ORDER_TYPE_DEFAULT: False},
                    by_field_id=False,
                )

    def _active_work_order_count_for_type(self, work_order_type):
        type_id = work_order_type.get("id")
        count = 0
        try:
            records = self.airtable.list_records(self.config.WORK_ORDERS_TABLE, by_field_id=False).get("records", [])
        except requests.HTTPError:
            return 0
        for record in records:
            fields = record.get("fields", {})
            status = str(fields.get(self.config.F_WORK_ORDER_CURRENT_STATUS, "")).lower()
            if status in {"cancelled", "complete", "completed"}:
                continue
            if type_id in _as_list(fields.get(self.config.F_WORK_ORDER_TYPE, [])):
                count += 1
        return count

    def _unique_copy_key(self, source_key):
        base = f"{source_key}-copy"
        existing = {record.get("key") for record in self.list_types(seed=False)}
        if base not in existing:
            return base
        index = 2
        while f"{base}-{index}" in existing:
            index += 1
        return f"{base}-{index}"
