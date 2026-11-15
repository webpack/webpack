const fs = require("fs");
const path = require("path");

it("should leave a link to the page's file under an injected <base> as written", () => {
	const page = fs.readFileSync(path.resolve(__dirname, "page.html"), "utf-8");
	expect(page).toContain('<base href="https://example.com/other/">');
	expect(page).toContain('<div id="page_html-style-1-help">one</div>');
	expect(page).toContain('<a href="page.html#help">two</a>');
	// A fragment alone stays on the page, whatever the base.
	expect(page).toContain('<a href="#page_html-style-1-help">three</a>');
});
