"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		const dir = options.output.path;
		const css = fs.readFileSync(path.join(dir, "bundle0.css"), "utf8");
		const urls = [...css.matchAll(/url\(([^)]*)\)/g)].map((match) => match[1]);
		expect(urls).toHaveLength(2);
		// A top-level declaration is a parse error whose tokens become a qualified
		// rule's prelude, so one url here stands in a prelude and one in a block.
		// Neither may point at a source path that is not beside the bundle.
		for (const url of urls) {
			expect({ url, emitted: fs.existsSync(path.join(dir, url)) }).toEqual({
				url,
				emitted: true
			});
		}
	}
};
