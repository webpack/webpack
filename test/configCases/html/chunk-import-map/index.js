import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import "./page.html";
import "./page-existing.html";
import "./page-broken.html";
import "./page-no-script.html";
import "./page-bare.html";

const here = path.dirname(fileURLToPath(import.meta.url));

const read = (name) => fs.readFileSync(path.resolve(here, name), "utf-8");

const mapOf = (html) => {
	const match = /<script type="importmap">([\s\S]*?)<\/script>/.exec(html);
	if (!match) throw new Error("no import map in page");
	return JSON.parse(match[1]);
};

const countMaps = (html) => (html.match(/type=['"]?importmap/g) || []).length;

it("should inject the import map before the module script", () => {
	const page = read("page.html");
	expect(page.indexOf('type="importmap"')).toBeLessThan(
		page.indexOf('type="module"')
	);
	const { imports } = mapOf(page);
	const entries = Object.entries(imports);
	expect(entries.length).toBeGreaterThan(0);
	for (const [specifier, url] of entries) {
		expect(specifier).toMatch(/^webpack\/c\//);
		expect(read(url.replace(/^\.\//, ""))).toBeTruthy();
	}
});

it("should merge an existing import map into a single tag placed first", () => {
	const page = read("page-existing.html");
	const map = mapOf(page);
	expect(map.imports.lit).toBe("https://cdn.example/lit.js");
	expect(map.imports).toMatchObject(mapOf(read("page.html")).imports);
	// Unrelated keys survive the merge.
	expect(map.scopes).toEqual({});
	// A document may only carry one import map, and it must come first.
	expect(countMaps(page)).toBe(1);
	expect(page.indexOf('type="importmap"')).toBeLessThan(
		page.indexOf('type="module"')
	);
});

it("should replace an unparsable import map instead of failing the build", () => {
	const page = read("page-broken.html");
	expect(page).not.toContain("not json");
	expect(countMaps(page)).toBe(1);
	expect(mapOf(page).imports).toEqual(mapOf(read("page.html")).imports);
});

it("should keep the tag inside the document when there is no module script", () => {
	const page = read("page-no-script.html");
	// Never before the doctype — that would trigger quirks mode.
	expect(page.startsWith("<!DOCTYPE html>")).toBe(true);
	expect(page.indexOf('type="importmap"')).toBeLessThan(page.indexOf("<body"));
});

it("should prepend when there is no head and no module script", () => {
	expect(read("page-bare.html").startsWith('<script type="importmap">')).toBe(
		true
	);
});

it("should still emit the standalone import map next to the pages", () => {
	expect(JSON.parse(read("importmap.json")).imports).toEqual(
		mapOf(read("page.html")).imports
	);
});
