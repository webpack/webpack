import { shown } from "./text-shake.module.css";

/**
 * @param {string} js bundle source
 * @returns {string} module.exports assignment for the text CSS module
 */
const extractTextModuleExports = (js) => {
	const marker = "css ./text-shake.module.css";
	const start = js.indexOf(marker);
	expect(start).not.toBe(-1);
	const slice = js.slice(start);
	const match = slice.match(/module\.exports = \{([\s\S]*?)\};/);
	expect(match).not.toBeNull();
	return match[0];
};

it("should resolve the used named export from a text CSS module", () => {
	expect(typeof shown).toBe("string");
	expect(shown.length).toBeGreaterThan(0);
});

it("should not emit default or unused named exports for named-only text import", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const js = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.js`),
		"utf-8"
	);

	const hidden = "hi" + "dden";
	const exportsBlock = extractTextModuleExports(js);

	expect(exportsBlock).toMatch(/"shown":/);
	expect(exportsBlock).not.toMatch(new RegExp(`"${hidden}":`));
	expect(exportsBlock).not.toMatch(/"default":/);
});
