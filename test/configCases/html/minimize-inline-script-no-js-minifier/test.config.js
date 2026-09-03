"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	},
	afterExecute(options) {
		const page = fs.readFileSync(
			path.join(options.output.path, "page.html"),
			"utf8"
		);
		expect(page).toMatchSnapshot();
		// Program text, so the edges go — the type spelled with a reference too.
		expect(page).toContain("<script>var a = 1</script>");
		expect(page).toContain("<script type=text/javascript>var b = 2</script>");
		// A data block keeps every byte, its indentation being its own syntax.
		expect(page).toContain(
			"<script type=text/yaml>\n    a: 1\n    b: 2\n  </script>"
		);
	}
};
