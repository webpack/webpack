import { button } from "./styles.module.css";

/**
 * @param {string} js bundle source
 * @returns {string} the CSS module's section of the bundle
 */
const extractCssSection = (js) => {
	const start = js.indexOf("css ./styles.module.css");
	expect(start).not.toBe(-1);
	const end = js.indexOf("./index.js", start + 1);
	expect(end).not.toBe(-1);
	return js.slice(start, end);
};

it("should keep the composed class in the composing one's value", () => {
	const names = button.split(" ");
	expect(names).toHaveLength(2);
	expect(names[0]).not.toBe(names[1]);
	// both names are classes the emitted stylesheet defines
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");
	for (const name of names) expect(css).toContain(`.${name}`);
});

it("should shake the composed and unrelated names from the JS exports", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const section = extractCssSection(
		fs.readFileSync(path.join(__dirname, `bundle${__STATS_I__}.js`), "utf-8")
	);
	// split, so this file's own source cannot satisfy the match
	const composed = "ba" + "se";
	const unrelated = "oth" + "er";
	expect(section).toMatch(/button/);
	expect(section).not.toMatch(new RegExp(`"${composed}"|const ${composed} =`));
	expect(section).not.toMatch(new RegExp(`"${unrelated}"|const ${unrelated} =`));
});
