import "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

/**
 * The value of a declaration in the rule holding the given (scoped) class.
 * @param {string} className unscoped class name
 * @param {string} property declaration property name
 * @returns {string} the declaration value
 */
const declarationValue = (className, property) => {
	// The char before the property must be whitespace / `{` / `;`, or `color`
	// would also match inside `--theme-color`.
	const rule = new RegExp(
		`\\.[^\\s{}]*_css-${className}\\s*\\{[^}]*?[\\s{;]${property}:\\s*([^;\\n]+)`
	).exec(css);
	expect(rule).not.toBe(null);
	return rule[1].trim();
};

/**
 * The single grid line name a rule's `grid-template-columns` declares.
 * @param {string} className unscoped class name
 * @returns {string} the name inside `[…]`
 */
const gridLineName = (className) => {
	const rule = new RegExp(
		`\\.[^\\s{}]*_css-${className}\\s*\\{[^}]*?[\\s{;]grid-template-columns:\\s*\\[([^\\]]+)\\]`
	).exec(css);
	expect(rule).not.toBe(null);
	return rule[1].trim();
};

it("should localize a custom property reached through a @value", () => {
	// `var(themeColor)` names the same property as `var(--theme-color)`, so both
	// have to land on the scoped name the `@property` rule declares.
	const direct = declarationValue("direct-var", "color");
	expect(direct).toMatch(/^var\(--value-resolved-idents-style_module_css-theme-color\)$/);
	expect(declarationValue("value-var", "color")).toBe(direct);
	expect(css).toMatch(
		/@property --value-resolved-idents-style_module_css-theme-color/
	);
	expect(css).not.toMatch(/var\(--theme-color\)/);
});

it("should localize a dashed-ident value reached through a @value", () => {
	const anchor = declarationValue("direct-anchor", "anchor-name");
	expect(anchor).toBe("--value-resolved-idents-style_module_css-my-anchor");
	expect(declarationValue("value-anchor", "anchor-name")).toBe(anchor);

	const timeline = declarationValue("direct-timeline", "view-timeline-name");
	expect(timeline).toBe("--value-resolved-idents-style_module_css-my-timeline");
	expect(declarationValue("value-timeline", "view-timeline-name")).toBe(
		timeline
	);
});

it("should give a grid line named by a @value the same name as the direct spelling", () => {
	// A line declared through `@value` is useless if referencing its resolved
	// name does not select it.
	expect(gridLineName("declare-grid-value")).toBe(
		declarationValue("reference-grid-direct", "grid-row-start")
	);
});
