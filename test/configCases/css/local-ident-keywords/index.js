import * as styles from "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const css = () =>
	fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

/**
 * @param {string} rule scoped class of the rule
 * @param {string} property declaration to read
 * @returns {string} its emitted value
 */
const valueOf = (rule, property) =>
	new RegExp(`\\.${rule}\\s*\\{[^}]*(?:^|[;{\\s])${property}:\\s*([^;}]+)`, "m")
		.exec(css())[1]
		.trim();

// Every keyword a scoped build must leave alone. `_` is the localIdentName
// prefix, so a scoped one reads as `_none` and fails the check.
const KEYWORDS = [
	["animation-keywords", "animation-name", "none"],
	[
		"animation-keywords",
		"animation",
		"1s linear infinite alternate both running paused"
	],
	["animation-wide", "animation-name", "inherit"],
	["grid-keywords", "grid-area", "auto"],
	["grid-keywords", "grid-row", "auto / span 3"],
	["container-keywords", "container-name", "none"],
	["view-transition-keywords", "view-transition-name", "none"],
	["counter-keywords", "counter-reset", "none"],
	["counter-keywords", "counter-increment", "none"],
	["counter-ua", "counter-reset", "page 1 list-item 2"],
	["list-style-keywords", "list-style-type", "disc"],
	["list-style-keywords", "list-style", "decimal"],
	["font-palette-keywords", "font-palette", "normal"],
	["will-change-keywords", "will-change", "transform, opacity, auto"],
	["transition-keywords", "transition-property", "all"]
];

for (const [rule, property, expected] of KEYWORDS) {
	it(`should not scope \`${property}: ${expected}\``, () => {
		expect(valueOf(styles[rule], property)).toBe(expected);
	});
}

it("should still scope a local name in the same position", () => {
	// The guard is keyword-shaped, not property-shaped: a real custom-ident
	// next to these keywords must keep scoping.
	expect(styles.thumbs).toBe("_thumbs");
	expect(valueOf(styles["counter-style-local"], "list-style")).toBe("_thumbs");
});

it("should keep a predefined counter style global", () => {
	expect(css()).toContain("system: extends decimal");
});

it("should emit the stylesheet", () => {
	expect(css()).toMatchSnapshot();
});
