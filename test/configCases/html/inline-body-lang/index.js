const fs = require("fs");
const path = require("path");

const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");

/**
 * @param {string} selector selector opening the sheet
 * @returns {string} the sheet's `<style>` body
 */
const sheetOf = (selector) => {
	const start = page.lastIndexOf("<style", page.indexOf(selector));
	return page.slice(start, page.indexOf("</style>", start));
};

it("should leave a <style> in CSS as it was", () => {
	for (const [selector, color] of [
		[".plain", "red"],
		[".css-lang", "blue"]
	]) {
		const sheet = sheetOf(selector);
		expect(sheet).toContain("css data:text/css;base64,");
		expect(sheet).toContain(`${selector} { color: ${color}; }`);
		expect(sheet).not.toContain("by-");
	}
});

it("should type a <style lang> body as its language's files", () => {
	const less = sheetOf(".less-lang");
	expect(less).toContain("css data:text/less;base64,");
	expect(less).not.toContain("@accent");
	expect(less).toMatch(/\.less-lang \{\s*color: green;\s*\}/);
	expect(less).toMatch(
		/\.less-lang \.nested \{\s*background: url\(handled-pixel\.png\);\s*\}/
	);

	for (const [selector, color, marker, mediaType] of [
		[".scss-lang", "purple", "by-scss-rule", "text/x-scss"],
		[".styl-lang", "teal", "by-stylus-rule", "text/stylus"],
		[".postcss-lang", "olive", "by-postcss-rule", "text/x-postcss"]
	]) {
		const sheet = sheetOf(selector);
		expect(sheet).toContain(`css data:${mediaType};base64,`);
		expect(sheet).toContain(`${selector} { color: ${color}; }`);
		// A loader resolves from the page's directory, not from `data:text`.
		expect(sheet).toContain(`.${marker}-from-page-directory {}`);
	}
});

it("should leave a <style lang> no media type can name in CSS", () => {
	const sheet = sheetOf(".attribute-lang");
	expect(sheet).toContain("css data:text/css;base64,");
	expect(sheet).toContain("$accent: navy;");
	expect(sheet).not.toContain("by-");
});

it("should type a <script lang> body as its language's files", () => {
	const scripts = [...page.matchAll(/<script src="([^"]+)"/g)]
		.map((match) => fs.readFileSync(path.resolve(__dirname, match[1]), "utf-8"))
		.join("\n");
	expect(scripts).toContain('window.inlineScriptLang = "SHOUT"');
	expect(scripts).toContain('window.inlineScriptPlain = "plain"');
	expect(scripts).toContain("data:text/x-upper;base64,");
});
