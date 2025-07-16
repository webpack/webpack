"use strict";

const { RawSource } = require("webpack-sources");
const Generator = require("../../../../").Generator;
const RuntimeModule = require("../../../../").RuntimeModule;
const RuntimeGlobals = require("../../../../").RuntimeGlobals;
const Parser = require("../../../../").Parser;
const webpack = require("../../../../");

/** @typedef {import("../../../../").Compiler} Compiler */
/** @typedef {import("../../../../").ParserState} ParserState */
/** @typedef {import("../../../../lib/Parser").PreparsedAst} PreparsedAst */
/** @typedef {import("../../../../").Module} Module */

class LocalizationParser extends Parser {
	/**
	 * @param {string | Buffer | PreparsedAst} source input source
	 * @param {ParserState} state state
	 * @returns {ParserState} state
	 */
	parse(source, state) {
		if (typeof source !== "string") throw new Error("Unexpected input");
		const { module } = state;
		/** @type {NonNullable<Module["buildInfo"]>} */
		(module.buildInfo).content = JSON.parse(source);
		return state;
	}
}

const TYPES = new Set(["localization"]);

/**
 * @extends {Generator}
 */
class LocalizationGenerator extends Generator {
	getTypes() {
		return TYPES;
	}

	/** @type {Generator["getSize"]} */
	getSize(module, type) {
		return 42;
	}

	/** @type {Generator["generate"]} */
	generate(module, { type }) {
		return null;
	}
}

class LocalizationLoadingRuntimeModule extends RuntimeModule {
	constructor() {
		super("localization chunk loading", 10);
	}

	/**
	 * @returns {string} runtime code
	 */
	generate() {
		return `
${RuntimeGlobals.ensureChunkHandlers}.localization = (chunkId, promises) => {
	const data = require("./localization-" + chunkId + ".js");
	for(const moduleId of Object.keys(data)) {
		${RuntimeGlobals.moduleCache}[moduleId] = {
			i: moduleId,
			l: true,
			exports: data[moduleId]
		};
	}
}`;
	}
}

/**
 * @type {{ TARGET: string, CONTENT2: boolean, NORMAL1: boolean, NORMAL2: boolean }[]}
 */
const definitions = ["node", "async-node", "web"].reduce(
	(arr, target) =>
		// eslint-disable-next-line unicorn/prefer-spread
		arr.concat([
			{
				TARGET: JSON.stringify(target),
				CONTENT2: false,
				NORMAL1: true,
				NORMAL2: false
			},
			{
				TARGET: JSON.stringify(target),
				CONTENT2: true,
				NORMAL1: true,
				NORMAL2: false
			},
			{
				TARGET: JSON.stringify(target),
				CONTENT2: false,
				NORMAL1: true,
				NORMAL2: true
			},
			{
				TARGET: JSON.stringify(target),
				CONTENT2: true,
				NORMAL1: true,
				NORMAL2: true
			},
			{
				TARGET: JSON.stringify(target),
				CONTENT2: true,
				NORMAL1: false,
				NORMAL2: false
			},
			{
				TARGET: JSON.stringify(target),
				CONTENT2: false,
				NORMAL1: false,
				NORMAL2: false
			}
		]),
	/** @type {{ TARGET: string, CONTENT2: boolean, NORMAL1: boolean, NORMAL2: boolean }[]} */
	([])
);

module.exports = definitions.map((defs, i) => ({
	module: {
		rules: [
			{
				test: /\.loc$/,
				type: "localization"
			}
		]
	},
	target: JSON.parse(defs.TARGET),
	plugins: [
		new webpack.DefinePlugin(defs),
		new webpack.DefinePlugin({ INDEX: i }),
		/**
		 * @param {Compiler} compiler the compiler
		 */
		compiler => {
			compiler.hooks.thisCompilation.tap(
				"LocalizationPlugin",
				(compilation, { normalModuleFactory }) => {
					normalModuleFactory.hooks.createParser
						.for("localization")
						.tap("LocalizationPlugin", () => new LocalizationParser());

					normalModuleFactory.hooks.createGenerator
						.for("localization")
						.tap("LocalizationPlugin", () => new LocalizationGenerator());

					compilation.chunkTemplate.hooks.renderManifest.tap(
						"LocalizationPlugin",
						(result, { chunk, chunkGraph }) => {
							/** @type {Module[]} */
							const localizationModules = [];
							for (const module of chunkGraph.getChunkModulesIterable(chunk)) {
								if (module.getSourceTypes().has("localization")) {
									localizationModules.push(module);
								}
							}

							result.push({
								render: () => {
									/** @type {Record<number | string, string>} */
									const data = {};
									for (const module of localizationModules) {
										data[
											/** @type {number | string} */
											(chunkGraph.getModuleId(module))
										] =
											/** @type {NonNullable<Module["buildInfo"]>} */
											(module.buildInfo).content;
									}
									return new RawSource(
										`module.exports = ${JSON.stringify(data)}`
									);
								},
								filenameTemplate: "localization-[id].js",
								pathOptions: {
									chunk,
									contentHashType: "localization"
								},
								identifier: `localizationchunk${chunk.id}`,
								hash: chunk.hash
							});

							return result;
						}
					);

					compilation.hooks.runtimeRequirementInTree
						.for(RuntimeGlobals.ensureChunkHandlers)
						.tap("LocalizationPlugin", (chunk, set) => {
							const chunkGraph = compilation.chunkGraph;
							if (
								!chunkGraph.hasModuleInGraph(chunk, m =>
									m.type.startsWith("localization")
								)
							) {
								return;
							}
							set.add(RuntimeGlobals.moduleCache);
							compilation.addRuntimeModule(
								chunk,
								new LocalizationLoadingRuntimeModule()
							);
						});
				}
			);
		}
	],
	node: {
		__dirname: false
	}
}));
