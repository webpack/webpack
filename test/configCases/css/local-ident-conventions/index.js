import * as camel from "./style.module.css?camel";
import * as dashes from "./style.module.css?dashes";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");
const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

/**
 * @param {string} rule scoped class of the rule
 * @param {string} property property to read
 * @returns {string} its emitted value
 */
const valueOf = (rule, property) =>
	new RegExp(`\\.${rule}\\s*\\{[^}]*${property}:\\s*([^;}]+)`)
		.exec(css)[1]
		.trim();

for (const [convention, styles, prefix] of [
	["camel-case-only", camel, "camel"],
	["dashes-only", dashes, "dashes"]
]) {
	it(`should fill [local] with the written name under ${convention}`, () => {
		expect(css).toContain(`.${prefix}-foo-bar {`);
		expect(css).toContain(`.${prefix}-fooBar {`);
		expect(css).toContain(`@keyframes ${prefix}-fade-in {`);
		expect(css).toContain(`@keyframes ${prefix}-fadeIn {`);
		expect(valueOf(styles.first, "animation-name")).toBe(`${prefix}-fade-in`);
		expect(valueOf(styles.second, "animation-name")).toBe(`${prefix}-fadeIn`);
	});

	it(`should apply ${convention} to the export keys only`, () => {
		expect(styles.first).toBe(`${prefix}-first`);
		expect(Object.keys(styles)).not.toContain("foo-bar");
		expect(Object.keys(styles)).not.toContain("fade-in");
	});
}
