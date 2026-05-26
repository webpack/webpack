"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	module: {
		parser: {
			html: {
				template: (source, { resource }) => {
					if (typeof resource !== "string") {
						throw new Error("Expected a resource path in the context");
					}
					return source
						.replace(/\{\{title\}\}/g, "Hello world")
						.replace(/\{\{image\}\}/g, "./image.png");
				}
			}
		}
	},
	experiments: {
		html: true
	}
};
