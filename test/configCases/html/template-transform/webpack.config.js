"use strict";

const path = require("path");

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	experiments: { html: true },
	module: {
		parser: {
			html: {
				template(
					source,
					{ addBuildDependency, addMissingDependency, emitWarning, emitError }
				) {
					addBuildDependency(path.resolve(__dirname, "page.html"));
					addMissingDependency(path.resolve(__dirname, "optional.html"));
					emitWarning("template warning");
					emitError(new Error("template error"));
					return source.replace("<p>Hello</p>", "<p>Transformed</p>");
				}
			}
		}
	}
};
