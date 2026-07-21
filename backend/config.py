import os
from pathlib import Path

from dotenv import load_dotenv


BACKEND_DIR = Path(__file__).resolve().parent
load_dotenv(BACKEND_DIR / ".env")


class Config:
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    PORT = int(os.getenv("PORT", "5057"))
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:5175")
    SECRET_KEY = os.getenv("SECRET_KEY", os.getenv("FLASK_SECRET_KEY", "marks-dev-secret-change-me"))
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true" or FLASK_ENV == "production"

    AIRTABLE_API_KEY = os.getenv("AIRTABLE_API_KEY", "")
    AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID", "")
    R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
    R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "")
    R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")
    R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "")
    R2_PUBLIC_BASE_URL = os.getenv("R2_PUBLIC_BASE_URL", "")
    RECEIVING_PHOTO_STORAGE = os.getenv("RECEIVING_PHOTO_STORAGE", "r2")
    RECEIVING_PHOTO_MAX_BYTES = int(os.getenv("RECEIVING_PHOTO_MAX_BYTES", str(12 * 1024 * 1024)) or str(12 * 1024 * 1024))
    RECEIVING_PHOTO_LOCAL_DIR = str(BACKEND_DIR / "uploads" / "receiving")

    # Table names - canonical application domain.
    CLIENTS_TABLE = "Clients"

    JOBS_TABLE = "Jobs"

    PRODUCTS_TABLE = os.getenv("AIRTABLE_PRODUCTS_TABLE", os.getenv("AIRTABLE_ITEMS_TABLE", "Products"))
    SHIPMENTS_TABLE = os.getenv("AIRTABLE_SHIPMENTS_TABLE", os.getenv("AIRTABLE_RECEIPTS_TABLE", "Shipments"))
    MERCHANDISE_TABLE = os.getenv(
        "AIRTABLE_MERCHANDISE_TABLE",
        os.getenv("AIRTABLE_RECEIPT_ENTRIES_TABLE", "Merchandise"),
    )

    # Deprecated compatibility aliases. Use canonical constants in new backend
    # code. These stay for one migration cycle to protect older routes, tests,
    # payloads, local scripts, and rollback.
    ITEMS_TABLE = PRODUCTS_TABLE
    SKUS_TABLE = PRODUCTS_TABLE
    RECEIPTS_TABLE = SHIPMENTS_TABLE
    RECEIVING_TABLE = SHIPMENTS_TABLE
    RECEIPT_ENTRIES_TABLE = MERCHANDISE_TABLE
    LOCATIONS_TABLE = "Locations"
    USERS_TABLE = "Users"
    ISSUES_TABLE = "Issues"
    HISTORY_TABLE = "History"
    IMPORTS_TABLE = "Imports"
    WORKSTREAMS_TABLE = "Workstreams"
    WORK_ORDERS_TABLE = os.getenv(
        "AIRTABLE_WORK_ORDERS_TABLE",
        os.getenv("AIRTABLE_WORKSTREAM_ASSIGNMENTS_TABLE", "Work Orders"),
    )
    # Deprecated compatibility alias. Use WORK_ORDERS_TABLE in new backend code.
    WORKSTREAM_ASSIGNMENTS_TABLE = WORK_ORDERS_TABLE

    # Field names — Locations
    F_LOCATION_NAME = "Location"
    F_LOCATION_TYPE = "Type"
    F_LOCATION_ACTIVE = "Active"
    F_LOCATION_NOTES = "Notes"

    # Field names — Users
    F_USER_NAME = "User"
    F_USER_FIRST_NAME = "First Name"
    F_USER_LAST_NAME = "Last Name"
    F_USER_DISPLAY_NAME = "Display Name"
    F_USER_EMAIL = "Email"
    F_USER_ROLE = "Role"
    F_USER_ACTIVE = "Active"
    F_USER_CLIENTS = "Clients"
    F_USER_ALL_CLIENTS = "All Clients"
    F_USER_AVATAR = "Avatar"
    F_USER_PIN_HASH = "PIN Hash"

    # Field names - Shipments
    F_RECEIPT_NAME = "Shipment"
    F_RECEIPT_CLIENT = "Client"
    F_RECEIPT_ITEMS = "Products"
    F_RECEIPT_CARRIER = "Carrier"
    F_RECEIPT_TRACKING = "Tracking"
    F_RECEIPT_BOX_QUANTITY = "Box Quantity"
    F_RECEIPT_RECEIVED = "Received"
    F_RECEIPT_RECEIVER = "Receiver"
    F_RECEIPT_LOCATION = "Location"
    F_RECEIPT_PHOTOS = "Photos"
    F_RECEIPT_NOTES = "Notes"

    # Field names - Merchandise
    F_RECEIPT_ENTRY_NAME = "Observed Package Name"
    F_RECEIPT_ENTRY_RECEIPT = "Shipment"
    F_RECEIPT_ENTRY_SKU_ID = "Observed Identifier"
    F_RECEIPT_ENTRY_QUANTITY = "Quantity"
    F_RECEIPT_ENTRY_LOCATION = "Storage Location"
    F_RECEIPT_ENTRY_CONDITION = "Condition"
    F_RECEIPT_ENTRY_DESCRIPTION = "Description"
    F_RECEIPT_ENTRY_NOTES = "Notes"
    F_RECEIPT_ENTRY_PHOTOS = "Photos"
    F_RECEIPT_ENTRY_PHOTO_METADATA = "Photo Metadata"
    F_RECEIPT_ENTRY_ITEM = "Product"
    F_RECEIPT_ENTRY_MERCH_STATUS = "Merch Status"
    F_RECEIPT_ENTRY_INTAKE_STATUS = "Intake Status"
    F_RECEIPT_ENTRY_DELIVERABLES = "Deliverables"
    F_RECEIPT_ENTRY_MERCHANDISE_RESOLUTION = "Merchandise Resolution"
    F_RECEIPT_ENTRY_RELEASED = "Released"
    F_RECEIPT_ENTRY_RELEASED_AT = "Released At"
    F_RECEIPT_ENTRY_RELEASED_BY = "Released By"
    F_RECEIPT_ENTRY_MERCH_VERIFIED = "Merchandise Verified"
    F_RECEIPT_ENTRY_MERCH_VERIFIED_AT = "Merchandise Verified At"
    F_RECEIPT_ENTRY_MERCH_VERIFIED_BY = "Merchandise Verified By"
    INTAKE_STATUS_OPTIONS = ["Needs Review", "Waiting on Information", "Ready to Release", "Closed"]
    DELIVERABLE_OPTIONS = ["Packaging Photo", "Ecomm Photo", "Thr3d"]
    MERCHANDISE_RESOLUTION_OPTIONS = [
        "Keep at Walnut",
        "Ship to Kentucky",
        "Hold",
        "Replacement Requested",
        "Return to Client",
        "Dispose",
    ]

    # Field names — Clients
    F_CLIENT_NAME = "Client"
    F_CLIENT_IDENTIFIER_TYPE = "Identifier Type"
    F_CLIENT_HOLD_DAYS = "Hold Days"
    F_CLIENT_DISPO_DAYS = "Dispo Days"
    F_CLIENT_JOB_PREFIX = "Job Prefix"
    F_CLIENT_ACTIVE = "Active"
    F_CLIENT_IDENTIFIER_LABEL = "Identifier Label"
    F_CLIENT_REQUIRED_PHOTO_FIELDS = "Required Photography Fields"
    F_CLIENT_ARTWORK_REQUIREMENT = "Artwork Requirement"
    F_CLIENT_MERCHANDISE_REQUIRED = "Merchandise Required"

    # Field names — Jobs
    F_JOB_NAME = "Job"
    F_JOB_CLIENT = "Client"
    F_JOB_PARENT_NUMBER = "Parent Job Number"
    F_JOB_EXT_ID = F_JOB_PARENT_NUMBER
    F_JOB_PERIOD = "Period"
    F_JOB_STATUS = "Status"
    F_JOB_DUE = "Due"

    # Field names - Products
    F_ITEM_NAME = "Product Name"
    F_ITEM_CLIENT = "Client"
    F_ITEM_JOB = "Job"
    F_ITEM_IDENTIFIER = "Identifier"
    F_ITEM_IDENTIFIER_TYPE = "Identifier Type"
    F_ITEM_PRODUCT = "Product or File Name"
    F_ITEM_JOB_NUMBER = "Product Job Number"
    F_ITEM_DESCRIPTION = "Description"
    F_ITEM_WORKSTREAM = "Workstream"
    F_ITEM_OUTPUT = F_ITEM_WORKSTREAM
    F_ITEM_MASTER_VARIANT = "Master or Variant"
    F_ITEM_PICKUP_JOB_NUMBER = "Pickup Job Number"
    F_ITEM_BRAND = "Brand"
    F_ITEM_CATEGORY = "Category"
    F_ITEM_RECEIVED = "Received"
    F_ITEM_REC_DATE = "Rec Date"
    F_ITEM_LOCATION = "Location"
    F_ITEM_CONDITION = "Condition"
    F_ITEM_STATUS = "Status"
    F_ITEM_NOTES = "Notes"
    F_ITEM_PHOTOS = "Photos"
    F_ITEM_PHOTO_METADATA = "Photo Metadata"
    F_ITEM_REFERENCE_DATA = "Reference Data"
    F_ITEM_RECEIPTS = "Shipments"
    F_ITEM_ISSUES = "Issues"
    F_ITEM_ARTWORK_RECEIVED = "Artwork Received"
    F_ITEM_EXPORTED = "Exported"
    F_ITEM_EXPORTED_ON = "Exported On"
    F_ITEM_EXPORT_ERROR = "Export Error"

    # Field names - Workstreams
    F_WORKSTREAM_NAME = "Name"
    F_WORKSTREAM_ACTIVE = "Active"
    F_WORKSTREAM_DESCRIPTION = "Description"
    F_WORKSTREAM_WORKFLOW_TEMPLATE = "Workflow Template"
    F_WORKSTREAM_CONFIGURATION = "Configuration"

    # Table names - Workflow configuration
    WORKFLOW_TEMPLATES_TABLE = os.getenv("AIRTABLE_WORKFLOW_TEMPLATES_TABLE", "Workflow Templates")
    WORKFLOW_STAGES_TABLE = os.getenv("AIRTABLE_WORKFLOW_STAGES_TABLE", "Workflow Stages")
    WORK_ORDER_TYPES_TABLE = os.getenv("AIRTABLE_WORK_ORDER_TYPES_TABLE", "Work Order Types")

    # Field names - Workflow Templates
    F_WORKFLOW_TEMPLATE_NAME = "Name"
    F_WORKFLOW_TEMPLATE_DESCRIPTION = "Description"
    F_WORKFLOW_TEMPLATE_ACTIVE = "Active"
    F_WORKFLOW_TEMPLATE_DEFAULT = "Default"
    F_WORKFLOW_TEMPLATE_VERSION = "Version"
    F_WORKFLOW_TEMPLATE_CREATED_AT = "Created At"
    F_WORKFLOW_TEMPLATE_UPDATED_AT = "Updated At"

    # Field names - Workflow Stages
    F_WORKFLOW_STAGE_NAME = "Name"
    F_WORKFLOW_STAGE_TEMPLATE = "Workflow Template"
    F_WORKFLOW_STAGE_KEY = "Stage Key"
    F_WORKFLOW_STAGE_DISPLAY_ORDER = "Display Order"
    F_WORKFLOW_STAGE_COLOR_TOKEN = "Color Token"
    F_WORKFLOW_STAGE_TYPE = "Stage Type"
    F_WORKFLOW_STAGE_IS_COMPLETE = "Is Complete"
    F_WORKFLOW_STAGE_IS_TERMINAL = "Is Terminal"
    F_WORKFLOW_STAGE_ACTIVE = "Active"
    F_WORKFLOW_STAGE_DESCRIPTION = "Description"

    # Field names - Work Order Types
    F_WORK_ORDER_TYPE_NAME = "Name"
    F_WORK_ORDER_TYPE_KEY = "Key"
    F_WORK_ORDER_TYPE_DESCRIPTION = "Description"
    F_WORK_ORDER_TYPE_WORKFLOW_TEMPLATE = "Workflow Template"
    F_WORK_ORDER_TYPE_ACTIVE = "Active"
    F_WORK_ORDER_TYPE_DEFAULT = "Is Default"
    F_WORK_ORDER_TYPE_SORT_ORDER = "Sort Order"
    F_WORK_ORDER_TYPE_ICON = "Icon"
    F_WORK_ORDER_TYPE_COLOR = "Color"
    F_WORK_ORDER_TYPE_DEFAULT_ASSIGNEE_ROLE = "Default Assignee Role"
    F_WORK_ORDER_TYPE_ALLOW_MULTIPLE = "Allow Multiple Per Merchandise"
    F_WORK_ORDER_TYPE_AUTO_CREATE = "Auto Create"
    F_WORK_ORDER_TYPE_CREATED_AT = "Created At"
    F_WORK_ORDER_TYPE_UPDATED_AT = "Updated At"

    # Field names - Work Orders
    F_WORK_ORDER_NAME = "Work Order"
    F_WORK_ORDER_TYPE = "Work Order Type"
    F_WORK_ORDER_MERCHANDISE = "Merchandise"
    F_WORK_ORDER_WORKSTREAM = "Workstream"
    F_WORK_ORDER_WORKFLOW = "Workflow"
    F_WORK_ORDER_WORKFLOW_TEMPLATE = "Workflow Template"
    F_WORK_ORDER_CURRENT_WORKFLOW_STAGE = "Current Workflow Stage"
    F_WORK_ORDER_CURRENT_STAGE = "Current Stage"
    F_WORK_ORDER_CURRENT_GATE = F_WORK_ORDER_CURRENT_STAGE
    F_WORK_ORDER_CURRENT_OWNER = "Current Owner"
    F_WORK_ORDER_CURRENT_STATUS = "Current Status"
    F_WORK_ORDER_JOB = "Job"
    F_WORK_ORDER_READINESS_METADATA = "Readiness Metadata"
    F_WORK_ORDER_BLOCKING_REQUIREMENTS = "Blocking Requirements"
    F_WORK_ORDER_CREATED_AT = "Created At"
    F_WORK_ORDER_COMPLETED_AT = "Completed At"

    # Deprecated compatibility aliases. Use Work Order names in new code.
    F_WORKSTREAM_ASSIGNMENT_NAME = F_WORK_ORDER_NAME
    F_WORKSTREAM_ASSIGNMENT_MERCHANDISE = F_WORK_ORDER_MERCHANDISE
    F_WORKSTREAM_ASSIGNMENT_WORKSTREAM = F_WORK_ORDER_WORKSTREAM
    F_WORKSTREAM_ASSIGNMENT_WORKFLOW = F_WORK_ORDER_WORKFLOW
    F_WORKSTREAM_ASSIGNMENT_CURRENT_GATE = F_WORK_ORDER_CURRENT_STAGE
    F_WORKSTREAM_ASSIGNMENT_CURRENT_OWNER = F_WORK_ORDER_CURRENT_OWNER
    F_WORKSTREAM_ASSIGNMENT_CURRENT_STATUS = F_WORK_ORDER_CURRENT_STATUS
    F_WORKSTREAM_ASSIGNMENT_JOB = F_WORK_ORDER_JOB
    F_WORKSTREAM_ASSIGNMENT_READINESS_METADATA = F_WORK_ORDER_READINESS_METADATA
    F_WORKSTREAM_ASSIGNMENT_BLOCKING_REQUIREMENTS = F_WORK_ORDER_BLOCKING_REQUIREMENTS
    F_WORKSTREAM_ASSIGNMENT_CREATED_AT = F_WORK_ORDER_CREATED_AT
    F_WORKSTREAM_ASSIGNMENT_COMPLETED_AT = F_WORK_ORDER_COMPLETED_AT

    # Field names — Issues
    F_ISSUE_NAME = "Issue"
    F_ISSUE_ITEM = "Product"
    F_ISSUE_JOB = "Job"
    F_ISSUE_TYPE = "Type"
    F_ISSUE_STATUS = "Status"
    F_ISSUE_PRIORITY = "Priority"
    F_ISSUE_ASSIGNED = "Assigned"
    F_ISSUE_OPENED = "Opened"
    F_ISSUE_CLOSED = "Closed"
    F_ISSUE_PHOTOS = "Photos"
    F_ISSUE_NOTES = "Notes"

    # Field names — History
    F_HISTORY_EVENT = "Event"
    F_HISTORY_ITEM = "Product"
    F_HISTORY_JOB = "Job"
    F_HISTORY_USER = "User"
    F_HISTORY_TYPE = "Type"
    F_HISTORY_DATE = "Date"
    F_HISTORY_FIELD = "Field"
    F_HISTORY_FROM = "From"
    F_HISTORY_TO = "To"
    F_HISTORY_DETAILS = "Details"

    # Field names — Imports
    F_IMPORT_NAME = "Import"
    F_IMPORT_CLIENT = "Client"
    F_IMPORT_USER = "User"
    F_IMPORT_FILE = "File"
    F_IMPORT_TYPE = "Type"
    F_IMPORT_STATUS = "Status"
    F_IMPORT_STARTED = "Started"
    F_IMPORT_FINISHED = "Finished"
    F_IMPORT_ROWS = "Rows"
    F_IMPORT_JOBS_CREATED = "Jobs Created"
    F_IMPORT_JOBS_REUSED = "Jobs Reused"
    F_IMPORT_ITEMS_CREATED = "Products Created"
    F_IMPORT_ITEMS_UPDATED = "Products Updated"
    F_IMPORT_ROWS_SKIPPED = "Rows Skipped"
    F_IMPORT_ERRORS = "Errors"
    F_IMPORT_WARNINGS = "Warnings"
    F_IMPORT_DETAILS = "Details"

    @classmethod
    def cors_origins(cls):
        return [origin.strip() for origin in cls.CORS_ORIGINS.split(",") if origin.strip()]

    @classmethod
    def airtable_ready(cls):
        placeholders = {"pat_your_airtable_token", "app_your_base_id"}
        return bool(
            cls.AIRTABLE_API_KEY
            and cls.AIRTABLE_BASE_ID
            and cls.AIRTABLE_API_KEY not in placeholders
            and cls.AIRTABLE_BASE_ID not in placeholders
        )
