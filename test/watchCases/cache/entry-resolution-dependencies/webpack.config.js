"use strict";

const path = require("path");

/** @import { Configuration } from "../../../.." */

/** @type {Configuration} */
module.exports = {
	plugins: [
		(compiler) => {
			compiler.hooks.thisCompilation.tap("EntryResolution", (compilation) => {
				compilation.fileDependencies.add(
					path.join(compiler.context, "trigger.txt")
				);
			});
		}
	]
};
