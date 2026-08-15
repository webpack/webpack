"use strict";

/** @type {import("../../../../").Configuration} */
module.exports = {
	mode: "development",
	performance: {
		hints: "warning",
		unusedRules: true
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				use: []
			},
			{
				test: /\.never-matches$/,
				loader: "./loader"
			},
			// Each of these is unused too, and names itself a different way.
			{
				include: "/never/matches/this/path",
				loader: "./loader"
			},
			{
				resourceQuery: "?never-matches",
				loader: "./loader"
			},
			{
				resourceQuery: "?never-matches-either",
				type: "asset/source"
			}
		]
	}
};
