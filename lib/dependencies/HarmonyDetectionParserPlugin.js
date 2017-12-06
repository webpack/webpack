/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/
"use strict";

const HarmonyCompatibilityDependency = require("./HarmonyCompatibilityDependency");
const HarmonyInitDependency = require("./HarmonyInitDependency");

module.exports = class HarmonyDetectionParserPlugin {
	apply(parser) {
		parser.plugin("program", (ast) => {
			const isStrictHarmony = parser.state.module.type === "javascript/esm";
			const isHarmony = isStrictHarmony || ast.body.some(statement => {
				return /^(Import|Export).*Declaration$/.test(statement.type);
			});
			if(isHarmony) {
				const module = parser.state.module;
				const compatDep = new HarmonyCompatibilityDependency(module);
				compatDep.loc = {
					start: {
						line: -1,
						column: 0
					},
					end: {
						line: -1,
						column: 0
					},
					index: -3
				};
				module.addDependency(compatDep);
				const initDep = new HarmonyInitDependency(module);
				initDep.loc = {
					start: {
						line: -1,
						column: 0
					},
					end: {
						line: -1,
						column: 0
					},
					index: -2
				};
				module.addDependency(initDep);
				parser.state.harmonyParserScope = parser.state.harmonyParserScope || {};
				module.buildMeta.harmonyModule = true;
				module.buildInfo.strict = true;
				module.buildInfo.exportsArgument = "__webpack_exports__";
				if(isStrictHarmony) {
					module.buildMeta.strictHarmonyModule = true;
					module.buildInfo.moduleArgument = "__webpack_module__";
				}
			}
		});

		const skipInHarmony = () => {
			const module = parser.state.module;
			if(module && module.buildMeta && module.buildMeta.harmonyModule)
				return true;
		};

		const nullInHarmony = () => {
			const module = parser.state.module;
			if(module && module.buildMeta && module.buildMeta.harmonyModule)
				return null;
		};

		const nonHarmonyIdentifiers = ["define", "exports"];
		nonHarmonyIdentifiers.forEach(identifer => {
			parser.plugin(`evaluate typeof ${identifer}`, nullInHarmony);
			parser.plugin(`typeof ${identifer}`, skipInHarmony);
			parser.plugin(`evaluate ${identifer}`, nullInHarmony);
			parser.plugin(`expression ${identifer}`, skipInHarmony);
			parser.plugin(`call ${identifer}`, skipInHarmony);
		});
	}
};
