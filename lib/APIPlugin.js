/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const {
	toConstantDependency,
	evaluateToString
} = require("./JavascriptParserHelpers");
const NullFactory = require("./NullFactory");
const RuntimeGlobals = require("./RuntimeGlobals");
const ConstDependency = require("./dependencies/ConstDependency");

/** @typedef {import("./Compiler")} Compiler */

/* eslint-disable camelcase */
const REPLACEMENTS = {
	__webpack_require__: {
		expr: RuntimeGlobals.require,
		req: [RuntimeGlobals.require],
		type: "function"
	},
	__webpack_public_path__: {
		expr: RuntimeGlobals.publicPath,
		req: [RuntimeGlobals.publicPath],
		type: "string"
	},
	__webpack_modules__: {
		expr: RuntimeGlobals.moduleFactories,
		req: [RuntimeGlobals.moduleFactories],
		type: "object"
	},
	__webpack_chunk_load__: {
		expr: RuntimeGlobals.ensureChunk,
		req: [RuntimeGlobals.ensureChunk],
		type: "function"
	},
	__non_webpack_require__: {
		expr: "require",
		req: null,
		type: undefined
	},
	__webpack_nonce__: {
		expr: RuntimeGlobals.scriptNonce,
		req: [RuntimeGlobals.scriptNonce],
		type: "string"
	},
	"require.onError": {
		expr: RuntimeGlobals.uncaughtErrorHandler,
		req: [RuntimeGlobals.uncaughtErrorHandler],
		type: "function"
	}
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
						const info = REPLACEMENTS[key];
						parser.hooks.expression
							.for(key)
							.tap(
								"APIPlugin",
								toConstantDependency(parser, info.expr, info.req)
							);
						if (info.type) {
							parser.hooks.evaluateTypeof
								.for(key)
								.tap("APIPlugin", evaluateToString(info.type));
						}
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
