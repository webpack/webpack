"use strict";

const fs = require("fs");
const path = require("path");

/** @type {import("webpack").Configuration} */
module.exports = {
	module: { unsafeCache: false },
	plugins: [
		(compiler) => {
			const selection = path.join(compiler.context, "selection.txt");
			compiler.hooks.normalModuleFactory.tap("SelectExternal", (factory) => {
				factory.hooks.beforeResolve.tap("SelectExternal", (data) => {
					if (data.request !== "choice") return;
					data.fileDependencies.add(selection);
					data.cacheable = false;
				});
			});
			new compiler.webpack.ExternalsPlugin("var", ({ request }, callback) => {
				if (request !== "choice") return callback();
				callback(
					null,
					JSON.stringify(fs.readFileSync(selection, "utf8").trim())
				);
			}).apply(compiler);
		}
	]
};
