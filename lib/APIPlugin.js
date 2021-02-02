/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("./RuntimeGlobals");
const WebpackError = require("./WebpackError");
const ConstDependency = require("./dependencies/ConstDependency");
const BasicEvaluatedExpression = require("./javascript/BasicEvaluatedExpression");
const {
	toConstantDependency,
	evaluateToString
} = require("./javascript/JavascriptParserHelpers");
const ChunkNameRuntimeModule = require("./runtime/ChunkNameRuntimeModule");
const GetFullHashRuntimeModule = require("./runtime/GetFullHashRuntimeModule");

/** @typedef {import("./Compiler")} Compiler */
/** @typedef {import("./javascript/JavascriptParser")} JavascriptParser */

/* eslint-disable camelcase */
const REPLACEMENTS = {
	__webpack_require__: {
		expr: RuntimeGlobals.require,
		req: [RuntimeGlobals.require],
		type: "function",
		assign: false
	},
	__webpack_public_path__: {
		expr: RuntimeGlobals.publicPath,
		req: [RuntimeGlobals.publicPath],
		type: "string",
		assign: true
	},
	__webpack_modules__: {
		expr: RuntimeGlobals.moduleFactories,
		req: [RuntimeGlobals.moduleFactories],
		type: "object",
		assign: false
	},
	__webpack_chunk_load__: {
		expr: RuntimeGlobals.ensureChunk,
		req: [RuntimeGlobals.ensureChunk],
		type: "function",
		assign: true
	},
	__non_webpack_require__: {
		expr: "require",
		req: null,
		type: undefined, // type is not known, depends on environment
		assign: true
	},
	__webpack_nonce__: {
		expr: RuntimeGlobals.scriptNonce,
		req: [RuntimeGlobals.scriptNonce],
		type: "string",
		assign: true
	},
	__webpack_hash__: {
		expr: `${RuntimeGlobals.getFullHash}()`,
		req: [RuntimeGlobals.getFullHash],
		type: "string",
		assign: false
	},
	__webpack_chunkname__: {
		expr: RuntimeGlobals.chunkName,
		req: [RuntimeGlobals.chunkName],
		type: "string",
		assign: false
	},
	__webpack_get_script_filename__: {
		expr: RuntimeGlobals.getChunkScriptFilename,
		req: [RuntimeGlobals.getChunkScriptFilename],
		type: "function",
		assign: true
	},
	"require.onError": {
		expr: RuntimeGlobals.uncaughtErrorHandler,
		req: [RuntimeGlobals.uncaughtErrorHandler],
		type: undefined, // type is not known, could be function or undefined
		assign: true // is never a pattern
	},
	__system_context__: {
		expr: RuntimeGlobals.systemContext,
		req: [RuntimeGlobals.systemContext],
		type: "object",
		assign: false
	},
	__webpack_share_scopes__: {
		expr: RuntimeGlobals.shareScopeMap,
		req: [RuntimeGlobals.shareScopeMap],
		type: "object",
		assign: false
	},
	__webpack_init_sharing__: {
		expr: RuntimeGlobals.initializeSharing,
		req: [RuntimeGlobals.initializeSharing],
		type: "function",
		assign: true
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
				compilation.dependencyTemplates.set(
					ConstDependency,
					new ConstDependency.Template()
				);

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.chunkName)
					.tap("APIPlugin", chunk => {
						compilation.addRuntimeModule(
							chunk,
							new ChunkNameRuntimeModule(chunk.name)
						);
						return true;
					});

				compilation.hooks.runtimeRequirementInTree
					.for(RuntimeGlobals.getFullHash)
					.tap("APIPlugin", (chunk, set) => {
						compilation.addRuntimeModule(chunk, new GetFullHashRuntimeModule());
						return true;
					});

				/**
				 * @param {JavascriptParser} parser the parser
				 */
				const handler = parser => {
					Object.keys(REPLACEMENTS).forEach(key => {
						const info = REPLACEMENTS[key];
						parser.hooks.expression
							.for(key)
							.tap(
								"APIPlugin",
								toConstantDependency(parser, info.expr, info.req)
							);
						if (info.assign === false) {
							parser.hooks.assign.for(key).tap("APIPlugin", expr => {
								const err = new WebpackError(`${key} must not be assigned`);
								err.loc = expr.loc;
								throw err;
							});
						}
						if (info.type) {
							parser.hooks.evaluateTypeof
								.for(key)
								.tap("APIPlugin", evaluateToString(info.type));
						}
					});

					parser.hooks.expression
						.for("__webpack_layer__")
						.tap("APIPlugin", expr => {
							const dep = new ConstDependency(
								JSON.stringify(parser.state.module.layer),
								expr.range
							);
							dep.loc = expr.loc;
							parser.state.module.addPresentationalDependency(dep);
							return true;
						});
					parser.hooks.evaluateIdentifier
						.for("__webpack_layer__")
						.tap("APIPlugin", expr =>
							(parser.state.module.layer === null
								? new BasicEvaluatedExpression().setNull()
								: new BasicEvaluatedExpression().setString(
										parser.state.module.layer
								  )
							).setRange(expr.range)
						);
					parser.hooks.evaluateTypeof
						.for("__webpack_layer__")
						.tap("APIPlugin", expr =>
							new BasicEvaluatedExpression()
								.setString(
									parser.state.module.layer === null ? "object" : "string"
								)
								.setRange(expr.range)
						);
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
