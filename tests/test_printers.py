import sys
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from config import Config as C  # noqa: E402
from routes import _active_printers, _printer_for_user, _shape_printer  # noqa: E402


def printer(record_id, name, host="10.1.129.39", active=True, default=False, port=None):
    fields = {
        C.F_PRINTER_NAME: name,
        C.F_PRINTER_HOST: host,
        C.F_PRINTER_ACTIVE: active,
        C.F_PRINTER_DEFAULT: default,
    }
    if port is not None:
        fields[C.F_PRINTER_PORT] = port
    return {"id": record_id, "fields": fields}


class PrinterShapeTests(unittest.TestCase):
    def test_port_defaults_to_the_raw_print_port(self):
        self.assertEqual(_shape_printer(printer("rec1", "Dock"))["port"], 9100)
        self.assertEqual(_shape_printer(printer("rec1", "Dock", port=6101))["port"], 6101)

    def test_an_unreadable_port_falls_back_rather_than_failing(self):
        record = printer("rec1", "Dock")
        record["fields"][C.F_PRINTER_PORT] = "nine thousand"
        self.assertEqual(_shape_printer(record)["port"], 9100)


class ActivePrinterTests(unittest.TestCase):
    def test_only_printers_that_can_be_printed_to_are_offered(self):
        records = [
            printer("recOff", "Retired", active=False),
            printer("recNoHost", "Unconfigured", host=""),
            printer("recGood", "Dock"),
        ]
        with patch("routes._list_all_records", return_value=records):
            self.assertEqual([p["id"] for p in _active_printers()], ["recGood"])

    def test_the_default_is_listed_first(self):
        records = [
            printer("recA", "Attic"),
            printer("recB", "Basement", default=True),
        ]
        with patch("routes._list_all_records", return_value=records):
            self.assertEqual([p["id"] for p in _active_printers()], ["recB", "recA"])


class PrinterChoiceTests(unittest.TestCase):
    def records(self):
        return [printer("recDefault", "Dock", default=True), printer("recUpstairs", "Upstairs")]

    def test_an_explicit_choice_wins(self):
        with patch("routes._list_all_records", return_value=self.records()):
            chosen = _printer_for_user(None, requested_id="recUpstairs")
        self.assertEqual(chosen["id"], "recUpstairs")

    def test_otherwise_the_person_gets_the_one_they_last_used(self):
        user = {"fields": {C.F_USER_PRINTER_ID: "recUpstairs"}}
        with patch("routes._list_all_records", return_value=self.records()):
            self.assertEqual(_printer_for_user(user)["id"], "recUpstairs")

    def test_a_remembered_printer_that_is_gone_falls_back_to_the_default(self):
        # A printer can be retired between prints; that must not break printing.
        user = {"fields": {C.F_USER_PRINTER_ID: "recRetired"}}
        with patch("routes._list_all_records", return_value=self.records()):
            self.assertEqual(_printer_for_user(user)["id"], "recDefault")

    def test_no_printers_is_reported_rather_than_guessed(self):
        with patch("routes._list_all_records", return_value=[]):
            self.assertIsNone(_printer_for_user(None))


class OneDefaultTests(unittest.TestCase):
    def test_setting_a_default_clears_the_others(self):
        # Two defaults and nobody can say where a tag went.
        from unittest.mock import call, patch

        import routes

        records = [
            {"id": "recA", "fields": {C.F_PRINTER_NAME: "A", C.F_PRINTER_DEFAULT: True}},
            {"id": "recB", "fields": {C.F_PRINTER_NAME: "B", C.F_PRINTER_DEFAULT: True}},
            {"id": "recKeep", "fields": {C.F_PRINTER_NAME: "Keep", C.F_PRINTER_DEFAULT: True}},
        ]
        with patch("routes._list_all_records", return_value=records), \
             patch("routes.airtable.update_record") as update:
            routes._clear_other_defaults("recKeep")

        cleared = [c.args[1] for c in update.call_args_list]
        self.assertEqual(sorted(cleared), ["recA", "recB"])
        for c in update.call_args_list:
            self.assertEqual(c.args[2], {C.F_PRINTER_DEFAULT: False})
