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

it("should resolve the directly imported bindings", () => {
	expect(typeof fooBar).toBe("string");
	expect(fooBar.length).toBeGreaterThan(0);
	expect(usedVar).toBe("hello");
});

it("should emit convention aliases but omit unused exports in the JS wrapper", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const js = fs.readFileSync(path.join(__dirname, "bundle0.js"), "utf-8");

	const unusedClass = "un" + "usedClass";
	const unusedExport = "un" + "usedVar";
	const exportsBlock = extractModuleExports(js);

	// `fooBar` is imported; `foo_bar` is the as-is alias for the same class.
	expect(exportsBlock).toMatch(/"fooBar":/);
	expect(exportsBlock).toMatch(/"foo_bar":/);
	expect(exportsBlock).toMatch(/"usedVar":\s*"hello"/);
	expect(exportsBlock).not.toMatch(new RegExp(`"${unusedClass}":`));
	expect(exportsBlock).not.toMatch(new RegExp(`"${unusedExport}":`));
});
