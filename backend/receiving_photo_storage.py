import io
import os
import re
from datetime import datetime, timezone
from pathlib import Path

from werkzeug.utils import secure_filename


ACCEPTED_IMAGE_MIME_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}
DEFAULT_MAX_BYTES = 12 * 1024 * 1024


class ReceivingPhotoStorageError(Exception):
    pass


class ReceivingPhotoConfigError(ReceivingPhotoStorageError):
    pass


class ReceivingPhotoValidationError(ReceivingPhotoStorageError):
    pass


class ReceivingPhotoCollisionError(ReceivingPhotoStorageError):
    pass


def _utc_now():
    return datetime.now(timezone.utc)


def _safe_metadata_value(value):
    return re.sub(r"[\r\n]+", " ", str(value or "")).strip()[:512]


def sanitize_filename(filename):
    name = secure_filename(os.path.basename(filename or "receiving-photo"))
    if not name:
        name = "receiving-photo"
    stem, ext = os.path.splitext(name)
    stem = re.sub(r"[^A-Za-z0-9_.-]+", "-", stem).strip(".-_") or "receiving-photo"
    ext = re.sub(r"[^A-Za-z0-9]+", "", ext).lower()
    return stem[:80], ext


def sanitize_path_segment(value, fallback="unnamed"):
    segment = re.sub(r"[^A-Za-z0-9_.-]+", "-", str(value or "")).strip(".-_")
    segment = re.sub(r"-{2,}", "-", segment)
    return (segment or fallback)[:96]


def _detect_mime(data):
    if data.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "image/webp"
    if len(data) >= 12 and data[4:8] == b"ftyp" and data[8:12] in {b"heic", b"heix", b"hevc", b"hevx", b"mif1", b"msf1"}:
        return "image/heic"
    return ""


def _assert_image_decodable(data, mime_type):
    if mime_type in {"image/heic", "image/heif"}:
        return
    try:
        from PIL import Image
    except ImportError:
        return
    try:
        with Image.open(io.BytesIO(data)) as image:
            image.verify()
    except Exception as exc:
        raise ReceivingPhotoValidationError("Malformed image file.") from exc


def _convert_heic_to_jpeg(data):
    try:
        from PIL import ImageOps
        import pillow_heif
    except ImportError as exc:
        raise ReceivingPhotoValidationError("HEIC/HEIF uploads require Pillow and pillow-heif support.") from exc
    try:
        heif_file = pillow_heif.read_heif(data)
        image = heif_file.to_pillow()
        image = ImageOps.exif_transpose(image)
        if image.mode not in {"RGB", "L"}:
            image = image.convert("RGB")
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=92, optimize=True)
        return output.getvalue()
    except Exception as exc:
        raise ReceivingPhotoValidationError("Malformed HEIC/HEIF image file.") from exc


def _conditional_put_unsupported(error):
    error_type = type(error).__name__
    if error_type == "ParamValidationError" and "IfNoneMatch" in str(error):
        return True
    response = getattr(error, "response", None)
    if not isinstance(response, dict):
        return False
    code = str((response.get("Error") or {}).get("Code") or "")
    return code in {"InvalidArgument", "NotImplemented", "NotSupported", "XNotImplemented"}


class ReceivingPhotoStorage:
    def __init__(self, config, local_dir=None, s3_client=None, now_func=None):
        self.config = config
        self.mode = (getattr(config, "RECEIVING_PHOTO_STORAGE", "local") or "local").lower()
        self.local_dir = Path(local_dir or getattr(config, "RECEIVING_PHOTO_LOCAL_DIR", "uploads/receiving"))
        self.s3_client = s3_client
        self.now_func = now_func or _utc_now
        self.max_bytes = int(getattr(config, "RECEIVING_PHOTO_MAX_BYTES", DEFAULT_MAX_BYTES) or DEFAULT_MAX_BYTES)

    def validate_configuration(self):
        if self.mode not in {"r2", "local"}:
            raise ReceivingPhotoConfigError("RECEIVING_PHOTO_STORAGE must be either r2 or local.")
        if self.mode == "local":
            return
        missing = [
            name for name in (
                "R2_ACCOUNT_ID",
                "R2_ACCESS_KEY_ID",
                "R2_SECRET_ACCESS_KEY",
                "R2_BUCKET_NAME",
                "R2_PUBLIC_BASE_URL",
            )
            if not getattr(self.config, name, "")
        ]
        if missing:
            raise ReceivingPhotoConfigError(f"Missing R2 configuration: {', '.join(missing)}.")

    def public_url(self, object_key):
        base_url = (getattr(self.config, "R2_PUBLIC_BASE_URL", "") or "").rstrip("/")
        if self.mode == "local":
            base_url = base_url or "/api/receiving/photos"
        return f"{base_url}/{object_key}"

    def object_key(self, delivery_folder, sequence_number, extension):
        folder = sanitize_path_segment(delivery_folder, "Unknown")
        number = int(sequence_number)
        ext = re.sub(r"[^A-Za-z0-9]+", "", str(extension or "jpg")).lower() or "jpg"
        stored_filename = f"{folder}-{number}.{ext}"
        return f"receiving/{folder}/{stored_filename}", stored_filename

    def upload_photo(self, file_storage, receipt_id, receipt_entry_id, *, delivery_folder="Unknown", sequence_number=1, existing_keys=None):
        self.validate_configuration()
        original_filename = file_storage.filename or "receiving-photo"
        data = file_storage.read()
        if not data:
            raise ReceivingPhotoValidationError("Photo file is empty.")
        if len(data) > self.max_bytes:
            raise ReceivingPhotoValidationError("Photo file is too large.")
        mime_type = _detect_mime(data)
        if mime_type not in ACCEPTED_IMAGE_MIME_TYPES:
            raise ReceivingPhotoValidationError("Unsupported photo type.")
        if mime_type in {"image/heic", "image/heif"}:
            data = _convert_heic_to_jpeg(data)
            mime_type = "image/jpeg"
            extension = "jpg"
        else:
            _assert_image_decodable(data, mime_type)
            extension = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}[mime_type]
        uploaded_at = self.now_func().isoformat(timespec="seconds").replace("+00:00", "Z")
        metadata = {
            "original-filename": _safe_metadata_value(original_filename),
            "receipt-id": _safe_metadata_value(receipt_id),
            "receipt-entry-id": _safe_metadata_value(receipt_entry_id),
            "uploaded-at": uploaded_at,
        }
        existing = set(existing_keys or [])
        next_number = max(1, int(sequence_number or 1))
        for _ in range(1000):
            object_key, stored_filename = self.object_key(delivery_folder, next_number, extension)
            if object_key in existing or self.object_exists(object_key):
                next_number += 1
                continue
            try:
                self._put_object(object_key, data, mime_type, metadata)
            except ReceivingPhotoCollisionError:
                existing.add(object_key)
                next_number += 1
                continue
            except Exception as exc:
                raise ReceivingPhotoStorageError("Photo could not be uploaded.") from exc
            return {
                "object_key": object_key,
                "public_url": self.public_url(object_key),
                "url": self.public_url(object_key),
                "original_filename": original_filename,
                "filename": original_filename,
                "stored_filename": stored_filename,
                "mime_type": mime_type,
                "size_bytes": len(data),
                "uploaded_at": uploaded_at,
            }
        raise ReceivingPhotoStorageError("Photo could not be uploaded without overwriting an existing object.")

    def delete_photo(self, object_key):
        self.validate_configuration()
        if not object_key or ".." in object_key or object_key.startswith("/"):
            raise ReceivingPhotoValidationError("Invalid photo object key.")
        if self.mode == "local":
            path = (self.local_dir / object_key).resolve()
            if self.local_dir.resolve() not in path.parents:
                raise ReceivingPhotoValidationError("Invalid photo object key.")
            if path.exists():
                path.unlink()
            return {"deleted": True, "object_key": object_key}
        self._client().delete_object(Bucket=self.config.R2_BUCKET_NAME, Key=object_key)
        return {"deleted": True, "object_key": object_key}

    def list_object_keys(self, prefix):
        self.validate_configuration()
        prefix = str(prefix or "")
        if not prefix or ".." in prefix or prefix.startswith("/"):
            raise ReceivingPhotoValidationError("Invalid photo object prefix.")
        if self.mode == "local":
            base = (self.local_dir / prefix).resolve()
            if self.local_dir.resolve() not in base.parents and base != self.local_dir.resolve():
                raise ReceivingPhotoValidationError("Invalid photo object prefix.")
            if not base.exists():
                return []
            return sorted(str(path.relative_to(self.local_dir)) for path in base.rglob("*") if path.is_file())

        client = self._client()
        keys = []
        paginator = getattr(client, "get_paginator", None)
        if paginator:
            for page in client.get_paginator("list_objects_v2").paginate(Bucket=self.config.R2_BUCKET_NAME, Prefix=prefix):
                keys.extend(item.get("Key") for item in page.get("Contents", []) if item.get("Key"))
            return sorted(keys)
        response = client.list_objects_v2(Bucket=self.config.R2_BUCKET_NAME, Prefix=prefix)
        return sorted(item.get("Key") for item in response.get("Contents", []) if item.get("Key"))

    def delete_prefix(self, prefix):
        keys = self.list_object_keys(prefix)
        deleted = []
        for key in keys:
            self.delete_photo(key)
            deleted.append(key)
        return deleted

    def object_exists(self, object_key):
        if not object_key:
            return False
        if self.mode == "local":
            return (self.local_dir / object_key).exists()
        try:
            self._client().head_object(Bucket=self.config.R2_BUCKET_NAME, Key=object_key)
            return True
        except Exception as exc:
            code = ""
            response = getattr(exc, "response", None)
            if isinstance(response, dict):
                code = str((response.get("Error") or {}).get("Code") or "")
            if code in {"404", "NoSuchKey", "NotFound"}:
                return False
            return False

    def _put_object(self, object_key, data, mime_type, metadata):
        if self.mode == "local":
            path = self.local_dir / object_key
            path.parent.mkdir(parents=True, exist_ok=True)
            if path.exists():
                raise ReceivingPhotoCollisionError("Photo object already exists.")
            path.write_bytes(data)
            return
        try:
            self._client().put_object(
                Bucket=self.config.R2_BUCKET_NAME,
                Key=object_key,
                Body=data,
                ContentType=mime_type,
                Metadata=metadata,
                IfNoneMatch="*",
            )
        except TypeError:
            if self.object_exists(object_key):
                raise ReceivingPhotoCollisionError("Photo object already exists.")
            self._client().put_object(
                Bucket=self.config.R2_BUCKET_NAME,
                Key=object_key,
                Body=data,
                ContentType=mime_type,
                Metadata=metadata,
            )
        except Exception as exc:
            code = ""
            response = getattr(exc, "response", None)
            if isinstance(response, dict):
                code = str((response.get("Error") or {}).get("Code") or "")
            if code in {"PreconditionFailed", "412"}:
                raise ReceivingPhotoCollisionError("Photo object already exists.") from exc
            if _conditional_put_unsupported(exc):
                if self.object_exists(object_key):
                    raise ReceivingPhotoCollisionError("Photo object already exists.") from exc
                self._client().put_object(
                    Bucket=self.config.R2_BUCKET_NAME,
                    Key=object_key,
                    Body=data,
                    ContentType=mime_type,
                    Metadata=metadata,
                )
                return
            raise

    def _client(self):
        if self.s3_client is not None:
            return self.s3_client
        try:
            import boto3
            from botocore.config import Config as BotoConfig
        except ImportError as exc:
            raise ReceivingPhotoConfigError("R2 storage requires boto3 and botocore.") from exc
        self.s3_client = boto3.client(
            "s3",
            endpoint_url=f"https://{self.config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=self.config.R2_ACCESS_KEY_ID,
            aws_secret_access_key=self.config.R2_SECRET_ACCESS_KEY,
            config=BotoConfig(signature_version="s3v4"),
            region_name="auto",
        )
        return self.s3_client
