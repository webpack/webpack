/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

// const RequireContextDependency = require("./RequireContextDependency");
const parserHelpersLocation = require.resolve("../ParserHelpers");

module.exports = class RequireContextDependencyParserPlugin {
	apply(parser) {
		parser.plugin("call require.context", {
			path: parserHelpersLocation,
			fnName: "RequireContextDependencyParser"
		});
	}
};
