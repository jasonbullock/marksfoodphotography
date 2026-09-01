import sys
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "backend"))

import routes  # noqa: E402
import tag_print  # noqa: E402
from config import Config as C  # noqa: E402


PRINTER = {"id": "recPrn", "name": "Receiving ZD621", "host": "10.1.129.39", "port": 9100}


class SendOrQueueTests(unittest.TestCase):
    def test_a_reachable_printer_is_used_directly(self):
        # On the studio network the label should go straight out, not sit in a queue
        # waiting for an agent to notice it.
        with patch("routes.tag_print.send_zpl") as send, \
                patch("routes._queue_print_job") as queue:
            result = routes._send_or_queue("^XA^XZ", PRINTER)
        send.assert_called_once()
        queue.assert_not_called()
        self.assertTrue(result["printed"])
        self.assertFalse(result["queued"])

    def test_an_unreachable_printer_queues_the_label(self):
        # Which is the whole point: the cloud API cannot reach a private address.
        with patch("routes.tag_print.send_zpl", side_effect=tag_print.TagPrintError("nope")), \
                patch("routes._queue_print_job", return_value={"id": "recJob"}) as queue:
            result = routes._send_or_queue("^XA^XZ", PRINTER, label="MP-00017")
        queue.assert_called_once()
        self.assertFalse(result["printed"])
        self.assertTrue(result["queued"])
        self.assertEqual(result["jobId"], "recJob")

    def test_the_queued_job_carries_where_it_should_go(self):
        # The agent works from the job, not from the printer table, so a printer
        # renamed or readdressed later cannot redirect a label already queued.
        with patch("routes.airtable.create_record", return_value={"id": "recJob"}) as create:
            routes._queue_print_job("^XA^XZ", PRINTER, label="MP-00017", requested_by="Jason")
        fields = create.call_args[0][1]
        self.assertEqual(fields[C.F_PRINT_JOB_PRINTER_HOST], "10.1.129.39")
        self.assertEqual(fields[C.F_PRINT_JOB_PRINTER_PORT], 9100)
        self.assertEqual(fields[C.F_PRINT_JOB_STATUS], "Queued")
        self.assertEqual(fields[C.F_PRINT_JOB_LABEL], "MP-00017")


def job(status, claimed_at=None, host="10.1.129.39", requested="2026-08-31T10:00:00Z"):
    return {"id": "rec" + status + str(requested), "fields": {
        C.F_PRINT_JOB_STATUS: status,
        C.F_PRINT_JOB_CLAIMED_AT: claimed_at,
        C.F_PRINT_JOB_PRINTER_HOST: host,
        C.F_PRINT_JOB_REQUESTED_AT: requested,
        C.F_PRINT_JOB_ZPL: "^XA^XZ",
    }}


class ClaimableTests(unittest.TestCase):
    def test_a_queued_job_is_claimable(self):
        self.assertTrue(routes._print_job_is_claimable(job("Queued")["fields"]))

    def test_a_job_another_agent_just_took_is_not(self):
        recent = datetime.now(timezone.utc).isoformat()
        self.assertFalse(routes._print_job_is_claimable(job("Printing", recent)["fields"]))

    def test_a_job_an_agent_died_holding_is_released(self):
        stale = (datetime.now(timezone.utc) - timedelta(seconds=C.PRINT_JOB_CLAIM_SECONDS + 60)).isoformat()
        self.assertTrue(routes._print_job_is_claimable(job("Printing", stale)["fields"]))

    def test_a_finished_job_is_never_claimed_again(self):
        for status in ("Printed", "Failed"):
            self.assertFalse(routes._print_job_is_claimable(job(status)["fields"]))

    def test_an_unreadable_claim_time_does_not_strand_the_label(self):
        self.assertTrue(routes._print_job_is_claimable(job("Printing", "not a date")["fields"]))


class AgentAuthTests(unittest.TestCase):
    def setUp(self):
        self.client = __import__("app").app.test_client()

    def test_an_agent_without_the_key_is_refused(self):
        with patch.object(C, "PRINT_AGENT_KEY", "s3cret"):
            response = self.client.post("/api/print-jobs/claim", json={})
        self.assertEqual(response.status_code, 401)

    def test_a_wrong_key_is_refused(self):
        with patch.object(C, "PRINT_AGENT_KEY", "s3cret"):
            response = self.client.post(
                "/api/print-jobs/claim", json={}, headers={"X-Print-Agent-Key": "guess"})
        self.assertEqual(response.status_code, 401)

    def test_no_key_configured_means_no_agent_can_claim_anything(self):
        # Rather than defaulting open, which would leave every queued label - and
        # the addresses of the studio printers - readable to anyone.
        with patch.object(C, "PRINT_AGENT_KEY", ""):
            response = self.client.post(
                "/api/print-jobs/claim", json={}, headers={"X-Print-Agent-Key": ""})
        self.assertEqual(response.status_code, 503)


class ClaimTests(unittest.TestCase):
    def setUp(self):
        self.client = __import__("app").app.test_client()
        self.headers = {"X-Print-Agent-Key": "s3cret", "X-Print-Agent-Name": "receiving-mac"}

    def claim(self, jobs, body=None):
        with patch.object(C, "PRINT_AGENT_KEY", "s3cret"), \
                patch("routes._list_all_records", return_value=jobs), \
                patch("routes.airtable.update_record", return_value={}) as update:
            response = self.client.post("/api/print-jobs/claim", json=body or {}, headers=self.headers)
        return response.get_json(), update

    def test_the_oldest_label_goes_first(self):
        body, _ = self.claim([
            job("Queued", requested="2026-08-31T11:00:00Z"),
            job("Queued", requested="2026-08-31T09:00:00Z"),
        ])
        self.assertEqual(body["job"]["id"], job("Queued", requested="2026-08-31T09:00:00Z")["id"])

    def test_an_agent_only_takes_work_for_printers_it_can_reach(self):
        # Two studios on one account would otherwise steal each other's labels.
        body, _ = self.claim(
            [job("Queued", host="10.9.9.9")],
            {"hosts": ["10.1.129.39"]},
        )
        self.assertIsNone(body["job"])

    def test_claiming_marks_the_job_so_no_one_else_takes_it(self):
        _, update = self.claim([job("Queued")])
        fields = update.call_args[0][2]
        self.assertEqual(fields[C.F_PRINT_JOB_STATUS], "Printing")
        self.assertEqual(fields[C.F_PRINT_JOB_AGENT], "receiving-mac")

    def test_an_empty_queue_is_not_an_error(self):
        body, _ = self.claim([])
        self.assertIsNone(body["job"])


class PublicEndpointTests(unittest.TestCase):
    def test_the_agent_endpoints_do_not_need_a_session(self):
        # There is no person behind the agent; it proves itself with a key instead.
        self.assertIn("api.claim_print_job", routes.PUBLIC_ENDPOINTS)
        self.assertIn("api.finish_print_job", routes.PUBLIC_ENDPOINTS)


class AgentScriptTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "tools" / "print_agent.py").read_text()

    def test_it_refuses_to_run_without_a_key(self):
        self.assertIn("PRINT_AGENT_KEY is not set", self.source)

    def test_it_reports_a_failed_print_rather_than_dropping_it(self):
        self.assertIn('"ok": False', self.source)

    def test_it_survives_the_api_being_down(self):
        # It is meant to be started once and left alone.
        self.assertIn("cannot reach the api", self.source)

    def test_it_only_makes_outbound_calls(self):
        # No listening socket means no firewall change on the studio machine.
        self.assertNotIn("socket.bind", self.source)
        self.assertNotIn("HTTPServer", self.source)


if __name__ == "__main__":
    unittest.main()


class PrintOutcomeWordingTests(unittest.TestCase):
    """Three print buttons, one truthful phrasing."""

    @classmethod
    def setUpClass(cls):
        cls.source = (ROOT / "frontend" / "src" / "App.jsx").read_text()

    def test_a_queued_label_is_not_reported_as_printed(self):
        self.assertIn("function tagPrintOutcome(result) {", self.source)
        self.assertIn("queued for ${printer}", self.source)

    def test_every_print_button_uses_it(self):
        # The definition plus one call from each of the three print buttons.
        self.assertEqual(self.source.count("tagPrintOutcome(result)"), 4)
