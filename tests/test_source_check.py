import sys
import unittest
import json
from pathlib import Path
from unittest.mock import patch


sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "backend"))

from app import create_app  # noqa: E402
from config import Config as C  # noqa: E402
from routes import AUTH_SESSION_KEY, TOPCO_READINESS_PROFILE  # noqa: E402


class SourceCheckTests(unittest.TestCase):
    def setUp(self):
        self.app = create_app().test_client()
        with self.app.session_transaction() as session:
            session[AUTH_SESSION_KEY] = {
                "id": "recTestUser",
                "name": "Test User",
                "role": "Admin",
                "active": True,
                "clientIds": [],
                "allClients": True,
            }

    @staticmethod
    def product(record_id, name, upc, fields=None):
        base = {
            C.F_ITEM_NAME: name,
            C.F_ITEM_CLIENT: ["recTopco"],
            C.F_ITEM_IDENTIFIER: upc,
            C.F_ITEM_UPC: upc,
            C.F_ITEM_REQUEST_TYPE: "",
        }
        base.update(fields or {})
        return {"id": record_id, "fields": base}

    @staticmethod
    def shipment(record_id="recShipment", client_id="recTopco"):
        return {
            "id": record_id,
            "fields": {
                C.F_RECEIPT_CLIENT: [client_id],
                C.F_RECEIPT_NAME: "Shipment 1",
                C.F_RECEIPT_RECEIVED: "2026-08-18T12:00:00Z",
            },
        }

    @staticmethod
    def merchandise(record_id="recMerch", product_id=None):
        fields = {
            C.F_RECEIPT_ENTRY_NAME: "Lookup Item",
            C.F_RECEIPT_ENTRY_SKU_ID: "100000000031",
            C.F_RECEIPT_ENTRY_RECEIPT: ["recShipment"],
            C.F_RECEIPT_ENTRY_QUANTITY: 1,
            C.F_RECEIPT_ENTRY_MERCH_STATUS: "Received",
        }
        if product_id:
            fields[C.F_RECEIPT_ENTRY_ITEM] = [product_id]
        return {"id": record_id, "fields": fields}

    @staticmethod
    def fake_response(csv_text):
        class FakeResponse:
            text = csv_text

            def raise_for_status(self):
                return None

        return FakeResponse()

    def test_topco_source_check_rules_cover_expected_work_and_required_fields(self):
        rules = TOPCO_READINESS_PROFILE["sourceCheckRules"]

        self.assertEqual(rules["sourceIdentityFields"], ["productName", "upc"])
        self.assertEqual(rules["activationField"], "requestType")
        self.assertEqual(rules["requiredToProceed"]["Packaging"], ["productName", "upc", "jobNumber"])
        self.assertEqual(rules["requiredToProceed"]["Ecomm"], ["productName", "upc", "cvid"])

        mappings = rules["requestTypeMappings"]
        expected = {
            "ecomm only": (["Ecomm"], []),
            "pack only": (["Packaging"], []),
            "ecomm and pack": (["Ecomm", "Packaging"], []),
            "pack and thr3d": (["Packaging"], ["Thr3d"]),
        }
        for request_type, (deliverables, shipment_context) in expected.items():
            self.assertEqual(mappings[request_type]["requiredDeliverables"], deliverables)
            self.assertEqual(mappings[request_type].get("shipmentContext", []), shipment_context)

        for request_type in ["thr3d only", "not needed"]:
            self.assertEqual(mappings[request_type]["requiredDeliverables"], [])
            self.assertTrue(mappings[request_type]["noWalnutWorkExpected"])
            self.assertTrue(mappings[request_type]["alertIfReceived"])

        self.assertNotIn("mystery request", mappings)

    @patch("routes.airtable.create_record")
    @patch("routes.airtable.update_record")
    @patch("routes._clients_by_id")
    @patch("routes._list_all_records")
    @patch("routes.requests.get")
    def test_topco_source_check_reads_fixture_rows_without_writes(
        self,
        requests_get,
        list_all_records,
        clients_by_id,
        update_record,
        create_record,
    ):
        csv_text = "\n".join([
            "Product Name,CVID,UPC,Brand Prefix,Request Type,WKFT #,Mbox #,Product Type,Prod Descrip,Link to Prepro/Overlays,Path to Art,Photo Notes,Vendor",
            "Ecomm Item,CVID-E,100000000001,TOP,Ecomm Only,JOB-E,MBOX-E,Shelf Stable,Ecomm desc,prepro,path,note,ignored vendor",
            "Pack Item,CVID-P,100000000002,TOP,Pack Only,JOB-P,MBOX-P,Shelf Stable,Pack desc,prepro,path,note,ignored vendor",
            "Combo Item,CVID-C,100000000003,TOP,Ecomm & Pack,JOB-C,MBOX-C,Shelf Stable,Combo desc,prepro,path,note,ignored vendor",
            "Pack Thr3d Item,CVID-T,100000000004,TOP,Pack & Thr3d,JOB-T,MBOX-T,Shelf Stable,Pack Thr3d desc,prepro,path,note,ignored vendor",
            "Thr3d Item,CVID-3,100000000005,TOP,Thr3d Only,JOB-3,MBOX-3,Shelf Stable,Thr3d desc,prepro,path,note,ignored vendor",
            "Not Needed Item,CVID-N,100000000006,TOP,Not Needed,JOB-N,MBOX-N,Shelf Stable,Not Needed desc,prepro,path,note,ignored vendor",
            "Missing UPC Item,CVID-U,,TOP,Ecomm Only,JOB-U,MBOX-U,Shelf Stable,Missing UPC desc,prepro,path,note,ignored vendor",
            "Missing Job Item,CVID-J,100000000008,TOP,Pack Only,,MBOX-J,Shelf Stable,Missing Job desc,prepro,path,note,ignored vendor",
            "Missing CVID Item,,100000000009,TOP,Ecomm Only,JOB-CVID,MBOX-CVID,Shelf Stable,Missing CVID desc,prepro,path,note,ignored vendor",
            "Unknown Request Item,CVID-X,100000000010,TOP,Mystery Request,JOB-X,MBOX-X,Shelf Stable,Unknown desc,prepro,path,note,ignored vendor",
        ])

        class FakeResponse:
            text = csv_text

            def raise_for_status(self):
                return None

        requests_get.return_value = FakeResponse()
        clients_by_id.return_value = {
            "recTopco": {
                "id": "recTopco",
                "name": "Topco",
                "codeType": "",
                "primaryMatchKeyLabel": "UPC",
            }
        }
        list_all_records.return_value = [
            self.product("recEcomm", "Ecomm Item", "100000000001", {C.F_ITEM_CVID: "CVID-E"}),
            self.product("recPack", "Pack Item", "100000000002", {C.F_ITEM_WKFT_JOB_NUMBER: "JOB-P"}),
            self.product("recCombo", "Combo Item", "100000000003", {C.F_ITEM_CVID: "CVID-C", C.F_ITEM_WKFT_JOB_NUMBER: "JOB-C"}),
            self.product("recPackThr3d", "Pack Thr3d Item", "100000000004", {C.F_ITEM_WKFT_JOB_NUMBER: "JOB-T"}),
            self.product("recThr3d", "Thr3d Item", "100000000005"),
            self.product("recNotNeeded", "Not Needed Item", "100000000006"),
            self.product("recMissingUpc", "Missing UPC Item", "", {C.F_ITEM_CVID: "CVID-U"}),
            self.product("recMissingJob", "Missing Job Item", "100000000008"),
            self.product("recMissingCvid", "Missing CVID Item", "100000000009"),
            self.product("recUnknown", "Unknown Request Item", "100000000010"),
        ]

        response = self.app.get("/api/source-check/topco?limit=10")

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        rows = payload["rows"]
        self.assertEqual(len(rows), 10)
        self.assertEqual(payload["source"]["sheetName"], "Master Tracker 2026")
        self.assertIn("/export", requests_get.call_args.args[0])
        self.assertIn("format=csv", requests_get.call_args.args[0])

        by_name = {row["sourceData"]["Product Name"]: row for row in rows}
        self.assertEqual(by_name["Ecomm Item"]["sourceData"]["Request Type"], "Ecomm Only")
        self.assertEqual(by_name["Pack Item"]["sourceData"]["Request Type"], "Pack Only")
        self.assertEqual(by_name["Combo Item"]["sourceData"]["Request Type"], "Ecomm & Pack")
        self.assertEqual(by_name["Pack Thr3d Item"]["sourceData"]["Request Type"], "Pack & Thr3d")
        self.assertEqual(by_name["Thr3d Item"]["sourceData"]["Request Type"], "Thr3d Only")
        self.assertEqual(by_name["Not Needed Item"]["sourceData"]["Request Type"], "Not Needed")
        self.assertEqual(by_name["Unknown Request Item"]["sourceData"]["Request Type"], "Mystery Request")

        self.assertEqual(by_name["Missing UPC Item"]["sourceData"]["UPC"], "")
        self.assertEqual(by_name["Missing UPC Item"]["matchMethod"], "Product Name")
        self.assertEqual(by_name["Missing Job Item"]["sourceData"]["WKFT #"], "")
        self.assertEqual(by_name["Missing CVID Item"]["sourceData"]["CVID"], "")
        self.assertNotIn("Vendor", by_name["Ecomm Item"]["sourceData"])

        create_record.assert_not_called()
        update_record.assert_not_called()

    @patch("routes.airtable.create_record")
    @patch("routes.airtable.update_record")
    @patch("routes._client_record")
    @patch("routes.requests.get")
    def test_topco_source_suggestions_are_read_only(
        self,
        requests_get,
        client_record,
        update_record,
        create_record,
    ):
        requests_get.return_value = self.fake_response("\n".join([
            "Product Name,CVID,UPC,Brand Prefix,Request Type,WKFT #",
            "Lookup Item,CVID-S,100000000031,TOP,Ecomm Only,JOB-S",
            "Other Item,CVID-O,100000000099,TOP,Pack Only,JOB-O",
        ]))
        client_record.return_value = {
            "id": "recTopco",
            "fields": {C.F_CLIENT_NAME: "Topco"},
        }

        response = self.app.get(
            "/api/source-check/topco/suggestions?clientId=recTopco&productName=Lookup&upc=100000000031"
        )

        self.assertEqual(response.status_code, 200)
        records = response.get_json()["records"]
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["sourceData"]["Product Name"], "Lookup Item")
        self.assertEqual(records[0]["matchBasis"], "UPC + Product Name")
        create_record.assert_not_called()
        update_record.assert_not_called()

    @patch("routes.airtable.create_record")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.list_records")
    @patch("routes._client_record")
    @patch("routes.requests.get")
    def test_topco_source_suggestions_do_not_require_local_products(
        self,
        requests_get,
        client_record,
        list_records,
        update_record,
        create_record,
    ):
        requests_get.return_value = self.fake_response("\n".join([
            "Product Name,CVID,UPC,Brand Prefix,Request Type,WKFT #",
            "Lookup Item,CVID-S,100000000031,TOP,Ecomm Only,JOB-S",
        ]))
        client_record.return_value = {
            "id": "recTopco",
            "fields": {C.F_CLIENT_NAME: "Topco"},
        }
        list_records.return_value = {"records": []}

        response = self.app.get(
            "/api/source-check/topco/suggestions?clientId=recTopco&productName=Lookup&upc=100000000031"
        )

        self.assertEqual(response.status_code, 200)
        records = response.get_json()["records"]
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["sourceData"]["UPC"], "100000000031")
        list_records.assert_not_called()
        create_record.assert_not_called()
        update_record.assert_not_called()

    @patch("routes.airtable.create_record")
    @patch("routes.airtable.update_record")
    @patch("routes._client_record")
    @patch("routes.requests.get")
    def test_topco_source_suggestions_match_upc_digits_without_product_name(
        self,
        requests_get,
        client_record,
        update_record,
        create_record,
    ):
        requests_get.return_value = self.fake_response("\n".join([
            "Product Name,CVID,UPC,Brand Prefix,Request Type,WKFT #",
            "Topcare Toothbrush Deep Clean Soft,CVID-A,03680011565,TOP,Ecomm Only,JOB-A",
            "Other Item,CVID-B,100000000099,TOP,Pack Only,JOB-B",
        ]))
        client_record.return_value = {
            "id": "recTopco",
            "fields": {C.F_CLIENT_NAME: "Topco"},
        }

        response = self.app.get(
            "/api/source-check/topco/suggestions?clientId=recTopco&upc=680011"
        )

        self.assertEqual(response.status_code, 200)
        records = response.get_json()["records"]
        self.assertEqual(len(records), 1)
        self.assertEqual(records[0]["sourceData"]["Product Name"], "Topcare Toothbrush Deep Clean Soft")
        self.assertEqual(records[0]["matchBasis"], "UPC")
        create_record.assert_not_called()
        update_record.assert_not_called()

    @patch("routes.airtable.create_record")
    @patch("routes.airtable.update_record")
    @patch("routes._client_record")
    @patch("routes.requests.get")
    def test_topco_source_suggestions_rank_name_and_upc_combo_first(
        self,
        requests_get,
        client_record,
        update_record,
        create_record,
    ):
        requests_get.return_value = self.fake_response("\n".join([
            "Product Name,CVID,UPC,Brand Prefix,Request Type,WKFT #",
            "CT Parmesan Cheese 8oz,CVID-A,1122500491,TOP,Ecomm Only,JOB-A",
            "CT Asiago Cheese 8oz,CVID-B,1122500492,TOP,Ecomm Only,JOB-B",
            "Unrelated UPC Item,CVID-C,1122500491,TOP,Ecomm Only,JOB-C",
        ]))
        client_record.return_value = {
            "id": "recTopco",
            "fields": {C.F_CLIENT_NAME: "Topco"},
        }

        response = self.app.get(
            "/api/source-check/topco/suggestions?clientId=recTopco&productName=parmesan&upc=1122500491"
        )

        self.assertEqual(response.status_code, 200)
        records = response.get_json()["records"]
        self.assertGreaterEqual(len(records), 2)
        self.assertEqual(records[0]["sourceData"]["Product Name"], "CT Parmesan Cheese 8oz")
        self.assertEqual(records[0]["matchBasis"], "UPC + Product Name")
        create_record.assert_not_called()
        update_record.assert_not_called()

    @patch("routes._jobs_by_id", return_value={})
    @patch("routes._client_permitted", return_value=True)
    @patch("routes.airtable.list_records")
    def test_existing_merchandise_product_suggestions_still_work(
        self,
        list_records,
        _client_permitted,
        _jobs_by_id,
    ):
        list_records.return_value = {
            "records": [
                self.product("recLocalProduct", "Lookup Item", "100000000031"),
                self.product("recOtherProduct", "Other Item", "100000000099"),
            ],
        }

        response = self.app.get("/api/merchandise/products?clientId=recTopco&q=100000000031")

        self.assertEqual(response.status_code, 200)
        records = response.get_json()["records"]
        self.assertEqual([record["id"] for record in records], ["recLocalProduct"])

    @patch("routes._now_iso", return_value="2026-08-18T12:00:00Z")
    @patch("routes._issues_by_item_id", return_value={})
    @patch("routes._clients_by_id")
    @patch("routes._create_history_event")
    @patch("routes._existing_jobs_by_lookup", return_value={})
    @patch("routes._existing_items_by_identifier", return_value={})
    @patch("routes._list_all_records", return_value=[])
    @patch("routes._client_permitted", return_value=True)
    @patch("routes._client_record")
    @patch("routes.airtable.get_record")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.create_record")
    @patch("routes.requests.get")
    def test_activate_topco_source_row_creates_one_product_with_source_snapshot(
        self,
        requests_get,
        create_record,
        update_record,
        get_record,
        client_record,
        _client_permitted,
        _list_all_records,
        _existing_items,
        _existing_jobs,
        _history,
        clients_by_id,
        _issues,
        _now,
    ):
        csv_text = "\n".join([
            "Product Name,CVID,UPC,Brand Prefix,Request Type,WKFT #,Mbox #,Product Type,Prod Descrip,Link to Prepro/Overlays,Path to Art,Photo Notes,Vendor",
            "Lookup Item,CVID-L,100000000021,TOP,Ecomm Only,JOB-L,MBOX-L,Shelf Stable,Lookup desc,prepro,path,note,ignored vendor",
        ])

        class FakeResponse:
            text = csv_text

            def raise_for_status(self):
                return None

        requests_get.return_value = FakeResponse()
        client_record.return_value = {
            "id": "recTopco",
            "fields": {
                C.F_CLIENT_NAME: "Topco",
                C.F_CLIENT_IDENTIFIER_TYPE: "",
                C.F_CLIENT_REQUIRED_TO_SHOOT: [],
            },
        }
        clients_by_id.return_value = {"recTopco": {"id": "recTopco", "name": "Topco"}}

        def fake_create(table, fields, **_kwargs):
            self.assertEqual(table, C.PRODUCTS_TABLE)
            return {"id": "recCreatedProduct", "fields": fields}

        create_record.side_effect = fake_create
        get_record.return_value = {
            "id": "recCreatedProduct",
            "fields": {
                C.F_ITEM_NAME: "Lookup Item",
                C.F_ITEM_CLIENT: ["recTopco"],
                C.F_ITEM_UPC: "100000000021",
                C.F_ITEM_REFERENCE_DATA: create_record.side_effect(C.PRODUCTS_TABLE, {
                    C.F_ITEM_NAME: "Lookup Item",
                    C.F_ITEM_CLIENT: ["recTopco"],
                    C.F_ITEM_UPC: "100000000021",
                    C.F_ITEM_REFERENCE_DATA: json.dumps({
                        "_sourceSnapshot": {
                            "client": "Topco",
                            "source": "TOPCO (MARKS) PROJECTS",
                            "sheetTab": "Master Tracker 2026",
                            "sourceRowNumber": 6,
                            "sourceCheckedAt": "2026-08-18T12:00:00Z",
                            "matchMethod": "Source Lookup",
                            "actionableReason": "activate_in_marks",
                            "sourceIdentity": {"productName": "Lookup Item", "upc": "100000000021"},
                        }
                    }),
                })["fields"][C.F_ITEM_REFERENCE_DATA],
            },
        }

        response = self.app.post("/api/source-check/topco/activate", json={
            "clientId": "recTopco",
            "sourceRowNumber": 6,
        })

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload["activated"])
        self.assertEqual(payload["action"], "created")
        self.assertEqual(create_record.call_count, 1)
        update_record.assert_not_called()
        fields = create_record.call_args.args[1]
        reference_data = json.loads(fields[C.F_ITEM_REFERENCE_DATA])
        self.assertEqual(reference_data["Product Name"], "Lookup Item")
        self.assertNotIn("Vendor", reference_data)
        self.assertEqual(reference_data["_sourceSnapshot"]["matchMethod"], "Source Lookup")
        self.assertEqual(reference_data["_sourceSnapshot"]["actionableReason"], "activate_in_marks")
        self.assertEqual(reference_data["_sourceSnapshot"]["sourceRowNumber"], 6)
        self.assertEqual(reference_data["_sourceSnapshot"]["sourceIdentity"], {
            "productName": "Lookup Item",
            "upc": "100000000021",
        })
        self.assertIn("/export", requests_get.call_args.args[0])

    @patch("routes._now_iso", return_value="2026-08-18T12:00:00Z")
    @patch("routes._issues_by_item_id", return_value={})
    @patch("routes._clients_by_id")
    @patch("routes._create_history_event")
    @patch("routes._existing_jobs_by_lookup", return_value={})
    @patch("routes._existing_items_by_identifier", return_value={})
    @patch("routes._list_all_records")
    @patch("routes._client_permitted", return_value=True)
    @patch("routes._client_record")
    @patch("routes.airtable.get_record")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.create_record")
    @patch("routes.requests.get")
    def test_activate_topco_source_row_updates_exactly_one_existing_product(
        self,
        requests_get,
        create_record,
        update_record,
        get_record,
        client_record,
        _client_permitted,
        list_all_records,
        _existing_items,
        _existing_jobs,
        _history,
        clients_by_id,
        _issues,
        _now,
    ):
        csv_text = "\n".join([
            "Product Name,CVID,UPC,Brand Prefix,Request Type,WKFT #,Mbox #,Product Type,Prod Descrip,Link to Prepro/Overlays,Path to Art,Photo Notes",
            "Existing Lookup Item,CVID-U,100000000022,TOP,Pack Only,JOB-U,MBOX-U,Shelf Stable,Updated desc,prepro,path,note",
        ])

        class FakeResponse:
            text = csv_text

            def raise_for_status(self):
                return None

        requests_get.return_value = FakeResponse()
        client_record.return_value = {
            "id": "recTopco",
            "fields": {
                C.F_CLIENT_NAME: "Topco",
                C.F_CLIENT_IDENTIFIER_TYPE: "",
                C.F_CLIENT_REQUIRED_TO_SHOOT: [],
            },
        }
        clients_by_id.return_value = {"recTopco": {"id": "recTopco", "name": "Topco"}}
        existing = {
            "id": "recExistingProduct",
            "fields": {
                C.F_ITEM_NAME: "Existing Lookup Item",
                C.F_ITEM_CLIENT: ["recTopco"],
                C.F_ITEM_UPC: "100000000022",
            },
        }
        list_all_records.return_value = [existing]
        get_record.side_effect = [
            existing,
            {
                "id": "recExistingProduct",
                "fields": {
                    **existing["fields"],
                    C.F_ITEM_REFERENCE_DATA: json.dumps({"_sourceSnapshot": {"sourceRowNumber": 6}}),
                },
            },
        ]

        def fake_update(table, record_id, fields, **_kwargs):
            self.assertEqual(table, C.PRODUCTS_TABLE)
            self.assertEqual(record_id, "recExistingProduct")
            return {"id": record_id, "fields": {**existing["fields"], **fields}}

        update_record.side_effect = fake_update

        response = self.app.post("/api/source-check/topco/activate", json={
            "clientId": "recTopco",
            "sourceRowNumber": 6,
        })

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["action"], "updated")
        create_record.assert_not_called()
        self.assertEqual(update_record.call_count, 1)
        fields = update_record.call_args.args[2]
        reference_data = json.loads(fields[C.F_ITEM_REFERENCE_DATA])
        self.assertEqual(reference_data["_sourceSnapshot"]["matchMethod"], "Source Lookup")
        self.assertEqual(reference_data["_sourceSnapshot"]["actionableReason"], "activate_in_marks")
        self.assertEqual(reference_data["_sourceSnapshot"]["sourceIdentity"]["upc"], "100000000022")

    @patch("routes._now_iso", return_value="2026-08-18T12:00:00Z")
    @patch("routes._issues_by_item_id", return_value={})
    @patch("routes._clients_by_id")
    @patch("routes._create_history_event")
    @patch("routes._existing_jobs_by_lookup", return_value={})
    @patch("routes._existing_items_by_identifier", return_value={})
    @patch("routes._list_all_records")
    @patch("routes._client_permitted", return_value=True)
    @patch("routes._client_record")
    @patch("routes.airtable.get_record")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.create_record")
    @patch("routes.requests.get")
    def test_activate_topco_source_row_clears_blank_source_request_type(
        self,
        requests_get,
        create_record,
        update_record,
        get_record,
        client_record,
        _client_permitted,
        list_all_records,
        _existing_items,
        _existing_jobs,
        _history,
        clients_by_id,
        _issues,
        _now,
    ):
        csv_text = "\n".join([
            "Product Name,CVID,UPC,Brand Prefix,Request Type,WKFT #",
            "Existing Lookup Item,CVID-U,100000000022,TOP,,JOB-U",
        ])

        class FakeResponse:
            text = csv_text

            def raise_for_status(self):
                return None

        requests_get.return_value = FakeResponse()
        client_record.return_value = {
            "id": "recTopco",
            "fields": {
                C.F_CLIENT_NAME: "Topco",
                C.F_CLIENT_IDENTIFIER_TYPE: "",
                C.F_CLIENT_REQUIRED_TO_SHOOT: [],
            },
        }
        clients_by_id.return_value = {"recTopco": {"id": "recTopco", "name": "Topco"}}
        existing = self.product("recExistingProduct", "Existing Lookup Item", "100000000022", {
            C.F_ITEM_REQUEST_TYPE: "Pack only",
            C.F_ITEM_REFERENCE_DATA: json.dumps({
                "_sourceSnapshot": {
                    "client": "Topco",
                    "source": "TOPCO (MARKS) PROJECTS",
                    "sheetTab": "Master Tracker 2026",
                    "sourceRowNumber": 6,
                    "sourceIdentity": {
                        "productName": "Existing Lookup Item",
                        "upc": "100000000022",
                    },
                }
            }),
        })
        product_state = {"record": existing}
        list_all_records.return_value = [existing]

        def fake_update(table, record_id, fields, **_kwargs):
            self.assertEqual(table, C.PRODUCTS_TABLE)
            self.assertEqual(record_id, "recExistingProduct")
            product_state["record"] = {"id": record_id, "fields": {**product_state["record"]["fields"], **fields}}
            return product_state["record"]

        def fake_get_record(table, record_id, **_kwargs):
            self.assertEqual(table, C.PRODUCTS_TABLE)
            self.assertEqual(record_id, "recExistingProduct")
            return product_state["record"]

        update_record.side_effect = fake_update
        get_record.side_effect = fake_get_record

        response = self.app.post("/api/source-check/topco/activate", json={
            "clientId": "recTopco",
            "sourceRowNumber": 6,
        })

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["action"], "updated")
        create_record.assert_not_called()
        fields = update_record.call_args.args[2]
        self.assertIsNone(fields[C.F_ITEM_REQUEST_TYPE])
        reference_data = json.loads(fields[C.F_ITEM_REFERENCE_DATA])
        self.assertEqual(reference_data["_sourceSnapshot"]["sourceRowNumber"], 6)

    @patch("routes._now_iso", return_value="2026-08-18T12:00:00Z")
    @patch("routes._issues_by_item_id", return_value={})
    @patch("routes._clients_by_id")
    @patch("routes._create_history_event")
    @patch("routes._existing_jobs_by_lookup", return_value={})
    @patch("routes._existing_items_by_identifier", return_value={})
    @patch("routes._list_all_records")
    @patch("routes._client_permitted", return_value=True)
    @patch("routes._client_record")
    @patch("routes.airtable.get_record")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.create_record")
    @patch("routes.requests.get")
    def test_refresh_topco_linked_products_updates_existing_source_linked_products_only(
        self,
        requests_get,
        create_record,
        update_record,
        get_record,
        client_record,
        _client_permitted,
        list_all_records,
        _existing_items,
        _existing_jobs,
        _history,
        clients_by_id,
        _issues,
        _now,
    ):
        csv_text = "\n".join([
            "Product Name,CVID,UPC,Brand Prefix,Request Type,WKFT #,Mbox #,Product Type,Prod Descrip,Link to Prepro/Overlays,Path to Art,Photo Notes",
            "Refreshed Source Item,CVID-R,100000000044,TOP,Ecomm Only,JOB-R,MBOX-R,Shelf Stable,Source desc,prepro,path,note",
        ])

        class FakeResponse:
            text = csv_text

            def raise_for_status(self):
                return None

        requests_get.return_value = FakeResponse()
        client_record.return_value = {
            "id": "recTopco",
            "fields": {
                C.F_CLIENT_NAME: "Topco",
                C.F_CLIENT_IDENTIFIER_TYPE: "",
                C.F_CLIENT_REQUIRED_TO_SHOOT: [],
            },
        }
        clients_by_id.return_value = {"recTopco": {"id": "recTopco", "name": "Topco"}}
        linked = self.product("recLinkedProduct", "Old Source Item", "100000000044", {
            C.F_ITEM_REFERENCE_DATA: json.dumps({
                "_sourceSnapshot": {
                    "client": "Topco",
                    "source": "TOPCO (MARKS) PROJECTS",
                    "sheetTab": "Master Tracker 2026",
                    "sourceRowNumber": 6,
                    "sourceIdentity": {
                        "productName": "Old Source Item",
                        "upc": "100000000044",
                    },
                }
            }),
        })
        unlinked = self.product("recUnlinkedProduct", "Unlinked Product", "100000000045")
        product_state = {"recLinkedProduct": linked, "recUnlinkedProduct": unlinked}
        list_all_records.return_value = [linked, unlinked]

        def fake_get_record(table, record_id, **_kwargs):
            self.assertEqual(table, C.PRODUCTS_TABLE)
            return product_state[record_id]

        def fake_update(table, record_id, fields, **_kwargs):
            self.assertEqual(table, C.PRODUCTS_TABLE)
            self.assertEqual(record_id, "recLinkedProduct")
            product_state[record_id] = {"id": record_id, "fields": {**product_state[record_id]["fields"], **fields}}
            return product_state[record_id]

        get_record.side_effect = fake_get_record
        update_record.side_effect = fake_update

        response = self.app.post("/api/source-check/topco/refresh-linked-products", json={
            "clientId": "recTopco",
        })

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload["refreshed"])
        self.assertEqual(payload["checked"], 1)
        self.assertEqual(payload["updated"], 1)
        create_record.assert_not_called()
        self.assertEqual(update_record.call_count, 1)
        fields = update_record.call_args.args[2]
        self.assertEqual(fields[C.F_ITEM_NAME], "Refreshed Source Item")
        self.assertEqual(fields[C.F_ITEM_REQUEST_TYPE], "Ecomm only")
        self.assertEqual(fields[C.F_ITEM_CVID], "CVID-R")
        reference_data = json.loads(fields[C.F_ITEM_REFERENCE_DATA])
        self.assertEqual(reference_data["_sourceSnapshot"]["matchMethod"], "Source Refresh")
        self.assertEqual(reference_data["_sourceSnapshot"]["actionableReason"], "source_refresh")

    @patch("routes._now_iso", return_value="2026-08-18T12:00:00Z")
    @patch("routes._issues_by_item_id", return_value={})
    @patch("routes._clients_by_id")
    @patch("routes._create_history_event")
    @patch("routes._existing_jobs_by_lookup", return_value={})
    @patch("routes._existing_items_by_identifier", return_value={})
    @patch("routes._list_all_records")
    @patch("routes._client_permitted", return_value=True)
    @patch("routes._client_record")
    @patch("routes.airtable.get_record")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.create_record")
    @patch("routes.requests.get")
    def test_activate_topco_source_row_twice_keeps_one_product(
        self,
        requests_get,
        create_record,
        update_record,
        get_record,
        client_record,
        _client_permitted,
        list_all_records,
        _existing_items,
        _existing_jobs,
        _history,
        clients_by_id,
        _issues,
        _now,
    ):
        csv_text = "\n".join([
            "Product Name,CVID,UPC,Brand Prefix,Request Type,WKFT #,Mbox #,Product Type,Prod Descrip,Link to Prepro/Overlays,Path to Art,Photo Notes",
            "Repeat Lookup Item,CVID-R,100000000023,TOP,Ecomm Only,JOB-R,MBOX-R,Shelf Stable,Repeat desc,prepro,path,note",
        ])

        class FakeResponse:
            text = csv_text

            def raise_for_status(self):
                return None

        requests_get.return_value = FakeResponse()
        client_record.return_value = {
            "id": "recTopco",
            "fields": {
                C.F_CLIENT_NAME: "Topco",
                C.F_CLIENT_IDENTIFIER_TYPE: "",
                C.F_CLIENT_REQUIRED_TO_SHOOT: [],
            },
        }
        clients_by_id.return_value = {"recTopco": {"id": "recTopco", "name": "Topco"}}

        created_state = {}

        def fake_list_all_records(table, *args, **_kwargs):
            if table != C.PRODUCTS_TABLE:
                return []
            return [created_state["record"]] if created_state else []

        def fake_create(table, fields, **_kwargs):
            self.assertEqual(table, C.PRODUCTS_TABLE)
            created_state["record"] = {"id": "recRepeatProduct", "fields": fields}
            return created_state["record"]

        def fake_update(table, record_id, fields, **_kwargs):
            self.assertEqual(table, C.PRODUCTS_TABLE)
            self.assertEqual(record_id, "recRepeatProduct")
            created_state["record"] = {
                "id": record_id,
                "fields": {**created_state["record"]["fields"], **fields},
            }
            return created_state["record"]

        def fake_get_record(table, record_id, **_kwargs):
            self.assertEqual(table, C.PRODUCTS_TABLE)
            self.assertEqual(record_id, "recRepeatProduct")
            return created_state["record"]

        list_all_records.side_effect = fake_list_all_records
        create_record.side_effect = fake_create
        update_record.side_effect = fake_update
        get_record.side_effect = fake_get_record

        first = self.app.post("/api/source-check/topco/activate", json={
            "clientId": "recTopco",
            "sourceRowNumber": 6,
        })
        second = self.app.post("/api/source-check/topco/activate", json={
            "clientId": "recTopco",
            "sourceRowNumber": 6,
        })

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.get_json()["action"], "created")
        self.assertEqual(second.get_json()["action"], "updated")
        self.assertEqual(create_record.call_count, 1)
        self.assertEqual(update_record.call_count, 1)
        reference_data = json.loads(created_state["record"]["fields"][C.F_ITEM_REFERENCE_DATA])
        self.assertEqual(reference_data["_sourceSnapshot"]["sourceRowNumber"], 6)
        self.assertEqual(reference_data["_sourceSnapshot"]["sourceIdentity"]["upc"], "100000000023")

    @patch("routes._now_iso", return_value="2026-08-18T12:00:00Z")
    @patch("routes._issues_by_item_id", return_value={})
    @patch("routes._clients_by_id")
    @patch("routes._create_history_event")
    @patch("routes._existing_jobs_by_lookup", return_value={})
    @patch("routes._existing_items_by_identifier", return_value={})
    @patch("routes._list_all_records", return_value=[])
    @patch("routes._client_record")
    @patch("routes.airtable.get_record")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.create_record")
    @patch("routes.requests.get")
    def test_merchandise_match_activate_creates_product_and_links_merchandise(
        self,
        requests_get,
        create_record,
        update_record,
        get_record,
        client_record,
        _list_all_records,
        _existing_items,
        _existing_jobs,
        _history,
        clients_by_id,
        _issues,
        _now,
    ):
        requests_get.return_value = self.fake_response("\n".join([
            "Product Name,CVID,UPC,Brand Prefix,Request Type,WKFT #,Mbox #,Product Type,Prod Descrip,Link to Prepro/Overlays,Path to Art,Photo Notes",
            "Lookup Item,CVID-M,100000000031,TOP,Ecomm Only,JOB-M,MBOX-M,Shelf Stable,Lookup desc,prepro,path,note",
        ]))
        client_record.return_value = {"id": "recTopco", "fields": {C.F_CLIENT_NAME: "Topco"}}
        clients_by_id.return_value = {"recTopco": {"id": "recTopco", "name": "Topco"}}
        created_product = {}
        updated_merch = {}

        def fake_create(table, fields, **_kwargs):
            self.assertEqual(table, C.PRODUCTS_TABLE)
            created_product["record"] = {"id": "recActivatedProduct", "fields": fields}
            return created_product["record"]

        def fake_update(table, record_id, fields, **_kwargs):
            if table == C.MERCHANDISE_TABLE:
                self.assertEqual(record_id, "recMerch")
                updated_merch["record"] = {
                    "id": "recMerch",
                    "fields": {**self.merchandise()["fields"], **fields},
                }
                return updated_merch["record"]
            self.fail(f"Unexpected update table: {table}")

        def fake_get_record(table, record_id, **_kwargs):
            if table == C.MERCHANDISE_TABLE:
                return updated_merch.get("record") or self.merchandise()
            if table == C.SHIPMENTS_TABLE:
                return self.shipment()
            if table == C.PRODUCTS_TABLE:
                return created_product["record"]
            self.fail(f"Unexpected get table: {table}")

        create_record.side_effect = fake_create
        update_record.side_effect = fake_update
        get_record.side_effect = fake_get_record

        response = self.app.post("/api/merchandise/recMerch/activate-source-row", json={
            "sourceRowNumber": 6,
        })

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload["activated"])
        self.assertEqual(payload["action"], "created")
        self.assertEqual(payload["product"]["id"], "recActivatedProduct")
        self.assertEqual(payload["merchandise"]["itemIds"], ["recActivatedProduct"])
        self.assertEqual(create_record.call_count, 1)
        self.assertEqual(create_record.call_args.args[0], C.PRODUCTS_TABLE)
        update_tables = [call.args[0] for call in update_record.call_args_list]
        self.assertEqual(update_tables, [C.MERCHANDISE_TABLE])
        self.assertNotIn(C.WORKSTREAM_CARDS_TABLE, update_tables)
        self.assertNotIn(C.THR3D_SHIPPING_ITEMS_TABLE, update_tables)
        reference_data = json.loads(created_product["record"]["fields"][C.F_ITEM_REFERENCE_DATA])
        self.assertEqual(reference_data["_sourceSnapshot"]["sourceRowNumber"], 6)

    @patch("routes._now_iso", return_value="2026-08-18T12:00:00Z")
    @patch("routes._issues_by_item_id", return_value={})
    @patch("routes._clients_by_id")
    @patch("routes._create_history_event")
    @patch("routes._existing_jobs_by_lookup", return_value={})
    @patch("routes._existing_items_by_identifier", return_value={})
    @patch("routes._list_all_records", return_value=[])
    @patch("routes._client_record")
    @patch("routes.airtable.get_record")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.create_record")
    @patch("routes.requests.get")
    def test_merchandise_match_missing_upc_creates_source_linked_product(
        self,
        requests_get,
        create_record,
        update_record,
        get_record,
        client_record,
        _list_all_records,
        _existing_items,
        _existing_jobs,
        _history,
        clients_by_id,
        _issues,
        _now,
    ):
        requests_get.return_value = self.fake_response("\n".join([
            "Product Name,CVID,UPC,Brand Prefix,Request Type,WKFT #",
            "Pending UPC Item,CVID-P,,TOP,Ecomm Only,JOB-P",
        ]))
        client_record.return_value = {"id": "recTopco", "fields": {C.F_CLIENT_NAME: "Topco"}}
        clients_by_id.return_value = {"recTopco": {"id": "recTopco", "name": "Topco"}}
        merch_state = {"record": self.merchandise()}
        product_state = {}

        def fake_create(table, fields, **_kwargs):
            self.assertEqual(table, C.PRODUCTS_TABLE)
            product_state["record"] = {"id": "recPendingProduct", "fields": fields}
            return product_state["record"]

        def fake_update(table, record_id, fields, **_kwargs):
            if table == C.MERCHANDISE_TABLE:
                self.assertEqual(record_id, "recMerch")
                merch_state["record"] = {
                    "id": "recMerch",
                    "fields": {**merch_state["record"]["fields"], **fields},
                }
                return merch_state["record"]
            self.fail(f"Unexpected update table: {table}")

        def fake_get_record(table, record_id, **_kwargs):
            if table == C.MERCHANDISE_TABLE:
                return merch_state["record"]
            if table == C.SHIPMENTS_TABLE:
                return self.shipment()
            if table == C.PRODUCTS_TABLE:
                return product_state["record"]
            self.fail(f"Unexpected get table: {table}")

        create_record.side_effect = fake_create
        update_record.side_effect = fake_update
        get_record.side_effect = fake_get_record

        response = self.app.post("/api/merchandise/recMerch/activate-source-row", json={
            "sourceRowNumber": 6,
        })

        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertTrue(payload["activated"])
        self.assertEqual(payload["action"], "created")
        self.assertEqual(payload["sourceRowNumber"], 6)
        self.assertEqual(payload["product"]["id"], "recPendingProduct")
        self.assertEqual(payload["product"]["name"], "Pending UPC Item")
        self.assertEqual(payload["product"]["upc"], "")
        self.assertEqual(payload["merchandise"]["itemIds"], ["recPendingProduct"])
        self.assertEqual(create_record.call_count, 1)
        fields = create_record.call_args.args[1]
        self.assertNotIn(C.F_ITEM_UPC, fields)
        reference_data = json.loads(fields[C.F_ITEM_REFERENCE_DATA])
        self.assertEqual(reference_data["_sourceSnapshot"]["sourceRowNumber"], 6)
        self.assertEqual(reference_data["_sourceSnapshot"]["sourceIdentity"]["productName"], "Pending UPC Item")
        self.assertEqual(reference_data["_sourceSnapshot"]["sourceIdentity"].get("upc", ""), "")

    @patch("routes._now_iso", return_value="2026-08-18T12:00:00Z")
    @patch("routes._issues_by_item_id", return_value={})
    @patch("routes._clients_by_id")
    @patch("routes._create_history_event")
    @patch("routes._existing_jobs_by_lookup", return_value={})
    @patch("routes._existing_items_by_identifier", return_value={})
    @patch("routes._list_all_records")
    @patch("routes._client_record")
    @patch("routes.airtable.get_record")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.create_record")
    @patch("routes.requests.get")
    def test_merchandise_match_activate_same_row_twice_does_not_duplicate(
        self,
        requests_get,
        create_record,
        update_record,
        get_record,
        client_record,
        list_all_records,
        _existing_items,
        _existing_jobs,
        _history,
        clients_by_id,
        _issues,
        _now,
    ):
        requests_get.return_value = self.fake_response("\n".join([
            "Product Name,CVID,UPC,Brand Prefix,Request Type,WKFT #",
            "Repeat Item,CVID-R,100000000032,TOP,Pack Only,JOB-R",
        ]))
        client_record.return_value = {"id": "recTopco", "fields": {C.F_CLIENT_NAME: "Topco"}}
        clients_by_id.return_value = {"recTopco": {"id": "recTopco", "name": "Topco"}}
        product_state = {}
        merch_state = {"record": self.merchandise()}

        def fake_list_all_records(table, *args, **_kwargs):
            if table == C.PRODUCTS_TABLE and product_state:
                return [product_state["record"]]
            return []

        def fake_create(table, fields, **_kwargs):
            self.assertEqual(table, C.PRODUCTS_TABLE)
            product_state["record"] = {"id": "recRepeatProduct", "fields": fields}
            return product_state["record"]

        def fake_update(table, record_id, fields, **_kwargs):
            if table == C.PRODUCTS_TABLE:
                product_state["record"] = {
                    "id": record_id,
                    "fields": {**product_state["record"]["fields"], **fields},
                }
                return product_state["record"]
            if table == C.MERCHANDISE_TABLE:
                merch_state["record"] = {
                    "id": "recMerch",
                    "fields": {**merch_state["record"]["fields"], **fields},
                }
                return merch_state["record"]
            self.fail(f"Unexpected update table: {table}")

        def fake_get_record(table, record_id, **_kwargs):
            if table == C.MERCHANDISE_TABLE:
                return merch_state["record"]
            if table == C.SHIPMENTS_TABLE:
                return self.shipment()
            if table == C.PRODUCTS_TABLE:
                return product_state["record"]
            self.fail(f"Unexpected get table: {table}")

        list_all_records.side_effect = fake_list_all_records
        create_record.side_effect = fake_create
        update_record.side_effect = fake_update
        get_record.side_effect = fake_get_record

        first = self.app.post("/api/merchandise/recMerch/activate-source-row", json={"sourceRowNumber": 6})
        second = self.app.post("/api/merchandise/recMerch/activate-source-row", json={"sourceRowNumber": 6})

        self.assertEqual(first.status_code, 200)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.get_json()["action"], "created")
        self.assertEqual(second.get_json()["action"], "updated")
        self.assertEqual(create_record.call_count, 1)
        product_updates = [call for call in update_record.call_args_list if call.args[0] == C.PRODUCTS_TABLE]
        merch_updates = [call for call in update_record.call_args_list if call.args[0] == C.MERCHANDISE_TABLE]
        self.assertEqual(len(product_updates), 1)
        self.assertEqual(len(merch_updates), 2)

    @patch("routes._now_iso", return_value="2026-08-18T12:00:00Z")
    @patch("routes._issues_by_item_id", return_value={})
    @patch("routes._clients_by_id")
    @patch("routes._create_history_event")
    @patch("routes._existing_jobs_by_lookup", return_value={})
    @patch("routes._existing_items_by_identifier", return_value={})
    @patch("routes._list_all_records")
    @patch("routes._client_record")
    @patch("routes.airtable.get_record")
    @patch("routes.airtable.update_record")
    @patch("routes.airtable.create_record")
    @patch("routes.requests.get")
    def test_merchandise_match_activate_existing_client_upc_product_gets_snapshot(
        self,
        requests_get,
        create_record,
        update_record,
        get_record,
        client_record,
        list_all_records,
        _existing_items,
        _existing_jobs,
        _history,
        clients_by_id,
        _issues,
        _now,
    ):
        requests_get.return_value = self.fake_response("\n".join([
            "Product Name,CVID,UPC,Brand Prefix,Request Type,WKFT #",
            "Existing UPC Item,CVID-X,100000000033,TOP,Ecomm Only,JOB-X",
        ]))
        client_record.return_value = {"id": "recTopco", "fields": {C.F_CLIENT_NAME: "Topco"}}
        clients_by_id.return_value = {"recTopco": {"id": "recTopco", "name": "Topco"}}
        existing = self.product("recExistingUpcProduct", "Existing UPC Item", "100000000033")
        product_state = {"record": existing}
        merch_state = {"record": self.merchandise()}
        list_all_records.return_value = [existing]

        def fake_update(table, record_id, fields, **_kwargs):
            if table == C.PRODUCTS_TABLE:
                self.assertEqual(record_id, "recExistingUpcProduct")
                product_state["record"] = {"id": record_id, "fields": {**existing["fields"], **fields}}
                return product_state["record"]
            if table == C.MERCHANDISE_TABLE:
                merch_state["record"] = {"id": "recMerch", "fields": {**merch_state["record"]["fields"], **fields}}
                return merch_state["record"]
            self.fail(f"Unexpected update table: {table}")

        def fake_get_record(table, record_id, **_kwargs):
            if table == C.MERCHANDISE_TABLE:
                return merch_state["record"]
            if table == C.SHIPMENTS_TABLE:
                return self.shipment()
            if table == C.PRODUCTS_TABLE:
                return product_state["record"]
            self.fail(f"Unexpected get table: {table}")

        update_record.side_effect = fake_update
        get_record.side_effect = fake_get_record

        response = self.app.post("/api/merchandise/recMerch/activate-source-row", json={"sourceRowNumber": 6})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["action"], "updated")
        create_record.assert_not_called()
        reference_data = json.loads(product_state["record"]["fields"][C.F_ITEM_REFERENCE_DATA])
        self.assertEqual(reference_data["_sourceSnapshot"]["sourceIdentity"]["upc"], "100000000033")
        self.assertEqual(merch_state["record"]["fields"][C.F_RECEIPT_ENTRY_ITEM], ["recExistingUpcProduct"])


if __name__ == "__main__":
    unittest.main()
