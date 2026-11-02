"use strict";

const acorn = require("acorn");

/** @typedef {import("../../../../lib/Compiler")} Compiler */
/** @typedef {import("../../../../lib/module/NormalModule")} NormalModule */
/** @import JavascriptParser, { ParseOptions, ParseResult } from "../../../../lib/javascript/JavascriptParser" */

const PLUGIN_NAME = "program-tree";

const MODULE_TYPES = [
	"javascript/auto",
	"javascript/esm",
	"javascript/dynamic"
];

/**
 * Checks every built module fired `programTree` and what the tree-reading
 * taps recorded on it.
 * @param {Compiler} compiler the compiler
 * @returns {void}
 */
const programTree = (compiler) => {
	compiler.hooks.compilation.tap(
		PLUGIN_NAME,
		(compilation, { normalModuleFactory }) => {
			/** @type {Set<string>} */
			const walked = new Set();
			for (const type of MODULE_TYPES) {
				normalModuleFactory.hooks.parser
					.for(type)
					.tap(PLUGIN_NAME, (moduleParser) => {
						const parser = /** @type {JavascriptParser} */ (moduleParser);
						// another parse, started before the plugins read the tree
						parser.hooks.programTree.tap(
							{ name: PLUGIN_NAME, stage: -100 },
							() => {
								parser.evaluate("1 + 1");
							}
						);
						parser.hooks.programTree.tap(PLUGIN_NAME, (tree, program) => {
							expect(tree.type(program)).toBe(
								compiler.webpack.javascript.syntax.parser.NodeType.Program
							);
							walked.add(
								/** @type {NormalModule} */ (parser.state.module).resource
							);
						});
					});
			}
			compilation.hooks.succeedModule.tap(PLUGIN_NAME, (module) => {
				const { resource } = /** @type {NormalModule} */ (module);
				if (!/\.js$/.test(resource)) return;
				expect(walked.has(resource)).toBe(true);
				const buildInfo = /** @type {NonNullable<typeof module.buildInfo>} */ (
					module.buildInfo
				);
				const buildMeta = /** @type {NonNullable<typeof module.buildMeta>} */ (
					module.buildMeta
				);
				if (resource.endsWith("esm.js")) {
					expect(buildMeta.exportsType).toBe("namespace");
				}
				if (/(strict-cjs|custom)\.js$/.test(resource)) {
					expect(buildInfo.strict).toBe(true);
				}
				if (resource.endsWith("using.js")) {
					expect(buildInfo.usesTopLevelUsingDeclaration).toBe(true);
				}
				if (resource.endsWith("this-class.js")) {
					expect(
						/** @type {NonNullable<typeof buildInfo.diagnostics>} */ (
							buildInfo.diagnostics
						).topLevelThis
					).toBe(2);
				}
				if (resource.endsWith("pure.js")) {
					expect(
						/** @type {NonNullable<typeof buildInfo.diagnostics>} */ (
							buildInfo.diagnostics
						).ineffectivePureAnnotations
					).toBe(2);
				}
			});
		}
	);
};

/** @type {import("../../../../").Configuration} */
module.exports = {
	entry: {
		main: "./index.js",
		using: "./using.js"
	},
	output: {
		filename: "[name].js"
	},
	plugins: [programTree],
	performance: {
		hints: "warning",
		pureAnnotations: true,
		topLevelThis: true
	},
	module: {
		rules: [
			{
				test: /custom\.js$/,
				parser: {
					/**
					 * A program another parser read, marking no directive, which the
					 * build writes into a tree.
					 * @param {string} code source code
					 * @param {ParseOptions} options parse options
					 * @returns {ParseResult} parse result
					 */
					parse: (code, options) => {
						const ast = acorn.parse(code, {
							sourceType: options.sourceType,
							ecmaVersion: "latest",
							ranges: true
						});
						for (const statement of ast.body) {
							if (statement.type === "ExpressionStatement") {
								statement.directive = undefined;
							}
						}
						return {
							ast: /** @type {ParseResult["ast"]} */ (ast),
							comments: []
						};
					}
				}
			}
		]
	},
	optimization: {
		minimize: false
	}
};
