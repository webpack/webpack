import page from "./page.html";

/**
 * @param {string} selector selector opening the sheet
 * @returns {string} the sheet's `<style>` body
 */
const sheetOf = (selector) => {
	const start = page.lastIndexOf("<style", page.indexOf(selector));
	return page.slice(start, page.indexOf("</style>", start));
};

it("should leave a <style> without a stylesheet language to the CSS rules", () => {
	expect(sheetOf(".plain")).toContain("css data:text/css;base64,");
	expect(sheetOf(".plain")).toContain(".plain { color: red; }");
	expect(sheetOf(".css-lang")).toContain("css data:text/css;base64,");
	expect(sheetOf(".css-lang")).toContain(".css-lang { color: blue; }");
	expect(sheetOf(".plain")).not.toContain("by-");
	expect(sheetOf(".css-lang")).not.toContain("by-");
});

it("should type a <style lang> body as mime-db types the language", () => {
	const less = sheetOf(".less-lang");
	expect(less).toContain("css data:text/less;base64,");
	expect(less).not.toContain("@accent");
	expect(less).toMatch(/\.less-lang \{\s*color: green;\s*\}/);
	expect(less).toMatch(
		/\.less-lang \.nested \{\s*background: url\(handled-pixel\.png\);\s*\}/
	);

	const scss = sheetOf(".scss-lang");
	expect(scss).toContain("css data:text/x-scss;base64,");
	expect(scss).toContain(".scss-lang { color: purple; }");
	expect(scss).toContain(".by-scss-rule {}");

	for (const [selector, color] of [
		[".styl-lang", "teal"],
		[".stylus-lang", "navy"]
	]) {
		const stylus = sheetOf(selector);
		expect(stylus).toContain("css data:text/stylus;base64,");
		expect(stylus).toContain(`${selector} { color: ${color}; }`);
		expect(stylus).toContain(".by-stylus-rule {}");
	}
});

it("should type a <style lang> mime-db doesn't name as text/x-<lang>", () => {
	const postcss = sheetOf(".postcss-lang");
	expect(postcss).toContain("css data:text/x-postcss;base64,");
	expect(postcss).toContain(".postcss-lang { color: olive; }");
	expect(postcss).toContain(".by-postcss-rule {}");
});
