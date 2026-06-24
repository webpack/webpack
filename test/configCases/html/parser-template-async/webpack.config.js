"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	target: "web",
	module: {
		parser: {
			html: {
				template: async (source, { resource, addDependency, emitWarning }) => {
					await Promise.resolve();
					addDependency(resource);
					emitWarning("async template warning");
					return source
						.replace(/\{\{title\}\}/g, "Hello async")
						.replace(/\{\{image\}\}/g, "./image.png");
				}
			}
		}
	},
	experiments: {
		html: true
	}
};
