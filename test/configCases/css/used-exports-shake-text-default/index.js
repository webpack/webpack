import text from "./text-shake.module.css";

/**
 * @param {string} js bundle source
 * @returns {string} generated code for the text CSS module
 */
const extractTextModuleSection = (js) => {
	const marker = "css ./text-shake.module.css";
	const start = js.indexOf(marker);
	expect(start).not.toBe(-1);
	const nextModule = js.indexOf("/***/", start + marker.length);
	return nextModule === -1 ? js.slice(start) : js.slice(start, nextModule);
};

it("should export CSS text as default when only default is imported", () => {
	expect(typeof text).toBe("string");
	expect(text).toMatch(/color:\s*green/);
	expect(text).toMatch(/color:\s*gray/);
});

it("should not emit unused named exports for default-only text import", () => {
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const js = fs.readFileSync(
		path.join(__dirname, `bundle${__STATS_I__}.js`),
		"utf-8"
	);

	const shown = "sh" + "own";
	const hidden = "hi" + "dden";
	const section = extractTextModuleSection(js);

	expect(section).toMatch(/module\.exports =/);
	expect(section).toMatch(/"default":/);
	expect(section).not.toMatch(new RegExp(`"${shown}":`));
	expect(section).not.toMatch(new RegExp(`"${hidden}":`));
});
