import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "frontend" / "src" / "App.jsx"
STYLES = ROOT / "frontend" / "src" / "styles.css"
VOCABULARY = ROOT / "frontend" / "src" / "domainVocabulary.js"
TABLE_EXPORT = ROOT / "frontend" / "src" / "tableExport.js"
PACKAGE = ROOT / "frontend" / "package.json"
REDIRECTS = ROOT / "frontend" / "public" / "_redirects"


class FrontendRoutingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = APP.read_text()
        cls.styles = STYLES.read_text()
        cls.vocabulary = VOCABULARY.read_text()
        cls.table_export = TABLE_EXPORT.read_text()

    def test_router_library_is_used(self):
        package = json.loads(PACKAGE.read_text())
        self.assertIn("react-router-dom", package["dependencies"])
        self.assertIn("BrowserRouter", self.source)
        self.assertIn("<Routes>", self.source)

    def test_navigation_renames_intake_to_imports(self):
        self.assertIn("label: 'Imports'", self.source)
        self.assertNotRegex(self.source, r"label:\s*'Intake'")
        self.assertNotIn(">New Intake<", self.source)

    def test_canonical_routes_are_declared(self):
        for route in [
            'path="/" element={<Navigate to="/dashboard" replace />}',
            'path="/dashboard"',
            'path="/imports"',
            'path="/imports/history"',
            'path="/shipments"',
            'path="/merchandise"',
            'path="/merchandise/review"',
            'path="/products"',
            'path="/jobs"',
            'path="/jobs/new"',
            'path="/clients"',
            'path="/settings"',
        ]:
            self.assertIn(route, self.source)

    def test_legacy_routes_redirect_to_canonical_routes(self):
        for route in [
            'path="/receiving" element={<Navigate to="/shipments" replace />}',
            'path="/receipts" element={<Navigate to="/shipments" replace />}',
            'path="/verification" element={<Navigate to="/merchandise/review" replace />}',
            'path="/items" element={<Navigate to="/products" replace />}',
            'path="/intake" element={<Navigate to="/imports" replace />}',
            'path="/intake/import-history" element={<Navigate to="/imports/history" replace />}',
        ]:
            self.assertIn(route, self.source)

    def test_business_language_navigation_is_visible(self):
        for label in [
            "label: 'Dashboard'",
            "label: 'Imports'",
            "label: DOMAIN_TERMS.shipments",
            "label: 'Inventory'",
            "label: DOMAIN_TERMS.merchandiseReview",
            "label: DOMAIN_TERMS.products",
            "label: 'Jobs'",
            "label: 'Clients'",
        ]:
            self.assertIn(label, self.source)
        self.assertIn("merchandiseReview: 'Merchandise Review'", self.vocabulary)
        self.assertIn("products: 'Products'", self.vocabulary)
        self.assertIn("packageName: 'Package Name'", self.vocabulary)
        self.assertIn("merchandiseIdentifier: 'Barcode or ID Number'", self.vocabulary)
        self.assertNotRegex(self.source, r"label:\s*'Verification'")
        self.assertNotRegex(self.source, r"label:\s*'Items'")
        self.assertNotRegex(self.source, r"label:\s*'Receiving'")
        self.assertNotRegex(self.source, r"label:\s*'Import'")
        nav_section = self.source.split("const NAV_ITEMS = [", 1)[1].split("];", 1)[0]
        self.assertNotIn("label: 'Settings'", nav_section)

    def test_inventory_and_review_navigation_are_independent(self):
        nav_section = self.source.split("const NAV_ITEMS = [", 1)[1].split("];", 1)[0]
        self.assertIn("{ path: '/merchandise', label: 'Inventory'", nav_section)
        self.assertIn("{ path: '/merchandise/review', label: DOMAIN_TERMS.merchandiseReview", nav_section)
        self.assertIn("if (pathname.startsWith('/merchandise/review')) return DOMAIN_TERMS.merchandiseReview;", self.source)
        self.assertIn("if (pathname.startsWith('/merchandise')) return 'Inventory';", self.source)
        self.assertIn("end={item.path === '/dashboard' || item.path === '/merchandise'}", self.source)
        active_logic = self.source.split("<NavLink", 1)[1].split("onClick={() => setMobileNavOpen(false)}", 1)[0]
        self.assertIn("item.path === '/merchandise' && location.pathname === '/merchandise'", active_logic)

    def test_settings_is_only_in_sidebar_profile_area(self):
        nav_section = self.source.split("const NAV_ITEMS = [", 1)[1].split("];", 1)[0]
        self.assertNotIn("path: '/settings'", nav_section)
        self.assertIn('to="/settings"', self.source)
        self.assertIn("sidebar-admin-link", self.source)
        self.assertIn('<span className="nav-label">Settings</span>', self.source)

    def test_shared_domain_vocabulary_exists(self):
        self.assertTrue(VOCABULARY.exists())
        for term in [
            "product: 'Product'",
            "products: 'Products'",
            "shipment: 'Shipment'",
            "shipments: 'Shipments'",
            "merchandise: 'Merchandise'",
            "merchandiseReview: 'Merchandise Review'",
            "packageName: 'Package Name'",
            "merchandiseIdentifier: 'Barcode or ID Number'",
            "productJobNumber: 'Product Job Number'",
        ]:
            self.assertIn(term, self.vocabulary)
        self.assertIn("export function getFieldLabel", self.vocabulary)
        self.assertIn("export function technicalTableLabel", self.vocabulary)

    def test_import_mappings_keep_internal_field_names_with_user_labels(self):
        self.assertIn("'Item Name': 'itemName'", self.source)
        self.assertIn("'Item Job Number': 'itemJobNumber'", self.source)
        self.assertIn("getFieldLabel('Item Name', 'product')", self.source)
        self.assertIn("getFieldLabel('Item Job Number', 'product')", self.source)
        self.assertIn("Source column", self.source)
        self.assertIn("Destination field", self.source)
        self.assertIn("Airtable field:", self.source)

    def test_technical_airtable_names_are_labeled_as_technical(self):
        self.assertIn("technicalTableLabel('Items')", self.source)
        self.assertIn("technicalTableLabel('Receipts')", self.source)
        self.assertIn("technicalTableLabel('Receipt Entries')", self.source)
        self.assertIn("Airtable table", self.vocabulary)

    def test_migrated_pages_use_alias_api_calls(self):
        self.assertIn("api.listShipments()", self.source)
        self.assertIn("api.listProducts()", self.source)
        self.assertIn("api.getProduct(itemId)", self.source)
        self.assertIn("api.listMerchandise()", self.source)
        self.assertIn("api.listMerchandiseReviewEntries()", self.source)
        self.assertIn("api.searchMerchandiseReviewProducts", self.source)
        self.assertIn("api.matchMerchandiseReviewEntry", self.source)
        self.assertIn("api.removeMerchandiseReviewMatch", self.source)
        self.assertIn("api.markMerchandiseWaitingForProductData", self.source)
        self.assertIn("api.createMerchandiseReviewIssue", self.source)

    def test_merchandise_review_page_has_phase_five_queues_and_actions(self):
        for text in [
            "Needs Review",
            "Waiting for Product Data",
            "Validated",
            "Issues",
            "Validate Merchandise",
            "Change Product",
            "Remove Match",
            "Skip for Now",
            "Raise Issue",
            "Unidentified Merchandise",
            "No Product Matched",
            "Do not create Products from this workspace.",
            "Focus Photos",
            "Restore Panels",
        ]:
            self.assertIn(text, self.source)
        self.assertIn("MERCHANDISE_REVIEW_STATES", self.source)
        self.assertIn("reviewStateFor(record)", self.source)
        self.assertIn("merch-review-workspace", self.source)
        self.assertIn("merch-review-queue-panel", self.source)
        self.assertIn("merch-review-inspection-panel", self.source)
        self.assertIn("merch-review-decision-panel", self.source)
        self.assertIn("merch-review-action-bar", self.source)
        self.assertIn("merch-review-lightbox", self.source)
        self.assertNotIn("Approve & move to production", self.source)

    def test_active_navigation_uses_current_route(self):
        self.assertIn("<NavLink", self.source)
        self.assertIn("item.path === '/imports' && location.pathname.startsWith('/imports/')", self.source)

    def test_role_navigation_uses_canonical_paths(self):
        self.assertIn("Admin:        ['/dashboard', '/imports', '/shipments', '/merchandise', '/merchandise/review', '/products', '/jobs', '/clients', '/settings']", self.source)
        self.assertIn("Receiver:     ['/shipments', '/merchandise']", self.source)
        self.assertIn("PM:           ['/dashboard', '/merchandise', '/merchandise/review', '/products', '/jobs']", self.source)

    def test_merchandise_inventory_page_has_required_filters(self):
        for text in [
            "Search merchandise",
            'aria-label="Client"',
            'aria-label="Status"',
            'aria-label="Storage Location"',
            'aria-label="Age"',
            "All ages",
            "0-7 days",
            "8-14 days",
            "15-30 days",
            "More than 30 days",
            "Unknown",
            "Clear",
        ]:
            self.assertIn(text, self.source)
        self.assertIn("AGE_FILTERS", self.source)
        self.assertIn("visibleRecords = records.filter", self.source)
        self.assertIn("ageFilter !== 'all'", self.source)
        self.assertIn("inventorySummary", self.source)
        self.assertIn("Total on Shelf", self.source)
        self.assertIn("More Than 30 Days", self.source)
        self.assertIn("Storage Locations", self.source)
        self.assertIn("Unknown Age", self.source)
        self.assertIn("merchandise-inventory-image", self.source)
        self.assertIn("merchandise-inventory-card-grid", self.source)
        self.assertIn("ui-filter-bar", self.source)
        self.assertIn("ui-select", self.source)
        self.assertIn("ui-card", self.source)
        self.assertNotIn("Open in Merchandise Review", self.source)
        self.assertNotIn("REVIEW_RELEVANT_INVENTORY_STATUSES", self.source)

    def test_merchandise_inventory_has_card_list_toggle_and_minimal_cards(self):
        for text in [
            "ViewToggle",
            "useStoredState('merchandise-inventory:view-mode', 'cards')",
            "viewMode === 'cards'",
            "viewMode === 'list'",
            "merchandise-age-badge",
            "merchandise-image-status-badge",
            "compactAgeBadgeLabel(record)",
            "merchandise-inventory-identifier",
            "merchandise-inventory-divider",
            "merchandise-inventory-meta-row",
            "merchandiseTableColumns",
            "merchandise-inventory-table",
        ]:
            self.assertIn(text, self.source)

        card_section = self.source.split("viewMode === 'cards'", 1)[1].split("viewMode === 'list'", 1)[0]
        self.assertIn("record.packageName", card_section)
        self.assertIn("record.barcodeOrIdNumber", card_section)
        self.assertIn("record.client", card_section)
        self.assertIn("record.quantity", card_section)
        self.assertIn("StatusBadge", card_section)
        self.assertIn("merchandise-image-status-badge", card_section)
        self.assertIn("Client:", card_section)
        self.assertIn("Qty:", card_section)
        self.assertIn("merchandise-inventory-meta-label", card_section)
        self.assertNotIn("<strong>Client:</strong>", card_section)
        self.assertNotIn("<strong>Qty:</strong>", card_section)
        for forbidden in [
            "Date Received",
            "matchedProduct",
            "condition",
            "shipment",
            "storageLocation",
            "<strong>Status</strong>",
            "Time Here",
        ]:
            self.assertNotIn(forbidden, card_section)

    def test_merchandise_inventory_card_visual_structure_matches_reference(self):
        self.assertIn("return record.daysHere === null || record.daysHere === undefined ? '—' : `${record.daysHere}d`;", self.source)
        for selector in [
            ".merchandise-inventory-image",
            ".merchandise-inventory-image img",
            ".merchandise-age-badge",
            ".merchandise-image-status-badge",
            ".merchandise-inventory-title-row",
            ".merchandise-inventory-meta-row",
        ]:
            self.assertIn(selector, self.styles)
        image_section = self.styles.split(".merchandise-inventory-image img", 1)[1].split("}", 1)[0]
        self.assertIn("object-fit: cover", image_section)
        self.assertIn("object-position: center", image_section)
        self.assertIn("transform: scale(1.25)", image_section)
        image_frame_section = self.styles.split(".merchandise-inventory-image", 1)[1].split("}", 1)[0]
        self.assertIn("width: calc(100% + 4px)", image_frame_section)
        self.assertIn("margin: -2px -2px 0", image_frame_section)
        self.assertIn("font-size: 10px", image_frame_section)
        self.assertNotIn("text-transform: uppercase", image_frame_section)
        badge_section = self.styles.split(".merchandise-age-badge", 1)[1].split("}", 1)[0]
        self.assertIn("position: absolute", badge_section)
        self.assertIn("top: 12px", badge_section)
        self.assertIn("right: 12px", badge_section)
        self.assertNotIn("min-width", badge_section)
        self.assertNotIn("min-height", badge_section)
        self.assertIn("padding: 5px 8px", badge_section)
        self.assertIn("font-size: 10pt", badge_section)
        self.assertIn("box-shadow: 0 2px 8px rgba(15, 23, 42, 0.5)", badge_section)
        self.assertIn("background: rgba(255, 255, 255", badge_section)
        self.assertIn("border: 2px solid #f06423", badge_section)
        title_section = self.styles.split(".merchandise-inventory-title-row h2", 1)[1].split("}", 1)[0]
        self.assertIn("font-size: 14px", title_section)
        self.assertIn("line-height: 1.35", title_section)
        identifier_section = self.styles.split(".merchandise-inventory-identifier", 1)[1].split("}", 1)[0]
        self.assertIn("font-size: 13px", identifier_section)
        meta_section = self.styles.split(".merchandise-inventory-meta-row", 1)[1].split("}", 1)[0]
        self.assertIn("font-size: 13px", meta_section)
        status_section = self.styles.split(".merchandise-image-status-badge", 1)[1].split("}", 1)[0]
        self.assertIn("position: absolute", status_section)
        self.assertIn("bottom: 10px", status_section)
        status_badge_section = self.styles.split(".merchandise-image-status-badge .badge", 1)[1].split("}", 1)[0]
        self.assertIn("font-size: 11px", status_badge_section)
        self.assertIn("padding: 1px 6px", status_badge_section)
        self.assertIn("border-radius: 6px", status_badge_section)

    def test_merchandise_table_has_full_details_and_filtered_export(self):
        table_section = self.source.split("const merchandiseTableColumns", 1)[1].split("function toggleInventorySort", 1)[0]
        for text in [
            "DOMAIN_TERMS.packageName",
            "DOMAIN_TERMS.merchandiseIdentifier",
            "Client",
            "DOMAIN_TERMS.quantity",
            "DOMAIN_TERMS.storageLocation",
            "Status",
            "Days Here",
            "Time Here",
            "Date Received",
            "DOMAIN_TERMS.matchedProduct",
            "Matched Product ID",
            "DOMAIN_TERMS.shipment",
            "Tracking",
            "DOMAIN_TERMS.condition",
        ]:
            self.assertIn(text, table_section)
        self.assertIn("rows={sortedVisibleRecords}", self.source)
        self.assertIn("filename={todayExportFilename('merchandise-inventory')}", self.source)
        self.assertIn("label=\"Export to Excel\"", self.source)
        toolbar_section = self.source.split('label="Merchandise inventory view"', 1)[1].split("</DataTableToolbar>", 1)[0]
        self.assertIn("ExcelExportButton", toolbar_section)
        self.assertNotIn("viewMode === 'list'", toolbar_section)

    def test_shared_excel_export_pattern_exists_for_data_tables(self):
        package = json.loads(PACKAGE.read_text())
        self.assertIn("xlsx", package["dependencies"])
        self.assertTrue(TABLE_EXPORT.exists())
        self.assertIn("import * as XLSX from 'xlsx'", self.table_export)
        self.assertIn("export function exportTableToXlsx", self.table_export)
        self.assertIn("XLSX.utils.json_to_sheet", self.table_export)
        self.assertIn("XLSX.writeFile", self.table_export)
        self.assertIn("HHmm", "merchandise-inventory-YYYY-MM-DD-HHmm.xlsx")
        self.assertIn("pad(now.getHours())", self.table_export)
        self.assertIn("pad(now.getMinutes())", self.table_export)
        for filename in [
            "todayExportFilename('merchandise-inventory')",
            "todayExportFilename('jobs')",
            "todayExportFilename('products')",
            "todayExportFilename('import-history')",
            "todayExportFilename('client-requirements')",
            "todayExportFilename('users')",
        ]:
            self.assertIn(filename, self.source)
        self.assertIn("function ExcelExportButton", self.source)
        self.assertIn("function DataTableToolbar", self.source)

    def test_direct_load_fallback_is_configured(self):
        redirects = REDIRECTS.read_text().splitlines()
        self.assertIn("/api/* /api/:splat 200", redirects)
        self.assertIn("/* /index.html 200", redirects)


if __name__ == "__main__":
    unittest.main()
