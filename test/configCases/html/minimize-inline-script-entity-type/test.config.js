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
		// What the parser reads is the decoded value, so both spellings name JSON
		// and both bodies are stripped.
		expect(page).toContain('<script type=application/ld+json>{"a":1}</script>');
		expect(page).toContain('<script type=application/ld+json>{"b":2}</script>');
		// The template language owns what is inside a data block, its whitespace
		// too — only a body webpack can name is touched.
		expect(page).toContain(
			'<script type=text/x-template>  <p   class="a">  {{ t }}  </p>  </script>'
		);
		expect(page).toContain(
			"<script type=text/yaml>\n    a: 1\n    b: 2\n  </script>"
		);
	}
};
