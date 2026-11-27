import "./style.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

/**
 * How many blocks and parentheses are open where `.after` starts.
 * @param {string} css stylesheet
 * @returns {number} the depth
 */
const depthAtAfter = (css) => {
	let depth = 0;
	for (let i = 0; i < css.length; i++) {
		const c = css[i];
		if (c === "\\") {
			i++;
		} else if (c === "/" && css[i + 1] === "*") {
			const end = css.indexOf("*/", i + 2);
			i = end === -1 ? css.length : end + 1;
		} else if (c === "{" || c === "(") {
			depth++;
		} else if (c === "}" || c === ")") {
			depth--;
		} else if (css.startsWith(".after", i)) {
			return depth;
		}
	}
	return -1;
};

it("should keep the escaped space that ends an @import condition", () => {
	const css = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.css`),
		"utf-8"
	);
	// `\)` would escape the parenthesis and leave the condition open.
	expect(css).toMatch(/@supports\s*\(--x:\\ \)\s*\{/);
	expect(depthAtAfter(css)).toBe(0);
});
