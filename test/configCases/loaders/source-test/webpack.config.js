"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	devtool: false,
	module: {
		rules: [
			...[
				"direct",
				"regexp",
				"include",
				"excluded",
				"exclude-only",
				"empty-regexp",
				"empty",
				"unicode",
				"right-output",
				"functional"
			].map((name) => {
				const use = [
					"./observer-loader.js",
					{
						loader: "./transform-loader.js",
						options: { value: name },
						sourceTest: {
							direct: /marker:direct/,
							regexp: /marker:regexp/g,
							include: "marker:include",
							excluded: "not-present",
							"exclude-only": "__VALUE__",
							"empty-regexp": /(?:)/,
							empty: "",
							unicode: "你好",
							"right-output": "generated:marker",
							functional: /marker:functional/
						}[name]
					},
					...(name === "right-output" ? ["./producer-loader.js"] : []),
					...(name === "empty" ? ["./empty-loader.js"] : [])
				];
				return {
					resourceQuery: new RegExp(`^\\?${name}$`),
					use: name === "functional" ? () => use : use
				};
			}),
			{
				resourceQuery: /^\?bom-hit$/,
				use: [
					{
						loader: "./transform-loader.js",
						options: { value: "bom-hit" },
						sourceTest: /^export/
					},
					"./bom-loader.js"
				]
			},
			{
				resourceQuery: /^\?bom-miss$/,
				use: [
					{
						loader: "./transform-loader.js",
						options: { value: "wrong" },
						sourceTest: /^\uFEFFexport/
					},
					"./bom-loader.js"
				]
			},
			{
				resourceQuery: /^\?string-bom$/,
				use: [
					{
						loader: "./transform-loader.js",
						options: { value: "string-bom" },
						sourceTest: /^export/
					},
					"./string-bom-loader.js"
				]
			},
			{
				resourceQuery: /^\?invalid-utf8$/,
				use: [
					{ loader: "./invalid-loader.js", sourceTest: /(?:)/ },
					"./invalid-producer-loader.js"
				]
			},
			{
				resourceQuery: /^\?metadata$/,
				use: [
					"./metadata-observer-loader.js",
					{
						loader: "./transform-loader.js",
						options: { value: "wrong" },
						sourceTest: /not present/
					},
					"./metadata-producer-loader.js"
				]
			},
			{
				resourceQuery: /^\?pitch$/,
				use: [{ loader: "./pitch-loader.js", sourceTest: /not present/ }]
			}
		]
	}
};
