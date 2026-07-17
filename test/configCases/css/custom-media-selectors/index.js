import "./style.css";
import * as mod from "./comp.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const readBundle = () =>
	fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

it("should resolve a simple @custom-media reference", () => {
	expect(readBundle()).toContain("@media (max-width: 30em)");
});

it("should resolve a comma-list @custom-media as an `or` group", () => {
	expect(readBundle()).toContain(
		"@media ((color) or (hover)) and (min-width: 100px)"
	);
});

it("should wrap a `not` @custom-media value", () => {
	expect(readBundle()).toContain("@media (not (hover: hover))");
});

it("should resolve a @custom-media defined after its use", () => {
	expect(readBundle()).toContain("@media (min-width: 60em)");
});

it("should resolve each ref in a comma-separated media-query list", () => {
	expect(readBundle()).toContain("@media (max-width: 30em), (min-width: 60em)");
});

it("should keep a calc() media feature while scanning for refs", () => {
	expect(readBundle()).toContain("calc(1px + 1px)");
});

it("should inline a media-type @custom-media value", () => {
	const css = readBundle();
	expect(css).toMatch(/@media screen\s*\{/);
	expect(css).toContain("@media screen and (min-width: 100px)");
	expect(css).toMatch(/@media not all\s*\{/);
});

it("should expand a @custom-selector to :is()", () => {
	const css = readBundle();
	expect(css).toContain(":is(h1, h2, h3)");
	expect(css).toContain("a:is(h1, h2, h3)");
	expect(css).toContain(":not(:is(h1, h2, h3))");
});

it("should leave an undefined custom selector untouched", () => {
	expect(readBundle()).toContain(".unknown:--not-defined");
});

it("should not scope the selector list of a @custom-selector in a css module", () => {
	expect(readBundle()).toContain(":is(.button)");
});

it("should scope regular class names in a css module while resolving custom-media", () => {
	const css = readBundle();
	expect(mod.box).toBeDefined();
	expect(css).toContain("@media (max-width: 20em)");
	expect(css).toContain(`.${mod.box}`);
});

it("should drop the @custom-media and @custom-selector at-rules", () => {
	const css = readBundle();
	expect(css).not.toContain("@custom-media");
	expect(css).not.toContain("@custom-selector");
	expect(css).not.toContain("(--narrow)");
	expect(css).not.toContain(":--heading");
	expect(css).not.toContain(":--btn");
});
