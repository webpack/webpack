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
						new Promise((_resolve, reject) => {
							setTimeout(() => {
								reject(new Error("Validation failed in compiler1"));
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
	},
	{
		name: "compiler3",
		validate: true,
		entry: "./test.js",
		plugins: [
			function MyValidatePlugin3(compiler) {
				compiler.hooks.validate.tapPromise(
					"MyValidatePlugin3",
					() =>
						new Promise((_resolve, reject) => {
							setTimeout(() => {
								reject(new Error("Validation failed in compiler3"));
							}, 100);
						})
				);
			}
		]
	}
];
