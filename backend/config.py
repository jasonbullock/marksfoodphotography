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

    AIRTABLE_API_KEY = os.getenv("AIRTABLE_API_KEY", "")
    AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID", "")

    # Table names — production schema uses concise Airtable field names.
    CLIENTS_TABLE = "Clients"

    JOBS_TABLE = "Jobs"

    # Table IDs — Marks Food Photography base (appE30EGZv8OzssDx)
    ITEMS_TABLE = "Items"
    SKUS_TABLE = ITEMS_TABLE
    RECEIPTS_TABLE = "Receipts"
    RECEIVING_TABLE = RECEIPTS_TABLE
    LOCATIONS_TABLE = "Locations"
    USERS_TABLE = "Users"
    ISSUES_TABLE = "Issues"
    HISTORY_TABLE = "History"

    # Field names — Locations
    F_LOCATION_NAME = "Location"
    F_LOCATION_TYPE = "Type"
    F_LOCATION_ACTIVE = "Active"
    F_LOCATION_NOTES = "Notes"

    # Field names — Users
    F_USER_NAME = "User"
    F_USER_EMAIL = "Email"
    F_USER_ROLE = "Role"
    F_USER_ACTIVE = "Active"

    # Field names — Receipts
    F_RECEIPT_NAME = "Receipt"
    F_RECEIPT_CLIENT = "Client"
    F_RECEIPT_ITEMS = "Items"
    F_RECEIPT_CARRIER = "Carrier"
    F_RECEIPT_TRACKING = "Tracking"
    F_RECEIPT_RECEIVED = "Received"
    F_RECEIPT_RECEIVER = "Receiver"
    F_RECEIPT_LOCATION = "Location"
    F_RECEIPT_PHOTOS = "Photos"
    F_RECEIPT_NOTES = "Notes"

    # Field names — Clients
    F_CLIENT_NAME = "Client"
    F_CLIENT_CODE_TYPE = "Code Type"
    F_CLIENT_HOLD_DAYS = "Hold Days"
    F_CLIENT_DISPO_DAYS = "Dispo Days"
    F_CLIENT_JOB_PREFIX = "Job Prefix"
    F_CLIENT_ACTIVE = "Active"

    # Field names — Jobs
    F_JOB_NAME = "Job"
    F_JOB_CLIENT = "Client"
    F_JOB_EXT_ID = "Ext ID"
    F_JOB_OUTPUT = "Output"
    F_JOB_STATUS = "Status"
    F_JOB_DUE = "Due"
    F_JOB_NOTES = "Notes"

    # Field names — Items
    F_ITEM_NAME = "Name"
    F_ITEM_CLIENT = "Client"
    F_ITEM_JOB = "Job"
    F_ITEM_IDENTIFIER = "ID"
    F_ITEM_CODE_TYPE = "Code Type"
    F_ITEM_PRODUCT = "Product"
    F_ITEM_BRAND = "Brand"
    F_ITEM_CATEGORY = "Category"
    F_ITEM_RECEIVED = "Received"
    F_ITEM_REC_DATE = "Rec Date"
    F_ITEM_LOCATION = "Location"
    F_ITEM_CONDITION = "Condition"
    F_ITEM_STATUS = "Status"
    F_ITEM_NOTES = "Notes"
    F_ITEM_EXPORTED = "Exported"
    F_ITEM_EXPORTED_ON = "Exported On"
    F_ITEM_EXPORT_ERROR = "Export Error"

    # Field names — Issues
    F_ISSUE_NAME = "Issue"
    F_ISSUE_ITEM = "Item"
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
    F_HISTORY_ITEM = "Item"
    F_HISTORY_JOB = "Job"
    F_HISTORY_USER = "User"
    F_HISTORY_TYPE = "Type"
    F_HISTORY_DATE = "Date"
    F_HISTORY_FROM = "From"
    F_HISTORY_TO = "To"
    F_HISTORY_DETAILS = "Details"

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
