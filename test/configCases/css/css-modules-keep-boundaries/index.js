import * as styles from "./style.module.css";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

/**
 * The stylesheet with its comments taken out, strings and escapes kept.
 * @param {string} css stylesheet
 * @returns {string} the stylesheet without comments
 */
const withoutComments = (css) => {
	let out = "";
	for (let i = 0; i < css.length; i++) {
		const c = css[i];
		if (c === "\\") {
			out += css.slice(i, i + 2);
			i++;
		} else if (c === "/" && css[i + 1] === "*") {
			const end = css.indexOf("*/", i + 2);
			i = end === -1 ? css.length : end + 1;
		} else if (c === '"' || c === "'") {
			let end = i + 1;
			while (end < css.length && css[end] !== c) {
				if (css[end] === "\\") end++;
				end++;
			}
			out += css.slice(i, end + 1);
			i = end;
		} else {
			out += c;
		}
	}
	return out;
};

it("should keep the text around a CSS modules rewrite as written", () => {
	const raw = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.css`),
		"utf-8"
	);
	const css = withoutComments(raw);
	// An inlined `@value` ending in `/` must not open a comment.
	expect(raw).not.toContain("1px/*");
	expect(css).toMatch(
		new RegExp(`\\.${styles["bare-marker"]}[^{]*\\{\\s*color:\\s*red`)
	);
	expect(css).toMatch(new RegExp(`\\.${styles.after}\\s*\\{\\s*color:\\s*blue`));
	expect(css).toMatch(/content:\s*"a:b"/);
	expect(css).toMatch(/background:\s*url\(http:\/\/example\.com\/a\.png\)/);
	expect(css).toMatch(/animation-name:\s*foo/);
	expect(css).not.toContain(".evil");
});
