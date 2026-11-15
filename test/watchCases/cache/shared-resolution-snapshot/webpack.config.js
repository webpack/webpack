"use strict";

const fs = require("fs");
const path = require("path");

/** @import { Configuration } from "webpack" */

/** @type {Configuration["cache"][]} */
const caches = [false, true, { type: "filesystem" }];

/** @type {Configuration[]} */
module.exports = caches.map((cache) => ({
	mode: "development",
	cache,
	parallelism: 1
}));

module.exports.push({
	mode: "development",
	cache: false,
	parallelism: 1,
	plugins: [
		(compiler) => {
			compiler.hooks.normalModuleFactory.tap("ContextResolution", (factory) => {
				factory.hooks.beforeResolve.tap("ContextResolution", (data) => {
					if (data.request !== "./package") return;
					const directory = path.join(compiler.context, "package");
					data.contextDependencies.add(directory);
					data.request = fs.existsSync(path.join(directory, "selection.txt"))
						? "./other.js"
						: "./shared.js";
				});
			});
		}
	]
});
