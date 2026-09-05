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

		// A handler is minified as a function body, so `return` survives it, and a
		// name that is a handler nowhere near this element is left as written.
		expect(page).toContain("return!1");
		expect(page).toContain("not( 'a handler here' )");
		expect(page).toMatchSnapshot();
	}
};
