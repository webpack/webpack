const fs = require("fs");
const path = require("path");

it("should minify the payload of every data: URL a URL attribute holds", () => {
	const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(page).toMatchSnapshot();
	expect(page).toContain(`data='data:application/json,{"a":1}'`);
	expect(page).toContain(`href='data:application/json,{"b":"&#39;"}'`);
	expect(page).toContain("data:text/html,<p>a");
	expect(page).not.toContain("dropped");
	// A media type naming no language, and an attribute holding text.
	expect(page).toContain("data:image/png;base64,AAAA");
	expect(page).toContain(`data:application/json,{ "kept" : 1 }`);
});
