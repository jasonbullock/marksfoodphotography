import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "frontend" / "src" / "App.jsx"
STYLES = ROOT / "frontend" / "src" / "styles.css"
VOCABULARY = ROOT / "frontend" / "src" / "domainVocabulary.js"
TABLE_EXPORT = ROOT / "frontend" / "src" / "tableExport.js"
WORKFLOW_ENGINE = ROOT / "frontend" / "src" / "workflowEngine.js"
PACKAGE = ROOT / "frontend" / "package.json"
REDIRECTS = ROOT / "frontend" / "public" / "_redirects"


class FrontendRoutingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = APP.read_text()
        cls.styles = STYLES.read_text()
        cls.vocabulary = VOCABULARY.read_text()
        cls.table_export = TABLE_EXPORT.read_text()
        cls.workflow_engine = WORKFLOW_ENGINE.read_text()

    def test_router_library_is_used(self):
        package = json.loads(PACKAGE.read_text())
        self.assertIn("react-router-dom", package["dependencies"])
        self.assertIn("BrowserRouter", self.source)
        self.assertIn("<Routes>", self.source)

    def test_import_routes_remain_import_workspace(self):
        self.assertIn("imports: '/imports'", self.source)
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
            'path="/intake"',
            'path="/planning"',
            'path="/production"',
            'path="/products"',
            'path="/jobs"',
            'path="/jobs/new"',
            'path="/clients"',
            'path="/admin"',
            'path="/admin/:section"',
        ]:
            self.assertIn(route, self.source)

    def test_legacy_routes_redirect_to_canonical_routes(self):
        for route in [
            'path="/receiving" element={<Navigate to="/shipments" replace />}',
            'path="/receipts" element={<Navigate to="/shipments" replace />}',
            'path="/verification" element={<Navigate to="/merchandise/review" replace />}',
            'path="/work" element={<Navigate to="/intake" replace />}',
            'path="/merchandise-review-v2" element={<Navigate to="/intake" replace />}',
            'path="/items" element={<Navigate to="/products" replace />}',
            'path="/intake/import-history" element={<Navigate to="/imports/history" replace />}',
            'path="/settings" element={<Navigate to={`${ADMINISTRATION_PATH}/system`} replace />}',
            'path="/administration" element={<Navigate to={ADMINISTRATION_DEFAULT_PATH} replace />}',
        ]:
            self.assertIn(route, self.source)

    def test_business_language_navigation_is_visible(self):
        for label in [
            "label: 'Dashboard'",
            "label: 'Import'",
            "label: 'Receiving'",
            "label: 'Merchandise'",
            "label: 'Intake'",
            "label: 'Products'",
            "label: 'Jobs'",
        ]:
            self.assertIn(label, self.source)
        nav_section = self.source.split("const NAV_ITEMS = [", 1)[1].split("];", 1)[0]
        self.assertNotIn("label: 'Inventory'", nav_section)
        self.assertNotIn("label: 'Clients'", nav_section)
        self.assertNotIn("label: 'Settings'", nav_section)
        self.assertNotIn("label: 'Imports'", nav_section)
        self.assertNotIn("label: 'Work'", nav_section)
        self.assertNotIn("label: 'Merchandise Review'", nav_section)
        self.assertNotIn("label: 'Merchandise Review V2'", nav_section)
        self.assertIn("merchandiseReview: 'Merchandise Review'", self.vocabulary)
        self.assertIn("products: 'Products'", self.vocabulary)
        self.assertIn("packageName: 'Package Name'", self.vocabulary)
        self.assertIn("merchandiseIdentifier: 'Barcode or ID Number'", self.vocabulary)
        self.assertNotRegex(self.source, r"label:\s*'Verification'")
        self.assertNotRegex(self.source, r"label:\s*'Items'")

    def test_primary_navigation_uses_operational_shell_model(self):
        nav_section = self.source.split("const NAV_ITEMS = [", 1)[1].split("];", 1)[0]
        self.assertIn("{ path: '/merchandise', label: 'Merchandise'", nav_section)
        self.assertIn("{ path: '/intake', label: 'Intake'", nav_section)
        self.assertNotIn("{ path: '/merchandise/review', label: 'Merchandise Review'", nav_section)
        self.assertNotIn("{ path: '/merchandise-review-v2', label: 'Merchandise Review V2'", nav_section)
        self.assertIn("function isPrimaryNavActive", self.source)
        self.assertIn("function isTopNavVisible", self.source)
        self.assertIn("item.path === '/merchandise'", self.source)
        self.assertIn("if (pathname.startsWith('/merchandise/review')) return DOMAIN_TERMS.merchandiseReview;", self.source)
        self.assertIn("if (pathname.startsWith('/intake') || pathname.startsWith('/work') || pathname.startsWith('/merchandise-review-v2')) return 'Intake';", self.source)
        self.assertIn("if (pathname === '/merchandise') return DOMAIN_TERMS.merchandise;", self.source)
        self.assertIn("Download as DownloadIcon", self.source)
        for text in [
            "ClipboardList",
            "Layers",
            "PackageOpen",
            "Tag",
            "Workflow as WorkflowIcon",
        ]:
            self.assertIn(text, self.source)
        for text in [
            "NavImport: () => <DownloadIcon size={20} strokeWidth={1.5} />",
            "NavReceiving: () => <PackageOpen size={20} strokeWidth={1.5} />",
            "NavMerchandise: () => <ClipboardList size={20} strokeWidth={1.5} />",
            "NavWork: () => <WorkflowIcon size={20} strokeWidth={1.5} />",
            "NavJobs: () => <Layers size={20} strokeWidth={1.5} />",
            "NavProducts: () => <Tag size={20} strokeWidth={1.5} />",
        ]:
            self.assertIn(text, self.source)
        for text in [
            "{ path: '/imports', label: 'Import', icon: <Icon.NavImport /> }",
            "{ path: '/shipments', label: 'Receiving', icon: <Icon.NavReceiving /> }",
            "{ path: '/merchandise', label: 'Merchandise', icon: <Icon.NavMerchandise /> }",
            "{ path: '/intake', label: 'Intake', icon: <Icon.NavWork /> }",
            "{ path: '/jobs', label: 'Jobs', icon: <Icon.NavJobs /> }",
            "{ path: '/products', label: 'Products', icon: <Icon.NavProducts /> }",
        ]:
            self.assertIn(text, nav_section)
        expected_order = [
            "label: 'Dashboard'",
            "label: 'Import'",
            "label: 'Receiving'",
            "label: 'Merchandise'",
            "label: 'Intake'",
            "label: 'Jobs'",
            "label: 'Products'",
        ]
        positions = [nav_section.index(label) for label in expected_order]
        self.assertEqual(positions, sorted(positions))

    def test_primary_navigation_active_matching_is_exact_for_merchandise_routes(self):
        matcher = self.source.split("function isPrimaryNavActive", 1)[1].split("function isTopNavVisible", 1)[0]
        top_nav = self.source.split("const primaryNav = (", 1)[1].split("\n  );\n\n  return (", 1)[0]
        self.assertIn("if (item.path === '/merchandise') return pathname === '/merchandise';", matcher)
        self.assertIn("if (item.path === '/imports') return pathname.startsWith('/imports');", matcher)
        self.assertIn("if (item.path === '/intake') return pathname.startsWith('/intake') || pathname.startsWith('/work') || pathname.startsWith('/merchandise-review-v2');", matcher)
        self.assertNotIn("item.path === '/merchandise/review'", matcher)
        self.assertNotIn("item.path === '/merchandise-review-v2'", matcher)
        self.assertNotIn("item.path === '/merchandise') return pathname.startsWith('/merchandise')", matcher)
        self.assertIn("<Link", top_nav)
        self.assertIn("const isActive = isPrimaryNavActive(item, location.pathname);", top_nav)
        self.assertIn("aria-current={isActive ? 'page' : undefined}", top_nav)
        self.assertIn("className={`topbar-nav-link ${isActive ? 'active' : ''}`}", top_nav)
        self.assertNotIn("<NavLink", top_nav)

    def test_shared_subnav_component_owns_page_tab_behavior(self):
        component = self.source.split("function SubNav", 1)[1].split("function CardShell", 1)[0]
        self.assertIn("label = 'Section navigation'", component)
        self.assertIn('role="tablist"', component)
        self.assertIn("aria-label={label}", component)
        self.assertIn('role="tab"', component)
        self.assertIn("aria-selected={isActive}", component)
        self.assertIn("aria-disabled={isDisabled}", component)
        self.assertIn("disabled={isDisabled}", component)
        self.assertIn("item.onClick?.(item)", component)
        self.assertIn("onChange?.(item.id, item)", component)
        self.assertGreaterEqual(self.source.count("<SubNav"), 2)
        self.assertIn(".subnav-tabs", self.styles)
        self.assertIn("overflow-x: auto", self.styles)
        self.assertIn("flex: 0 0 auto", self.styles)
        self.assertIn(".subnav-tab:focus-visible", self.styles)
        self.assertIn(".subnav-tab:disabled", self.styles)

    def test_merchandise_review_uses_shared_subnav_without_equal_width_overrides(self):
        self.assertIn('className="merch-review-subnav"', self.source)
        self.assertIn('<Route path="/merchandise/review" element={<MerchandiseReviewPage />} />', self.source)
        self.assertIn('<Route path="/intake" element={<MerchandiseReviewV2Page />} />', self.source)
        self.assertIn('<Route path="/work" element={<Navigate to="/intake" replace />} />', self.source)
        self.assertIn('<Route path="/merchandise-review-v2" element={<Navigate to="/intake" replace />} />', self.source)
        self.assertNotIn(".merch-review-subnav .subnav-tabs", self.styles)
        self.assertNotIn(".merch-review-subnav .subnav-tab", self.styles)
        self.assertNotIn("flex: 1 1 0;\n  justify-content: center;", self.styles)

    def test_merchandise_review_v2_has_experimental_kanban_board(self):
        for text in [
            "function MerchandiseReviewV2Page",
            "ReadinessIndicators",
            "KanbanBoard",
            "KanbanColumn",
            "KanbanCard",
            "MERCHANDISE_REVIEW_WORKFLOW",
            "evaluateMerchandiseReviewAssignment",
            "WorkflowWorkspaceDrawer",
            "WorkflowWorkspaceSection",
            "WaitingInformationWorkspace",
            "NewReviewModal",
            "workflowForClient",
            "buildWorkOrderCard",
            "MERCH_REVIEW_V2_DECISIONS_KEY",
            "Save & Continue",
            "api.listMerchandiseReviewEntries()",
            '<Route path="/intake" element={<MerchandiseReviewV2Page />} />',
        ]:
            self.assertIn(text, self.source)
        self.assertIn(".work-board-page", self.styles)
        self.assertIn(".kanban-board", self.styles)
        self.assertIn(".kanban-column", self.styles)
        self.assertIn(".kanban-card", self.styles)
        self.assertIn(".workflow-workspace-drawer", self.styles)
        self.assertIn(".waiting-info-drawer", self.styles)
        self.assertIn(".workflow-transition-panel", self.styles)
        self.assertIn(".new-review-modal", self.styles)
        self.assertIn(".new-review-image-pane", self.styles)
        self.assertIn(".new-review-modal-footer", self.styles)
        self.assertIn(".readiness-dot.is-overridden::after", self.styles)
        self.assertIn("recordPhotos(selectedItem?.record)", self.source)
        self.assertIn("setSelectedId", self.source)
        self.assertIn("workspaceOpen", self.source)
        for text in [
            "Review",
            "Waiting for Information",
            "Send to THR3D",
            "Waiting for Activation",
            "Ready for Production",
        ]:
            self.assertIn(text, self.workflow_engine)

    def test_workflow_engine_foundation_exists(self):
        self.assertTrue(WORKFLOW_ENGINE.exists())
        for text in [
            "WORKFLOW_OWNERS",
            "WORKFLOW_STATUS",
            "WORKSTREAM_IDS",
            "WORKSTREAMS",
            "WORKSPACE_MODES",
            "REQUIREMENT_KEYS",
            "GATE_IDS",
            "WORKSPACE_SECTIONS",
            "CARD_FIELDS",
            "WORKFLOW_REGISTRY",
            "MERCHANDISE_REVIEW_WORKFLOW",
            "evaluateMerchandiseReviewRequirements",
            "evaluateMerchandiseReviewAssignment",
            "createWorkflowAssignment",
            "enrichWorkflowAssignment",
            "enrichWorkOrder",
            "evaluateWorkOrder",
            "workflowForClient",
            "buildWorkOrderCard",
            "workspaceModeForGate",
            "routingPreviewForWorkstream",
            "workstreamFromLegacyValue",
            "workstreamDefinition",
            "activeWorkstreamsForClient",
            "workOrderPreview",
            "workstreamLabel",
            "validateWorkflowTransition",
            "gatesForBoard",
            "ownerRole = WORKFLOW_OWNERS.projectManagement",
            "workstream: WORKSTREAM_IDS.thr3d",
            "allowedNextGates",
            "entryCriteria",
            "exitCriteria",
            "transitionMode",
            "workspaceMode",
            "cardFields",
            "workspaceSections",
            "currentGate",
            "currentOwner",
            "currentStatus",
        ]:
            self.assertIn(text, self.workflow_engine)
        self.assertIn("from './workflowEngine'", self.source)
        self.assertNotIn("function validateReviewV2Move", self.source)
        self.assertNotIn("Save Artwork Override", self.source)

    def test_workflow_engine_supports_configured_board_and_transitions(self):
        for text in [
            "boardVisible",
            ".filter(gateConfig => gateConfig.boardVisible !== false",
            ".sort((a, b) => a.order - b.order)",
            "clientWorkflowAssignments",
            "registry.clientWorkflowAssignments?.[clientId]",
            "validNextGates",
            "blockedNextGates",
            "Cannot move to",
            "Missing:",
            "WORKFLOW_STATUS.notApplicable",
            "tone: 'neutral'",
            "visible: applicable",
            "workspaceMode: WORKSPACE_MODES.modal",
            "workspaceMode: WORKSPACE_MODES.readonly",
        ]:
            self.assertIn(text, self.workflow_engine)
        self.assertIn("gate.workspaceSections", self.source)
        self.assertIn("item.workOrder.validNextGates.map", self.source)
        self.assertIn("item.workOrder.blockedNextGates.map", self.source)
        self.assertNotIn("validateWorkflowTransition(defaultWorkflow, item.workOrder, columnId)", self.source)
        self.assertNotIn("Deprecated Airtable Photos - Do Not Use", self.source)

    def test_new_review_gate_uses_modal_and_workstream_decisions(self):
        for text in [
            "selectedWorkspaceMode === 'modal'",
            "workspaceModeForGate(selectedItem?.workOrder?.gate)",
            "NewReviewProductIdentification",
            "NewReviewReadinessSummary",
            "IntakeDecisionSelect",
            "INTAKE_PRODUCTION_TYPE_OPTIONS",
            "INTAKE_MERCHANDISE_RESOLUTION_OPTIONS",
            "PRODUCTION_TYPE_WORKSTREAM_MAP",
            "Merchandise",
            "Product",
            "Linked Product",
            "Search Product",
            "Create Incomplete Product",
            "Production",
            "Production Type",
            "Merchandise Resolution",
            "Select production type",
            "Select resolution",
            "api.updateMerchandiseIntakeDecisions",
            "Readiness",
            "Readiness checks are not configured yet.",
            "Intake notes",
            "Previous Merchandise",
            "Save & Continue",
            "Next Merchandise",
            "setWorkspaceOpen(false)",
            "recordPhotos(selectedItem?.record)",
            "new-review-lightbox",
            "api.searchMerchandiseReviewProducts",
            "api.matchMerchandiseReviewEntry",
        ]:
            self.assertIn(text, self.source)
        for text in [
            ".new-review-product-id",
            ".new-review-inline-status",
            ".intake-decision-field",
        ]:
            self.assertIn(text, self.styles)
        modal_section = self.source.split("function NewReviewModal", 1)[1].split("function MerchandiseReviewV2Page", 1)[0]
        self.assertNotIn("<WorkstreamSelector", modal_section)
        self.assertNotIn("WorkOrderPreview", modal_section)
        self.assertNotIn("api.saveMerchandiseReviewWorkOrders", modal_section)
        for text in [
            "Ecomm Photo",
            "Packaging Photo",
            "THR3D",
            "workflowTemplate",
            "initialGate",
            "subjectType: workstream ? 'work-order' : 'merchandise'",
            "evaluateWorkOrder",
        ]:
            self.assertIn(text, self.workflow_engine)
        registry_section = self.workflow_engine.split("export const WORKSTREAMS = [", 1)[1].split("];", 1)[0]
        for text in ["GS1 Ecomm", "Packaging Photography", "Video", "Other", "Styled Photo"]:
            self.assertNotIn(text, registry_section)
        for text in [
            "Production Path",
            "Required Outputs",
            "PRODUCTION_PATHS",
            "REQUIRED_OUTPUTS",
            "routingPreviewForProductionPaths",
            "saveJsonMap(MERCH_REVIEW_V2_DECISIONS_KEY",
        ]:
            self.assertNotIn(text, self.source + self.workflow_engine)

    def test_merchandise_review_v2_is_merchandise_driven_without_active_work_orders(self):
        for text in [
            "api.listMerchandiseReviewEntries()",
            "api.updateMerchandiseIntakeDecisions",
            "api.updateMerchandiseIntakeState",
            "intakeRequestedGateForRecord(record)",
            "merchandiseId",
            "isDraftWorkOrder",
            "kanban-card-workstream",
        ]:
            self.assertIn(text, self.source)
        for text in [
            "api.listWorkOrders()",
            "api.saveMerchandiseReviewWorkOrders",
            "api.updateWorkOrder",
            "workOrdersByMerchandise",
            "groupWorkOrdersByMerchandise(workOrders)",
            "workOrderRecordId",
            "activeWorkstreamsForClient(selectedItem.record.clientIds?.[0], workstreamOptions)",
        ]:
            self.assertNotIn(text, self.source)
        for text in [
            "updateMerchandiseIntakeDecisions",
            "/intake-decisions",
            "updateMerchandiseIntakeState",
            "/intake-state",
        ]:
            self.assertIn(text, (ROOT / "frontend" / "src" / "api.js").read_text())
        for text in [
            "listWorkOrders",
            "saveMerchandiseReviewWorkOrders",
            "updateWorkOrder",
            "listWorkflowTemplates",
            "listWorkOrderTypes",
        ]:
            self.assertNotIn(text, (ROOT / "frontend" / "src" / "api.js").read_text())
        self.assertIn(".kanban-card-workstream", self.styles)

    def test_waiting_information_gate_has_work_order_workspace(self):
        for text in [
            "function WaitingInformationWorkspace",
            "item.workOrder.currentGate === GATE_IDS.waitingInformation",
            "Missing Information",
            "Product",
            "Search Product",
            "Link Product",
            "Create Incomplete Product",
            "Production",
            "Production Type",
            "Select production type",
            "Merchandise",
            "Merchandise Resolution",
            "Select resolution",
            "api.updateMerchandiseIntakeDecisions",
            "Artwork Required?",
            "Artwork Available?",
            "Artwork Status",
            "Activation",
            "Campaign",
            "Readiness",
            "Readiness checks are not configured yet.",
            "Valid Next Stage(s)",
            "api.searchMerchandiseReviewProducts",
            "api.matchMerchandiseReviewEntry",
            "api.updateItem",
            "api.createItem",
            "saveIntakeReadiness",
            "saveIntakeReadinessAndContinue",
            "Ready for:",
        ]:
            self.assertIn(text, self.source)
        waiting_gate = self.workflow_engine.split("id: GATE_IDS.waitingInformation", 1)[1].split("gate({", 1)[0]
        self.assertIn("WORKSPACE_SECTIONS.notes", waiting_gate)
        self.assertNotIn("WORKSPACE_SECTIONS.issues", waiting_gate)
        for text in [
            "notes: 'notes'",
            "entryCriteria",
            "exitCriteria",
            "validNextGates",
            "blockedNextGates",
        ]:
            self.assertIn(text, self.workflow_engine)
        for text in [
            ".waiting-info-missing",
            ".waiting-product-search",
            ".waiting-product-fields",
            ".waiting-readiness-list",
            ".waiting-info-footer",
        ]:
            self.assertIn(text, self.styles)

    def test_admin_is_utility_navigation_not_primary_navigation(self):
        nav_section = self.source.split("const NAV_ITEMS = [", 1)[1].split("];", 1)[0]
        self.assertNotIn("path: '/settings'", nav_section)
        self.assertNotIn("path: '/clients'", nav_section)
        self.assertIn("const ADMINISTRATION_PATH = '/admin';", self.source)
        self.assertIn("const ADMINISTRATION_DEFAULT_PATH = '/admin/users';", self.source)
        self.assertIn("const ADMIN_NAV_ITEM = { path: ADMINISTRATION_DEFAULT_PATH, label: 'Admin'", self.source)
        self.assertIn("showAdminShortcut", self.source)
        self.assertIn("to={ADMINISTRATION_DEFAULT_PATH}", self.source)
        self.assertIn("location.pathname.startsWith('/admin')", self.source)
        self.assertIn("topbar-user-popover", self.source)
        self.assertRegex(self.source, r">\s*Admin\s*</NavLink>")

    def test_admin_does_not_expose_workflow_templates_configuration(self):
        for text in [
            "Workflow Templates",
            "function WorkflowTemplatesSection",
            "api.listWorkflowTemplates()",
            "api.createWorkflowTemplate",
            "api.updateWorkflowTemplate",
            "api.duplicateWorkflowTemplate",
            "api.createWorkflowStage",
            "api.updateWorkflowStage",
            "api.deactivateWorkflowStage",
            "Workflow configuration is currently operating through the existing compatibility mapping",
            "Stage keys must be unique within a template.",
            "if (activeCard.id === 'workflow-templates') return <WorkflowTemplatesSection />;",
        ]:
            self.assertNotIn(text, self.source)

    def test_admin_does_not_expose_work_order_types_configuration(self):
        for text in [
            "Work Order Types",
            "function WorkOrderTypesSection",
            "api.listWorkOrderTypes()",
            "api.createWorkOrderType",
            "api.updateWorkOrderType",
            "api.duplicateWorkOrderType",
            "api.setDefaultWorkOrderType",
            "api.activateWorkOrderType",
            "api.deactivateWorkOrderType",
            "Work Order Types define the business purpose of a Work Order",
            "The active default Work Order Type cannot be deactivated.",
            "if (activeCard.id === 'work-order-types') return <WorkOrderTypesSection />;",
        ]:
            self.assertNotIn(text, self.source)
        self.assertRegex(self.source, r">\s*Profile\s*</button>")
        self.assertRegex(self.source, r">\s*Sign Out\s*</button>")
        self.assertNotIn("sidebar-admin-link", self.source)

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

    def test_admin_surfaces_canonical_table_mapping(self):
        for text in [
            "s.tables?.products || s.tables?.skus || 'Products'",
            "s.tables?.shipments || s.tables?.receipts || 'Shipments'",
            "s.tables?.merchandise || s.tables?.receiptEntries || 'Merchandise'",
        ]:
            self.assertIn(text, self.source)
        self.assertIn("PRODUCTS: 'Products'", (ROOT / "frontend" / "src" / "api.js").read_text())
        self.assertIn("SHIPMENTS: 'Shipments'", (ROOT / "frontend" / "src" / "api.js").read_text())
        self.assertIn("MERCHANDISE: 'Merchandise'", (ROOT / "frontend" / "src" / "api.js").read_text())

    def test_shared_application_shell_components_exist(self):
        for text in [
            "function TopNavigation",
            "function WorkspaceHeader",
            "function WorkspaceLayout",
            "function QueuePanel",
            "function WorkspaceCanvas",
            "function InspectorPanel",
            "function PanelCollapseButton",
            "function SearchControl",
            "function FilterControl",
            "function ViewSwitcher",
            "function CountBadge",
            "function EmptyState",
            "function LoadingState",
            "function ErrorState",
            "function CardShell",
            "function MediaThumbnail",
            "function MetadataRow",
            "function ActionBar",
            "className=\"app-topbar\"",
            "workspace-shell-layout ${className}",
        ]:
            self.assertIn(text, self.source)
        for selector in [
            ".app-shell.app-shell-topnav",
            ".app-topbar",
            ".topbar-primary-nav",
            ".topbar-mobile-panel",
            ".workspace-header",
            ".workspace-shell-layout",
            ".queue-panel",
            ".workspace-canvas",
            ".inspector-panel",
        ]:
            self.assertIn(selector, self.styles)

    def test_import_mappings_keep_internal_field_names_with_user_labels(self):
        self.assertIn("'Product Name': 'itemName'", self.source)
        self.assertIn("'Product Job Number': 'itemJobNumber'", self.source)
        self.assertIn("getFieldLabel('Product Name', 'product')", self.source)
        self.assertIn("getFieldLabel('Product Job Number', 'product')", self.source)
        self.assertIn("Source column", self.source)
        self.assertIn("Destination field", self.source)
        self.assertIn("Airtable field:", self.source)

    def test_technical_airtable_names_are_labeled_as_technical(self):
        self.assertIn("technicalTableLabel(s.tables?.products || s.tables?.skus || 'Products')", self.source)
        self.assertIn("technicalTableLabel(s.tables?.shipments || s.tables?.receipts || 'Shipments')", self.source)
        self.assertIn("technicalTableLabel(s.tables?.merchandise || s.tables?.receiptEntries || 'Merchandise')", self.source)
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
        self.assertIn('<Route path="/merchandise/review" element={<MerchandiseReviewPage />} />', self.source)
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
        self.assertIn("isPrimaryNavActive(item, location.pathname)", self.source)
        self.assertIn("item.path === '/shipments'", self.source)

    def test_role_navigation_uses_canonical_paths(self):
        self.assertIn("Admin:        ['/dashboard', '/imports', '/shipments', '/merchandise', '/intake', '/products', '/jobs']", self.source)
        self.assertIn("Receiver:     ['/shipments', '/merchandise']", self.source)
        self.assertIn("PM:           ['/dashboard', '/merchandise', '/intake', '/products', '/jobs']", self.source)

    def test_merchandise_inventory_page_has_required_filters(self):
        for text in [
            "Search merchandise",
            'aria-label="Client"',
            'aria-label="Status"',
            'aria-label="Storage Location"',
            'aria-label="Condition"',
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
        self.assertIn("conditionFilter !== 'all'", self.source)
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
        self.assertIn("Open Merchandise Review", self.source)
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
            "merchandise-inventory-location",
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
        self.assertIn("record.storageLocation", card_section)
        self.assertNotIn("<strong>Client:</strong>", card_section)
        self.assertNotIn("<strong>Qty:</strong>", card_section)
        for forbidden in [
            "Date Received",
            "matchedProduct",
            "condition",
            "shipment",
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
            ".merchandise-inventory-location",
            ".merchandise-detail-drawer",
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
