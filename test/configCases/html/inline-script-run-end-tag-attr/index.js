const fs = require("fs");
const path = require("path");

const page = require("./page.html");

const pageContent = typeof page === "string" ? page : "";

it("should remove a merged script's whole end tag when a quoted attribute holds `>`", () => {
	const urls = pageContent.match(/<script src="page\d*\.js"><\/script>/g) || [];
	expect(urls).toHaveLength(1);
	const chunk = fs.readFileSync(
		path.resolve(__dirname, urls[0].replace(/^.*src="|".*$/g, "")),
		"utf-8"
	);
	expect(chunk).toContain("MARK_1");
	expect(chunk).toContain("MARK_2");
	// No part of the end tag is left behind as page text.
	expect(pageContent).not.toMatch(/^">/m);
	expect(pageContent).toMatch(/<\/script>\s*<p>after<\/p>/);
});
