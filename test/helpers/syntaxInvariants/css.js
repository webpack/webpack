/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const {
	PRESETS,
	cssCuts,
	cssPurityDigest,
	cssSlices,
	cssSpans,
	printerFor,
	sweepRespellings,
	tokenStream
} = require("../../../tooling/compare-css-tools");

/** @type {import("./index").SyntaxInvariants} */
module.exports = {
	printers: () =>
		PRESETS.map(([name, options]) => ({
			name,
			minify: printerFor(options),
			says: tokenStream
		})),
	spans: cssSpans,
	slices: (css) => cssSlices(css).reports,
	digest: (css) => cssPurityDigest(css, printerFor(PRESETS[0][1])),
	respellings: (printer, css, printed) =>
		sweepRespellings(printer.minify, css, printed),
	cuts: cssCuts
};
