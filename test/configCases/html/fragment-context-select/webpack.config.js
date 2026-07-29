"use strict";

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		name: "select",
		module: {
			rules: [
				{
					test: /\.html$/,
					type: "html",
					parser: { as: "select" }
				}
			]
		},
		experiments: { html: true }
	},
	{
		name: "template",
		module: {
			rules: [
				{
					test: /\.html$/,
					type: "html",
					parser: { as: "template" }
				}
			]
		},
		experiments: { html: true }
	}
];
