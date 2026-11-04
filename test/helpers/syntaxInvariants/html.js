/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const {
	HTML_CUTS,
	PRESETS,
	htmlPurityDigest,
	htmlSlices,
	htmlSpans,
	idempotenceRepro,
	printerFor,
	sweepRespellings,
	tokenStream
} = require("../../../tooling/compare-html-tools");
const { cutsAt } = require("./relations");

/** @type {import("./index").SyntaxInvariants} */
module.exports = {
	printers: () =>
		PRESETS.map(([name, options]) => {
			const minify = printerFor(options);
			return {
				name,
				minify,
				says: tokenStream,
				repro: (printed, at) => idempotenceRepro(minify, printed, at)
			};
		}),
	spans: htmlSpans,
	slices: (html) => htmlSlices(html).reports,
	digest: (html) => htmlPurityDigest(html, printerFor(PRESETS[0][1])),
	respellings: (printer, html, printed) =>
		sweepRespellings(printer.minify, html, printed),
	cuts: (html) => cutsAt(html, HTML_CUTS)
};
