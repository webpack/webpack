"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	setupDocument(document) {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.href = "bundle0.css";
		document.head.appendChild(link);
	},
	findBundle(i, options) {
		const source = fs.readFileSync(
			path.resolve(options.output.path, "bundle0.css"),
			"utf8"
		);

		if (
			!source.includes(`/*!********************************!*\\
  !*** css ./style-imported.css ***!
  \\********************************/`) &&
			!source.includes(`/*!***********************!*\\
  !*** css ./style.css ***!
  \\***********************/`)
		) {
			throw new Error("The `pathinfo` option doesn't work.");
		}

		return ["./style2_css.bundle0.js", "./bundle0.js"];
	}
};
