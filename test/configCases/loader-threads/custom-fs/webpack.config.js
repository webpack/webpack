"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	experiments: { threads: { max: 1 } },
	plugins: [
		{
			apply(compiler) {
				const inputFileSystem =
					/** @type {import("../../../../").InputFileSystem} */ (
						compiler.inputFileSystem
					);
				compiler.inputFileSystem =
					/** @type {import("../../../../").InputFileSystem} */ (
						new Proxy(inputFileSystem, {
							get(target, property) {
								const value = Reflect.get(target, property, target);
								return typeof value === "function" ? value.bind(target) : value;
							},
							getPrototypeOf() {
								return Object.prototype;
							}
						})
					);
			}
		}
	],
	module: {
		rules: [
			{
				test: /value\.js$/,
				use: ["./loader"],
				threads: true
			}
		]
	}
};
