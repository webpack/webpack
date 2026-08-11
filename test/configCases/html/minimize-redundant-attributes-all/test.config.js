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
		// `all` adds the spec defaults on top of what `smart` drops — this is the
		// tier that changes what `input[type=text]` matches.
		expect(page).toMatchSnapshot();
		expect(page).toContain("<input name=a>");
		expect(page).toContain("<form><button>b</button></form>");
		expect(page).toContain("<td>c<");
		expect(page).toContain("<textarea>");
		// A value that is not the default still says something.
		expect(page).toContain("<input type=checkbox");
		expect(page).toContain("<td colspan=2>");
	}
};
