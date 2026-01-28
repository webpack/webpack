"use strict";

const json5 = require("json5");
const toml = require("toml");
// @ts-expect-error no types for yamljs
const yaml = require("yamljs");

/** @type {import("webpack").Configuration} */
const config = {
	module: {
		rules: [
			{
				test: /\.toml$/,
				type: "json",
				parser: {
					parse: toml.parse
				}
			},
			{
				test: /\.json5$/,
				type: "json",
				parser: {
					parse: json5.parse
				}
			},
			{
				test: /\.yaml$/,
				type: "json",
				parser: {
					parse: yaml.parse
				}
			}
		]
	}
};

module.exports = config;
