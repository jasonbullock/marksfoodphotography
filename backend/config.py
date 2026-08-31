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
    SESSION_COOKIE_SAMESITE = os.getenv(
        "SESSION_COOKIE_SAMESITE",
        "None" if (os.getenv("SESSION_COOKIE_SECURE", "").lower() == "true"
                   or os.getenv("FLASK_ENV", "development") == "production") else "Lax",
    )
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() == "true" or FLASK_ENV == "production"

    AIRTABLE_API_KEY = os.getenv("AIRTABLE_API_KEY", "")
    AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID", "")
    R2_ACCOUNT_ID = os.getenv("R2_ACCOUNT_ID", "")
    R2_ACCESS_KEY_ID = os.getenv("R2_ACCESS_KEY_ID", "")
    R2_SECRET_ACCESS_KEY = os.getenv("R2_SECRET_ACCESS_KEY", "")
    R2_BUCKET_NAME = os.getenv("R2_BUCKET_NAME", "")
    R2_PUBLIC_BASE_URL = os.getenv("R2_PUBLIC_BASE_URL", "")
    # Where a notification should send someone. Without it a message still posts,
    # just without links, rather than linking to localhost.
    APP_BASE_URL = os.getenv("APP_BASE_URL", "").rstrip("/")
    CREATIVE_FORCE_WEBHOOK_SECRET = os.getenv("CREATIVE_FORCE_WEBHOOK_SECRET", "")
    # Where to relay a copy of each authentic webhook event, so Creative Force can
    # point at one URL forever while a development instance still sees live
    # traffic. Unset means no relay, which is what a development instance runs
    # with - otherwise two instances would forward to each other.
    CREATIVE_FORCE_FORWARD_URL = os.getenv("CREATIVE_FORCE_FORWARD_URL", "")
    CREATIVE_FORCE_MAIN_WORKFLOW_NAME = os.getenv("CREATIVE_FORCE_MAIN_WORKFLOW_NAME", "")
    # The main workflow's steps in order. Creative Force does not encode its own
    # ordering in StepId, so a reset - which stamps every step the same instant -
    # has nothing to sort by unless the order is stated here.
    CREATIVE_FORCE_STEP_ORDER = [
        value.strip() for value in os.getenv(
            "CREATIVE_FORCE_STEP_ORDER",
            "Photography,Final Selection,Photo Review,External Post Production,External Post QC,Delivery",
        ).split(",") if value.strip()
    ]
    # Creative Force posts every client's events to one endpoint. Restrict to ours.
    CREATIVE_FORCE_CLIENT_IDS = [
        value.strip() for value in os.getenv("CREATIVE_FORCE_CLIENT_IDS", "").split(",") if value.strip()
    ]
    CREATIVE_FORCE_CLIENT_NAMES = [
        value.strip() for value in os.getenv("CREATIVE_FORCE_CLIENT_NAMES", "").split(",") if value.strip()
    ]
    RECEIVING_PHOTO_STORAGE = os.getenv("RECEIVING_PHOTO_STORAGE", "r2")
    RECEIVING_PHOTO_MAX_BYTES = int(os.getenv("RECEIVING_PHOTO_MAX_BYTES", str(12 * 1024 * 1024)) or str(12 * 1024 * 1024))
    RECEIVING_PHOTO_LOCAL_DIR = str(BACKEND_DIR / "uploads" / "receiving")
    TOPCO_SOURCE_SHEET_ID = os.getenv("TOPCO_SOURCE_SHEET_ID", "1vYAEh-fPogUX5c3dsBqvlqx5aaUvZ_kBQUFnOfYtr9k")
    TOPCO_SOURCE_SHEET_GID = os.getenv("TOPCO_SOURCE_SHEET_GID", "1627774267")
    TOPCO_SOURCE_SHEET_TAB = os.getenv("TOPCO_SOURCE_SHEET_TAB", "Master Tracker 2026")
    TOPCO_SOURCE_HEADER_ROW = int(os.getenv("TOPCO_SOURCE_HEADER_ROW", "5") or "5")
    TOPCO_SOURCE_COLUMN_RANGE = os.getenv("TOPCO_SOURCE_COLUMN_RANGE", "A:AE")
    TOPCO_SOURCE_REFRESH_ENABLED = os.getenv("TOPCO_SOURCE_REFRESH_ENABLED", "true").lower() == "true"
    TOPCO_SOURCE_REFRESH_INTERVAL_SECONDS = int(os.getenv("TOPCO_SOURCE_REFRESH_INTERVAL_SECONDS", "300") or "300")
    # The source sheet is a working list of expected and active products, not an
    # archive: finished items come off it. A window well above steady state means
    # matching searches the whole list without needing tuning as it moves.
    TOPCO_SOURCE_MATCH_ROW_WINDOW = int(os.getenv("TOPCO_SOURCE_MATCH_ROW_WINDOW", "600") or "600")
    TOPCO_SOURCE_REFRESH_LIMIT = int(os.getenv("TOPCO_SOURCE_REFRESH_LIMIT", "100") or "100")
    TOPCO_SOURCE_CHECK_FIELDS = [
        field.strip()
        for field in os.getenv(
            "TOPCO_SOURCE_CHECK_FIELDS",
            (
                "Product Name,CVID,UPC,Brand Prefix,Request Type,WKFT #,Mbox #,"
                "Product Type,Prod Descrip,Link to Prepro/Overlays,Path to Art,Photo Notes"
            ),
        ).split(",")
        if field.strip()
    ]

    # Table names - canonical application domain.
    CLIENTS_TABLE = "Clients"


    PRODUCTS_TABLE = os.getenv("AIRTABLE_PRODUCTS_TABLE", os.getenv("AIRTABLE_ITEMS_TABLE", "Products"))
    SHIPMENTS_TABLE = os.getenv("AIRTABLE_SHIPMENTS_TABLE", os.getenv("AIRTABLE_RECEIPTS_TABLE", "Shipments"))
    MERCHANDISE_TABLE = os.getenv(
        "AIRTABLE_MERCHANDISE_TABLE",
        os.getenv("AIRTABLE_RECEIPT_ENTRIES_TABLE", "Merchandise"),
    )
    WORKSTREAM_CARDS_TABLE = os.getenv("AIRTABLE_WORKSTREAM_CARDS_TABLE", "Workstream Cards")
    THR3D_SHIPPING_ITEMS_TABLE = os.getenv("AIRTABLE_THR3D_SHIPPING_ITEMS_TABLE", "THR3D Shipping Items")
    CREATIVE_FORCE_PRODUCT_FEED_TABLE = os.getenv(
        "AIRTABLE_CREATIVE_FORCE_PRODUCT_FEED_TABLE", "Creative Force Product Feed"
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
    COMMENTS_TABLE = "Comments"
    IMPORTS_TABLE = "Imports"
    ACTIVATIONS_TABLE = "Activations"

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
    # App-owned JSON map of merchandiseId -> ISO timestamp read through. Server-side so
    # "new comment" is per person rather than per browser.
    F_USER_COMMENT_READS = "Comment Reads"

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
    F_RECEIPT_PHOTO_METADATA = "Photo Metadata"
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
    F_RECEIPT_ENTRY_PLANNING_STATUS = "Planning Status"
    F_RECEIPT_ENTRY_DELIVERABLES = "Deliverables"
    F_RECEIPT_ENTRY_MANUAL_PRODUCT_INFO = "Manual Product Info"
    # Airtable mints the sequence; the app renders it as MP-00412. This is the code
    # printed on the tag and, suffixed per workstream, the Creative Force Product Code.
    F_RECEIPT_ENTRY_MARKS_NUMBER = "Marks Number"
    F_RECEIPT_ENTRY_RELEASED = "Released"
    F_RECEIPT_ENTRY_RELEASED_AT = "Released At"
    F_RECEIPT_ENTRY_RELEASED_BY = "Released By"
    F_RECEIPT_ENTRY_MERCH_VERIFIED = "Merchandise Verified"
    F_RECEIPT_ENTRY_MERCH_VERIFIED_AT = "Merchandise Verified At"
    F_RECEIPT_ENTRY_MERCH_VERIFIED_BY = "Merchandise Verified By"
    F_RECEIPT_ENTRY_HISTORY = "History"
    PLANNING_STATUS_OPTIONS = ["New", "Needs More Information", "Awaiting Photo Release"]
    # Workstream cards are only created after merchandise is accepted and
    # deliverables are known, so they are born at Needs More Information and can
    # never legitimately be New. New is a parent-merchandise concept.
    WORKSTREAM_CARD_PLANNING_STATUS_OPTIONS = ["Needs More Information", "Awaiting Photo Release"]
    DELIVERABLE_OPTIONS = ["Packaging", "Ecomm", "Thr3d"]

    # Field names - Workstream Cards
    F_WORKSTREAM_CARD_NAME = "Workstream Card"
    F_WORKSTREAM_CARD_RECEIVED_MERCH = "Received Merch"
    F_WORKSTREAM_CARD_EXPECTED_PRODUCT = "Expected Product"
    F_WORKSTREAM_CARD_TYPE = "Workstream Type"
    F_WORKSTREAM_CARD_PLANNING_STATUS = "Planning Status"
    F_WORKSTREAM_CARD_QUANTITY = "Quantity"
    F_WORKSTREAM_CARD_MANUAL_PRODUCT_INFO = "Manual Product Info"
    F_WORKSTREAM_CARD_NOTES = "Notes"
    F_WORKSTREAM_CARD_CREATIVE_FORCE_SYNC = "Creative Force Sync"
    F_WORKSTREAM_CARD_CREATIVE_FORCE_STATUS = "Creative Force Status"
    F_WORKSTREAM_CARD_CREATIVE_FORCE_STEP = "Creative Force Step"
    # Release is per workstream, not per arrival: an Ecomm card can go to photo while
    # Packaging for the same box is still waiting on data.
    F_WORKSTREAM_CARD_RELEASED = "Released"
    F_WORKSTREAM_CARD_RELEASED_AT = "Released At"
    F_WORKSTREAM_CARD_RELEASED_BY = "Released By"
    WORKSTREAM_TYPE_OPTIONS = ["Ecomm", "Packaging"]

    # Field names - THR3D Shipping Items
    F_THR3D_SHIPPING_ITEM_NAME = "THR3D Shipping Item"
    F_THR3D_SHIPPING_ITEM_RECEIVED_MERCH = "Received Merch"
    F_THR3D_SHIPPING_ITEM_EXPECTED_PRODUCT = "Expected Product"
    F_THR3D_SHIPPING_ITEM_QUANTITY = "Quantity to Ship"
    F_THR3D_SHIPPING_ITEM_STATUS = "Shipping Status"
    F_THR3D_SHIPPING_ITEM_OUTBOUND_SHIPMENT = "Outbound Shipment"
    F_THR3D_SHIPPING_ITEM_MANUAL_PRODUCT_INFO = "Manual Product Info"
    F_THR3D_SHIPPING_ITEM_NOTES = "Notes"
    THR3D_SHIPPING_STATUS_OPTIONS = ["Needs Shipment", "Shipped"]

    # Field names — Clients
    F_CLIENT_NAME = "Client"
    F_CLIENT_IDENTIFIER_TYPE = "Identifier Type"
    F_CLIENT_HOLD_DAYS = "Hold Days"
    F_CLIENT_DISPO_DAYS = "Dispo Days"
    F_CLIENT_ACTIVE = "Active"
    F_CLIENT_PHOTO_RELEASE_RECIPIENTS = "Photo Release Recipients"
    # Power Automate webhook for this client's Teams channel. A capability URL:
    # holding it is enough to post, so it is never sent to the browser.
    F_CLIENT_TEAMS_WEBHOOK = "Teams Webhook"
    F_CLIENT_IDENTIFIER_LABEL = "Identifier Label"
    F_CLIENT_REQUIRED_TO_SHOOT = "Required to Shoot"
    F_CLIENT_ARTWORK_REQUIREMENT = "Artwork Requirement"
    F_CLIENT_MERCHANDISE_REQUIRED = "Merchandise Required"
    F_CLIENT_PRODUCT_IMPORT_PROFILES = "Product Import Profiles"
    F_CLIENT_PHOTO_PRODUCTION_REQUIREMENTS = "Photo Production Requirements"

    # Field names - Activations
    F_ACTIVATION_NAME = "Name"
    F_ACTIVATION_CLIENT = "Client"
    F_ACTIVATION_STATUS = "Status"
    F_ACTIVATION_PROJECT_REFERENCE = "Project Reference"
    F_ACTIVATION_PACKAGE = "Activation Package"
    F_ACTIVATION_DATE = "Activation Date"
    F_ACTIVATION_DUE_URGENCY = "Due / Urgency"
    F_ACTIVATION_WALNUT_SCOPE = "Walnut Scope"
    F_ACTIVATION_NUMBER_OF_SKUS = "Number of SKUs"
    F_ACTIVATION_IMAGES_PER_BUNDLE = "Images Per Bundle"
    F_ACTIVATION_TOTAL_IMAGES = "Total Images"
    F_ACTIVATION_ARTWORK_PATH = "Artwork Path"
    F_ACTIVATION_UPLOAD_LOCATION = "Upload Location"
    F_ACTIVATION_SKU_DETAILS_JSON = "SKU Details JSON"
    F_ACTIVATION_DELIVERABLES = "Deliverables"
    F_ACTIVATION_LINKED_MERCHANDISE = "Linked Merchandise"
    F_ACTIVATION_MATCHED_MERCHANDISE = F_ACTIVATION_LINKED_MERCHANDISE
    F_ACTIVATION_NOTES = "Notes"
    F_ACTIVATION_EMAIL_SUBJECT = "Email Subject"
    F_ACTIVATION_EMAIL_BODY_HTML = "Email Body HTML"
    ACTIVATION_STATUS_OPTIONS = ["Draft", "Active", "Needs Info", "Released", "Cancelled"]

    # Field names — Jobs

    # Field names - Products
    F_ITEM_NAME = "Product Name"
    F_ITEM_CLIENT = "Client"
    # Compatibility alias: Product matching now lives in the real UPC field.
    F_ITEM_IDENTIFIER = "UPC"
    F_ITEM_IDENTIFIER_TYPE = "Identifier Type"
    F_ITEM_CVID = "CVID"
    F_ITEM_UPC = "UPC"
    F_ITEM_BRAND_PREFIX = "Brand Prefix"
    F_ITEM_REQUEST_TYPE = "Request Type"
    F_ITEM_PROJECT_STATUS = "Project Status"
    F_ITEM_WKFT_JOB_NUMBER = "WKFT Job Number"
    F_ITEM_MBOX_NUMBER = "Mbox Number"
    F_ITEM_PROJECT_NAME = "Project Name"
    F_RECEIPT_ENTRY_ITEM_MERCHANDISE = "Merchandise"
    F_ITEM_STUDIO_DESTINATION = "Studio Destination"
    F_ITEM_VENDOR = "Vendor"
    F_ITEM_PRODUCT_TYPE = "Product Type"
    # A short human-readable name used as a file-naming token, not prose. Renamed
    # from "Product Description" on 2026-08-27; source sheets still call it Prod Descrip.
    F_ITEM_FILE_NAME_DESCRIPTION = "File Name Description"
    F_ITEM_PREPRO_OVERLAYS = "Link to Prepro/Overlays"
    F_ITEM_ECOMM_PHOTO_NOTES = "Ecomm Photo Notes"
    F_ITEM_PATH_TO_ART = "Path to Art"
    # Compatibility alias: the retired Product or File Name field now maps to Product Name.
    F_ITEM_PRODUCT = F_ITEM_NAME
    # The live Products table uses WKFT Job Number. Keep the API's
    # itemJobNumber name for compatibility with existing callers.
    F_ITEM_JOB_NUMBER = "WKFT Job Number"
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

    # Field names - Creative Force Product Feed
    F_CF_FEED_PRODUCT = "Product"
    F_CF_FEED_CLIENT = "Client"
    F_CF_FEED_PRODUCT_CODE = "Product Code"
    F_CF_FEED_CATEGORY = "Category"
    F_CF_FEED_PRODUCTION_TYPE = "Production Type"
    F_CF_FEED_SOURCE_KEY = "Source Key"

    CREATIVE_FORCE_FEED_PRODUCT_FIELDS = {
        "productName": "Product Name",
        "upc": "UPC / Product ID",
        "cvid": "CVID",
        "jobNumber": "Job Number",
        "brandPrefix": "Brand Prefix",
        "fileNameDescription": "File Name Description",
        "ecommPhotoNotes": "Ecomm Photo Notes",
        "pathToArt": "Valid Artwork Path",
    }

    # Field names — Issues
    F_ISSUE_NAME = "Issue"
    F_ISSUE_ITEM = "Product"
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
    F_HISTORY_USER = "User"
    F_HISTORY_DATE = "Date"
    F_HISTORY_FROM = "From"
    F_HISTORY_TO = "To"
    # History covers the physical lifecycle too, not just Product edits, so merchandise
    # events have something to attach to.
    F_HISTORY_MERCHANDISE = "Merchandise"

    # Field names - Comments
    F_COMMENT_BODY = "Comment"
    F_COMMENT_MERCHANDISE = "Merchandise"
    F_COMMENT_USER = "User"
    # Airtable createdTime field on Comments. The shaper still falls back to the
    # record's createdTime metadata, so a rename here degrades to the same value
    # rather than losing the timestamp.
    F_COMMENT_CREATED_AT = "Comment Created"

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
