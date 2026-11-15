const fs = require("fs");
const path = require("path");

/**
 * @param {string} name the page's entry name
 * @returns {string} the emitted page
 */
const read = (name) =>
	fs.readFileSync(path.resolve(__dirname, `${name}.html`), "utf-8");

it("should keep an imported sheet's `</style>` inside the `<style>`", () => {
	const html = read("import");
	expect(html).toContain('content: "<\\/style><b>bold</b>"');
	expect(html.match(/<\/style/gi)).toHaveLength(1);
});

it("should quote an unquoted `style` and `srcdoc` value it writes back", () => {
	const html = read("unquoted");
	expect(html).toMatch(/<div style="[^"]*; title=a">a<\/div>/);
	expect(html).toContain('<iframe srcdoc="<p title=x>hi"></iframe>');
});

it("should keep a decoded `</noscript>` in a value escaped", () => {
	const html = read("unquoted");
	expect(html).toContain("&lt;/noscript><b>bold</b>");
	expect(html.match(/<\/noscript/gi)).toHaveLength(1);
});

it("should write into a page with two byte order marks where it parsed", () => {
	const html = read("bom");
	expect(html).toMatch(/<style>[^<]*p::after \{ content: "><b>/);
	expect(html).not.toContain("}}</style>");
});

it("should drop an attribute rewrite inside a dropped tag", () => {
	const html = read("nested");
	expect(html).not.toContain("bold");
	expect(html).toMatch(/<script src="nested\.js"><\/script>\s*$/);
});
