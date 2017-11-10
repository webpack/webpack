/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

// const RequireIncludeDependency = require("./RequireIncludeDependency");
const parserHelpersLocation = require.resolve("../ParserHelpers");

module.exports = class RequireIncludeDependencyParserPlugin {
	apply(parser) {
		parser.plugin("call require.include", {
			path: parserHelpersLocation,
			fnName: "RequireIncludeDependencyCallRequireInclude",
		});
	}
};
