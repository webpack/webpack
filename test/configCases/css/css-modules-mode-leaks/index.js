import * as style from "./style.module.css";
import * as pure from "./pure.module.css";
import * as nested from "./nested-global.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

const names = [
	"afterLayer",
	"afterLayerList",
	"afterUpperLayer",
	"afterUnknown",
	"inMedia",
	"inLayerBlock",
	"outer",
	"inRule",
	"last"
];

it("should scope and export the rule after a `;`-terminated at-rule", () => {
	for (const name of names) {
		expect(style[name]).toBe(`mode-leaks-style_module_css-${name}`);
		expect(css).toContain(`.mode-leaks-style_module_css-${name} {`);
		expect(css).not.toMatch(new RegExp(`\\.${name} \\{`));
	}
});

it("should keep the rule after a `@layer` statement local in pure mode", () => {
	expect(pure.pureAfterLayer).toBe(
		"mode-leaks-pure_module_css-pureAfterLayer"
	);
});

it("should keep a bare `:global` to its own rule, not later or nested rules", () => {
	expect(Object.keys(nested).sort()).toEqual([
		"afterGlobalInMedia",
		"afterGlobalInRule",
		"last",
		"nestedInGlobal",
		"outer",
		"scopeChild",
		"scopeRoot"
	]);
	for (const name of [
		"globalInMedia",
		"globalInRule",
		"globalParent",
		"scopeParent"
	]) {
		expect(css).toContain(`.${name} {`);
	}
	expect(css).toContain(".mode-leaks-nested-global_module_css-nestedInGlobal {");
	expect(css).toContain("animation-name: globalAnimation;");
});
