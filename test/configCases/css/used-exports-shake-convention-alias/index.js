import { fooBar, usedVar } from "./style.module.css";

/**
 * @param {string} js bundle source
 * @returns {string} module.exports assignment for the CSS module
 */
const extractModuleExports = (js) => {
	const marker = "css ./style.module.css";
	const start = js.indexOf(marker);
	expect(start).not.toBe(-1);
	const slice = js.slice(start);
	const match = slice.match(/module\.exports = \{([\s\S]*?)\};/);
	expect(match).not.toBeNull();
	return match[0];
};

/**
 * @param {string} js bundle source
 * @returns {string} concatenated CSS module bindings section
 */
const extractConcatCssSection = (js) => {
	const marker = "css ./style.module.css";
	const start = js.indexOf(marker);
	expect(start).not.toBe(-1);
	const end = js.indexOf(";// ./index.js", start);
	expect(end).not.toBe(-1);
	return js.slice(start, end);
};

it("should resolve the directly imported bindings", () => {
	expect(typeof fooBar).toBe("string");
	expect(fooBar.length).toBeGreaterThan(0);
	expect(usedVar).toBe("hello");
});

it("should emit used exports but omit unused exports and unused aliases in the JS wrapper", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const js = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.js`),
		"utf-8"
	);

	const unusedClass = "un" + "usedClass";
	const unusedExport = "un" + "usedVar";

	if (__STATS_I__ === 0) {
		const exportsBlock = extractModuleExports(js);
		expect(exportsBlock).toMatch(/"fooBar":/);
		expect(exportsBlock).not.toMatch(/"foo_bar":/);
		expect(exportsBlock).toMatch(/"usedVar":\s*"hello"/);
		expect(exportsBlock).not.toMatch(new RegExp(`"${unusedClass}":`));
		expect(exportsBlock).not.toMatch(new RegExp(`"${unusedExport}":`));
	} else {
		const cssSection = extractConcatCssSection(js);
		expect(cssSection).toMatch(/const fooBar =/);
		expect(cssSection).not.toMatch(/const foo_bar =/);
		expect(cssSection).toMatch(/const usedVar = "hello"/);
		expect(cssSection).not.toMatch(new RegExp(`const ${unusedClass} =`));
		expect(cssSection).not.toMatch(new RegExp(`const ${unusedExport} =`));
	}
});
