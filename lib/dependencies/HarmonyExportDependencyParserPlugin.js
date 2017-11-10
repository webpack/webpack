/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const parserHelpersLocation = require.resolve("../ParserHelpers");

module.exports = class HarmonyExportDependencyParserPlugin {
	apply(parser) {
		parser.plugin("export", {
			path: parserHelpersLocation,
			fnName: "HarmonyExportExport",
		});
		parser.plugin("export import", {
			path: parserHelpersLocation,
			fnName: "HarmonyExportImport",
		});

		parser.plugin("export expression", {
			path: parserHelpersLocation,
			fnName: "HarmonyExportExportExpression",
		});

		parser.plugin("export declaration", {
			path: parserHelpersLocation,
			fnName: "noop",
		});

		parser.plugin("export specifier", {
			path: parserHelpersLocation,
			fnName: "HarmonyExportExportSpecifier",
		});

		parser.plugin("export import specifier", {
			path: parserHelpersLocation,
			fnName: "HarmonyExportExportImportSpecifier",
		});
	}
};
