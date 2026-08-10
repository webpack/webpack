import * as styles from "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const css = () =>
	fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

/**
 * The cell names an areas string carries, as emitted.
 * @param {string} rule scoped class of the rule declaring the areas
 * @returns {string[]} named cells in source order, null cells dropped
 */
const cellsOf = (rule) => {
	const declared = new RegExp(
		`\\.${rule}\\s*\\{[^}]*grid-template(?:-areas)?:\\s*([^;}]+)`
	).exec(css());
	return String(declared[1])
		.match(/"[^"]*"/g)
		.flatMap((row) => row.slice(1, -1).split(/\s+/))
		.filter((cell) => cell && !/^\.+$/.test(cell));
};

/**
 * @param {string} rule scoped class of the rule
 * @returns {string} its emitted `grid-area` value
 */
const gridAreaOf = (rule) =>
	new RegExp(`\\.${rule}\\s*\\{[^}]*grid-area:\\s*([^;}]+)`)
		.exec(css())[1]
		.trim();

it("should bind a hyphenated area name to its grid-area", () => {
	expect(cellsOf(styles["hyphen-grid"])).toEqual([
		styles["main-head"],
		styles["side-bar"]
	]);
	expect(gridAreaOf(styles["hyphen-head"])).toBe(styles["main-head"]);
	expect(gridAreaOf(styles["hyphen-side"])).toBe(styles["side-bar"]);
});

it("should bind an area name carrying digits", () => {
	expect(cellsOf(styles["digit-grid"])).toEqual([
		styles["a-1"],
		styles["a-2"]
	]);
	expect(gridAreaOf(styles["digit-one"])).toBe(styles["a-1"]);
});

it("should bind a non-ASCII area name", () => {
	expect(cellsOf(styles["unicode-grid"])).toEqual([styles["héad"]]);
	expect(gridAreaOf(styles["unicode-head"])).toBe(styles["héad"]);
});

it("should read an escape as part of the cell it opens", () => {
	// `\68 ead` is `head`: the space closes the escape, it does not split the
	// cell in two, and the escaped spelling scopes to the plain one's ident.
	expect(cellsOf(styles["escaped-grid"])).toEqual([styles.head, styles.foot]);
	expect(gridAreaOf(styles["escaped-head"])).toBe(styles.head);
	expect(gridAreaOf(styles["escaped-foot"])).toBe(styles.foot);
	expect(cellsOf(styles["escaped-long-grid"])).toEqual([styles.head]);
	expect(gridAreaOf(styles["escaped-long-head"])).toBe(styles.head);
});

it("should leave a null cell alone", () => {
	expect(css()).toContain(`"${styles.head} ."`);
	expect(css()).toContain(`"... ${styles.foot}"`);
});

it("should bind an area named by the grid shorthand", () => {
	expect(cellsOf(styles["shorthand-grid"])).toEqual([
		styles["nav-bar"],
		styles["main-area"]
	]);
	expect(gridAreaOf(styles["shorthand-nav"])).toBe(styles["nav-bar"]);
});

it("should emit the stylesheet", () => {
	expect(css()).toMatchSnapshot();
});
