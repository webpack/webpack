const fs = require("fs");
const path = require("path");

const readHtml = (name) =>
	fs.readFileSync(path.resolve(__dirname, name)).toString("utf-8");

it("keeps the html options of the entry that owns a page another entry also bundles", () => {
	const html = readHtml("admin.html");
	expect(html).toMatch(/<meta http-equiv="Content-Security-Policy"/i);
	expect(html).toMatch(/<script\b[^>]*\bintegrity="sha384-/);
});
