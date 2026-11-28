import "./open.css";
import "./after-open.css";
import "./comment.css";
import "./after-comment.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

/**
 * Selectors of the top-level rules, skipping comments, strings and escapes.
 * @param {string} css stylesheet
 * @returns {string[]} top-level selectors
 */
const topLevelSelectors = (css) => {
	const selectors = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < css.length; i++) {
		const c = css[i];
		if (c === "\\") {
			i++;
		} else if (c === "/" && css[i + 1] === "*") {
			const end = css.indexOf("*/", i + 2);
			i = end === -1 ? css.length : end + 1;
		} else if (c === '"' || c === "'") {
			for (i++; i < css.length && css[i] !== c; i++) {
				if (css[i] === "\\") i++;
			}
		} else if (c === "{" || c === "(" || c === "[") {
			if (depth === 0 && c === "{") selectors.push(css.slice(start, i));
			depth++;
		} else if (c === "}" || c === ")" || c === "]") {
			depth--;
			if (depth === 0 && c === "}") start = i + 1;
		}
	}
	return selectors.map((selector) =>
		selector.replace(/\/\*[\s\S]*?\*\//g, "").trim()
	);
};

it("should keep the rules after a custom selector as rules", () => {
	const css = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.css`),
		"utf-8"
	);
	const selectors = topLevelSelectors(css);
	expect(selectors).toContain(".after-open");
	expect(selectors).toContain(".after-comment");
	expect(css).not.toContain(".evil");
});
