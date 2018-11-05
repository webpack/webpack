/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	evaluateToString,
	toConstantDependency
} = require("./JavascriptParserHelpers");
const NullFactory = require("./NullFactory");
const RuntimeGlobals = require("./RuntimeGlobals");
const Template = require("./Template");
const ConstDependency = require("./dependencies/ConstDependency");

/** @typedef {import("./Compiler")} Compiler */

const REPLACEMENTS = {
	// eslint-disable-next-line camelcase
	__webpack_hash__: RuntimeGlobals.getFullHash,
	// eslint-disable-next-line camelcase
	__webpack_chunkname__: RuntimeGlobals.chunkName
};
const REPLACEMENT_TYPES = {
	// eslint-disable-next-line camelcase
	__webpack_hash__: "string",
	// eslint-disable-next-line camelcase
	__webpack_chunkname__: "string"
};

class ExtendedAPIPlugin {
	/**
	 * @param {Compiler} compiler webpack compiler
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"ExtendedAPIPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(ConstDependency, new NullFactory());
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);

				const mainTemplate = compilation.mainTemplate;
				mainTemplate.hooks.requireExtensions.tap(
					"ExtendedAPIPlugin",
					(source, { chunk, hash }) => {
						const buf = [source];
						buf.push("");
						buf.push("// __webpack_hash__");
						buf.push(
							`${RuntimeGlobals.getFullHash} = ${JSON.stringify(hash)};`
						);
						buf.push("");
						buf.push("// __webpack_chunkname__");
						buf.push(
							`${RuntimeGlobals.chunkName} = ${JSON.stringify(chunk.name)};`
						);
						return Template.asString(buf);
					}
				);

				const handler = (parser, parserOptions) => {
					Object.keys(REPLACEMENTS).forEach(key => {
						parser.hooks.expression
							.for(key)
							.tap(
								"ExtendedAPIPlugin",
								toConstantDependency(parser, REPLACEMENTS[key], [
									REPLACEMENTS[key]
								])
							);
						parser.hooks.evaluateTypeof
							.for(key)
							.tap(
								"ExtendedAPIPlugin",
								evaluateToString(REPLACEMENT_TYPES[key])
							);
					});
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("ExtendedAPIPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("ExtendedAPIPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("ExtendedAPIPlugin", handler);
			}
		);
	}
}

module.exports = ExtendedAPIPlugin;
