import * as mod from "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const readBundle = () =>
	fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

const escapeRe = str => str.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");

it("should export scoped locals only for locally-defined ident families", () => {
	expect(mod.MyFont).toBeDefined();
	expect(mod.MyFont).not.toBe("MyFont");
	expect(mod.LateFont).toBeDefined();
	// A quoted family with a space is not a valid ident and stays global.
	expect(Object.keys(mod)).not.toContain("My Font");
});

it("should rename every reference and the @font-face descriptor to one local", () => {
	const css = readBundle();
	expect(css).not.toMatch(/font-family:\s*MyFont\b/);
	const re = new RegExp(`\\b${escapeRe(mod.MyFont)}\\b`, "g");
	// Two references (.title, .stack) + one @font-face descriptor.
	expect((css.match(re) || []).length).toBe(3);
});

it("should rename only the local family in a stack, leaving system fonts", () => {
	expect(readBundle()).toContain(`${mod.MyFont}, Arial, sans-serif`);
});

it("should leave a space-containing quoted family untouched", () => {
	const css = readBundle();
	// Both the reference and its @font-face descriptor keep the quoted form.
	expect((css.match(/"My Font"/g) || []).length).toBe(2);
});

it("should resolve a family referenced before its @font-face definition", () => {
	const css = readBundle();
	expect(css).not.toMatch(/font-family:\s*LateFont\b/);
	expect(css).toContain(mod.LateFont);
});

it("should leave multi-word unquoted names and CSS-wide keywords untouched", () => {
	const css = readBundle();
	expect(css).toContain("font-family: My Font");
	expect(css).toContain("font-family: inherit");
});
