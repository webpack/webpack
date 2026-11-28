import "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

/**
 * Preludes of the top-level rules, skipping comments, strings and escapes.
 * @param {string} css stylesheet
 * @returns {string[]} top-level preludes
 */
const topLevelPreludes = (css) => {
	const preludes = [];
	let depth = 0;
	let start = 0;
	for (let i = 0; i < css.length; i++) {
		const c = css[i];
		if (c === "\\") {
			i++;
		} else if (c === "/" && css[i + 1] === "*") {
			const end = css.indexOf("*/", i + 2);
			i = end === -1 ? css.length : end + 1;
			if (depth === 0) start = i + 1;
		} else if (c === '"') {
			const end = css.indexOf('"', i + 1);
			i = end === -1 ? css.length : end;
		} else if (c === "{") {
			if (depth === 0) preludes.push(css.slice(start, i).trim());
			depth++;
		} else if (c === "}") {
			depth--;
			if (depth === 0) start = i + 1;
		} else if (c === ";" && depth === 0) {
			start = i + 1;
		}
	}
	return preludes;
};

it("should close the media wrapper of a stylesheet ending in a backslash", () => {
	const css = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.css`),
		"utf-8"
	);
	expect(topLevelPreludes(css)).toEqual(["@media print", ".after"]);
});
