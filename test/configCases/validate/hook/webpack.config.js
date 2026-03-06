"use strict";

/** @type {import("../../../../types").Configuration} */
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
