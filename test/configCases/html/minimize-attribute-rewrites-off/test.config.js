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

		expect(page).toContain('checked="checked"');
		expect(page).toContain('class="  b   a  "');
		expect(page).toContain('style="color:  #ff0000 ;"');
		expect(page).toContain('srcset="a.png 1x,   b.png 2x"');
		expect(page).toContain('content="width=device-width,  initial-scale=1"');
		expect(page).toContain('dir="RTL"');
		expect(page).toContain('id="q"');
		// An empty value is the bare name whatever the tier: the tokenizer reads
		// `x` and `x=""` as the same attribute.
		expect(page).toContain("<input checked");
	}
};
