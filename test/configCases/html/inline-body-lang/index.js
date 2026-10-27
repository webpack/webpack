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

it("should run the rules for a <style lang> body's extension", () => {
	const less = sheetOf(".less-lang");
	expect(less).toMatch(/css \.\/inline\.[\da-f]{16}\.less /);
	expect(less).not.toContain("@accent");
	expect(less).toMatch(/\.less-lang \{\s*color: green;\s*\}/);
	expect(less).toMatch(
		/\.less-lang \.nested \{\s*background: url\(handled-pixel\.png\);\s*\}/
	);

	for (const [selector, color, marker, extension] of [
		[".scss-lang", "purple", "by-scss-rule", "scss"],
		[".styl-lang", "teal", "by-stylus-rule", "styl"],
		[".postcss-lang", "olive", "by-postcss-rule", "postcss"]
	]) {
		const sheet = sheetOf(selector);
		expect(sheet).toMatch(
			new RegExp(`css \\./inline\\.[\\da-f]{16}\\.${extension} `)
		);
		expect(sheet).toContain(`${selector} { color: ${color}; }`);
		expect(sheet).toContain(`.${marker} {}`);
	}
});

it("should match a <style lang> no extension can name with `with: { lang }`", () => {
	const sheet = sheetOf(".attribute-lang");
	expect(sheet).toContain("css data:text/css;base64,");
	expect(sheet).toContain(".attribute-lang { color: navy; }");
	expect(sheet).toContain(".by-with-rule {}");
});

it("should run the rules for a <script lang> body's extension", () => {
	const scripts = [...page.matchAll(/<script src="([^"]+)"/g)].map((match) =>
		fs.readFileSync(path.resolve(__dirname, match[1]), "utf-8")
	);
	expect(scripts.join("\n")).toContain('window.inlineScriptLang = "SHOUT"');
	expect(scripts.join("\n")).toContain('window.inlineScriptPlain = "plain"');
	expect(scripts.join("\n")).toMatch(/\.\/inline\.[\da-f]{16}\.upper/);
});
