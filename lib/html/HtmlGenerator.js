/*
    MIT License http://www.opensource.org/licenses/mit-license.php
*/

"use strict";

const { RawSource } = require("webpack-sources");
const Generator = require("../Generator");

/** @typedef {import("../NormalModule")} NormalModule */
/** @typedef {import("../Generator").GenerateContext} GenerateContext */

class HtmlGenerator extends Generator {
	/**
	 * Generate the final HTML with resolved dependency URLs
	 * @param {NormalModule} module the module
	 * @param {GenerateContext} generateContext the generate context
	 * @returns {import("webpack-sources").Source} the generated source
	 */
	generate(module, generateContext) {
		// TODO: take the original HTML source string
		// TODO: for each dependency found by HtmlParser,
		//       replace the original src= or href= value
		//       with the final hashed output filename
		//       example: ./app.js -> app.a3f9c2.js
		// TODO: apply output.publicPath to all rewritten URLs
		// TODO: return the rewritten HTML as a webpack Source object

		return module.originalSource() || new RawSource("");
	}
}

module.exports = HtmlGenerator;
