"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	module: {
		parser: {
			html: {
				template: (
					source,
					{
						module,
						resource,
						addDependency,
						addContextDependency,
						addMissingDependency,
						emitWarning,
						emitError
					}
				) => {
					if (typeof resource !== "string" || !module) {
						throw new Error("Expected module and resource in the context");
					}
					if (
						typeof addDependency !== "function" ||
						typeof addContextDependency !== "function" ||
						typeof addMissingDependency !== "function" ||
						typeof emitWarning !== "function" ||
						typeof emitError !== "function"
					) {
						throw new Error("Incomplete html template context");
					}
					// Exercise the dependency helpers (harmless paths).
					addDependency(resource);
					addContextDependency(require("path").dirname(resource));
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
