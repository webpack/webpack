"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	},
	afterExecute(options) {
		const html = fs.readFileSync(
			path.join(options.output.path, "page.html"),
			"utf8"
		);
		expect(html).toMatchSnapshot();

		// An enumerated value folds to the keyword it names, unquoted as quoted.
		expect(html).toContain("method=get");
		expect(html).toContain("type=text");
		expect(html).toContain("inputmode=numeric");
		expect(html).toContain("crossorigin=anonymous");
		expect(html).toContain("contenteditable=true");
		expect(html).toContain("kind=subtitles");
		// A boolean attribute spelled with its own name is the bare name.
		expect(html).not.toContain("checked=checked");
		expect(html).not.toContain("disabled=disabled");
		// A reference decodes to the character it names.
		expect(html).toContain("value=&");
		// `<image>` is renamed to `<img>`, so its tag is rebuilt rather than echoed.
		expect(html).toContain("<img c=f>");
		// Whitespace is an empty value, which is the bare name.
		expect(html).toContain("<div class>y</div>");
	}
};
