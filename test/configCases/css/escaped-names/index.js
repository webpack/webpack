import * as styles from "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const css = () =>
	fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

/**
 * @param {string} rule scoped class of the rule
 * @param {string} property declaration to read, as spelled in the output
 * @returns {string} its emitted value
 */
const valueOf = (rule, property) =>
	new RegExp(`\\.${rule}\\s*\\{[^}]*${property}:\\s*([^;}]+)`)
		.exec(css())[1]
		.trim();

it("should scope the value of an escaped property name", () => {
	// `\61 nimation-name` is `animation-name`, so it names the scoped keyframes.
	expect(valueOf(styles["escaped-property"], "\\\\61 nimation-name")).toBe(
		styles.spin
	);
	expect(valueOf(styles["plain-property"], "animation-name")).toBe(
		styles.spin
	);
});

it("should scope the name of an escaped at-rule", () => {
	expect(styles.slide).toBe("_slide");
	expect(css()).toContain(`@\\6b eyframes ${styles.slide}`);
	expect(valueOf(styles["escaped-at-rule"], "animation-name")).toBe(
		styles.slide
	);
});

it("should resolve an asset behind an escaped url()", () => {
	const plain = valueOf(styles["plain-url"], "background");
	expect(plain).toMatch(/^url\([^)]+\.png\)$/);
	for (const rule of ["escaped-url", "escaped-url-long", "escaped-url-bare"]) {
		expect(valueOf(styles[rule], "background")).toBe(plain);
	}
});

it("should emit the stylesheet", () => {
	expect(css()).toMatchSnapshot();
});

it("should scope an escaped custom property with its use", () => {
	// Chromium reads `\2d\2d x`, `\-\-x` and `--x` as the one property, so a
	// scoped build has to rename the pair together.
	for (const [rule, name] of [
		["escaped-custom-property", "one"],
		["escaped-custom-property-use", "two"],
		["escaped-custom-property-both", "three"],
		["escaped-custom-property-at-rule", "four"]
	]) {
		expect(styles[name]).toBe(`--_${name}`);
		expect(valueOf(styles[rule], "color")).toBe(`var(${styles[name]})`);
	}
	expect(css()).toContain(`@property ${styles.four}`);
});
