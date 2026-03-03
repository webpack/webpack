"use strict";

/** @type {import("../../../../types").Configuration[]} */
module.exports = [
	{
		name: "compiler1",
		validate: false,
		entry: "./test.js",
		plugins: [
			function MyValidatePlugin1(compiler) {
				compiler.hooks.validate.tap("MyValidatePlugin1", () => {
					throw new Error("Validation failed in compiler1");
				});
			}
		]
	},
	{
		name: "compiler2",
		validate: true,
		entry: "./test.js",
		plugins: [
			function MyValidatePlugin2(compiler) {
				compiler.hooks.validate.tap("MyValidatePlugin2", () => {});
			}
		]
	},
	{
		name: "compiler3",
		validate: false,
		unknown: true,
		entry: "./test.js"
	},
	{
		name: "compiler4",
		unknown: true,
		mode: "production",
		experiments: {
			futureDefaults: true
		},
		entry: "./test.js"
	}
];
