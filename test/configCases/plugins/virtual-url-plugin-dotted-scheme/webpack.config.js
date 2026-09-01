"use strict";

const webpack = require("../../../../");

const { VirtualUrlPlugin } = webpack.experiments.schemes;

/** @type {import("webpack").Configuration} */
const config = {
	plugins: [
		new VirtualUrlPlugin(
			{
				greeting: "export const greeting = 'from a dotted scheme';"
			},
			"vnd.acme"
		),
		new VirtualUrlPlugin(
			{
				answer: "export const answer = 42;"
			},
			"x.y.z"
		)
	]
};

module.exports = config;
