import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));

const read = (name) => fs.readFileSync(path.resolve(here, name), "utf-8");

const find = (prefix) => {
	const name = fs
		.readdirSync(here)
		.find((f) => f.startsWith(`${prefix}.`) && f.endsWith(".mjs"));
	if (!name) throw new Error(`no chunk named ${prefix}`);
	return name;
};

it("should emit the import map at the configured file name", () => {
	const { imports } = JSON.parse(read("assets/importmap.json"));
	const entries = Object.entries(imports);
	expect(entries.length).toBeGreaterThan(0);
	for (const [specifier, url] of entries) {
		// Stable, content-independent keys pointing at chunks that were emitted.
		expect(specifier).toMatch(/^webpack\/c\//);
		expect(read(url.replace(/^\.\//, ""))).toBeTruthy();
	}
	expect(imports["webpack/c/vendor"]).toBe(`./${find("vendor")}`);
});

it("should keep the imported chunk's hashed name out of its importer", () => {
	const app = read(find("app"));
	expect(app).toMatch(/from\s*"webpack\/c\/vendor"/);
	// Nothing hash-dependent is left, so `app` cannot re-hash when `vendor` does.
	expect(app).not.toContain(find("vendor"));
});

it("should leave chunks without an inter-chunk import untouched", () => {
	// A leaf chunk imports nothing, so nothing in it is rewritten.
	expect(read(find("vendor"))).not.toContain("webpack/c/");
});
