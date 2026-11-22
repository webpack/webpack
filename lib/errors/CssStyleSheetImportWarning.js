/*
	MIT License https://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const makeSerializable = require("../util/makeSerializable");
const WebpackError = require("./WebpackError");

class CssStyleSheetImportWarning extends WebpackError {
	/**
	 * Creates an instance of CssStyleSheetImportWarning.
	 * @param {string} request the url of the external `@import`
	 */
	constructor(request) {
		super(
			`The external @import of ${JSON.stringify(
				request
			)} in a stylesheet imported as a CSSStyleSheet (with { type: "css" }) is added to the page's CSS instead: a constructed stylesheet ignores @import rules.\nImport the stylesheet with { type: "text" } to keep the @import in its text, or load the url another way.`
		);

		/** @type {string} */
		this.name = "CssStyleSheetImportWarning";
		/** @type {boolean} */
		this.hideStack = true;
	}
}

makeSerializable(
	CssStyleSheetImportWarning,
	"webpack/lib/errors/CssStyleSheetImportWarning"
);

module.exports = CssStyleSheetImportWarning;
