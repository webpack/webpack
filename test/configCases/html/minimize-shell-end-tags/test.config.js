"use strict";

const fs = require("fs");
const path = require("path");
const { htmlMinify } = require("../../../../").html.syntax;

module.exports = {
	findBundle(_i, options) {
		const files = fs.readdirSync(options.output.path);
		return files.includes("main.js") ? ["./main.js"] : undefined;
	},
	async afterExecute(options) {
		const html = fs.readFileSync(
			path.join(options.output.path, "page.html"),
			"utf8"
		);
		expect(html).toMatchSnapshot();

		// The start tag goes and the end tag the source wrote stays.
		expect(html).not.toContain("<html");
		expect(html.endsWith("</html>")).toBe(true);
		// A second pass over the first one's output has nothing left to take.
		const again = await htmlMinify({ "page.html": html }, {});
		expect(again.code).toBe(html);
	}
};
