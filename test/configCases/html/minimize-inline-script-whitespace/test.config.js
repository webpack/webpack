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
