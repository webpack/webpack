import * as lib from "./lib.css";
import * as styles from "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const css = () =>
	fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

/**
 * @param {string} rule scoped class of the rule
 * @param {string} property grid property to read
 * @returns {string} its emitted value
 */
const valueOf = (rule, property) =>
	new RegExp(`\\.${rule}\\s*\\{[^}]*${property}:\\s*([^;}]+)`)
		.exec(css())[1]
		.trim();

it("should scope an imported area and its implicit lines in the declaring module", () => {
	expect(valueOf(styles["use-area"], "grid-area")).toBe(lib.area);
	expect(valueOf(styles["use-area-lines"], "grid-column")).toBe(
		`${lib.area}-start / ${lib.area}-end`
	);
});

it("should scope an imported line in the declaring module, aliased or not", () => {
	expect(lib["line-start"]).toBe("lib_line-start");
	expect(valueOf(styles["use-line"], "grid-row")).toBe(lib["line-start"]);
	expect(valueOf(styles["use-line-alias"], "grid-row")).toBe(
		lib["line-start"]
	);
});

it("should spell an aliased or re-exported name as the declaring module does", () => {
	for (const rule of [styles["use-alias"], styles["use-chain"]]) {
		expect(valueOf(rule, "grid-area")).toBe(lib.area);
		expect(valueOf(rule, "grid-row")).toBe(
			`${lib.area}-start / ${lib.area}-end`
		);
	}
});

it("should scope a name no import selects in its own module", () => {
	expect(valueOf(styles["use-local"], "grid-area")).toBe(styles.local);
	expect(valueOf(styles["use-local"], "grid-row")).toBe(
		`${styles.local}-start`
	);
	expect(styles.local).toBe("style_local");
});

it("should leave an import nothing declares unscoped", () => {
	expect(valueOf(styles["use-missing"], "grid-area")).not.toMatch(
		/^(lib|style)_/
	);
});

it("should not route a line through an imported value that is no grid name", () => {
	expect(valueOf(styles["use-plain-line"], "grid-row")).toBe(
		"style_primary-start"
	);
});

it("should inline an imported plain value and scope it where it is used", () => {
	expect(valueOf(styles["use-imported-name"], "grid-area")).toBe(
		"style_hero"
	);
	expect(valueOf(styles["use-imported-keyword"], "grid-area")).toBe("auto");
	expect(valueOf(styles["use-imported-text"], "grid-row")).toBe("span 2");
	expect(valueOf(styles["use-local-keyword"], "grid-area")).toBe("auto");
});

it("should follow the longest imported prefix of a line name", () => {
	expect(valueOf(styles["use-alias-line"], "grid-row")).toBe(
		`${lib.area}-end`
	);
});

it("should resolve a local alias of an import as the import", () => {
	expect(valueOf(styles["use-local-alias"], "grid-area")).toBe(lib.area);
	expect(valueOf(styles["use-local-alias"], "grid-row")).toBe(
		`${lib.area}-start`
	);
	expect(valueOf(styles["use-local-alias-keyword"], "grid-area")).toBe("auto");
});
