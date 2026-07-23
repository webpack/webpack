const fs = require("fs");
const path = require("path");

it("compiles an html-webpack-plugin-style template through a child compiler with auto html", () => {
	// The rendered page proves the child module for `template.html` was parsed
	// as JavaScript (the loader result), not misparsed by the built-in HTML type.
	const html = fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8");
	expect(html).toContain("<title>Hello</title>");
	// The inline <script> stays part of the template — it must not be extracted
	// into its own entry by the HTML pipeline.
	expect(html).toContain("alert(");
	expect(html).toContain("<h1>Static heading</h1>");
});
