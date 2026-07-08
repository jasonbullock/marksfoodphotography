import os
from pathlib import Path

from dotenv import load_dotenv


ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")


class Config:
    FLASK_ENV = os.getenv("FLASK_ENV", "development")
    FLASK_DEBUG = os.getenv("FLASK_DEBUG", "true").lower() == "true"
    PORT = int(os.getenv("PORT", "5057"))
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:5174")

    AIRTABLE_API_KEY = os.getenv("AIRTABLE_API_KEY", "")
    AIRTABLE_BASE_ID = os.getenv("AIRTABLE_BASE_ID", "")

    # Table IDs — Marks Food Photography base (appE30EGZv8OzssDx)
    CLIENTS_TABLE = "tblQe6Fn5yAfqM6H7"
    JOBS_TABLE    = "tbliPzjwAh96ZA4vS"
    SKUS_TABLE    = "tblC9Tu69BEOIy6Q4"

    # Field IDs — Clients
    F_CLIENT_NAME              = "fldPDaLYrBzgd7UeH"
    F_CLIENT_JOB_CODE_PREFIX   = "fldMycolmfMPd2URa"
    F_CLIENT_GTIN_LENGTH       = "flduyn6PNava5wNUX"
    F_CLIENT_CF_STYLE_GUIDE    = "fld65cAsTYvB0aUDP"
    F_CLIENT_DELIVERY_PLATFORM = "fldkLeYO9iTFcIkim"

    # Field IDs — Jobs
    F_JOB_NAME            = "fldJ7jGXuU5O5HbXO"
    F_JOB_CLIENT          = "fldrU6lN2EJ5suawK"
    F_JOB_SGS_JOB_NUM     = "fldE1JZrdsAgrkxPt"
    F_JOB_CLIENT_BATCH_ID = "fldGN52XjmW1Hk4pM"
    F_JOB_PERIOD          = "fld89iGOcHvUhqvq1"
    F_JOB_DEADLINE        = "fldnOcRSw5w4F9QBH"
    F_JOB_STATUS          = "fldAQYGVZ1DGWK5et"
    F_JOB_CF_JOB_ID       = "fldGJUUCLcj7nHRz1"

    # Field IDs — SKUs
    F_SKU_NAME           = "fld96N7hMpncFfXhJ"
    F_SKU_JOB            = "fldTkQ5R14otWYKfb"
    F_SKU_GTIN_UPC       = "fldN2Teu3TDxqMDzx"
    F_SKU_BRAND          = "fldrb2JaNvtNmL7S5"
    F_SKU_VENDOR         = "fldnok3l1TUpBhoPv"
    F_SKU_OUTPUT_TYPE    = "fldQBxwewvqYrxzDI"
    F_SKU_MASTER_VARIANT = "fldkenv3gFLizbpyu"
    F_SKU_PICKUP_JOB_NUM = "fldiSiaLXDPTGmZAW"
    F_SKU_SPECIAL_INSTR  = "fldxUE4VQU1vPI1Gv"
    F_SKU_MERCH_VERIFIED = "fldCAM9d4Btzlu4pe"
    F_SKU_SHOOT_DATE     = "fldH2VMN1mpJWS6GX"
    F_SKU_STATUS         = "fldIBIo4rw2Qhm444"
    F_SKU_CF_PRODUCT_ID  = "fld2SzRZrHQOMnLXg"

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
