import "./a1.css";
import "./b.css";
import "./a2.css";
import "./c.css";
import "./a3.css";
import "./d.css";
import "./a4.css";
import "./e.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

/**
 * Selectors of the top-level rules, skipping comments, strings and blocks.
 * @param {string} css stylesheet
 * @returns {string[]} top-level selectors
 */
const topLevelSelectors = (css) => {
	const selectors = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < css.length; i++) {
		const c = css[i];
		if (c === "/" && css[i + 1] === "*") {
			const end = css.indexOf("*/", i + 2);
			i = end === -1 ? css.length : end + 1;
			if (depth === 0) start = i + 1;
		} else if (c === '"') {
			const end = css.indexOf('"', i + 1);
			i = end === -1 ? css.length : end;
		} else if (c === "(") {
			const end = css.indexOf(")", i + 1);
			i = end === -1 ? css.length : end;
		} else if (c === "{") {
			if (depth === 0) selectors.push(css.slice(start, i).trim());
			depth++;
		} else if (c === "}") {
			depth--;
			if (depth === 0) start = i + 1;
		}
	}
	return selectors;
};

it("should close what a module left open before the next module", () => {
	const css = fs.readFileSync(path.join(__dirname, `bundle${__STATS_I__}.css`), "utf-8");
	expect(topLevelSelectors(css)).toEqual([
		".a1",
		".b",
		".a2",
		".c",
		".a3",
		".d",
		".a4",
		".e"
	]);
});
