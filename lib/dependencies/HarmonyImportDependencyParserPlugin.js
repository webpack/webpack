/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

// const HarmonyImportDependency = require("./HarmonyImportDependency");
// const HarmonyImportSpecifierDependency = require("./HarmonyImportSpecifierDependency");
// const HarmonyAcceptImportDependency = require("./HarmonyAcceptImportDependency");
// const HarmonyAcceptDependency = require("./HarmonyAcceptDependency");
// const HarmonyModulesHelpers = require("./HarmonyModulesHelpers");

const parserHelpersLocation = require.resolve("../ParserHelpers");

module.exports = class HarmonyImportDependencyParserPlugin {
	constructor(moduleOptions) {
		this.strictExportPresence = moduleOptions.strictExportPresence;
		this.strictThisContextOnImports = moduleOptions.strictThisContextOnImports;
	}

	apply(parser) {
		parser.plugin("import", {
			path: parserHelpersLocation,
			fnName: "HarmonyImportDependencyImport",
		});

		parser.plugin("import specifier", {
			path: parserHelpersLocation,
			fnName: "HarmonyImportDependencyImportSpecifier",
		});

		parser.plugin("expression imported var", {
			path: parserHelpersLocation,
			fnName: "HarmonyImportDependencyExpressionImportedVar"
		});

		parser.plugin("expression imported var.*", {
			path: parserHelpersLocation,
			fnName: "HarmonyImportDependencyExpressionImportedVarStar"
		});

		if(this.strictThisContextOnImports) {
			// only in case when we strictly follow the spec we need a special case here
			parser.plugin("call imported var.*", {
				path: parserHelpersLocation,
				fnName: "HarmonyImportDependencyCallImportedVarStar",
			});
		}

		parser.plugin("call imported var", {
			path: parserHelpersLocation,
			fnName: "HarmonyImportCallImportedVar",
		});

		parser.plugin("hot accept callback", {
			path: parserHelpersLocation,
			fnName: "HarmonyImportHotAcceptCallback",
		});

		parser.plugin("hot accept without callback", {
			path: parserHelpersLocation,
			fnName: "HarmonyImportHotAcceptWithoutCallback",
		});
	}
};
