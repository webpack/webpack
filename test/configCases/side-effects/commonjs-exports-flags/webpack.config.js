"use strict";

/** @import { Configuration } from "../../../../" */

/** @type {(analyse: boolean, sideEffects: boolean | "flag") => Configuration} */
const config = (analyse, sideEffects) => ({
	mode: "production",
	module: {
		rules: [
			{ test: /rule-side-effects\.js$/, sideEffects: true },
			{ test: /pure-dynamic\.js$/, type: "javascript/dynamic" }
		]
	},
	optimization: {
		sideEffects,
		concatenateModules: false,
		moduleIds: "named"
	},
	plugins: [
		new (require("../../../../").DefinePlugin)({
			ANALYSED: JSON.stringify(analyse),
			OPTIMIZED: JSON.stringify(sideEffects !== false)
		})
	]
});

module.exports = [
	config(true, true),
	config(false, "flag"),
	config(false, false)
];
