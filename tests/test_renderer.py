import copy
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SKILL = ROOT / "skills" / "editorial-article"

def module(name):
    spec = importlib.util.spec_from_file_location(name, SKILL / "scripts" / (name + ".py"))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result

renderer = module("render_article")
checker = module("check_article")

class RendererTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)
        self.brief = json.loads((SKILL / "assets" / "brief.example.json").read_text(encoding="utf-8"))

    def tearDown(self):
        self.temporary.cleanup()

    def render(self, brief=None):
        path = self.root / "brief.json"
        path.write_text(json.dumps(brief or self.brief, ensure_ascii=False), encoding="utf-8")
        renderer.render(path, self.root / "article")
        return self.root / "article"

    def test_bilingual_output_is_portable_and_has_no_example_cover_by_default(self):
        result = self.render()
        report = checker.check(result)
        self.assertEqual(report["status"], "PASS", report)
        self.assertEqual([item["language"] for item in report["pages"]], ["en", "pl"])
        self.assertFalse((result / "assets" / "memory.png").exists())
        self.assertTrue((result / "assets" / "fonts" / "LICENSE.txt").exists())
        self.assertTrue((result / "assets" / "icons" / "LICENSE.txt").exists())

    def test_reading_progress_bar_is_rendered_and_bundled(self):
        output = self.render()
        for name in ("index.html", "pl.html"):
            source = (output / name).read_text(encoding="utf-8")
            self.assertIn('<div class="progress" aria-hidden="true"><span></span></div>', source)
        self.assertIn(".progress{", (output / "assets" / "article.css").read_text(encoding="utf-8"))
        self.assertIn("scaleX(", (output / "assets" / "article.js").read_text(encoding="utf-8"))

    def test_models_block_and_ai_disclosure_are_rendered(self):
        output = self.render()
        source = (output / "index.html").read_text(encoding="utf-8")
        self.assertIn('class="model-chip"', source)
        self.assertIn("brand-openai", source)
        self.assertIn("Corrected by AI, not fully written.", source)
        pl = (output / "pl.html").read_text(encoding="utf-8")
        self.assertIn("Poprawione przez AI, nie napisane w całości.", pl)
        self.brief["languages"]["en"]["sections"][0]["blocks"][4]["items"][0]["url"] = "http://insecure.example/"
        path = self.root / "brief.json"
        path.write_text(json.dumps(self.brief, ensure_ascii=False), encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            renderer.render(path, self.root / "rejected")

    def test_existing_output_is_not_modified(self):
        output = self.root / "article"
        output.mkdir()
        marker = output / "user-work.txt"; marker.write_text("preserve", encoding="utf-8")
        with self.assertRaisesRegex(ValueError, "already exists"):
            self.render()
        self.assertEqual(marker.read_text(), "preserve")
        self.assertEqual(list(output.iterdir()), [marker])

    def test_prose_and_json_cannot_create_markup(self):
        payload = '<script>window.injected=true</script><img src=x onerror=alert(1)>'
        self.brief["languages"]["en"]["sections"][0]["blocks"][1]["text"] = payload
        pipeline = self.brief["languages"]["en"]["sections"][1]["blocks"][0]
        pipeline["flows"]["capture"]["steps"][0]["text"] = payload
        source = (self.render() / "index.html").read_text(encoding="utf-8")
        self.assertNotIn(payload, source)
        self.assertIn("&lt;script&gt;", source)
        self.assertIn("\\u003cscript", source)
        self.assertEqual(source.count('type="application/json"'), 1)

    def test_author_is_configurable_and_profiles_are_optional(self):
        self.brief["author"] = {"name": "Different author"}
        source = (self.render() / "index.html").read_text(encoding="utf-8")
        self.assertIn("Different author", source)
        self.assertNotIn('id="author-button"', source)
        self.assertNotIn("Kacper", source)

    def test_profile_url_rejects_script_scheme(self):
        self.brief["author"]["profiles"][0]["url"] = "javascript:alert(1)"
        with self.assertRaisesRegex(ValueError, "HTTPS"):
            self.render()
        self.assertFalse((self.root / "article").exists())

    def test_profile_url_rejects_embedded_credentials(self):
        self.brief["author"]["profiles"][0]["url"] = "https://user:password@example.com/"
        with self.assertRaisesRegex(ValueError, "credentials"):
            self.render()

    def test_missing_glossary_definition_is_rejected(self):
        self.brief["languages"]["en"]["sections"][0]["blocks"][1]["text"] = "[term:undefined|name]"
        with self.assertRaisesRegex(ValueError, "Undefined glossary"):
            self.render()

    def test_invalid_icon_cannot_escape_asset_directory(self):
        self.brief["author"]["profiles"][0]["icon"] = "../outside"
        with self.assertRaisesRegex(ValueError, "identifier"):
            self.render()

    def test_duplicate_section_ids_are_rejected_before_output(self):
        self.brief["languages"]["en"]["sections"][1]["id"] = "approach"
        with self.assertRaisesRegex(ValueError, "Duplicate"):
            self.render()
        self.assertFalse((self.root / "article").exists())

    def test_unknown_graph_node_is_rejected_before_output(self):
        graph = self.brief["languages"]["en"]["sections"][2]["blocks"][0]
        graph["edges"][0]["to"] = "absent"
        with self.assertRaises(KeyError):
            self.render()
        self.assertFalse((self.root / "article").exists())

    def test_nonfinite_graph_coordinate_is_rejected(self):
        graph = self.brief["languages"]["en"]["sections"][2]["blocks"][0]
        graph["nodes"][0]["x"] = float("nan")
        with self.assertRaisesRegex(ValueError, "coordinates"):
            self.render()

    def test_existing_local_cover_is_copied_and_alt_required(self):
        image = self.root / "supplied.png"; image.write_bytes((SKILL / "assets" / "shared" / "memory.png").read_bytes())
        self.brief["cover"] = {"path": "supplied.png", "generated": True}
        for content in self.brief["languages"].values():
            content["cover_alt"] = "A supplied illustration"
        output = self.render()
        self.assertEqual((output / "assets" / "cover.png").read_bytes(), image.read_bytes())
        self.assertEqual(checker.check(output)["status"], "PASS")

    def test_unsupported_language_is_rejected(self):
        self.brief["languages"] = {"unsupported": self.brief["languages"]["en"]}
        with self.assertRaisesRegex(ValueError, "Languages"):
            self.render()

    def test_polish_only_uses_index_with_polish_language(self):
        self.brief["languages"].pop("en")
        output = self.render()
        self.assertIn('<html lang="pl">', (output / "index.html").read_text(encoding="utf-8"))
        self.assertFalse((output / "pl.html").exists())

class CheckerTests(unittest.TestCase):
    def test_bundled_reference_uses_explicit_shared_asset_boundary(self):
        report = checker.check(SKILL / "assets" / "example", SKILL / "assets")
        self.assertEqual(report["status"], "PASS", report)

    def test_missing_local_asset_and_anchor_are_detected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "index.html").write_text('<html lang="en"><h1>Title</h1><a href="#missing">Link</a><img src="missing.png" alt="Image"></html>', encoding="utf-8")
            report = checker.check(root)
            self.assertEqual(report["status"], "FAIL")
            self.assertTrue(any("Missing local file" in error for error in report["errors"]))
            self.assertTrue(any("missing anchor" in error for error in report["errors"]))

    def test_remote_resources_and_boundary_escape_are_detected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "index.html").write_text('<html lang="en"><h1>Title</h1><script src="https://example.com/code.js"></script><img src="../outside.png" alt="Image"></html>', encoding="utf-8")
            report = checker.check(root)
            self.assertEqual(report["status"], "FAIL")
            self.assertTrue(any("offline" in error for error in report["errors"]))
            self.assertTrue(any("boundary" in error for error in report["errors"]))

    def test_model_chip_links_are_reviewed_like_the_author_panel(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "index.html").write_text('<html lang="en"><h1>Title</h1><a class="model-chip" href="https://example.com/" target="_blank" rel="noopener noreferrer">Model</a><a href="https://elsewhere.example/">Plain</a></html>', encoding="utf-8")
            report = checker.check(root)
            self.assertEqual(report["status"], "PASS", report)
            self.assertEqual(len(report["warnings"]), 1, report)

    def test_credential_signature_is_detected(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "index.html").write_text('<html lang="en"><h1>Title</h1><p>' + 'ghp_' + 'x' * 30 + '</p></html>', encoding="utf-8")
            self.assertEqual(checker.check(root)["status"], "FAIL")

if __name__ == "__main__":
    unittest.main()
