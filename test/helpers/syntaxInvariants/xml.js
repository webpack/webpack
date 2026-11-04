/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const {
	PRESETS,
	XML_CUTS,
	canonical,
	idempotenceRepro,
	printerFor,
	sweepRespellings,
	xmlPurityDigest,
	xmlSlices,
	xmlSpans
} = require("../../../tooling/compare-xml-tools");
const { cutsAt } = require("./relations");

/** @type {import("./index").SyntaxInvariants} */
module.exports = {
	printers: () =>
		PRESETS.map(([name, options, cssOptions]) => {
			const minify = printerFor(options);
			return {
				name,
				minify,
				says: (text) => canonical(text, cssOptions),
				repro: (printed, at) => idempotenceRepro(minify, printed, at)
			};
		}),
	spans: xmlSpans,
	slices: (xml) => xmlSlices(xml).reports,
	digest: xmlPurityDigest,
	// The XML sweep respells under its own first preset.
	respellings: (_printer, xml, printed) => sweepRespellings(xml, printed),
	cuts: (xml) => cutsAt(xml, XML_CUTS)
};
