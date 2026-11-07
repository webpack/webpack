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

it("should resolve an imported implicit line to the area declaring it", () => {
	expect(valueOf(styles["use-imported-line"], "grid-column")).toBe(
		`${lib.area}-start`
	);
});

it("should resolve an imported implicit area to the lines declaring it", () => {
	expect(lib["line-start"]).toBe("lib_line-line-start");
	expect(valueOf(styles["use-line-area"], "grid-area")).toBe("lib_line-line");
	expect(valueOf(styles["use-line"], "grid-row")).toBe(lib["line-start"]);
});

it("should spell an aliased or re-exported name as the declaring module does", () => {
	for (const rule of [styles["use-alias"], styles["use-chain"]]) {
		expect(valueOf(rule, "grid-area")).toBe(lib.area);
		expect(valueOf(rule, "grid-row")).toBe(
			`${lib.area}-start / ${lib.area}-end`
		);
	}
});

it("should fall back to an `-end` line when no `-start` line declares the area", () => {
	expect(valueOf(styles["use-tail"], "grid-area")).toBe("lib_tail-tail");
	expect(lib["tail-end"]).toBe("lib_tail-tail-end");
});

it("should scope a name no import selects in its own module", () => {
	expect(valueOf(styles["use-local"], "grid-area")).toBe(styles.local);
	expect(valueOf(styles["use-local"], "grid-row")).toBe(`${styles.local}-start`);
	expect(styles.local).toBe("style_local-local");
});

it("should leave an import nothing declares unscoped", () => {
	expect(valueOf(styles["use-missing"], "grid-area")).not.toMatch(
		/^(lib|style)_/
	);
});
