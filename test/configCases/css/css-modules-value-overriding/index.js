import * as style from "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const readBundle = () =>
	fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

const matchClassDecl = (cssContent, className, expectedValue) => {
	// Class names are renamed in css/module mode — match the unique suffix
	// followed by a `{ color: <value>; }` block (with arbitrary whitespace).
	const re = new RegExp(
		`\\.[^\\s{}]*${className}[^\\s{}]*\\s*\\{\\s*color:\\s*${expectedValue}\\s*;?\\s*\\}`
	);
	expect(cssContent).toMatch(re);
};

it("should let a later local @value override an earlier one with the same name", () => {
	const cssContent = readBundle();
	matchClassDecl(cssContent, "local-override", "blue");
});

it("should resolve @value references using the local definition active at the reference site", () => {
	const cssContent = readBundle();
	matchClassDecl(cssContent, "mid-before", "red");
	matchClassDecl(cssContent, "mid-after", "blue");
});

it("should resolve same-name @values imported from different modules under distinct aliases", () => {
	const cssContent = readBundle();
	matchClassDecl(cssContent, "aliased-from-a", "green");
	matchClassDecl(cssContent, "aliased-from-b", "orange");
});

it("should let a later @value import override an earlier one with the same local name (source-order)", () => {
	const cssContent = readBundle();
	matchClassDecl(cssContent, "import-shared-a", "green");
	matchClassDecl(cssContent, "import-shared-b", "orange");
});

it("should let a later @value import override an earlier local @value with the same name", () => {
	const cssContent = readBundle();
	matchClassDecl(cssContent, "local-base-pink", "pink");
	matchClassDecl(cssContent, "import-base-from-a", "aqua");
});

it("should let a later local @value override an earlier @value import with the same name", () => {
	const cssContent = readBundle();
	matchClassDecl(cssContent, "import-only-a", "lime");
	matchClassDecl(cssContent, "local-after-import", "black");
});

it("should re-resolve a chained @value alias after the source name is re-defined", () => {
	const cssContent = readBundle();
	matchClassDecl(cssContent, "chained-from-local", "teal");
	matchClassDecl(cssContent, "chained-from-local-after", "maroon");
});

it("should still export the renamed classes for every override scenario", () => {
	expect(style["local-override"]).toMatch(/local-override$/);
	expect(style["mid-before"]).toMatch(/mid-before$/);
	expect(style["mid-after"]).toMatch(/mid-after$/);
	expect(style["aliased-from-a"]).toMatch(/aliased-from-a$/);
	expect(style["aliased-from-b"]).toMatch(/aliased-from-b$/);
	expect(style["import-shared-a"]).toMatch(/import-shared-a$/);
	expect(style["import-shared-b"]).toMatch(/import-shared-b$/);
	expect(style["local-base-pink"]).toMatch(/local-base-pink$/);
	expect(style["import-base-from-a"]).toMatch(/import-base-from-a$/);
	expect(style["import-only-a"]).toMatch(/import-only-a$/);
	expect(style["local-after-import"]).toMatch(/local-after-import$/);
	expect(style["chained-from-local"]).toMatch(/chained-from-local$/);
	expect(style["chained-from-local-after"]).toMatch(
		/chained-from-local-after$/
	);
});
