/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const {
	JS_CUTS,
	PRESETS,
	goalFor,
	jsPurityDigest,
	jsSlices,
	minifyOnePass,
	parsesAsLatest,
	printerFor,
	spansEitherGoal,
	sweepRespellings,
	tokenMeaning
} = require("../../../tooling/compare-js-tools");
const { cutsAt } = require("./relations");

/**
 * Whether a source is a module, as a build reads it.
 * @param {string} source a script or a module
 * @returns {boolean | null} true for a module, null where neither goal parses
 */
const isModule = (source) => {
	const goal = goalFor(source);
	return goal === null ? null : goal.sourceType === "module";
};

/** @type {import("./index").SyntaxInvariants} */
module.exports = {
	printers: (source) => {
		const module = isModule(source);
		// Read as a build reads it, at the latest edition.
		if (module === null || !parsesAsLatest(source, module)) return [];
		return PRESETS.map(([name, options]) => {
			const { minify, reprint } = printerFor(minifyOnePass, options, module);
			return {
				name,
				minify,
				reprint,
				says: (text) => tokenMeaning(text, module)
			};
		});
	},
	spans: spansEitherGoal,
	slices: (source) => {
		const goal = goalFor(source);
		const answered = goal === null ? null : jsSlices(source, goal);
		return answered === null ? null : answered.reports;
	},
	digest: (source) => {
		const goal = goalFor(source);
		if (goal === null) return "";
		const format = /** @type {[string, EXPECTED_ANY]} */ (
			PRESETS.find(([name]) => name === "format")
		);
		const { minify } = printerFor(
			minifyOnePass,
			format[1],
			goal.sourceType === "module"
		);
		return jsPurityDigest(source, goal, minify);
	},
	respellings: (printer, source, printed) =>
		sweepRespellings(printer.minify, source, Boolean(isModule(source)), printed),
	cuts: (source) => cutsAt(source, JS_CUTS)
};
