import * as camel from "./style.module.css?camel";
import * as dashes from "./style.module.css?dashes";
import * as custom from "./style.module.css?custom";
import * as plain from "./leading.module.css?plain";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");
const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

/**
 * @param {string} rule scoped class of the rule
 * @param {string} property grid property to read
 * @returns {string} its emitted value
 */
const valueOf = (rule, property) =>
	new RegExp(`\\.${rule}\\s*\\{[^}]*${property}:\\s*([^;}]+)`)
		.exec(css)[1]
		.trim();

for (const [convention, styles, prefix] of [
	["camel-case-only", camel, "camel"],
	["dashes-only", dashes, "dashes"],
	["custom", custom, "custom"]
]) {
	it(`should preserve distinct grid areas with ${convention}`, () => {
		const first = valueOf(styles.first, "grid-area");
		const second = valueOf(styles.second, "grid-area");
		expect(first).toBe(`${prefix}-foo-bar`);
		expect(second).toBe(`${prefix}-fooBar`);
		expect(valueOf(styles.grid, "grid-template-areas")).toBe(
			`"${first} ${second}"`
		);
	});
}

it("should keep grid names short without merging protected prefixes", () => {
	expect(plain["1"]).toBe("1");
	expect(plain._1).toBe("_1");
	expect(plain["--foo"]).toBe("--foo");
	expect(plain["_--foo"]).toBe("_--foo");
	expect(valueOf(plain.leading, "grid-template-areas")).toBe(
		'"\\31  _1 \\--foo _--foo"'
	);
	expect(valueOf(plain.numeric, "grid-area")).toBe("\\31");
	expect(valueOf(plain.underscore, "grid-area")).toBe("_1");
	expect(valueOf(plain.dashed, "grid-area")).toBe("\\--foo");
	expect(valueOf(plain.protected, "grid-area")).toBe("_--foo");
});
