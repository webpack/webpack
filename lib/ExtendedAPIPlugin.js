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
const ConstDependency = require("./dependencies/ConstDependency");
const ChunkNameRuntimeModule = require("./runtime/ChunkNameRuntimeModule");
const GetFullHashRuntimeModule = require("./runtime/GetFullHashRuntimeModule");

/** @typedef {import("./Compiler")} Compiler */

const REPLACEMENTS = {
	// eslint-disable-next-line camelcase
	__webpack_hash__: {
		expr: `${RuntimeGlobals.getFullHash}()`,
		type: "string",
		req: [RuntimeGlobals.getFullHash]
	},
	// eslint-disable-next-line camelcase
	__webpack_chunkname__: {
		expr: RuntimeGlobals.chunkName,
		type: "string",
		req: [RuntimeGlobals.chunkName]
	}
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

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.chunkName)
					.tap("ExtendedAPIPlugin", chunk => {
						compilation.addRuntimeModule(
							chunk,
							new ChunkNameRuntimeModule(chunk.name)
						);
						return true;
					});

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.getFullHash)
					.tap("ExtendedAPIPlugin", chunk => {
						compilation.addRuntimeModule(
							chunk,
							new GetFullHashRuntimeModule(compilation)
						);
						return true;
					});

				const handler = (parser, parserOptions) => {
					Object.keys(REPLACEMENTS).forEach(key => {
						const info = REPLACEMENTS[key];
						parser.hooks.expression
							.for(key)
							.tap(
								"ExtendedAPIPlugin",
								toConstantDependency(parser, info.expr, info.req)
							);
						parser.hooks.evaluateTypeof
							.for(key)
							.tap("ExtendedAPIPlugin", evaluateToString(info.type));
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
