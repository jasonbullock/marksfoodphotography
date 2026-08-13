import sys
import unittest
from pathlib import Path


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from routes import evaluate_required_to_shoot, _validate_identifier_value  # noqa: E402


class RequiredToShootTests(unittest.TestCase):
    def client(self, **overrides):
        base = {
            "identifierLabel": "UPC",
            "codeType": "UPC-12",
            "requiredToShoot": ["Identifier", "Product Name"],
            "artworkRequirement": "Optional",
            "merchandiseRequired": True,
        }
        base.update(overrides)
        return base

    def item(self, **overrides):
        base = {
            "identifier": "012345678901",
            "productId": "012345678901",
            "product": "Whole Milk",
            "brand": "Kroger",
            "received": True,
            "receiptIds": ["recReceipt"],
            "artworkReceived": False,
            "status": "New",
        }
        base.update(overrides)
        return base

    def test_identifier_formats(self):
        self.assertEqual(_validate_identifier_value("012345678901", "UPC-12", "UPC"), "")
        self.assertEqual(_validate_identifier_value("00012345678901", "GTIN-14", "GTIN"), "")
        self.assertEqual(_validate_identifier_value("1234567890123", "GTIN-13", "GTIN"), "")
        self.assertEqual(_validate_identifier_value("123456789012", "GTIN-12", "GTIN"), "")
        self.assertEqual(_validate_identifier_value("12345678", "GTIN-8", "GTIN"), "")
        self.assertEqual(_validate_identifier_value("00123", "Numeric", "Identifier"), "")
        self.assertEqual(_validate_identifier_value("GAR-5001", "Text", "GAR"), "")
        self.assertEqual(_validate_identifier_value("123", "UPC-12", "UPC"), "")
        self.assertEqual(_validate_identifier_value("NO UPC", "UPC-12", "UPC"), "")

    def test_leading_zero_is_preserved_and_valid(self):
        item = self.item(productId="012345678901", identifier="012345678901")
        result = evaluate_required_to_shoot(item, self.client(), [])
        self.assertEqual(item["productId"], "012345678901")
        self.assertEqual(result["state"], "ready_for_photo")

    def test_required_field_evaluation_uses_client_label(self):
        result = evaluate_required_to_shoot(self.item(productId="", identifier=""), self.client(identifierLabel="UPC"), [])
        self.assertEqual(result["state"], "missing_data")
        self.assertIn("UPC is required.", result["missing"])

    def test_artwork_requirement_states(self):
        required = evaluate_required_to_shoot(self.item(artworkReceived=False), self.client(artworkRequirement="Required"), [])
        self.assertEqual(required["state"], "missing_artwork")

        optional = evaluate_required_to_shoot(self.item(artworkReceived=False), self.client(artworkRequirement="Optional"), [])
        self.assertEqual(optional["state"], "ready_for_photo")
        self.assertTrue(optional["warnings"])

        not_needed = evaluate_required_to_shoot(self.item(artworkReceived=False), self.client(artworkRequirement="Not Needed"), [])
        self.assertEqual(not_needed["state"], "ready_for_photo")
        self.assertFalse(not_needed["warnings"])

    def test_missing_unidentified_and_valid_merchandise(self):
        missing = evaluate_required_to_shoot(self.item(received=False, receiptIds=[]), self.client(), [])
        self.assertEqual(missing["state"], "waiting_for_merchandise")

        unidentified = evaluate_required_to_shoot(self.item(productId="", identifier="", received=True), self.client(), [])
        self.assertEqual(unidentified["state"], "missing_data")

        logged_only = evaluate_required_to_shoot(self.item(received=False, receiptIds=["recReceipt"]), self.client(), [])
        self.assertEqual(logged_only["state"], "waiting_for_merchandise")

        valid = evaluate_required_to_shoot(self.item(received=True, receiptIds=["recReceipt"]), self.client(), [])
        self.assertEqual(valid["state"], "ready_for_photo")

    def test_blocking_and_resolved_merchandise_issues(self):
        issue = {"type": "Damaged", "status": "Open"}
        blocked = evaluate_required_to_shoot(self.item(), self.client(), [issue])
        self.assertEqual(blocked["state"], "merchandise_issue")

        resolved = evaluate_required_to_shoot(self.item(), self.client(), [{**issue, "status": "Resolved"}])
        self.assertEqual(resolved["state"], "ready_for_photo")

    def test_completed_items_do_not_move_backward(self):
        result = evaluate_required_to_shoot(
            self.item(status="Complete", productId="", identifier="", received=False, receiptIds=[]),
            self.client(artworkRequirement="Required"),
            [{"type": "Damaged", "status": "Open"}],
        )
        self.assertEqual(result["state"], "ready_for_photo")
        self.assertTrue(result["ready"])


if __name__ == "__main__":
    unittest.main()
