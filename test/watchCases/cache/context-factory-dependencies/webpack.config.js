"use strict";

const fs = require("fs");
const path = require("path");

/** @type {import("webpack").Configuration} */
module.exports = {
	module: { unsafeCache: false },
	plugins: [
		(compiler) => {
			compiler.hooks.contextModuleFactory.tap("SelectContext", (factory) => {
				factory.hooks.beforeResolve.tap("SelectContext", (data) => {
					if (data.request !== "./selected") return data;
					const selection = path.join(compiler.context, "selection.txt");
					data.fileDependencies.add(selection);
					data.request = `./${fs.readFileSync(selection, "utf8").trim()}`;
					return data;
				});
			});
		}
	]
};
