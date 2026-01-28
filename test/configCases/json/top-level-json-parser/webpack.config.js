"use strict";

const toml = require("toml");

/** @type {import("../../../../").Configuration[]} */
module.exports = [
	{
		mode: "development",
		module: {
			parser: {
				json: {
					parse(input) {
						// eslint-disable-next-line prefer-rest-params
						expect(arguments).toHaveLength(1);
						return toml.parse(input);
					}
				}
			},
			rules: [
				{
					test: /\.toml$/,
					type: "json"
				}
			]
		}
	}
];
