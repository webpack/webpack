/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";


const parserHelpersLocation = require.resolve("../ParserHelpers");

module.exports = class HarmonyDetectionParserPlugin {
	apply(parser) {
		parser.plugin("program", {
			path: parserHelpersLocation,
			fnName: "HarmonyDetectionProgram",
		});

		var nonHarmonyIdentifiers = ["define", "exports"];
		nonHarmonyIdentifiers.forEach(identifer => {
			parser.plugin(`evaluate typeof ${identifer}`, {
				path: parserHelpersLocation,
				fnName: "nullInHarmony",
			});
			parser.plugin(`typeof ${identifer}`, {
				path: parserHelpersLocation,
				fnName: "skipInHarmony",
			});
			parser.plugin(`evaluate ${identifer}`, {
				path: parserHelpersLocation,
				fnName: "nullInHarmony",
			});
			parser.plugin(`expression ${identifer}`, {
				path: parserHelpersLocation,
				fnName: "skipInHarmony",
			});
			parser.plugin(`call ${identifer}`, {
				path: parserHelpersLocation,
				fnName: "skipInHarmony",
			});
		});
	}
};
