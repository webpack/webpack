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
	const cells = [];
	// No `flatMap` — this bundle also runs on the Node 10 CI job.
	for (const row of String(declared[1]).match(/"[^"]*"/g)) {
		for (const cell of row.slice(1, -1).split(/\s+/)) {
			if (cell && !/^\.+$/.test(cell)) cells.push(cell);
		}
	}
	return cells;
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

it("should not read padding as a cell", () => {
	expect(cellsOf(styles["padded-grid"])).toEqual([styles["pad-head"]]);
	expect(gridAreaOf(styles["padded-head"])).toBe(styles["pad-head"]);
});

it("should bind an area named by the grid shorthand", () => {
	expect(cellsOf(styles["shorthand-grid"])).toEqual([
		styles["nav-bar"],
		styles["main-area"]
	]);
	expect(gridAreaOf(styles["shorthand-nav"])).toBe(styles["nav-bar"]);
});

it("should keep an escaped area name escaped", () => {
	expect(styles["x.y"]).toBe("_x.y");
	expect(gridAreaOf(styles["dotted-head"])).toBe("_x\\.y");
});

it("should keep implicit -start / -end line names paired with their area", () => {
	expect(cellsOf(styles["implicit-grid"])).toEqual([styles.side, styles.main]);
	expect(styles["main-start"]).toBe(`${styles.main}-start`);
	expect(styles["main-end"]).toBe(`${styles.main}-end`);
	expect(css()).toContain(
		`grid-column: ${styles["main-start"]} / ${styles["main-end"]}`
	);
	expect(styles["y-start"]).toBe(`${styles.y}-start`);
	expect(styles["y-end"]).toBe(`${styles.y}-end`);
	expect(gridAreaOf(styles["implicit-area"])).toBe(styles.y);
});

it("should pair implicit line names in every grid value form", () => {
	expect(styles["top-start"]).toBe(`${styles.top}-start`);
	expect(styles["top-end"]).toBe(`${styles.top}-end`);
	// `repeat()` and `subgrid` only name lines, so no area export to compare.
	expect(styles["col-start"]).toBe("_col-start");
	expect(styles["col-end"]).toBe("_col-end");
	expect(styles["row-start"]).toBe("_row-start");
	expect(styles["row-end"]).toBe("_row-end");
	expect(gridAreaOf(styles["implicit-placement"])).toBe(
		`${styles["top-start"]} / ${styles["col-start"]} / ${styles["top-end"]} / ${styles["col-end"]}`
	);
});

it("should strip a whole run of -start / -end suffixes, case-sensitively", () => {
	expect(styles["foo-start-start"]).toBe(`${styles["foo-start"]}-start`);
	expect(styles["foo-start-end"]).toBe(`${styles["foo-start"]}-end`);
	expect(styles["main-START"]).toBe("_main-START");
});

it("should emit the stylesheet", () => {
	expect(css()).toMatchSnapshot();
});
