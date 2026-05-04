import { "style-class" as styleClass } from "./style.css";
import { "module-class" as moduleClass } from "./style.module.css";
import { "a-class" as aClass } from "./a.css";
import { "b-class" as bClass } from "./b.css";
import { "c-class" as cClass } from "./c.css";
import { "d-class" as dClass } from "./d.css";
import { "e-class" as eClass } from "./e.css";
import { "f-class" as fClass } from "./f.css";
import "./empty-middle.css";
import { "empty-chain-top-class" as emptyChainTopClass } from "./empty-chain-top.css";

it("should export correct CSS module class names", () => {
	expect(styleClass).toBe("style_css-style-class");
	expect(moduleClass).toBe("style_module_css-module-class");
	expect(aClass).toBe("a_css-a-class");
	expect(bClass).toBe("b_css-b-class");
	expect(cClass).toBe("c_css-c-class");
	expect(dClass).toBe("d_css-d-class");
	expect(eClass).toBe("e_css-e-class");
	expect(fClass).toBe("f_css-f-class");
});

it("should inject styles into DOM when exportType is style", () => {
	if (!process.env.BROWSER) {
		expect(true).toBe(true);
		return;
	}
	const styles = window.document.getElementsByTagName("style");
	expect(styles.length).toBeGreaterThan(0);

	const allCSS = Array.from(styles).map(s => s.textContent);

	// Original test: style.css and its @import style-imported.css
	expect(allCSS.some(c => c.includes("color: red"))).toBe(true);
	expect(allCSS.some(c => c.includes("margin: 10px"))).toBe(true);
});

it("should create style tags for single-level @import (a -> a-dep)", () => {
	if (!process.env.BROWSER) {
		expect(true).toBe(true);
		return;
	}
	const allCSS = Array.from(window.document.getElementsByTagName("style")).map(s => s.textContent);

	// a.css own content
	expect(allCSS.some(c => c.includes("font-weight: bold"))).toBe(true);
	// a-dep.css imported by a.css
	expect(allCSS.some(c => c.includes("letter-spacing: 1px"))).toBe(true);
});

it("should create style tags for two-level nested @import (b -> b-dep -> b-dep-dep)", () => {
	if (!process.env.BROWSER) {
		expect(true).toBe(true);
		return;
	}
	const allCSS = Array.from(window.document.getElementsByTagName("style")).map(s => s.textContent);

	// b.css own content
	expect(allCSS.some(c => c.includes("line-height: 1.6"))).toBe(true);
	// b-dep.css (depth 1)
	expect(allCSS.some(c => c.includes("text-indent: 4px"))).toBe(true);
	// b-dep-dep.css (depth 2)
	expect(allCSS.some(c => c.includes("word-spacing: 2px"))).toBe(true);
});

it("should create style tags for three-level nested @import (c -> c-dep -> c-dep-dep -> c-dep-dep-dep)", () => {
	if (!process.env.BROWSER) {
		expect(true).toBe(true);
		return;
	}
	const allCSS = Array.from(window.document.getElementsByTagName("style")).map(s => s.textContent);

	// c.css own content
	expect(allCSS.some(c => c.includes("cursor: pointer"))).toBe(true);
	// c-dep.css (depth 1)
	expect(allCSS.some(c => c.includes("visibility: hidden"))).toBe(true);
	// c-dep-dep.css (depth 2)
	expect(allCSS.some(c => c.includes("z-index: 10"))).toBe(true);
	// c-dep-dep-dep.css (depth 3)
	expect(allCSS.some(c => c.includes("opacity: 0.8"))).toBe(true);
});

it("should handle shared @import (d and e both import shared.css) with a single style tag", () => {
	if (!process.env.BROWSER) {
		expect(true).toBe(true);
		return;
	}
	const allCSS = Array.from(window.document.getElementsByTagName("style")).map(s => s.textContent);

	// d.css own content
	expect(allCSS.some(c => c.includes("overflow: hidden"))).toBe(true);
	// e.css own content
	expect(allCSS.some(c => c.includes("position: relative"))).toBe(true);
	// shared.css should appear exactly once (module cache prevents duplicate execution)
	const sharedCount = allCSS.filter(c => c.includes("box-sizing: border-box")).length;
	expect(sharedCount).toBe(1);
});

it("should create style tags for nested @import with layer/supports/media conditions (f -> f-dep[layer] -> f-dep-dep[supports+media])", () => {
	if (!process.env.BROWSER) {
		expect(true).toBe(true);
		return;
	}
	const allCSS = Array.from(window.document.getElementsByTagName("style")).map(s => s.textContent);

	// f.css own content
	expect(allCSS.some(c => c.includes("animation: none"))).toBe(true);
	// f-dep.css (imported with layer(components))
	expect(allCSS.some(c => c.includes("transition: all 0.3s"))).toBe(true);
	// f-dep-dep.css (imported with supports(display: grid) + media)
	expect(allCSS.some(c => c.includes("transform: scale(1)"))).toBe(true);
});

it("should create style tag for leaf when middle file is empty (@import only)", () => {
	if (!process.env.BROWSER) {
		expect(true).toBe(true);
		return;
	}
	const allCSS = Array.from(window.document.getElementsByTagName("style")).map(s => s.textContent);

	// empty-middle.css has no own rules, only @import
	// empty-middle-dep.css should still get its own style tag
	expect(allCSS.some(c => c.includes("text-transform: uppercase"))).toBe(true);
});

it("should create style tag for leaf through chain of empty @import-only files (top -> empty-a -> empty-b -> leaf)", () => {
	if (!process.env.BROWSER) {
		expect(true).toBe(true);
		return;
	}
	const allCSS = Array.from(window.document.getElementsByTagName("style")).map(s => s.textContent);

	expect(emptyChainTopClass).toBe("empty-chain-top_css-empty-chain-top-class");
	// top has own content
	expect(allCSS.some(c => c.includes("white-space: nowrap"))).toBe(true);
	// empty-chain-a.css and empty-chain-b.css are empty (only @import)
	// but the leaf should still be reachable and injected
	expect(allCSS.some(c => c.includes("text-decoration: underline"))).toBe(true);
});

it("should have the correct total number of style tags", () => {
	if (!process.env.BROWSER) {
		expect(true).toBe(true);
		return;
	}
	const styles = window.document.getElementsByTagName("style");
	// style-imported.css, style.css, style.module.css,
	// a-dep.css, a.css,
	// b-dep-dep.css, b-dep.css, b.css,
	// c-dep-dep-dep.css, c-dep-dep.css, c-dep.css, c.css,
	// shared.css (once), d.css, e.css,
	// f-dep-dep.css, f-dep.css, f.css,
	// empty-middle-dep.css, empty-middle.css,
	// empty-chain-leaf.css, empty-chain-b.css, empty-chain-a.css, empty-chain-top.css
	// = 24
	expect(styles.length).toBe(24);
});
