/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	toConstantDependency,
	toConstantDependencyWithWebpackRequire,
	evaluateToString
} = require("./JavascriptParserHelpers");
const NullFactory = require("./NullFactory");
const RuntimeGlobals = require("./RuntimeGlobals");
const ConstDependency = require("./dependencies/ConstDependency");

/** @typedef {import("./Compiler")} Compiler */

/* eslint-disable camelcase */
const REPLACEMENTS = {
	__webpack_require__: "__webpack_require__",
	__webpack_public_path__: RuntimeGlobals.publicPath,
	__webpack_modules__: RuntimeGlobals.moduleFactories,
	__webpack_chunk_load__: RuntimeGlobals.ensureChunk,
	__non_webpack_require__: "require",
	__webpack_nonce__: RuntimeGlobals.scriptNonce,
	"require.onError": RuntimeGlobals.uncaughtErrorHandler
};
const NO_WEBPACK_REQUIRE = {
	__non_webpack_require__: true
};
const REPLACEMENT_TYPES = {
	__webpack_public_path__: "string",
	__webpack_require__: "function",
	__webpack_modules__: "object",
	__webpack_chunk_load__: "function",
	__webpack_nonce__: "string"
};
/* eslint-enable camelcase */

class APIPlugin {
	/**
	 * Apply the plugin
	 * @param {Compiler} compiler the compiler instance
	 * @returns {void}
	 */
	apply(compiler) {
		compiler.hooks.compilation.tap(
			"APIPlugin",
			(compilation, { normalModuleFactory }) => {
				compilation.dependencyFactories.set(ConstDependency, new NullFactory());
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);

				const handler = parser => {
					Object.keys(REPLACEMENTS).forEach(key => {
						parser.hooks.expression
							.for(key)
							.tap(
								"APIPlugin",
								NO_WEBPACK_REQUIRE[key]
									? toConstantDependency(parser, REPLACEMENTS[key])
									: toConstantDependencyWithWebpackRequire(
											parser,
											REPLACEMENTS[key]
									  )
							);
						parser.hooks.evaluateTypeof
							.for(key)
							.tap("APIPlugin", evaluateToString(REPLACEMENT_TYPES[key]));
					});
				};

				normalModuleFactory.hooks.parser
					.for("javascript/auto")
					.tap("APIPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/dynamic")
					.tap("APIPlugin", handler);
				normalModuleFactory.hooks.parser
					.for("javascript/esm")
					.tap("APIPlugin", handler);
			}
		);
	}
}

module.exports = APIPlugin;
