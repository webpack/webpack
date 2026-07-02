import { used, usedVar } from "./styles.module.css";

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

/**
 * @param {string} js bundle source
 * @returns {string} concatenated CSS module bindings section
 */
const extractConcatCssSection = (js) => {
	const marker = "css ./styles.module.css";
	const start = js.indexOf(marker);
	expect(start).not.toBe(-1);
	const end = js.indexOf(";// ./index.js", start);
	expect(end).not.toBe(-1);
	return js.slice(start, end);
};

it("should resolve used class and :export bindings", () => {
	expect(typeof used).toBe("string");
	expect(used.length).toBeGreaterThan(0);
	expect(usedVar).toBe("hello");
});

it("should only emit used exports in the JS module wrapper", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const js = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.js`),
		"utf-8"
	);

	// Avoid embedding shake-sensitive literals in the bundle source.
	const unusedClass = "un" + "used";
	const unusedExport = "un" + "usedVar";

	if (__STATS_I__ === 0) {
		const exportsBlock = extractModuleExports(js);
		expect(exportsBlock).toMatch(/"used":/);
		expect(exportsBlock).not.toMatch(
			new RegExp(`"${unusedClass}":`)
		);
		expect(exportsBlock).toMatch(/"usedVar":\s*"hello"/);
		expect(exportsBlock).not.toMatch(
			new RegExp(`"${unusedExport}":`)
		);
	} else {
		const cssSection = extractConcatCssSection(js);
		expect(cssSection).toMatch(/const used =/);
		expect(cssSection).not.toMatch(
			new RegExp(`const ${unusedClass} =`)
		);
		expect(cssSection).toMatch(/const usedVar = "hello"/);
		expect(cssSection).not.toMatch(
			new RegExp(`const ${unusedExport} =`)
		);
	}
});

it("should still emit all CSS rules (export-level shake only)", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const css = fs.readFileSync(path.join(__dirname, "bundle0.css"), "utf-8");

	expect(css).toMatch(/color:\s*red/);
	expect(css).toMatch(/color:\s*blue/);
});
