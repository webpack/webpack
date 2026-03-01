"use strict";

/** @type {import("../../../../types").Configuration[]} */
module.exports = [
	{
		name: "compiler1",
		validate: true,
		entry: "./test.js",
		plugins: [
			function MyValidatePlugin1(compiler) {
				compiler.hooks.validate.tapPromise(
					"MyValidatePlugin1",
					() =>
						new Promise((resolve) => {
							setTimeout(() => {
								resolve();
							}, 100);
						})
				);
			}
		]
	},
	{
		name: "compiler2",
		validate: true,
		entry: "./test.js",
		plugins: [
			function MyValidatePlugin2(compiler) {
				compiler.hooks.validate.tapPromise(
					"MyValidatePlugin2",
					() =>
						new Promise((resolve) => {
							setTimeout(() => {
								resolve();
							}, 100);
						})
				);
			}
		]
	}
];
