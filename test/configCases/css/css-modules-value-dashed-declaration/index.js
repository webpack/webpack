import "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

it("should scope a custom property declaration named through a @value", () => {
	// `themeColor: blue` when `@value themeColor: --theme-color` declares the
	// same property `var(themeColor)` and `var(--theme-color)` read, so all
	// three spellings have to land on one scoped name.
	const scoped = "--value-dashed-decl-style_module_css-theme-color";
	const rule = new RegExp(
		"\\.value-dashed-decl-style_module_css-declares-through-value\\s*\\{([^}]*)\\}"
	).exec(css);
	expect(rule).not.toBe(null);
	expect(rule[1]).toContain(`${scoped}: blue`);
	// the unscoped name must not survive anywhere in the output
	expect(css).not.toMatch(/--theme-color:/);
	expect(css).toMatch(new RegExp(`color: var\\(${scoped}\\)`));
});
