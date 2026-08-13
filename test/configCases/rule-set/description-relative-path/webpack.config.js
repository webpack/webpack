"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	module: {
		rules: [
			{
				descriptionData: { name: "fake-package" },
				descriptionRelativePath: "./lib/button.js",
				loader: "./loader",
				options: { value: "string" }
			},
			{
				descriptionData: { name: "fake-package" },
				descriptionRelativePath: /^\.\/vendor\//,
				loader: "./loader",
				options: { value: "regexp" }
			},
			{
				descriptionRelativePath: (relativePath) =>
					relativePath === "./lib/index.js",
				loader: "./loader",
				options: { value: "function" }
			},
			{
				descriptionRelativePath: { not: [/^\.\/(lib|vendor)\//] },
				descriptionData: { name: "fake-package" },
				loader: "./loader",
				options: { value: "not" }
			},
			{
				test: /self\.js$/,
				use: (data) => ({
					loader: "./loader",
					options: { value: `self ${data.descriptionRelativePath}` }
				})
			},
			{
				test: /virtual\.js$/,
				use: (data) => ({
					loader: "./loader",
					options: { value: `virtual ${String(data.descriptionRelativePath)}` }
				})
			}
		]
	}
};
