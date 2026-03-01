"use strict";

/** @type {import("../../../../types").Configuration} */
module.exports = {
	validate: true,
	entry: "./test.js",
	plugins: [
		function MyValidatePlugin(compiler) {
			compiler.hooks.validate.tapPromise(
				"MyValidatePlugin",
				() =>
					new Promise((_resolve, reject) => {
						setTimeout(() => {
							reject(new Error("Validation failed"));
						}, 500);
					})
			);
		}
	]
};
