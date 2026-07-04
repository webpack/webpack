import styles from "./styles.module.css";

export { styles };

/**
 * @param {string} js bundle source
 * @returns {string} module.exports assignment for the CSS module
 */
const extractModuleExports = (js) => {
	const marker = "css ./styles.module.css";
	const start = js.indexOf(marker);
	expect(start).not.toBe(-1);
	const slice = js.slice(start);
	const match = slice.match(/module\.exports = \{([\s\S]*?)\};/);
	expect(match).not.toBeNull();
	return match[0];
};

it("should not emit an empty module.exports for default-only re-export", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const js = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.js`),
		"utf-8"
	);

	const exportsBlock = extractModuleExports(js);

	expect(exportsBlock).not.toBe("module.exports = {\n\n};");
	expect(exportsBlock).toMatch(/"used":/);
	expect(exportsBlock).toMatch(/"usedVar":/);

	const unusedClass = "un" + "used";
	const unusedExport = "un" + "usedVar";
	expect(exportsBlock).not.toMatch(new RegExp(`"${unusedClass}":`));
	expect(exportsBlock).not.toMatch(new RegExp(`"${unusedExport}":`));
});
