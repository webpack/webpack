/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const HarmonyCompatibilityDependency = require("./HarmonyCompatibilityDependency");

module.exports = class HarmonyDetectionParserPlugin {
	constructor(options) {
		const { topLevelAwait = false } = options || {};
		this.topLevelAwait = topLevelAwait;
		this.moduleInfoCache = new WeakMap();
	}

	apply(parser) {
		parser.hooks.program.tap("HarmonyDetectionParserPlugin", ast => {
			let isAsync = false;
			const isStrictHarmony = parser.state.module.type === "javascript/esm";
			const isHarmony =
				isStrictHarmony ||
				ast.body.some(
					statement =>
						statement.type === "ImportDeclaration" ||
						statement.type === "ExportDefaultDeclaration" ||
						statement.type === "ExportNamedDeclaration" ||
						statement.type === "ExportAllDeclaration"
				);
			if (isHarmony) {
				isAsync = ast.body.some(
					statement =>
						(statement.type === "ImportDeclaration" ||
							statement.type === "ExportDefaultDeclaration" ||
							statement.type === "ExportNamedDeclaration" ||
							statement.type === "ExportAllDeclaration") &&
						statement.await
				);
			}
			this.moduleInfoCache.set(parser.state.module, {
				isAsync,
				isHarmony,
				isStrictHarmony
			});
			this.checkHarmony(parser);
		});

		parser.hooks.topLevelAwait.tap("HarmonyDetectionParserPlugin", () => {
			const module = parser.state.module;
			if (!this.topLevelAwait) {
				throw new Error(
					"The top-level-await experiment is not enabled (set experiments.topLevelAwait: true to enabled it)"
				);
			}
			if (!parser.state.harmonyModule) {
				this.checkHarmony(parser, true);
			}
			module.buildMeta.async = true;
		});

		const skipInHarmony = () => {
			const module = parser.state.module;
			if (module && module.buildMeta && module.buildMeta.exportsType) {
				return true;
			}
		};

		const nullInHarmony = () => {
			const module = parser.state.module;
			if (module && module.buildMeta && module.buildMeta.exportsType) {
				return null;
			}
		};

		const nonHarmonyIdentifiers = ["define", "exports"];
		for (const identifier of nonHarmonyIdentifiers) {
			parser.hooks.evaluateTypeof
				.for(identifier)
				.tap("HarmonyDetectionParserPlugin", nullInHarmony);
			parser.hooks.typeof
				.for(identifier)
				.tap("HarmonyDetectionParserPlugin", skipInHarmony);
			parser.hooks.evaluate
				.for(identifier)
				.tap("HarmonyDetectionParserPlugin", nullInHarmony);
			parser.hooks.expression
				.for(identifier)
				.tap("HarmonyDetectionParserPlugin", skipInHarmony);
			parser.hooks.call
				.for(identifier)
				.tap("HarmonyDetectionParserPlugin", skipInHarmony);
		}
	}

	checkHarmony(parser, forceAsyncHarmony = false) {
		const { isAsync, isHarmony, isStrictHarmony } = this.moduleInfoCache.get(
			parser.state.module
		);

		if (isHarmony || forceAsyncHarmony) {
			const module = parser.state.module;
			const compatDep = new HarmonyCompatibilityDependency();

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
			module.addPresentationalDependency(compatDep);
			parser.state.harmonyModule = true;
			parser.scope.isStrict = true;
			module.buildMeta.exportsType = "namespace";
			module.buildMeta.async = isAsync || forceAsyncHarmony;
			module.buildInfo.strict = true;
			module.buildInfo.exportsArgument = "__webpack_exports__";
			if (isStrictHarmony) {
				module.buildMeta.strictHarmonyModule = true;
				module.buildInfo.moduleArgument = "__webpack_module__";
			}
		}
	}
};
