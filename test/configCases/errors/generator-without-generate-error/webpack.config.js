"use strict";

const { RawSource } = require("webpack-sources");
const { Generator, Parser } = require("../../../../");

/** @import { ParserState, Configuration, Compiler } from "../../../../" */
/** @import { PreparsedAst } from "../../../../lib/module/Parser.js" */

class PlainParser extends Parser {
	/**
	 * @param {string | Buffer | PreparsedAst} source input source
	 * @param {ParserState} state state
	 * @returns {ParserState} state
	 */
	parse(source, state) {
		return state;
	}
}

const TYPES = new Set(["javascript"]);

// A generator from before `generateError` existed: what a failed module emits
// is then the statement `NormalModule` falls back to.
class PlainGenerator extends Generator {
	getTypes() {
		return TYPES;
	}

	/** @type {Generator["getSize"]} */
	getSize(module, type) {
		return 42;
	}

	/** @type {Generator["generate"]} */
	generate(module, generateContext) {
		return new RawSource("module.exports = 'plain';");
	}
}

/** @type {Configuration} */
module.exports = {
	mode: "development",
	module: {
		rules: [
			{
				test: /\.plain$/,
				use: require.resolve("./loader.js"),
				type: "plain"
			}
		]
	},
	optimization: { emitOnErrors: true },
	plugins: [
		/**
		 * @param {Compiler} compiler compiler
		 */
		(compiler) => {
			compiler.hooks.thisCompilation.tap(
				"PlainPlugin",
				(compilation, { normalModuleFactory }) => {
					normalModuleFactory.hooks.createParser
						.for("plain")
						.tap("PlainPlugin", () => new PlainParser());
					normalModuleFactory.hooks.createGenerator
						.for("plain")
						.tap("PlainPlugin", () => new PlainGenerator());
				}
			);
		}
	]
};
