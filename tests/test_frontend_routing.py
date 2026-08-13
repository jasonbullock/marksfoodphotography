import json
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "frontend" / "src" / "App.jsx"
STYLES = ROOT / "frontend" / "src" / "styles.css"
VOCABULARY = ROOT / "frontend" / "src" / "domainVocabulary.js"
TABLE_EXPORT = ROOT / "frontend" / "src" / "tableExport.js"
MERCHANDISE_ROUTING = ROOT / "frontend" / "src" / "merchandiseRouting.js"
PACKAGE = ROOT / "frontend" / "package.json"
REDIRECTS = ROOT / "frontend" / "public" / "_redirects"


class FrontendRoutingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = APP.read_text()
        cls.styles = STYLES.read_text()
        cls.vocabulary = VOCABULARY.read_text()
        cls.table_export = TABLE_EXPORT.read_text()
        cls.merchandise_routing = MERCHANDISE_ROUTING.read_text()

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
            'path="/planning"',
            'path="/intake"',
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
            'path="/intake" element={<Navigate to="/planning" replace />}',
            'path="/work" element={<Navigate to="/planning" replace />}',
            'path="/merchandise-review-v2" element={<Navigate to="/planning" replace />}',
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
            "label: 'Shipments'",
            "label: 'Merchandise'",
            "label: 'Planning'",
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
        self.assertIn("packageName: 'Product Name on Package'", self.vocabulary)
        self.assertIn("merchandiseIdentifier: 'UPC / ID'", self.vocabulary)
        self.assertNotRegex(self.source, r"label:\s*'Verification'")
        self.assertNotRegex(self.source, r"label:\s*'Items'")

    def test_primary_navigation_uses_operational_shell_model(self):
        nav_section = self.source.split("const NAV_ITEMS = [", 1)[1].split("];", 1)[0]
        self.assertIn("{ path: '/merchandise', label: 'Merchandise'", nav_section)
        self.assertIn("{ path: '/planning', label: 'Planning'", nav_section)
        self.assertNotIn("{ path: '/merchandise/review', label: 'Merchandise Review'", nav_section)
        self.assertNotIn("{ path: '/merchandise-review-v2', label: 'Merchandise Review V2'", nav_section)
        self.assertIn("function isPrimaryNavActive", self.source)
        self.assertIn("function isTopNavVisible", self.source)
        self.assertIn("item.path === '/merchandise'", self.source)
        self.assertIn("if (pathname.startsWith('/merchandise/review')) return DOMAIN_TERMS.merchandiseReview;", self.source)
        self.assertIn("if (pathname.startsWith('/planning') || pathname.startsWith('/intake') || pathname.startsWith('/work') || pathname.startsWith('/merchandise-review-v2')) return 'Planning';", self.source)
        self.assertIn("if (pathname === '/merchandise') return DOMAIN_TERMS.merchandise;", self.source)
        self.assertIn("Download as DownloadIcon", self.source)
        for text in [
            "ClipboardList",
            "Kanban",
            "Layers",
            "PackageOpen",
            "SquareKanban",
            "Tag",
        ]:
            self.assertIn(text, self.source)
        for text in [
            "NavImport: () => <DownloadIcon size={20} strokeWidth={1.5} />",
            "NavShipments: () => <PackageOpen size={20} strokeWidth={1.5} />",
            "NavMerchandise: () => <ClipboardList size={20} strokeWidth={1.5} />",
            "NavWork: () => <Kanban size={20} strokeWidth={1.5} />",
            "NavProduction: () => <SquareKanban size={20} strokeWidth={1.5} />",
            "NavJobs: () => <Layers size={20} strokeWidth={1.5} />",
            "NavProducts: () => <Tag size={20} strokeWidth={1.5} />",
        ]:
            self.assertIn(text, self.source)
        for text in [
            "{ path: '/imports', label: 'Import', icon: <Icon.NavImport /> }",
            "{ path: '/shipments', label: 'Shipments', icon: <Icon.NavShipments /> }",
            "{ path: '/merchandise', label: 'Merchandise', icon: <Icon.NavMerchandise /> }",
            "{ path: '/planning', label: 'Planning', icon: <Icon.NavWork /> }",
            "{ path: '/jobs', label: 'Jobs', icon: <Icon.NavJobs /> }",
            "{ path: '/products', label: 'Products', icon: <Icon.NavProducts /> }",
        ]:
            self.assertIn(text, nav_section)
        expected_order = [
            "label: 'Dashboard'",
            "label: 'Import'",
            "label: 'Shipments'",
            "label: 'Merchandise'",
            "label: 'Planning'",
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
        self.assertIn("if (item.path === '/planning') return pathname.startsWith('/planning') || pathname.startsWith('/intake') || pathname.startsWith('/work') || pathname.startsWith('/merchandise-review-v2');", matcher)
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
        self.assertIn('<Route path="/planning" element={<MerchandiseReviewV2Page />} />', self.source)
        self.assertIn('<Route path="/intake" element={<Navigate to="/planning" replace />} />', self.source)
        self.assertIn('<Route path="/work" element={<Navigate to="/planning" replace />} />', self.source)
        self.assertIn('<Route path="/merchandise-review-v2" element={<Navigate to="/planning" replace />} />', self.source)
        self.assertNotIn(".merch-review-subnav .subnav-tabs", self.styles)
        self.assertNotIn(".merch-review-subnav .subnav-tab", self.styles)
        self.assertNotIn("flex: 1 1 0;\n  justify-content: center;", self.styles)

    def test_merchandise_review_v2_has_experimental_kanban_board(self):
        for text in [
            "function MerchandiseReviewV2Page",
            "RequiredToShootIndicators",
            "requiredToShootSummary",
            "KanbanBoard",
            "KanbanColumn",
            "KanbanCard",
            "MERCHANDISE_PLANNING_BOARD",
            "evaluateMerchandiseReviewAssignment",
            "PlanningWorkspaceDrawer",
            "PlanningWorkspaceSection",
            "WaitingInformationWorkspace",
            "NewReviewModal",
            "planningBoardForClient",
            "buildPlanningCard",
            "MERCH_REVIEW_V2_DECISIONS_KEY",
            "PM_QUEUE_COLUMNS",
            "label: 'New Merch'",
            "label: 'Needs Product / Work'",
            "label: 'Awaiting Info/Activation'",
            "Mark Merch Reviewed",
            "newReviewContextForItem",
            "kanban-review-context",
            "kanban-card-client-eyebrow",
            "kanban-photo-count",
            "ConversationPanel",
            "ActivityPanel",
            "api.listMerchandiseReviewEntries()",
            '<Route path="/planning" element={<MerchandiseReviewV2Page />} />',
        ]:
            self.assertIn(text, self.source)
        api_source = (ROOT / "frontend" / "src" / "api.js").read_text()
        self.assertIn("api.listMerchandiseComments", api_source)
        self.assertIn("api.createMerchandiseComment", api_source)
        self.assertIn(".work-board-page", self.styles)
        self.assertIn(".kanban-board", self.styles)
        self.assertIn(".kanban-column", self.styles)
        self.assertIn(".kanban-card", self.styles)
        self.assertNotIn(".kanban-card-action", self.styles)
        self.assertIn(".kanban-required-checks", self.styles)
        self.assertIn(".kanban-age-badge", self.styles)
        self.assertIn(".kanban-comment-signal", self.styles)
        self.assertIn(".kanban-column-summary > span", self.styles)
        self.assertIn(".kanban-comment-signal.has-recent", self.styles)
        self.assertIn("background: rgba(255, 251, 235, 0.92);", self.styles)
        self.assertIn("function CommentCountChip", self.source)
        self.assertIn("<CommentCountChip count={item.commentCount} unread={item.unreadComments} recent={item.recentComment} />", self.source)
        self.assertIn("<CommentCountChip", self.source)
        self.assertIn("count={withComments}", self.source)
        self.assertIn("className=\"is-column\"", self.source)
        self.assertIn("<CommentCountChip count={comments.length} className=\"is-support\" />", self.source)
        self.assertIn("const APP_TIME_ZONE = 'America/Chicago';", self.source)
        self.assertIn("const RECENT_COMMENT_WINDOW_MS = 4 * 60 * 60 * 1000;", self.source)
        self.assertIn("function hasRecentPlanningComment", self.source)
        self.assertIn("const recentComment = hasRecentPlanningComment(comments);", self.source)
        self.assertIn("recentComment,", self.source)
        self.assertIn(".conversation-avatar", self.styles)
        self.assertIn(".conversation-count", self.styles)
        self.assertIn(".new-review-support-summary", self.styles)
        self.assertIn(".kanban-comment-signal.is-support", self.styles)
        self.assertIn(".conversation-author-name", self.styles)
        self.assertIn(".conversation-meta-line", self.styles)
        self.assertNotIn("function formatCommentRole", self.source)
        self.assertNotIn("comment.author?.role", self.source)
        self.assertIn(".conversation-error", self.styles)
        self.assertIn(".activity-event time", self.styles)
        self.assertIn(".planning-workspace-drawer", self.styles)
        self.assertIn(".waiting-info-drawer", self.styles)
        self.assertIn(".planning-transition-panel", self.styles)
        self.assertIn(".new-review-modal", self.styles)
        self.assertIn(".new-review-image-pane", self.styles)
        self.assertIn(".new-review-image-layout", self.styles)
        self.assertIn(".verification-wizard-progress", self.styles)
        self.assertIn(".new-review-modal-footer", self.styles)
        self.assertIn(".required-to-shoot-dot.is-overridden::after", self.styles)
        self.assertIn("recordPhotos(selectedItem?.record)", self.source)
        self.assertIn("setSelectedId", self.source)
        self.assertIn("workspaceOpen", self.source)
        self.assertIn("function RequiredToShootPreview", self.source)
        self.assertIn("function ageBucketForItem", self.source)
        self.assertIn("showNewCardClient", self.source)
        self.assertIn("const showStorage = false && !isNewQueue && storage;", self.source)
        self.assertIn("const showQuantity = !isNewQueue || Number(quantity) > 1;", self.source)
        self.assertIn("const showFooter = item.commentCount > 0 || item.unreadComments > 0;", self.source)
        self.assertNotIn("Needs PM review", self.source)
        self.assertNotIn("New Arrival", self.source)
        self.assertNotIn("Deliverables not set", self.source)
        self.assertIn("const showRequiredIndicators = !isNewQueue && !activationState", self.source)
        self.assertIn("{showRequiredIndicators && <RequiredToShootIndicators items={item.requiredToShoot} />}", self.source)
        self.assertIn("const showRequiredPreview = !isNewQueue && !activationState", self.source)
        self.assertIn("const showStatusChip = !isNewQueue && !activationState", self.source)
        self.assertIn("{showRequiredPreview && <RequiredToShootPreview item={item} ready={ready} />}", self.source)
        self.assertNotIn(".kanban-new-arrival-label", self.styles)
        self.assertNotIn(".kanban-new-soft-prompt", self.styles)
        self.assertIn(".kanban-status-chip.is-new", self.styles)
        self.assertIn("const KanbanCard = memo(KanbanCardComponent)", self.source)
        self.assertIn("setDragState('drag-target')", self.source)
        self.assertIn("list.scrollTop = list.scrollHeight", self.source)
        for text in [
            "New",
            "Waiting",
            "Thr3d Shipment",
            "Planning",
            "Ready for Photo",
        ]:
            self.assertIn(text, self.merchandise_routing)

    def test_planning_comments_use_backend_authors_and_card_counts(self):
        for text in [
            "api.listMerchandiseComments(record.id)",
            "api.createMerchandiseComment(merchandiseId, body)",
            "comment.author?.displayName",
            "count={item.commentCount}",
            "item.unreadComments > 0",
            "marks:planning-board-comment-reads",
        ]:
            self.assertIn(text, self.source)
        self.assertNotIn("comment.author?.role", self.source)
        self.assertNotIn("PM_CONVERSATION_STORAGE_KEY", self.source)
        self.assertNotIn("authorName: pmCommentUserDisplayName", self.source)
        self.assertNotIn("'Team'", self.source)

    def test_new_review_modal_hides_required_to_shoot_for_now(self):
        modal_section = self.source.split("function NewReviewModal", 1)[1].split("function PlanningActivationPackageModal", 1)[0]
        self.assertNotIn('className="new-review-required-to-shoot"', self.source)
        self.assertNotIn('className="new-review-required-to-shoot-strip"', self.source)
        self.assertNotIn("function RequiredToShootStrip", self.source)
        self.assertNotIn("function NewReviewRequiredInformation", self.source)
        self.assertNotIn('title="Required to Shoot"', modal_section)
        self.assertNotIn("Complete required information", modal_section)
        self.assertIn("!wizardState.productLinked || wizardState.deliverables.length === 0", modal_section)
        self.assertIn("'Mark Merch Reviewed'", modal_section)
        self.assertNotIn("requiredToShoot-text", self.source)
        self.assertNotIn("new-review-requiredToShoot", self.source)
        self.assertNotIn("<small>{chip.hint}</small>", self.source)

    def test_shipments_supports_shipment_level_photo_capture(self):
        for text in [
            "api.uploadShipmentPhotos",
            "api.deleteShipmentPhoto",
            "shipmentCameraInputRef",
            "shipmentLibraryInputRef",
            "shipmentPhotoPreviews",
            "<label>Shipment Photos</label>",
            "async function createShipment({ toast: showToast = true } = {})",
            "const activeReceipt = receipt || await createShipment({ toast: false });",
            "Adding shipment photos saves this shipment.",
            "Shipment needs photos",
            "Add shipment photos to save this shipment.",
            "Add shipment photos in Shipment Details before saving merchandise.",
            "Merchandise Photos",
            "entryPhotos.length > 0 ? 'Added' : 'Required'",
            "className={entryPhotos.length > 0 ? 'is-complete' : ''}",
            "Shipment saved",
            "Changes to shipment details save when you leave each field.",
            "recv-autosave-card",
            'type="file" accept="image/*" capture="environment" multiple hidden',
            'type="file" accept="image/*" multiple hidden',
            'className="recv-photo-btns shipment-photo-actions"',
            'className="recv-camera-btn"',
            'className="recv-library-btn"',
            "<Camera size={17}",
            "<Images size={17}",
            "recordPhotos(receipt)",
            "shipment-photo-field",
            "shipment-photo-thumb",
            'disabled={Boolean(saving) || entryPhotos.length === 0}',
            ".recv-required-row",
        ]:
            self.assertIn(text, self.source + self.styles)
        for text in [
            "const merchandiseEntryLocked = !receipt",
            "recv-item-panel${merchandiseEntryLocked ? ' is-locked' : ''}",
            "disabled={merchandiseEntryLocked}",
            "Shipment details first",
            "Adding shipment photos saves this shipment and unlocks merchandise entry.",
            "disabled={!receipt || Boolean(saving) || entryPhotos.length === 0}",
        ]:
            self.assertNotIn(text, self.source)
        for selector in [
            ".recv-item-panel.is-locked .recv-form-content",
            ".recv-locked-card",
        ]:
            self.assertNotIn(selector, self.styles)
        self.assertNotIn("📷 Take Photo", self.source)
        self.assertNotIn("🖼 Library", self.source)
        self.assertNotIn("Shipment will autosave", self.source)
        self.assertNotIn("Selecting photos will start and save this shipment automatically.", self.source)
        self.assertNotIn("Save merchandise or add shipment photos to start this shipment.", self.source)
        self.assertNotIn("Create & Take Photo", self.source)
        self.assertNotIn("Create & Library", self.source)
        self.assertNotIn("recv-create-btn", self.source + self.styles)
        self.assertIn("api.listShipmentPhotos", (ROOT / "frontend" / "src" / "api.js").read_text())
        self.assertIn("api.uploadShipmentPhotos", (ROOT / "frontend" / "src" / "api.js").read_text())
        self.assertIn("api.deleteShipmentPhoto", (ROOT / "frontend" / "src" / "api.js").read_text())

    def test_all_shipments_can_switch_list_date_and_open_for_edit(self):
        shipments_section = self.source.split("function ShipmentsPage", 1)[1].split("function JobsPage", 1)[0]
        for text in [
            "useState('list'); // 'date' | 'list'",
            "allReceiptsDateScope",
            "setAllReceiptsDateScope('previous-week')",
            "setAllReceiptsDateScope('this-week')",
            "setAllReceiptsDateScope('month')",
            "Previous Week",
            "This Week",
            "Month",
            "setAllReceiptsLayout('list')",
            "setAllReceiptsLayout('date')",
            "function openReceiptForEdit(receiptId)",
            "async function deleteShipmentFromHistory(shipment)",
            "setTab('incoming')",
            "Delete",
            "recv-all-list",
            "recv-all-list-head",
            "recv-all-item-open",
            "recv-all-row-actions",
            "recv-all-delete",
            "recv-cal-grid",
            "recv-date-scope-toggle",
            "api.deleteReceivingSession(shipment.id)",
            "Remove merchandise from this Shipment before deleting it.",
            "weekColumns(allReceiptsDateScope === 'previous-week' ? -1 : 0)",
            "monthColumns()",
            "onClick={() => openReceiptForEdit(r.id)}",
            "onClick={() => deleteShipmentFromHistory(r)}",
        ]:
            self.assertIn(text, shipments_section + self.styles)
        self.assertNotIn("By Shipment", shipments_section)
        self.assertNotIn("By Merchandise", shipments_section)
        self.assertNotIn("allReceiptsView", shipments_section)
        self.assertNotIn("setTab('new')", shipments_section)

    def test_shipments_exposes_incoming_and_thr3d_outgoing_views(self):
        for text in [
            "useState('incoming')",
            "api.listThr3dShippingItems()",
            "{ id: 'incoming', label: 'Incoming'",
            "{ id: 'outgoing', label: 'THR3D / Outgoing'",
            "THR3D Queue",
            "THR3D shipping items from Planning appear here",
            "Confirmed THR3D quantities from New Merch",
            "recv-outgoing-row",
            "recv-outgoing-view",
            "api.shipThr3dShippingItem(record.id",
            "recv-outgoing-ship",
            "placeholder=\"Tracking\"",
            "Shipping...",
        ]:
            self.assertIn(text, self.source)

    def test_shipments_received_badge_is_confirmed_not_warning(self):
        shipments_section = self.source.split("function ShipmentsPage", 1)[1].split("function MerchandisePage", 1)[0]
        self.assertIn("['Received', 'Ready to Ship', 'Shipped', 'Disposed'].includes(merchStatus)", shipments_section)
        self.assertIn("const statusIcon = merchStatus === 'Received' ? ''", shipments_section)
        self.assertIn("statusIcon ? `${statusIcon} ` : ''", shipments_section)
        ok_section = self.styles.split(".receiving-status-line .is-ok", 1)[1].split("}", 1)[0]
        self.assertIn("var(--green-bg)", ok_section)
        self.assertIn("var(--green-text)", ok_section)
        self.assertIn("var(--green-border)", ok_section)

    def test_planning_carousel_distinguishes_shipment_photos(self):
        for text in [
            "record?.itemPhotos",
            "record?.shipmentPhotos",
            "photoSourceLabel",
            "Shipment Photo",
            "sourceLabel",
        ]:
            self.assertIn(text, self.source)

    def test_workflow_engine_foundation_exists(self):
        self.assertTrue(MERCHANDISE_ROUTING.exists())
        for text in [
            "PLANNING_OWNERS",
            "REQUIREMENT_STATUS",
            "DELIVERABLE_ROUTE_IDS",
            "DELIVERABLE_ROUTES",
            "WORKSPACE_MODES",
            "REQUIREMENT_KEYS",
            "QUEUE_IDS",
            "WORKSPACE_SECTIONS",
            "CARD_FIELDS",
            "BOARD_IDS",
            "BOARD_STATE_MODEL",
            "PLANNING_BOARD_REGISTRY",
            "MERCHANDISE_PLANNING_BOARD",
            "evaluateMerchandiseReviewRequirements",
            "evaluateMerchandiseReviewAssignment",
            "createPlanningCard",
            "enrichPlanningCard",
            "enrichPlanningCardAlias",
            "evaluateDeliverablePlanningCard",
            "planningBoardForClient",
            "buildPlanningCard",
            "workspaceModeForQueue",
            "routingPreviewForDeliverableRoute",
            "deliverableRouteFromLegacyValue",
            "deliverableRouteDefinition",
            "activeDeliverableRoutesForClient",
            "planningRoutePreview",
            "deliverableRouteLabel",
            "validatePlanningMove",
            "queuesForBoard",
            "ownerRole = PLANNING_OWNERS.projectManagement",
            "deliverableRoute: DELIVERABLE_ROUTE_IDS.thr3d",
            "allowedNextQueues",
            "entryCriteria",
            "exitCriteria",
            "transitionMode",
            "workspaceMode",
            "cardFields",
            "workspaceSections",
            "currentQueue",
            "currentOwner",
            "currentStatus",
            "productionScheduled: 'production-scheduled'",
            "productionInProgress: 'production-in-progress'",
            "productionQc: 'production-qc'",
            "productionComplete: 'production-complete'",
            "label: 'Planning Board'",
            "label: 'Production Board'",
            "shared: [QUEUE_IDS.readyProduction]",
        ]:
            self.assertIn(text, self.merchandise_routing)
        self.assertIn("from './merchandiseRouting'", self.source)
        self.assertNotIn("function validateReviewV2Move", self.source)
        self.assertNotIn("Save Artwork Override", self.source)

    def test_workflow_engine_supports_configured_board_and_transitions(self):
        for text in [
            "boardVisible",
            ".filter(queueConfig => queueConfig.boardVisible !== false",
            ".sort((a, b) => a.order - b.order)",
            "clientBoardAssignments",
            "registry.clientBoardAssignments?.[clientId]",
            "validNextQueues",
            "blockedNextQueues",
            "Cannot move to",
            "Missing:",
            "REQUIREMENT_STATUS.notApplicable",
            "tone: 'neutral'",
            "visible: applicable",
            "workspaceMode: WORKSPACE_MODES.modal",
            "workspaceMode: WORKSPACE_MODES.readonly",
        ]:
            self.assertIn(text, self.merchandise_routing)
        self.assertIn("queue.workspaceSections", self.source)
        self.assertIn("item.planningCard.validNextQueues.map", self.source)
        self.assertIn("item.planningCard.blockedNextQueues.map", self.source)
        self.assertNotIn("validatePlanningMove(defaultWorkflow, item.planningCard, columnId)", self.source)
        self.assertNotIn("Deprecated Airtable Photos - Do Not Use", self.source)

    def test_new_review_gate_uses_modal_and_workstream_decisions(self):
        for text in [
            "workspaceOpen && selectedItem",
            "workspaceModeForQueue(selectedItem?.planningCard?.queue)",
            "NewReviewProductIdentification",
            "DeliverablesSelector",
            "INTAKE_DELIVERABLE_OPTIONS",
            "DELIVERABLE_ROUTE_MAP",
            "Match Product",
            "Linked Product",
            "Search Product",
            "Create Incomplete Product",
            "Deliverables",
            "deliverables",
            "api.updateMerchandiseIntakeDecisions",
            "Product Name on Package",
            "UPC / ID",
            "Conversation",
            "Activity",
            "Add a comment",
            "Previous Merchandise",
            "finishCurrentVerification",
            "Next Merchandise",
            "setWorkspaceOpen(false)",
            "recordPhotos(selectedItem?.record)",
            "nr-lightbox",
            "api.searchMerchandiseReviewProducts",
            "api.matchMerchandiseReviewEntry",
        ]:
            self.assertIn(text, self.source)
        self.assertNotIn("function MerchandiseVerifyPanel", self.source)
        self.assertNotIn("Verify to continue", self.source)
        for text in [
            ".new-review-product-search-fields",
            ".new-review-inline-status",
            ".intake-deliverable-option",
            ".intake-deliverable-check",
            ".intake-deliverable-option.is-selected",
            "background: var(--blue-bg);",
            "color: var(--blue-text);",
            ".intake-deliverable-option:has(input:focus-visible)",
            ".intake-deliverable-option:has(input:disabled)",
            ".deliverables-inline-error",
            ".required-information-section",
            ".new-review-finish-summary",
            ".new-review-support-panel",
            ".new-review-support-body",
            ".conversation-panel",
            ".activity-panel",
            ".new-review-footer-left",
            ".new-review-footer-actions",
            "grid-template-columns: minmax(360px, 430px) minmax(0, 1fr);",
        ]:
            self.assertIn(text, self.styles)
        self.assertNotIn("--deliverable-selected-fill", self.styles)
        self.assertNotIn("--deliverable-selected-text", self.styles)
        self.assertNotIn("--deliverable-check", self.styles)
        deliverables_selector = self.source.split("function DeliverablesSelector", 1)[1].split("function NewReviewProductIdentification", 1)[0]
        for text in [
            'type="checkbox"',
            "checked={selected}",
            "onChange={() => toggle(option)}",
            "enforceExclusiveGs1Deliverables(nextValues, option)",
            "selected ? 'is-selected' : ''",
        ]:
            self.assertIn(text, deliverables_selector)
        self.assertNotIn("aria-pressed", deliverables_selector)
        modal_section = self.source.split("function NewReviewModal", 1)[1].split("function PlanningActivationPackageModal", 1)[0]
        finish_handler = self.source.split("async function finishVerification", 1)[1].split("async function closePlanningWorkspace", 1)[0]
        self.assertNotIn("Save Deliverables", modal_section)
        self.assertNotIn("Required to Shoot", modal_section)
        self.assertNotIn("NewReviewRequiredInformation", modal_section)
        self.assertNotIn("RequiredToShootStrip", modal_section)
        self.assertNotIn("NewReviewActivationPanel", modal_section)
        self.assertNotIn("Pending Activation", modal_section)
        self.assertIn("NewReviewSupportPanel", modal_section)
        self.assertIn("<aside className=\"new-review-support-panel\"", self.source)
        self.assertIn("Notes & history", self.source)
        self.assertNotIn("<details className=\"new-review-support-panel\"", modal_section)
        self.assertNotIn("<summary>", modal_section)
        self.assertNotIn("Resolution", modal_section)
        self.assertNotIn("Observed Package Name", modal_section)
        self.assertNotIn("Observed Identifier", modal_section)
        self.assertNotIn("ReleaseToProductionAction", modal_section)
        self.assertIn("Retry", self.source)
        self.assertNotIn("<DeliverableSelector", modal_section)
        self.assertNotIn("Select production type", modal_section)
        self.assertNotIn("productionTypes", modal_section)
        self.assertNotIn("productionType", modal_section)
        self.assertNotIn("WorkOrderPreview", modal_section)
        self.assertNotIn("api.saveMerchandiseReviewWorkOrders", modal_section)
        self.assertNotIn("Intake notes", modal_section)
        for text in [
            "finishCurrentVerification",
            "finishState.status === 'loading'",
            "Creating...",
            "disabled={finishDisabled}",
            "is-${finishState.status}",
            "Confirm & Assign",
            "Will create:",
            "<b>{routeDestination}</b>",
            "assignmentCreationSummary(assignmentPreview)",
            "Draft only. Nothing changes until Confirm & Assign.",
            "collapseWhenDone={false}",
            "window.confirm(THR3D_SHIP_CONFIRMATION_MESSAGE)",
            "thr3d-ship-warning",
            "quantity-allocation-panel",
            "Split received quantity",
            "Qty received {totalQuantity}",
            "Assigned {allocatedQuantity} of {totalQuantity}",
            "quantity-split-warning",
            "Received quantity cannot be split",
            "splitNeedsMultipleUnits",
            "Mark Merch Reviewed",
            "assignmentPrimaryActionLabel(assignmentPreview)",
            "stageThr3dAllocation",
            "Packaging",
            "readOnly disabled",
            "initialReviewDeliverables(item.record)",
            "showProductRequestTypeSuggestion",
            "Suggested from Product Request Type:",
        ]:
            self.assertIn(text, modal_section)
        self.assertIn("Create ${workstreams[0].type} Workstream", self.source)
        self.assertIn("Create THR3D Shipment", self.source)
        self.assertIn("function needsProductWorkQueue", self.source)
        self.assertIn("needsProductWorkQueue(record)", self.source)
        self.assertIn("Workstream cards belong in Awaiting Info/Activation", self.source)
        self.assertIn("const value = String(status || '').trim().toLowerCase();\n  if (value === 'ready for photo') return QUEUE_IDS.readyProduction;\n  return QUEUE_IDS.waitingInformation;", self.source)
        self.assertIn("requestedQueueId: QUEUE_IDS.waitingInformation", self.source)
        for text in [
            "function assignmentCreationSummary",
            "1 THR3D shipment",
            "1 ${workstreams[0].type} workstream",
            "${workstreams.length} workstreams",
        ]:
            self.assertIn(text, self.source)
        self.assertIn("This item will be removed from the Walnut work queue and be shipped to Thr3d.", self.source)
        self.assertNotIn("deliverablesAutosaveTimer", modal_section)
        self.assertNotIn("api.updateMerchandiseIntakeDecisions", modal_section)
        self.assertNotIn("Deliverables saved.", modal_section)
        self.assertNotIn("Saving...", modal_section)
        self.assertNotIn("'Ready for Thr3d'", modal_section)
        for text in [
            "state.assignment || workstreamAssignmentsForDeliverables(deliverables, item.record?.quantity)",
            "api.confirmAssignMerchandise(item.merchandiseId",
            "workstreams: assignment.workstreams",
            "thr3d: assignment.thr3d",
            "setSelectedId('')",
            "setWorkspaceOpen(false)",
            "return { ok: true, message, record: result.merchandise }",
            "return { ok: false, message }",
        ]:
            self.assertIn(text, finish_handler)
        for text in [
            "const PRODUCT_REQUEST_TYPE_DELIVERABLE_MAP",
            "'ecomm only': ['Ecomm']",
            "'pack only': ['Packaging']",
            "'thr3d only': ['Thr3d']",
            "'pack thr3d': ['Packaging', 'Thr3d']",
            "'ecomm pack': ['Ecomm', 'Packaging']",
            "function productRequestTypeDeliverables(requestType)",
            "function suggestedDeliverablesForRecord(record = {})",
            "function initialReviewDeliverables(record = {})",
        ]:
            self.assertIn(text, self.source)
        self.assertIn(".deliverables-suggestion", self.styles)
        for text in [
            "Ecomm",
            "Packaging",
            "Thr3d",
            "planningTemplate",
            "initialQueue",
            "subjectType: deliverableRoute ? 'deliverable-route' : 'merchandise'",
            "evaluateDeliverablePlanningCard",
        ]:
            self.assertIn(text, self.merchandise_routing)
        registry_section = self.merchandise_routing.split("export const DELIVERABLE_ROUTES = [", 1)[1].split("];", 1)[0]
        for text in ["GS1 Ecomm", "Packaginggraphy", "Video", "Other", "Styled Photo"]:
            self.assertNotIn(text, registry_section)
        for text in [
            "Production Path",
            "Required Outputs",
            "PRODUCTION_PATHS",
            "REQUIRED_OUTPUTS",
            "routingPreviewForProductionPaths",
            "saveJsonMap(MERCH_REVIEW_V2_DECISIONS_KEY",
        ]:
            self.assertNotIn(text, self.source + self.merchandise_routing)

    def test_merchandise_review_v2_is_merchandise_driven_without_active_work_orders(self):
        for text in [
            "api.listMerchandiseReviewEntries()",
            "api.updateMerchandiseIntakeDecisions",
            "api.updateMerchandiseIntakeState",
            "intakeRequestedQueueForRecord(record)",
            "record?.intakeStatus === 'Waiting on Information'",
            "record?.intakeStatus === 'Ready for Photo'",
            "record?.intakeStatus === 'Needs Review'",
            "return QUEUE_IDS.newReview;",
            "merchandiseId",
            "isDraftPlanningCard",
            "kanban-card-deliverables",
            "is-workstream-card",
            "kanban-card-workstream-row",
            "kanban-card-workstream-meta",
            "Workstream Card",
            "Assigned Qty",
            "queueIdForWorkstreamStatus",
            "workstreamStatusForQueueId",
            "api.updateWorkstreamCard(item.workstreamCardId",
            "status: workstreamStatusForQueueId(columnId)",
            "PM_QUEUE_STORAGE_KEY",
            "onDrop={event =>",
            "Cannot move to Ready for Photo. Missing:",
            "[QUEUE_IDS.newReview, QUEUE_IDS.waitingInformation, QUEUE_IDS.sendThr3d, QUEUE_IDS.readyProduction]",
        ]:
            self.assertIn(text, self.source)
        for text in [
            "api.listWorkOrders()",
            "api.saveMerchandiseReviewWorkOrders",
            "api.updateWorkOrder",
            "workOrdersByMerchandise",
            "groupWorkOrdersByMerchandise(workOrders)",
            "workOrderRecordId",
            "activeDeliverableRoutesForClient(selectedItem.record.clientIds?.[0], deliverableRouteOptions)",
            "(!product.satisfied || artwork.status === REQUIREMENT_STATUS.blocked)",
            "!activation.satisfied && visibleGateIds.has(QUEUE_IDS.waitingActivation)",
        ]:
            self.assertNotIn(text, self.source)
            self.assertNotIn(text, self.merchandise_routing)
        for text in [
            "updateMerchandiseIntakeDecisions",
            "/intake-decisions",
            "updateMerchandiseIntakeState",
            "/intake-state",
            "confirmAssignMerchandise",
            "/confirm-assign",
        ]:
            self.assertIn(text, (ROOT / "frontend" / "src" / "api.js").read_text())
        api_source = (ROOT / "frontend" / "src" / "api.js").read_text()
        self.assertIn("error.status = res.status", api_source)
        self.assertIn("error.payload = payload", api_source)
        for text in [
            "listWorkOrders",
            "saveMerchandiseReviewWorkOrders",
            "updateWorkOrder",
            "listWorkflowTemplates",
            "listWorkOrderTypes",
        ]:
            self.assertNotIn(text, (ROOT / "frontend" / "src" / "api.js").read_text())
        self.assertIn(".kanban-card-deliverables", self.styles)
        self.assertIn(".kanban-card.is-workstream-card", self.styles)
        self.assertIn(".kanban-card-workstream-row", self.styles)
        self.assertIn(".kanban-card-workstream-meta", self.styles)

    def test_unified_modal_replaces_waiting_information_controls_in_active_intake(self):
        for text in [
            "function WaitingInformationWorkspace",
            "function NewReviewModal",
            "ConversationPanel",
            "ActivityPanel",
            "workspaceOpen && selectedItem",
            "PM_LOCAL_QUEUE_IDS",
            "markCommentsRead",
            "addConversationComment",
            "Required to Shoot",
        ]:
            self.assertIn(text, self.source)
        waiting_gate = self.merchandise_routing.split("id: QUEUE_IDS.waitingInformation", 1)[1].split("queueColumn({", 1)[0]
        self.assertIn("WORKSPACE_SECTIONS.notes", waiting_gate)
        self.assertNotIn("WORKSPACE_SECTIONS.issues", waiting_gate)
        for text in [
            "notes: 'notes'",
            "entryCriteria",
            "exitCriteria",
            "validNextQueues",
            "blockedNextQueues",
        ]:
            self.assertIn(text, self.merchandise_routing)
        for text in [
            ".waiting-info-missing",
            ".waiting-product-search",
            ".waiting-product-fields",
            ".waiting-required-to-shoot-list",
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
            "Planning Templates",
            "function WorkflowTemplatesSection",
            "api.listWorkflowTemplates()",
            "api.createWorkflowTemplate",
            "api.updateWorkflowTemplate",
            "api.duplicateWorkflowTemplate",
            "api.createWorkflowStage",
            "api.updateWorkflowStage",
            "api.deactivateWorkflowStage",
            "Planning configuration is currently operating through the existing compatibility mapping",
            "Stage keys must be unique within a template.",
            "if (activeCard.id === 'planning-templates') return <WorkflowTemplatesSection />;",
        ]:
            self.assertNotIn(text, self.source)

    def test_admin_clients_show_activation_readiness_profiles(self):
        for text in [
            "function ClientReadinessProfile({ profile })",
            "client.readinessProfile?.label || 'Standard'",
            "Ready for Photo requires",
            "Not required from activation",
            "Server paths",
            "Artwork prefix",
            "Upload prefix",
            "client-readiness-paths",
            "client-readiness-path",
            "client-readiness-profile",
            "client-readiness-grid",
            "Activation",
        ]:
            self.assertIn(text, self.source + self.styles)
        admin_section = self.source.split("function SettingsPage", 1)[1].split("async function randomizeDemoData", 1)[0]
        self.assertNotIn("function ActivationPackageEditor", admin_section)
        self.assertNotIn("SKU Details JSON", admin_section)
        self.assertNotIn("Save Activation", admin_section)
        self.assertNotIn("Add Activation", admin_section)
        self.assertNotIn("activation-package-", self.styles)

    def test_frontend_api_exposes_activation_endpoints(self):
        api_source = (ROOT / "frontend/src/api.js").read_text()
        self.assertIn("listActivations: async ({ clientId } = {})", api_source)
        self.assertIn("return backend('GET', `/activations", api_source)
        self.assertIn("createActivation: async (payload = {}) => backend('POST', '/activations', payload)", api_source)
        self.assertIn("updateActivation: async (id, payload = {}) => backend('PATCH', `/activations/${id}`", api_source)
        self.assertIn("moveActivationToPhoto: async (id) => backend('POST', `/activations/${id}/move-to-photo`", api_source)

    def test_product_import_profiles_use_client_mapping_api(self):
        api_source = (ROOT / "frontend/src/api.js").read_text()
        app_source = self.source
        self.assertIn("updateClient: async (id, payload = {}) => backend('PATCH', `/clients/${id}`", api_source)
        self.assertIn("function productImportProfileState(profile, headers)", app_source)
        self.assertIn("function productImportProfilePayload(name, headers, sourceMapping, targetMapping, requiredTargets)", app_source)
        self.assertIn("api.updateClient(clientId", app_source)
        self.assertIn("await persistImportProfile(profileName.trim() || selectedClient?.name || 'Default')", app_source)
        self.assertIn("Load saved mapping...", app_source)
        self.assertIn("Save mapping", app_source)

    def test_import_modal_backdrop_covers_full_viewport(self):
        self.assertIn(".intake-modal-backdrop {\n  position: fixed;\n  inset: 0;", self.styles)

    def test_planning_exposes_activation_package_creation(self):
        for text in [
            "function PlanningActivationPackageModal",
            "DEFAULT_WALNUT_SCOPE_SUGGESTIONS",
            "DEFAULT_STRUCTURE_SUGGESTIONS",
            "DEFAULT_DUE_URGENCY_SUGGESTIONS",
            "ACTIVATION_DELIVERABLE_OPTIONS",
            "Full Set Renders - WALNUT (Photo)",
            "Hang Tag / Label",
            "ASAP upon receipt",
            "function SuggestiveTextInput",
            "activationFieldSuggestions",
            "activationSkuFieldSuggestions",
            "Add Activation",
            "api.createActivation(payload)",
            "api.updateActivation(initialActivation.id, payload)",
            "api.moveActivationToPhoto(result.record.id)",
            "Activation draft saved:",
            "Activation saved:",
            "skuDetails,",
            "linkedMerchandiseIds:",
            "activationModalOpen",
            "selectedActivation",
            "localActivations",
            "setLocalActivations(current => [",
            "activations={activationRecords}",
            "canCreateTopcoActivation",
            "activationMerchandiseOptions",
            "function PlanningActivationListModal",
            "activationEditableForPhoto",
            "No pending photo Activations to edit.",
            "Edit Activations",
            "activationListOpen",
            "activation-list-modal",
            "activation-list-row",
            "topcoClientIds",
            "const canCreateTopcoActivation = topcoClientIds.size > 0;",
            "planning-board-actions",
            "planning-board-action-buttons",
            "activation-modal",
            "activation-modal-simple",
            "activation-simple-form",
            "activation-simple-grid",
            ".activation-simple-form .form-input",
            "font-weight: 500",
            "select.form-input",
            "activation-deliverables-field",
            "activation-label-stack",
            ".activation-sku-rows",
            "activation-merchandise-match-field",
            "activation-structure-field",
            "activation-description-field",
            "<DeliverablesSelector",
            "options={ACTIVATION_DELIVERABLE_OPTIONS}",
            "const ACTIVATION_DELIVERABLE_OPTIONS = ['Packaging', 'Ecomm'];",
            "activation-builder-layout",
            "activation-email-preview",
            "activation-email-subject",
            "activation-preview-lines",
            "activation-preview-table-title",
            "activation-preview-link",
            ".activation-email-preview-body tbody tr:last-child td",
            "activation-preview-token",
            "function PreviewPath",
            "pathPrefixes.artwork",
            "pathPrefixes.upload",
            "Fresh_Melons/26003302",
            "suggestive-text-field",
            "suggestive-text-options",
            "activation-completion-pill",
            "activationMissing",
            "itemMissingFields",
            "const modalTitle = initialActivation?.id ? 'Edit Activation' : 'Add Activation';",
            "aria-label={modalTitle}",
            "<h2>{modalTitle}</h2>",
            "Email Preview",
            "Subject:",
            "Link Merchandise",
            "Save Draft",
            "Move to Photo",
            "activation-sku-row",
            "activation-empty-items",
            "No items linked. Add an item before moving this Activation to Photo.",
            "itemRows.length === 0 ? ['Linked Merchandise'] : []",
            "!form.deliverables.length ? ['Deliverables'] : []",
            "Add Item",
            "Items",
            "CVID",
            "Structure",
        ]:
            self.assertIn(text, self.source + self.styles)
        modal_section = self.source.split("function NewReviewModal", 1)[1].split("function PlanningActivationPackageModal", 1)[0]
        for text in [
            "function NewReviewActivationPanel",
            "activationRowFromPlanningItem",
            "activationWithPlanningItem",
            "function activationAvailableForPlanningItem",
            "Pending Activation",
            "Add to Activation",
            "New Activation",
            "new-review-activation-panel",
            "new-review-activation-actions",
        ]:
            self.assertNotIn(text, self.source + self.styles if text.startswith("new-review") else modal_section)

    def test_topco_cards_use_activation_state_instead_of_required_preview(self):
        for text in [
            "function activationStateForPlanningCard",
            "item?.activationDriven",
            "Needs Activation",
            "Needs Activation",
            "Activation Ready",
            "kanban-activation-chip",
            "const showRequiredPreview = !isNewQueue && !activationState",
            "function activationByMerchandiseId",
            "activationLinkedMerchandiseIds",
            "linkedActivationByMerchandiseId",
            "activationLinksLoaded",
            "!linkedActivation && baseColumnId === QUEUE_IDS.readyProduction",
            "Cannot move to Ready for Photo. Missing: linked Activation",
        ]:
            self.assertIn(text, self.source + self.styles)

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
            "packageName: 'Product Name on Package'",
            "merchandiseIdentifier: 'UPC / ID'",
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
        self.assertIn("Primary Match Key", self.vocabulary)
        self.assertIn("UPC match key used to match Received Merch to expected Products.", self.source)
        self.assertNotIn("${DOMAIN_TERMS.primaryMatchKey}; Airtable field: Identifier", self.source)
        self.assertIn("key: 'primaryMatchKey', patchKey: 'primaryMatchKey'", self.source)
        self.assertIn("Source column", self.source)
        self.assertIn("Destination field", self.source)
        self.assertIn("Airtable field:", self.source)

    def test_product_request_type_uses_tracker_choices(self):
        self.assertIn("const PRODUCT_REQUEST_TYPE_OPTIONS = ['Ecomm only', 'Pack only', 'Thr3d only', 'Pack & Thr3d', 'Ecomm & Pack']", self.source)
        self.assertIn("options: PRODUCT_REQUEST_TYPE_OPTIONS", self.source)
        self.assertIn("field === 'requestType'", self.source)
        self.assertIn("PRODUCT_REQUEST_TYPE_OPTIONS.map(option => <option value={option} key={option}>{option}</option>)", self.source)

    def test_product_grid_columns_are_draggable(self):
        self.assertIn("function moveProductColumn(sourceColumnId, targetColumnId, placement = 'before')", self.source)
        self.assertIn("function startProductColumnDrag(event, column)", self.source)
        self.assertIn("function dragOverProductColumn(event, column, axis = 'x')", self.source)
        self.assertIn("onDragStart={event => startProductColumnDrag(event, column)}", self.source)
        self.assertIn("onDrop={event => dropProductColumn(event, column)}", self.source)
        self.assertIn("onDrop={event => dropProductColumn(event, column, 'y')}", self.source)
        self.assertIn(".products-grid-header-cell.is-drop-before::before", self.styles)
        self.assertIn(".products-column-option.is-drop-after::after", self.styles)

    def test_shipment_matching_searches_identifier_before_name(self):
        self.assertIn("const matchIdentifierQuery = String(entry.skuId || '').trim()", self.source)
        self.assertIn("const matchNameQuery = String(entry.productName || '').trim()", self.source)
        self.assertIn("if (matchIdentifierReady && matchNameReady)", self.source)
        self.assertIn("limit: 50", self.source)
        self.assertIn("if (limit) params.set('limit', String(limit));", (ROOT / "frontend/src/api.js").read_text())
        self.assertIn("combineIdentifierAndNameMatches(identifierData.records ?? [], nameData.records ?? [], matchIdentifierQuery)", self.source)
        self.assertIn("if (records.length === 0 && matchNameReady && !matchIdentifierReady)", self.source)
        self.assertIn("function combineIdentifierAndNameMatches(identifierRecords = [], nameRecords = [], identifierQuery = '')", self.source)
        self.assertIn("matchBasis: itemIdentifierBasis(item, 'both')", self.source)
        self.assertIn("No product matches both fields", self.source)
        self.assertIn("Check the package name and UPC / ID. Clear one field to search by the other.", self.source)
        self.assertIn("matchBasis: 'name'", self.source)
        self.assertIn("Matches typed name + UPC prefix", self.source)
        self.assertIn("Matched by product name", self.source)
        self.assertIn("function itemExpectedIdentifierText(item)", self.source)
        self.assertIn("function itemProductIdentifierText(item)", self.source)
        self.assertIn("function matchValuesConflict(observedValue, productValue)", self.source)
        self.assertIn("if (!observed || !product || observed === product) return false;", self.source)
        self.assertIn("return true;", self.source)
        self.assertIn("Product ${itemMatchMethod(item)}: ${value}", self.source)
        self.assertIn("itemExpectedIdentifierText(item)", self.source)
        self.assertIn("itemProductIdentifierText(matchChoice.item)", self.source)
        self.assertIn("Matched Product", self.source)
        self.assertIn("Qty received", self.source)
        self.assertIn("Use Product {itemMatchMethod(matchChoice.item)}", self.source)
        self.assertIn("Use Product Name", self.source)
        self.assertIn("!String(entry.skuId || '').trim() || matchValuesConflict(entry.skuId, itemMatchIdentifierValue(matchChoice.item))", self.source)
        self.assertIn("!String(entry.productName || '').trim() || matchValuesConflict(entry.productName, itemMatchTitle(matchChoice.item))", self.source)
        self.assertIn("Observed {DOMAIN_TERMS.packageName} differs from the Product name.", self.source)
        self.assertIn("matchValuesConflict(entry.productName, itemMatchTitle(matchChoice.item))", self.source)
        self.assertIn("const matchedProduct = saved.matchedProduct || saved.linkedProduct || {}", self.source)
        self.assertIn("name: matchedProduct.name || matchedProduct.product || saved.productName || saved.name || 'Matched Product'", self.source)
        self.assertIn("identifier: matchedProduct.identifier || matchedProduct.primaryMatchKey || matchedProduct.productId || matchedProduct.gtinUpc || receivingEntrySku(saved)", self.source)
        self.assertIn("Observed {DOMAIN_TERMS.merchandiseIdentifier} differs from the Product {itemMatchMethod(matchChoice.item)}.", self.source)
        self.assertIn("matchValuesConflict(entry.skuId, itemMatchIdentifierValue(matchChoice.item))", self.source)
        self.assertIn("function itemMatchConfidenceBadge(item, identifierQuery = '')", self.source)
        self.assertIn("UPC prefix", self.source)
        self.assertIn("const nameOnlyMatchSuggestions = itemMatches.length > 0 && itemMatches.every(item => item.matchBasis === 'name')", self.source)
        self.assertIn("const combinedPartialMatchSuggestions = itemMatches.length > 0 && itemMatches.every(item => String(item.matchBasis || '').startsWith('both-'))", self.source)
        self.assertIn("(nameOnlyMatchSuggestions || combinedPartialMatchSuggestions) ? 'Possible products' : 'Suggested products'", self.source)
        self.assertIn("These match the typed name and UPC / ID prefix. Select the correct Product, then use Product values only when they should replace the observed fields.", self.source)
        self.assertIn("Enter or scan UPC / ID to confirm the exact Product.", self.source)
        self.assertIn("confidenceBadge && <em>{confidenceBadge}</em>", self.source)
        self.assertIn("if (item?.matchBasis === 'both-upc') return 'Possible';", self.source)
        self.assertIn(".receiving-match-eyebrow", self.styles)
        self.assertIn(".receiving-match-use-identifier", self.styles)
        self.assertIn(".receiving-match-warning", self.styles)
        self.assertIn(".receiving-match-selected-main > button", self.styles)
        self.assertIn(".receiving-match-correction-actions", self.styles)
        self.assertNotIn("<em>Best</em>", self.source)

    def test_planning_modal_product_search_uses_shipment_matching_model(self):
        planning_product_step = self.source.split("function NewReviewProductIdentification", 1)[1].split("function CommentComposer", 1)[0]
        self.assertIn("const [matchNameQuery, setMatchNameQuery]", planning_product_step)
        self.assertIn("const [matchIdentifierQuery, setMatchIdentifierQuery]", planning_product_step)
        self.assertIn("if (identifierReady && nameReady)", planning_product_step)
        self.assertIn("combineIdentifierAndNameMatches(identifierData.records ?? [], nameData.records ?? [], identifierQuery)", planning_product_step)
        self.assertIn("limit: 50", planning_product_step)
        self.assertIn("records = (data.records ?? []).map(match => ({ ...match, matchBasis: itemIdentifierBasis(match) }))", planning_product_step)
        self.assertIn("records = (data.records ?? []).map(match => ({ ...match, matchBasis: 'name' }))", planning_product_step)
        self.assertIn("No product matches both fields", planning_product_step)
        self.assertIn("These match the typed name and UPC / ID prefix. Select the correct Product, then use Product values only when they should replace the observed fields.", planning_product_step)
        self.assertIn("Enter or scan UPC / ID to confirm the exact Product.", planning_product_step)
        self.assertIn("itemMatchedByText(match)", planning_product_step)
        self.assertIn("itemExpectedIdentifierText(match)", planning_product_step)
        self.assertIn("itemMatchConfidenceBadge(match, matchIdentifierQuery)", planning_product_step)
        self.assertIn("useProductMerchValue('skuId', productIdentifier)", planning_product_step)
        self.assertIn("useProductMerchValue('productName', productTitle)", planning_product_step)
        self.assertIn("placeholder=\"Name printed on package\"", planning_product_step)
        self.assertIn("placeholder=\"Scan or enter UPC / ID\"", planning_product_step)
        self.assertIn("className=\"recv-field recv-field-product\"", planning_product_step)
        self.assertIn("className=\"recv-field\"", planning_product_step)
        package_name_index = planning_product_step.index("<label>{DOMAIN_TERMS.packageName}</label>")
        identifier_index = planning_product_step.index("<label>{DOMAIN_TERMS.merchandiseIdentifier}</label>", package_name_index)
        suggestions_index = planning_product_step.index("className=\"receiving-match-panel\"")
        self.assertLess(package_name_index, identifier_index)
        self.assertLess(identifier_index, suggestions_index)
        self.assertIn(".new-review-product-search-fields", self.styles)
        self.assertIn(".recv-field-product input", self.styles)
        self.assertIn(".receiving-match-panel", self.styles)
        product_search_styles = self.styles.split(".new-review-product-search-fields", 1)[1].split("}", 1)[0]
        self.assertNotIn("grid-template-columns", product_search_styles)

    def test_shipment_capture_shows_name_before_identifier_but_matches_after_identifier(self):
        receiving_form = self.source.split("function ShipmentsPage()", 1)[1].split("function ProductsPage", 1)[0]
        package_name_index = receiving_form.index("<label>{DOMAIN_TERMS.packageName}</label>")
        identifier_index = receiving_form.index("<label>{DOMAIN_TERMS.merchandiseIdentifier}</label>", package_name_index)
        suggestions_index = receiving_form.index("className=\"receiving-match-field\"")
        self.assertLess(package_name_index, identifier_index)
        self.assertLess(identifier_index, suggestions_index)
        self.assertIn("ref={skuIdRef}", receiving_form)
        self.assertIn("setTimeout(() => productNameRef.current?.focus(), 0)", receiving_form)

    def test_technical_airtable_names_are_labeled_as_technical(self):
        self.assertIn("technicalTableLabel(s.tables?.products || s.tables?.skus || 'Products')", self.source)
        self.assertIn("technicalTableLabel(s.tables?.shipments || s.tables?.receipts || 'Shipments')", self.source)
        self.assertIn("technicalTableLabel(s.tables?.merchandise || s.tables?.receiptEntries || 'Merchandise')", self.source)
        self.assertIn("Airtable table", self.vocabulary)

    def test_migrated_pages_use_alias_api_calls(self):
        self.assertIn("api.listShipments()", self.source)
        self.assertIn("api.listProducts()", self.source)
        self.assertIn("api.deleteProduct(item.id)", self.source)
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
        self.assertIn("Admin:        ['/dashboard', '/imports', '/shipments', '/merchandise', '/planning', '/products', '/jobs']", self.source)
        self.assertIn("Receiver:     ['/shipments', '/merchandise']", self.source)
        self.assertIn("PM:           ['/dashboard', '/merchandise', '/planning', '/products', '/jobs']", self.source)

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

    def test_dev_thr3d_regression_route_renders_planning_card_modal_and_outgoing(self):
        harness_section = self.source.split("function PlanningThr3dRegressionPage", 1)[1].split("// ── Auth", 1)[0]
        for text in [
            'data-testid="planning-thr3d-regression"',
            "<KanbanBoard",
            "<NewReviewModal",
            "requiredToShoot: undefined",
            "finishRegressionVerification",
            "setSelectedId('')",
            "intakeStatus: 'Ready for Photo'",
            "stage: QUEUE_IDS.sendThr3d",
            'data-testid="thr3d-outgoing-regression"',
            "THR3D / Outgoing",
            "disabled={Boolean(selectedItem)}",
        ]:
            self.assertIn(text, harness_section)
        self.assertNotIn("saveRegressionDeliverables", harness_section)
        self.assertNotIn("setDraftRecord", harness_section)
        self.assertIn("window.location.pathname === '/__test/planning-thr3d'", self.source)
        self.assertIn("data-testid={`deliverable-${DELIVERABLE_ROUTE_MAP[option] || option.toLowerCase().replaceAll(' ', '-')}`}", self.source)

    def test_planning_board_freezes_while_modal_is_open(self):
        self.assertIn("function KanbanBoard({ columns, itemsByColumn, selectedId, onSelect, onMove, disabled = false, showNewCardClient = true })", self.source)
        self.assertIn("className={`kanban-board ${disabled ? 'is-frozen' : ''}`}", self.source)
        self.assertIn("draggable={!disabled}", self.source)
        self.assertIn("disabled={workspaceOpen}", self.source)
        self.assertIn(".kanban-board.is-frozen", self.styles)
        self.assertIn("pointer-events: none", self.styles)

    def test_thr3d_planning_card_lookup_returns_current_queue_name(self):
        script = """
import {
  buildPlanningCard,
  evaluateMerchandiseReviewAssignment,
  MERCHANDISE_PLANNING_BOARD,
  QUEUE_IDS,
  queueById,
} from './frontend/src/merchandiseRouting.js';

const record = {
  id: 'rec-thr3d-unit',
  deliverables: ['Thr3d'],
  quantity: 1,
  clientIds: ['client-test'],
  itemPhotos: [{ object_key: 'photo.jpg' }],
};
const emptyBoard = { ...MERCHANDISE_PLANNING_BOARD, queues: [] };
const assignment = evaluateMerchandiseReviewAssignment(record, {
  requestedQueueId: QUEUE_IDS.sendThr3d,
  planningBoard: emptyBoard,
});
const card = buildPlanningCard(record, { assignment, client: { name: 'Test Client' } });
const queue = queueById(emptyBoard, QUEUE_IDS.sendThr3d);

if (queue.label !== 'Thr3d Shipment') throw new Error(`Expected Thr3d queue, got ${queue.label}`);
if (card.planningCard.currentQueue !== QUEUE_IDS.sendThr3d) throw new Error(`Expected send-thr3d, got ${card.planningCard.currentQueue}`);
if (card.planningCard.currentQueueName !== 'Thr3d Shipment') throw new Error(`Expected currentQueueName, got ${card.planningCard.currentQueueName}`);
if (card.assignment !== card.planningCard) throw new Error('Planning card alias must match assignment');
"""
        result = subprocess.run(
            ["node", "--input-type=module", "-e", script],
            cwd=ROOT,
            text=True,
            capture_output=True,
            check=False,
        )
        self.assertEqual(result.returncode, 0, result.stderr or result.stdout)

    def test_app_error_boundary_prevents_blank_root(self):
        self.assertIn("class AppErrorBoundary extends Component", self.source)
        self.assertIn("console.error('Uncaught Marks Photo UI error'", self.source)
        self.assertIn("<AppErrorBoundary>", self.source)
        self.assertIn(".app-error-boundary", self.styles)


if __name__ == "__main__":
    unittest.main()
