"use strict";

/** @import { Configuration } from "../../../../types.d.ts" */

/** @type {Configuration} */
module.exports = {
	validate: true,
	entry: "./test.js",
	plugins: [
		function MyValidatePlugin(compiler) {
			compiler.hooks.validate.tap("MyValidatePlugin", () => {
				throw new Error("Validation failed");
			});
		}
	]
};
