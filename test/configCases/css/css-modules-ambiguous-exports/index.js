import * as consumer from "./consumer.module.css";
import * as s from "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

it("should keep the class value for an export name shared with a grid identifier", () => {
	// `.sidebar` + `grid-area: sidebar` is idiomatic: the className must win
	expect(s.sidebar).toBe("s-sidebar");
	// a grid identifier without a same-named class keeps its export
	expect(s.main).toBe("s-main-main");
});

it("should resolve cross-module composes to the class value too", () => {
	// ICSS resolution must agree with the module's own JS export
	expect(consumer.consume).toBe("s-consume s-sidebar");
	// even when the demoted dashed entry comes first in the source
	expect(consumer["consume-late"]).toBe("s-consume-late s-late");
});

it("should fall back to all matches when the requester's family is absent", () => {
	// 'accent' only exists as a dashed ident; composes keeps resolving it
	expect(consumer.fallback).toBe("s-fallback --s-accent");
});

it("should keep the class value for an export name shared with a custom identifier", () => {
	expect(s.reveal).toBe("s-reveal");
});

it("should still rename demoted identifiers in the emitted CSS", () => {
	const cssFile = fs.readdirSync(__dirname).find((f) => f.endsWith(".css"));
	const css = fs.readFileSync(path.join(__dirname, cssFile), "utf-8");
	// demotion drops only the JS export; the CSS rewrite stays scoped
	expect(css).toContain("view-timeline-name: --s-reveal");
	expect(css).toContain("animation-timeline: --s-reveal");
	expect(css).toContain('grid-template-areas: "s-sidebar-sidebar s-main-main"');
	expect(css).toContain("grid-area: s-sidebar-sidebar");
});

it("should not affect unambiguous exports", () => {
	expect(s.shared).toBe("s-shared");
	expect(s.combined).toBe("s-combined s-shared");
	expect(s.accent).toBe("--s-accent");
});
