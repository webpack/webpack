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

it("should resolve an imported implicit line to the area declaring it", () => {
	expect(valueOf(styles["use-area-start"], "grid-column")).toBe(
		`${lib.area}-start`
	);
});

it("should resolve an imported implicit area to the lines declaring it", () => {
	expect(lib["line-start"]).toBe("lib_line-start");
	expect(valueOf(styles["use-line"], "grid-area")).toBe("lib_line");
	expect(valueOf(styles["use-line"], "grid-row")).toBe(lib["line-start"]);
});

it("should fall back to an `-end` line when no `-start` line declares the area", () => {
	expect(lib["tail-end"]).toBe("lib_tail-end");
	expect(valueOf(styles["use-tail"], "grid-area")).toBe("lib_tail");
});
