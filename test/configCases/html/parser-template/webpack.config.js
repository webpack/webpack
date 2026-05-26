"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	module: {
		parser: {
			html: {
				template: (
					source,
					{ module, resource, addDependency, emitWarning, emitError }
				) => {
					if (typeof resource !== "string" || !module) {
						throw new Error("Expected module and resource in the context");
					}
					if (
						typeof addDependency !== "function" ||
						typeof emitWarning !== "function" ||
						typeof emitError !== "function"
					) {
						throw new Error("Incomplete html template context");
					}
					// Exercise addDependency (harmless: the module's own resource).
					addDependency(resource);
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
