"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: ["web", "es2022"],
	entry: { main: "./src/main.js", a: "./a.html", docs: "./docs.html" },
	output: { htmlFilename: "[name].html" },
	module: {
		parser: {
			html: { sources: ["...", { tag: "a", attribute: "href", type: "html" }] }
		}
	},
	experiments: { html: true }
};
