/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const parserHelpersLocation = require.resolve("../ParserHelpers");

class AMDDefineDependencyParserPlugin {
	constructor(options) {
		this.options = options;
	}

	apply(parser) {
		const options = this.options;
		parser.plugin("call define", {
			path: parserHelpersLocation,
			fnName: "AMDDefineDependencyCallDefine",
		});

		parser.plugin("call define:amd:array", {
			path: parserHelpersLocation,
			fnName: "AMDDefineDependencyCallDefineAMDArray",
		});

		parser.plugin("call define:amd:item", {
			path: parserHelpersLocation,
			fnName: "AMDDefineDependencyCallDefineAMDItem",
		});

		parser.plugin("call define:amd:context", {
			path: parserHelpersLocation,
			fnName: "AMDDefineDependencyCallDefineAMDContext",
		}, options);
	}
}
module.exports = AMDDefineDependencyParserPlugin;
