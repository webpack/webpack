/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const parserHelpersLocation = require.resolve("../ParserHelpers");

module.exports = class RequireEnsureDependenciesBlockParserPlugin {
	apply(parser) {
		parser.plugin("call require.ensure", {
			path: parserHelpersLocation,
			fnName: "RequireEnsureDependenciesBlockParser",
		});
	}
};
