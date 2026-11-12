/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { Field, NodeType } = require("../../javascript/syntax").parser;
const RuntimeGlobals = require("../../runtime/RuntimeGlobals");
const memoize = require("../../util/memoize");

const ContextDependencyHelpers = require("../context/ContextDependencyHelpers");
const ConstDependency = require("../core/ConstDependency");
const getFunctionExpression = require("../helpers/getFunctionExpression");
const AMDRequireArrayDependency = require("./AMDRequireArrayDependency");
const AMDRequireContextDependency = require("./AMDRequireContextDependency");
const AMDRequireDependenciesBlock = require("./AMDRequireDependenciesBlock");
const AMDRequireDependency = require("./AMDRequireDependency");
const AMDRequireItemDependency = require("./AMDRequireItemDependency");
const LocalModuleDependency = require("./LocalModuleDependency");
const { getLocalModule } = require("./LocalModulesHelpers");
const UnsupportedDependency = require("./UnsupportedDependency");

// only `require.ensure` and AMD calls read functions by id
const getFunctionNode = memoize(() => require("../helpers/getFunctionNode"));

const getUnsupportedFeatureWarning = memoize(() =>
	require("../../errors/UnsupportedFeatureWarning")
);

/**
 * @import {
 * 	CallExpression,
 * 	Expression,
 * 	Identifier,
 * 	Pattern,
 * 	SourceLocation,
 * 	SpreadElement
 * } from "estree"
 */
/**
 * @import {
 * 	JavascriptParserOptions
 * } from "../../../declarations/WebpackOptions"
 */
/** @import Dependency, { DependencyLocation } from "../../graph/Dependency" */
/** @import DependenciesBlock from "../../graph/DependenciesBlock" */
/** @import BasicEvaluatedExpression from "../../javascript/BasicEvaluatedExpression" */
/** @import JavascriptParser, { JavascriptNodeReader, Range } from "../../javascript/JavascriptParser" */
/** @import LocalModule from "./LocalModule" */

const PLUGIN_NAME = "AMDRequireDependenciesBlockParserPlugin";

/**
 * Whether an argument holds an `await` or `yield` of the calling function,
 * which the template would move into a plain, non-async function.
 * @param {JavascriptNodeReader} path the reader of the node
 * @param {number} argument the `require()` argument
 * @returns {boolean} true when it holds one outside a nested function
 */
const hasOwnAwaitOrYield = (path, argument) => {
	const stack = [argument];
	let node;
	while ((node = stack.pop()) !== undefined) {
		switch (path.type(node)) {
			case NodeType.AwaitExpression:
			case NodeType.YieldExpression:
				return true;
			case NodeType.FunctionExpression:
			case NodeType.ArrowFunctionExpression:
				continue;
		}
		path.pushChildren(node, stack);
	}
	return false;
};

class AMDRequireDependenciesBlockParserPlugin {
	/**
	 * Creates an instance of AMDRequireDependenciesBlockParserPlugin.
	 * @param {JavascriptParserOptions} options parserOptions
	 */
	constructor(options) {
		/** @type {JavascriptParserOptions} */
		this.options = options;
	}

	/**
	 * Process function argument.
	 * @param {JavascriptParser} parser the parser
	 * @param {Expression | SpreadElement} expression expression
	 * @returns {boolean} need bind this
	 */
	processFunctionArgument(parser, expression) {
		let bindThis = true;
		const fnData = getFunctionExpression(expression);
		if (fnData) {
			parser.inFunctionScope(
				true,
				fnData.fn.params.filter(
					(i) =>
						!["require", "module", "exports"].includes(
							/** @type {Identifier} */ (i).name
						)
				),
				() => {
					if (fnData.fn.body.type === "BlockStatement") {
						parser.walkStatement(fnData.fn.body);
					} else {
						parser.walkExpression(fnData.fn.body);
					}
				}
			);
			parser.walkExpressions(fnData.expressions);
			if (fnData.needThis === false) {
				bindThis = false;
			}
		} else {
			parser.walkExpression(expression);
		}
		return bindThis;
	}

	/**
	 * `processFunctionArgument` for an argument read by id.
	 * @param {JavascriptParser} parser the parser
	 * @param {JavascriptNodeReader} path the reader of the argument's nodes
	 * @param {number} node the argument
	 * @returns {boolean} need bind this
	 */
	processFunctionArgumentByPath(parser, path, node) {
		const fnData = getFunctionNode()(path, node);
		if (fnData === undefined) {
			parser.walkExpression(parser.nodeOfPath(path, node));
			return true;
		}
		const { fn } = fnData;
		/** @type {Pattern[]} */
		const params = [];
		const count = path.fieldCount(Field.params, fn);
		for (let i = 0; i < count; i++) {
			const param = path.field(i, Field.params, fn);
			if (!["require", "module", "exports"].includes(path.name(param))) {
				params.push(/** @type {Pattern} */ (parser.nodeOfPath(path, param)));
			}
		}
		parser.inFunctionScope(true, params, () => {
			const body = path.field(0, Field.body, fn);
			if (path.type(body) === NodeType.BlockStatement) {
				parser.walkStatement(parser.nodeOfPath(path, body));
			} else {
				parser.walkExpression(parser.nodeOfPath(path, body));
			}
		});
		for (const expression of fnData.expressions) {
			parser.walkExpression(parser.nodeOfPath(path, expression));
		}
		return fnData.needThis !== false;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		// every CommonJS `require(…)` reaches this tap too, so it reads ids: with
		// one argument only an array is an AMD require
		parser.hooks.call
			.for("require")
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
				const argumentCount = path.fieldCount(Field.arguments, node);
				if (argumentCount === 0 || argumentCount > 3) return;
				if (argumentCount === 1) {
					const param = parser.evaluateExpression(
						parser.nodeOfPath(path, path.field(0, Field.arguments, node))
					);
					if (!param.isArray() && !param.isConstArray()) return;
				}
				return this.processCallRequireByPath(parser, path, node);
			});
	}

	/**
	 * Processes the provided parser.
	 * @param {JavascriptParser} parser the parser
	 * @param {CallExpression} expr call expression
	 * @param {BasicEvaluatedExpression} param param
	 * @returns {boolean | undefined} result
	 */
	processArray(parser, expr, param) {
		if (param.isArray()) {
			for (const p of /** @type {BasicEvaluatedExpression[]} */ (param.items)) {
				const result = this.processItem(parser, expr, p);
				if (result === undefined) {
					this.processContext(parser, expr, p);
				}
			}
			return true;
		} else if (param.isConstArray()) {
			/** @type {(string | LocalModuleDependency | AMDRequireItemDependency)[]} */
			const deps = [];
			for (const request of /** @type {string[]} */ (param.array)) {
				/** @type {string | LocalModuleDependency | AMDRequireItemDependency} */
				let dep;
				/** @type {undefined | null | LocalModule} */
				let localModule;
				if (request === "require") {
					dep = RuntimeGlobals.require;
				} else if (["exports", "module"].includes(request)) {
					dep = request;
				} else if ((localModule = getLocalModule(parser.state, request))) {
					localModule.flagUsed();
					dep = new LocalModuleDependency(localModule, undefined, false);
					dep.loc = parser.getLocation(expr);
					parser.state.module.addPresentationalDependency(dep);
				} else {
					dep = this.newRequireItemDependency(request);
					dep.loc = parser.getLocation(expr);
					dep.optional = Boolean(parser.scope.inTry);
					parser.state.current.addDependency(dep);
				}
				deps.push(dep);
			}
			const dep = this.newRequireArrayDependency(
				deps,
				/** @type {Range} */
				(param.range)
			);
			dep.loc = parser.getLocation(expr);
			dep.optional = Boolean(parser.scope.inTry);
			parser.state.module.addPresentationalDependency(dep);
			return true;
		}
	}

	/**
	 * Processes the provided parser.
	 * @param {JavascriptParser} parser the parser
	 * @param {CallExpression} expr call expression
	 * @param {BasicEvaluatedExpression} param param
	 * @returns {boolean | undefined} result
	 */
	processItem(parser, expr, param) {
		if (param.isConditional()) {
			for (const p of /** @type {BasicEvaluatedExpression[]} */ (
				param.options
			)) {
				const result = this.processItem(parser, expr, p);
				if (result === undefined) {
					this.processContext(parser, expr, p);
				}
			}
			return true;
		} else if (param.isString()) {
			/** @type {Dependency} */
			let dep;
			/** @type {LocalModule | null | undefined} */
			let localModule;
			if (param.string === "require") {
				dep = new ConstDependency(
					RuntimeGlobals.require,
					/** @type {Range} */
					(param.range),
					[RuntimeGlobals.require]
				);
			} else if (param.string === "module") {
				dep = new ConstDependency(
					parser.state.module.moduleArgument,
					/** @type {Range} */
					(param.range),
					[RuntimeGlobals.module]
				);
			} else if (param.string === "exports") {
				dep = new ConstDependency(
					parser.state.module.exportsArgument,
					/** @type {Range} */
					(param.range),
					[RuntimeGlobals.exports]
				);
			} else if (
				(localModule = getLocalModule(
					parser.state,
					/** @type {string} */
					(param.string)
				))
			) {
				localModule.flagUsed();
				dep = new LocalModuleDependency(localModule, param.range, false);
			} else {
				dep = this.newRequireItemDependency(
					/** @type {string} */
					(param.string),
					param.range
				);
				dep.loc = parser.getLocation(expr);
				dep.optional = Boolean(parser.scope.inTry);
				parser.state.current.addDependency(dep);
				return true;
			}
			dep.loc = parser.getLocation(expr);
			parser.state.module.addPresentationalDependency(dep);
			return true;
		}
	}

	/**
	 * Processes the provided parser.
	 * @param {JavascriptParser} parser the parser
	 * @param {CallExpression} expr call expression
	 * @param {BasicEvaluatedExpression} param param
	 * @returns {boolean | undefined} result
	 */
	processContext(parser, expr, param) {
		const dep = ContextDependencyHelpers.create(
			AMDRequireContextDependency,
			/** @type {Range} */
			(param.range),
			param,
			expr,
			this.options,
			{
				category: "amd"
			},
			parser
		);
		if (!dep) return;
		dep.loc = parser.getLocation(expr);
		dep.optional = Boolean(parser.scope.inTry);
		parser.state.current.addDependency(dep);
		return true;
	}

	/**
	 * Process array for request string.
	 * @param {BasicEvaluatedExpression} param param
	 * @returns {string | undefined} result
	 */
	processArrayForRequestString(param) {
		if (param.isArray()) {
			const result =
				/** @type {BasicEvaluatedExpression[]} */
				(param.items).map((item) => this.processItemForRequestString(item));
			if (result.every(Boolean)) return result.join(" ");
		} else if (param.isConstArray()) {
			return /** @type {string[]} */ (param.array).join(" ");
		}
	}

	/**
	 * Process item for request string.
	 * @param {BasicEvaluatedExpression} param param
	 * @returns {string | undefined} result
	 */
	processItemForRequestString(param) {
		if (param.isConditional()) {
			const result =
				/** @type {BasicEvaluatedExpression[]} */
				(param.options).map((item) => this.processItemForRequestString(item));
			if (result.every(Boolean)) return result.join("|");
		} else if (param.isString()) {
			return param.string;
		}
	}

	/**
	 * Process call require.
	 * @param {JavascriptParser} parser the parser
	 * @param {CallExpression} expr call expression
	 * @returns {boolean | undefined} result
	 */
	processCallRequire(parser, expr) {
		return parser._withNodeIds(1, expr, null, null, (path, node) =>
			this.processCallRequireByPath(parser, path, node)
		);
	}

	/**
	 * `processCallRequire` for a call read by id.
	 * @param {JavascriptParser} parser the parser
	 * @param {JavascriptNodeReader} path the reader of the call's nodes
	 * @param {number} node the call
	 * @returns {boolean | undefined} result
	 */
	processCallRequireByPath(parser, path, node) {
		/** @type {BasicEvaluatedExpression | undefined} */
		let param;
		/** @type {AMDRequireDependenciesBlock | undefined | null} */
		let depBlock;
		/** @type {AMDRequireDependency | undefined} */
		let dep;
		/** @type {boolean | undefined} */
		let result;

		const old = parser.state.current;
		const expr = /** @type {CallExpression} */ (parser.nodeOfPath(path, node));
		const argumentCount = path.fieldCount(Field.arguments, node);

		if (argumentCount >= 1) {
			param = parser.evaluateExpression(
				parser.nodeOfPath(path, path.field(0, Field.arguments, node))
			);
			depBlock = this.newRequireDependenciesBlock(
				parser.getLocation(expr),
				this.processArrayForRequestString(param)
			);
			dep = this.newRequireDependency(
				path.range(node),
				/** @type {Range} */ (param.range),
				argumentCount > 1
					? path.range(path.field(1, Field.arguments, node))
					: null,
				argumentCount > 2
					? path.range(path.field(2, Field.arguments, node))
					: null
			);
			dep.loc = parser.getLocation(expr);
			depBlock.addDependency(dep);

			parser.state.current = /** @type {typeof parser.state.current} */ (
				/** @type {DependenciesBlock} */ (depBlock)
			);
		}

		if (argumentCount === 1) {
			parser.inFunctionScope(true, [], () => {
				result = this.processArray(
					parser,
					expr,
					/** @type {BasicEvaluatedExpression} */
					(param)
				);
			});
			parser.state.current = old;
			if (
				!result ||
				hasOwnAwaitOrYield(path, path.field(0, Field.arguments, node))
			) {
				return;
			}
			parser.state.current.addBlock(
				/** @type {AMDRequireDependenciesBlock} */
				(depBlock)
			);
			return true;
		}

		if (argumentCount === 2 || argumentCount === 3) {
			try {
				parser.inFunctionScope(true, [], () => {
					result = this.processArray(
						parser,
						expr,
						/** @type {BasicEvaluatedExpression} */
						(param)
					);
				});
				let awaits = false;
				for (let i = 0; i < argumentCount && !awaits; i++) {
					awaits = hasOwnAwaitOrYield(
						path,
						path.field(i, Field.arguments, node)
					);
				}
				if (!result || awaits) {
					const dep = new UnsupportedDependency(
						"unsupported",
						path.range(node)
					);
					old.addPresentationalDependency(dep);
					if (parser.state.module) {
						const loc = /** @type {SourceLocation} */ (
							parser.getLocation(expr)
						);
						parser.state.module.addError(
							new (getUnsupportedFeatureWarning())(
								`Cannot statically analyse 'require(…, …)' in line ${loc.start.line}`,
								loc
							)
						);
					}
					depBlock = null;
					return true;
				}
				/** @type {AMDRequireDependency} */
				(dep).functionBindThis = this.processFunctionArgumentByPath(
					parser,
					path,
					path.field(1, Field.arguments, node)
				);
				if (argumentCount === 3) {
					/** @type {AMDRequireDependency} */
					(dep).errorCallbackBindThis = this.processFunctionArgumentByPath(
						parser,
						path,
						path.field(2, Field.arguments, node)
					);
				}
			} finally {
				parser.state.current = old;
				if (depBlock) parser.state.current.addBlock(depBlock);
			}
			return true;
		}
	}

	/**
	 * New require dependencies block.
	 * @param {DependencyLocation} loc location
	 * @param {string=} request request
	 * @returns {AMDRequireDependenciesBlock} AMDRequireDependenciesBlock
	 */
	newRequireDependenciesBlock(loc, request) {
		return new AMDRequireDependenciesBlock(loc, request);
	}

	/**
	 * New require dependency.
	 * @param {Range} outerRange outer range
	 * @param {Range} arrayRange array range
	 * @param {Range | null} functionRange function range
	 * @param {Range | null} errorCallbackRange error callback range
	 * @returns {AMDRequireDependency} dependency
	 */
	newRequireDependency(
		outerRange,
		arrayRange,
		functionRange,
		errorCallbackRange
	) {
		return new AMDRequireDependency(
			outerRange,
			arrayRange,
			functionRange,
			errorCallbackRange
		);
	}

	/**
	 * New require item dependency.
	 * @param {string} request request
	 * @param {Range=} range range
	 * @returns {AMDRequireItemDependency} AMDRequireItemDependency
	 */
	newRequireItemDependency(request, range) {
		return new AMDRequireItemDependency(request, range);
	}

	/**
	 * New require array dependency.
	 * @param {(string | LocalModuleDependency | AMDRequireItemDependency)[]} depsArray deps array
	 * @param {Range} range range
	 * @returns {AMDRequireArrayDependency} AMDRequireArrayDependency
	 */
	newRequireArrayDependency(depsArray, range) {
		return new AMDRequireArrayDependency(depsArray, range);
	}
}

module.exports = AMDRequireDependenciesBlockParserPlugin;
