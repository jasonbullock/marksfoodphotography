import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "frontend" / "src" / "App.jsx"
PACKAGE = ROOT / "frontend" / "package.json"
REDIRECTS = ROOT / "frontend" / "public" / "_redirects"


class FrontendRoutingTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = APP.read_text()

    def test_router_library_is_used(self):
        package = json.loads(PACKAGE.read_text())
        self.assertIn("react-router-dom", package["dependencies"])
        self.assertIn("BrowserRouter", self.source)
        self.assertIn("<Routes>", self.source)

    def test_navigation_renames_intake_to_imports(self):
        self.assertIn("label: 'Import'", self.source)
        self.assertNotRegex(self.source, r"label:\s*'Intake'")
        self.assertNotIn(">New Intake<", self.source)

    def test_required_routes_are_declared(self):
        for route in [
            'path="/" element={<Navigate to="/dashboard" replace />}',
            'path="/dashboard"',
            'path="/imports"',
            'path="/receiving"',
            'path="/verification"',
            'path="/items"',
            'path="/jobs"',
            'path="/clients"',
            'path="/settings"',
            'path="/administration"',
        ]:
            self.assertIn(route, self.source)

    def test_active_navigation_uses_current_route(self):
        self.assertIn("<NavLink", self.source)
        self.assertIn("item.path === '/imports' && location.pathname.startsWith('/imports/')", self.source)

    def test_direct_load_fallback_is_configured(self):
        redirects = REDIRECTS.read_text().splitlines()
        self.assertIn("/api/* /api/:splat 200", redirects)
        self.assertIn("/* /index.html 200", redirects)


if __name__ == "__main__":
    unittest.main()
