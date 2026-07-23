import * as s from "./style.module.css";

// Locks in that the blanket dashed-ident scanner scopes emerging CSS features
// (anchor positioning, `@container style()` queries, `@function`) with no
// feature-specific code — so a refactor can't silently drop the coverage.

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const readCss = () => {
	const file = fs.readdirSync(__dirname).find((f) => f.endsWith(".css"));
	return fs.readFileSync(path.join(__dirname, file), "utf-8");
};

it("should scope @function names and their calls consistently", () => {
	expect(s["my-fn"]).toBe("--s-my-fn");
	const css = readCss();
	expect(css).toContain("@function --s-my-fn()");
	expect(css).toContain("color: --s-my-fn()");
});

it("should auto-scope anchor-scope consistently with anchor-name", () => {
	expect(s["my-anchor"]).toBe("--s-my-anchor");
	const css = readCss();
	expect(css).toContain("anchor-name: --s-my-anchor");
	expect(css).toContain("anchor-scope: --s-my-anchor");
	// The unscoped name never leaks into the output.
	expect(css).not.toContain("--my-anchor");
});

it("should scope custom properties referenced from @container style() queries", () => {
	expect(s["my-prop"]).toBe("--s-my-prop");
	const css = readCss();
	expect(css).toContain("--s-my-prop: 1");
	expect(css).toContain("@container style(--s-my-prop: 1)");
});
