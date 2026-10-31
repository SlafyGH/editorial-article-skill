#!/usr/bin/env python3
"""Check portable HTML article references. This is not a browser or visual audit."""
import argparse
import json
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit

VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr"}
SECRETS = re.compile(r"(?:gh[pousr]_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9]{24,}|Bearer\s+[A-Za-z0-9_-]{24,})")
PRIVATE_PATH = re.compile(r"[A-Za-z]:[\\/]Users[\\/][^\s<]+|[A-Za-z]:[\\/](?:Projects|SecondBrain)[\\/]|/home/[^/\s]+/")
CSS_URL = re.compile(r"url\(\s*['\"]?([^)'\"\s]+)")

class Document(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids, self.duplicates, self.references, self.anchors, self.images = set(), [], [], [], []
        self.headings = 0
        self.language = None
        self.stack = []
        self.external = []
        self.inline_css = []
        self.in_style = False

    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if tag == "html":
            self.language = attrs.get("lang")
        if tag == "h1":
            self.headings += 1
        if attrs.get("id"):
            if attrs["id"] in self.ids:
                self.duplicates.append(attrs["id"])
            self.ids.add(attrs["id"])
        if tag == "style":
            self.in_style = True
        if tag in {"img", "script", "source"} and attrs.get("src"):
            self.references.append(attrs["src"])
        if tag == "img":
            self.images.append(attrs)
        if tag == "link" and attrs.get("href") and attrs.get("rel") in {"stylesheet", "icon", "preload", "alternate"}:
            self.references.append(attrs["href"])
        if tag == "a" and attrs.get("href"):
            href = attrs["href"]
            if href.startswith("#"):
                self.anchors.append(href[1:])
            elif urlsplit(href).scheme in {"http", "https"}:
                self.external.append(dict(url=href, target=attrs.get("target"), rel=attrs.get("rel", ""), reviewed=any({"author-card", "model-chip"} & set(ancestor.get("class", "").split()) for _, ancestor in self.stack)))
            else:
                self.references.append(href)
        if tag not in VOID:
            self.stack.append((tag, attrs))

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag == "style":
            self.in_style = False
        for index in range(len(self.stack) - 1, -1, -1):
            if self.stack[index][0] == tag:
                del self.stack[index:]
                break

    def handle_data(self, value):
        if self.in_style:
            self.inline_css.append(value)

def check(root, asset_root=None):
    root = Path(root).resolve()
    allowed = [root] + ([Path(asset_root).resolve()] if asset_root else [])
    errors, warnings, pages, visited_css = [], [], [], set()
    if not root.is_dir():
        return dict(status="FAIL", pages=[], errors=["Article directory does not exist"], warnings=[])

    def local_reference(value, base, resource=True):
        parsed = urlsplit(value)
        if parsed.scheme == "data" or not value or value.startswith("#"):
            return
        if parsed.scheme or parsed.netloc:
            errors.append("Remote or absolute resource breaks offline portability: " + value)
            return
        target = (base / unquote(parsed.path)).resolve()
        if not any(target.is_relative_to(boundary) for boundary in allowed):
            errors.append("Reference escapes the article asset boundary: " + value)
            return
        if not target.is_file():
            errors.append("Missing local file: " + value)
        elif target.suffix == ".css" and target not in visited_css:
            visited_css.add(target)
            for found in CSS_URL.findall(target.read_text(encoding="utf-8")):
                local_reference(found, target.parent)
        elif target.suffix == ".svg":
            svg = target.read_text(encoding="utf-8")
            if re.search(r"(?:href|src)=['\"](?:https?:)?//", svg):
                errors.append("SVG requests an external resource: " + value)

    for file in sorted(root.glob("*.html")):
        source = file.read_text(encoding="utf-8")
        document = Document(); document.feed(source)
        if not document.language:
            errors.append(file.name + ": missing document language")
        if document.headings != 1:
            errors.append(file.name + ": expected one main heading")
        errors.extend(file.name + ": duplicate id " + value for value in document.duplicates)
        errors.extend(file.name + ": missing anchor #" + value for value in document.anchors if value not in document.ids)
        for reference in document.references:
            local_reference(reference, file.parent)
        for css in document.inline_css:
            for reference in CSS_URL.findall(css):
                local_reference(reference, file.parent)
        for image in document.images:
            if "alt" not in image or (not image["alt"] and image.get("aria-hidden") != "true"):
                errors.append(file.name + ": image needs meaningful alt text or an explicit decorative designation")
        for external in document.external:
            if not external["reviewed"]:
                warnings.append(file.name + ": external link outside author panel needs publication review")
            if external["target"] == "_blank" and not {"noopener", "noreferrer"}.issubset(set(external["rel"].split())):
                errors.append(file.name + ": external new-tab link lacks isolation")
        if SECRETS.search(source):
            errors.append(file.name + ": possible credential in public HTML")
        if PRIVATE_PATH.search(source):
            errors.append(file.name + ": private machine path in public HTML")
        pages.append(dict(file=file.name, language=document.language, external_profile_links=len(document.external)))
    if not pages:
        errors.append("No top-level HTML articles found")
    return dict(status="FAIL" if errors else "PASS", pages=pages, errors=sorted(set(errors)), warnings=sorted(set(warnings)), limitations=["Does not prove rendering, translation parity, accessibility contrast or interactive behavior."])

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("article_directory")
    parser.add_argument("--asset-root", help="Explicit extra asset boundary for a bundled example")
    args = parser.parse_args()
    result = check(args.article_directory, args.asset_root)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(1 if result["errors"] else 0)

if __name__ == "__main__":
    main()
