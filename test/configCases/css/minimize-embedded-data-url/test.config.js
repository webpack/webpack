"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	findBundle() {
		return ["bundle0.js"];
	},
	afterExecute(options) {
		const css = fs.readFileSync(
			path.join(options.output.path, "bundle0.css"),
			"utf8"
		);

		// One payload per language a media type can name, each rebuilt into the
		// url it was written in. The whole serialization is the record.
		expect(css).toMatchSnapshot();
		// A media type naming no language webpack knows keeps its payload byte for
		// byte — only the url token's own quoting is normalized.
		expect(css).toContain("url(data:image/png;base64,AAAA)");
	}
};
