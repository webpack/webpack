const fs = require("fs");
const path = require("path");

const read = (name) =>
	fs.readFileSync(path.resolve(__dirname, name), "utf-8");

it("scriptLoading: defer emits a deferred script", () => {
	expect(read("defer.html")).toMatch(/<script defer src="[^"]+"><\/script>/);
});

it("scriptLoading: blocking emits a plain script", () => {
	const html = read("blocking.html");
	expect(html).toMatch(/<script src="[^"]+"><\/script>/);
	expect(html).not.toContain("defer");
	expect(html).not.toContain("module");
});

it("object without scriptLoading falls back to auto (defer on classic)", () => {
	expect(read("emptyobj.html")).toMatch(/<script defer src="[^"]+"><\/script>/);
});

it("auto emits a module script for ES module output", () => {
	expect(read("module.html")).toMatch(/<script type="module" src="[^"]+">/);
});

it("scriptLoading is ignored under output.module (still a module script)", () => {
	const html = read("module-warning.html");
	expect(html).toMatch(/<script type="module" src="[^"]+">/);
	expect(html).not.toContain("defer");
});

it("per-entry scriptLoading overrides output.html.scriptLoading", () => {
	const html = read("entry-blocking.html");
	expect(html).toMatch(/<script src="[^"]+"><\/script\s*>/i);
	expect(html).not.toContain("defer");
});

it("per-entry scriptLoading is ignored under output.module", () => {
	const html = read("module-entry-warning.html");
	expect(html).toMatch(/<script type="module" src="[^"]+">/);
	expect(html).not.toContain("defer");
});
