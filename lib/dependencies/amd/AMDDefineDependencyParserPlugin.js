/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { Field, Flag, NodeType } = require("../../javascript/syntax-parser");
const RuntimeGlobals = require("../../runtime/RuntimeGlobals");
const { recordOptimizationBailout } = require("../../util/buildDiagnostics");
const ContextDependencyHelpers = require("../context/ContextDependencyHelpers");
const ConstDependency = require("../core/ConstDependency");
const DynamicExports = require("../helpers/DynamicExports");
const AMDDefineDependency = require("./AMDDefineDependency");
const AMDRequireArrayDependency = require("./AMDRequireArrayDependency");
const AMDRequireContextDependency = require("./AMDRequireContextDependency");
const AMDRequireItemDependency = require("./AMDRequireItemDependency");
const LocalModuleDependency = require("./LocalModuleDependency");
const { addLocalModule, getLocalModule } = require("./LocalModulesHelpers");

/**
 * @import {
 * 	BlockStatement,
 * 	CallExpression,
 * 	Pattern
 * } from "estree"
 */
/**
 * @import {
 * 	JavascriptParserOptions
 * } from "../../../declarations/WebpackOptions"
 */
/** @import Dependency from "../../graph/Dependency" */
/** @import BasicEvaluatedExpression from "../../javascript/BasicEvaluatedExpression" */
/**
 * @import JavascriptParser, {
 * 	ExportedVariableInfo,
 * 	JavascriptNodeReader,
 * 	Range
 * } from "../../javascript/JavascriptParser"
 */
/** @import LocalModule from "./LocalModule" */

/**
 * Whether a node is `function () {}.bind(…)`, read by id.
 * @param {JavascriptNodeReader} path the reader of the node
 * @param {number} node the node
 * @returns {boolean} true when it is a bound function expression
 */
const isBoundFunctionNode = (path, node) => {
	if (path.type(node) !== NodeType.CallExpression) return false;
	const callee = path.field(0, Field.callee, node);
	if (path.type(callee) !== NodeType.MemberExpression) return false;
	if (path.flag(Flag.computed, callee)) return false;
	if (
		path.type(path.field(0, Field.object, callee)) !==
		NodeType.FunctionExpression
	) {
		return false;
	}
	const property = path.field(0, Field.property, callee);
	return (
		path.type(property) === NodeType.Identifier &&
		path.name(property) === "bind"
	);
};

/**
 * Whether a node is a function or arrow function expression, read by id.
 * @param {JavascriptNodeReader} path the reader of the node
 * @param {number} node the node
 * @returns {boolean} true when it is an unbound function expression
 */
const isUnboundFunctionNode = (path, node) => {
	const type = path.type(node);
	return (
		type === NodeType.FunctionExpression ||
		type === NodeType.ArrowFunctionExpression
	);
};

/**
 * The parameters of a function node, read by id.
 * @param {JavascriptNodeReader} path the reader of the node
 * @param {number} fn the function
 * @returns {number[]} its parameters
 */
const paramsOf = (path, fn) => {
	const count = path.fieldCount(Field.params, fn);
	/** @type {number[]} */
	const params = [];
	for (let i = 0; i < count; i++) params.push(path.field(i, Field.params, fn));
	return params;
};

/**
 * Walks a factory's body as a function body, read by id.
 * @param {JavascriptParser} parser the parser
 * @param {JavascriptNodeReader} path the reader of the node
 * @param {number} body the body
 * @returns {void}
 */
const walkFunctionBody = (parser, path, body) => {
	if (path.type(body) !== NodeType.BlockStatement) {
		parser.walkExpression(parser.nodeOfPath(path, body));
		return;
	}
	const block = /** @type {BlockStatement} */ (parser.nodeOfPath(path, body));
	parser._detectModeNode(body);
	// the private slot: the public getter makes the statement's object
	const prev = parser._prevStatement;
	parser._preWalkScope(block);
	parser._prevStatement = prev;
	parser.walkStatement(block);
};

/** @typedef {Record<number, string>} Identifiers */

const PLUGIN_NAME = "AMDDefineDependencyParserPlugin";

class AMDDefineDependencyParserPlugin {
	/**
	 * Creates an instance of AMDDefineDependencyParserPlugin.
	 * @param {JavascriptParserOptions} options parserOptions
	 */
	constructor(options) {
		/** @type {JavascriptParserOptions} */
		this.options = options;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		parser.hooks.call
			.for("define")
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) =>
				this.processCallDefineByPath(parser, path, node)
			);
	}

	/**
	 * Processes the provided parser.
	 * @param {JavascriptParser} parser the parser
	 * @param {CallExpression} expr call expression
	 * @param {BasicEvaluatedExpression} param param
	 * @param {Identifiers} identifiers identifiers
	 * @param {string=} namedModule named module
	 * @returns {boolean | undefined} result
	 */
	processArray(parser, expr, param, identifiers, namedModule) {
		if (param.isArray()) {
			const items = /** @type {BasicEvaluatedExpression[]} */ (param.items);
			for (const [idx, item] of items.entries()) {
				if (
					item.isString() &&
					["require", "module", "exports"].includes(
						/** @type {string} */ (item.string)
					)
				) {
					identifiers[idx] =
						/** @type {string} */
						(item.string);
				}
				const result = this.processItem(parser, expr, item, namedModule);
				if (result === undefined) {
					this.processContext(parser, expr, item);
				}
			}
			return true;
		} else if (param.isConstArray()) {
			/** @type {(string | LocalModuleDependency | AMDRequireItemDependency)[]} */
			const deps = [];
			const array = /** @type {string[]} */ (param.array);
			for (const [idx, request] of array.entries()) {
				/** @type {string | LocalModuleDependency | AMDRequireItemDependency} */
				let dep;
				/** @type {undefined | null | LocalModule} */
				let localModule;
				if (request === "require") {
					identifiers[idx] = request;
					dep = RuntimeGlobals.require;
				} else if (["exports", "module"].includes(request)) {
					identifiers[idx] = request;
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
				/** @type {Range} */ (param.range)
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
	 * @param {string=} namedModule named module
	 * @returns {boolean | undefined} result
	 */
	processItem(parser, expr, param, namedModule) {
		if (param.isConditional()) {
			const options = /** @type {BasicEvaluatedExpression[]} */ (param.options);
			for (const item of options) {
				const result = this.processItem(parser, expr, item);
				if (result === undefined) {
					this.processContext(parser, expr, item);
				}
			}

			return true;
		} else if (param.isString()) {
			/** @type {Dependency} */
			let dep;
			/** @type {undefined | null | LocalModule} */
			let localModule;

			if (param.string === "require") {
				dep = new ConstDependency(
					RuntimeGlobals.require,
					/** @type {Range} */ (param.range),
					[RuntimeGlobals.require]
				);
			} else if (param.string === "exports") {
				dep = new ConstDependency(
					"exports",
					/** @type {Range} */ (param.range),
					[RuntimeGlobals.exports]
				);
			} else if (param.string === "module") {
				dep = new ConstDependency(
					"module",
					/** @type {Range} */ (param.range),
					[RuntimeGlobals.module]
				);
			} else if (
				(localModule = getLocalModule(
					parser.state,
					/** @type {string} */ (param.string),
					namedModule
				))
			) {
				localModule.flagUsed();
				dep = new LocalModuleDependency(localModule, param.range, false);
			} else {
				dep = this.newRequireItemDependency(
					/** @type {string} */ (param.string),
					param.range
				);
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
			/** @type {Range} */ (param.range),
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
	 * Process call define.
	 * @param {JavascriptParser} parser the parser
	 * @param {CallExpression} expr call expression
	 * @returns {boolean | undefined} result
	 */
	processCallDefine(parser, expr) {
		return parser._withNodeIds(1, expr, null, null, (path, node) =>
			this.processCallDefineByPath(parser, path, node)
		);
	}

	/**
	 * `processCallDefine` for a call read by id.
	 * @param {JavascriptParser} parser the parser
	 * @param {JavascriptNodeReader} path the reader of the call's nodes
	 * @param {number} node the call
	 * @returns {boolean | undefined} result
	 */
	processCallDefineByPath(parser, path, node) {
		let array = 0;
		let fn = 0;
		let obj = 0;
		/** @type {string | undefined} */
		let namedModule;
		/**
		 * Takes a factory argument as a function, an object or either.
		 * @param {number} factory the argument
		 * @returns {void}
		 */
		const takeFactory = (factory) => {
			if (
				isUnboundFunctionNode(path, factory) ||
				isBoundFunctionNode(path, factory)
			) {
				// define(f() {…})
				fn = factory;
			} else if (path.type(factory) === NodeType.ObjectExpression) {
				// define({…})
				obj = factory;
			} else {
				// define(expr): unclear if function or object
				obj = fn = factory;
			}
		};
		const first = path.field(0, Field.arguments, node);
		switch (path.fieldCount(Field.arguments, node)) {
			case 1:
				takeFactory(first);
				break;
			case 2:
				if (path.type(first) === NodeType.Literal) {
					// define("…", …)
					namedModule = /** @type {string} */ (path.value(first));
				} else {
					// define([…], …)
					array = first;
				}
				takeFactory(path.field(1, Field.arguments, node));
				break;
			case 3:
				// define("…", […], f() {…})
				namedModule = /** @type {string} */ (path.value(first));
				array = path.field(1, Field.arguments, node);
				takeFactory(path.field(2, Field.arguments, node));
				break;
			default:
				return;
		}
		DynamicExports.bailout(parser.state);
		recordOptimizationBailout(
			parser.state.module.buildInfo,
			"AMD bailout: define() prevents static exports analysis"
		);
		const expr = /** @type {CallExpression} */ (parser.nodeOfPath(path, node));
		const bound = fn !== 0 && isBoundFunctionNode(path, fn);
		// the function of `function () {}.bind(…)`
		const boundFunction = bound
			? path.field(0, Field.object, path.field(0, Field.callee, fn))
			: 0;
		/** @type {number[] | null} */
		let fnParams = null;
		let fnParamsOffset = 0;
		if (fn !== 0) {
			if (isUnboundFunctionNode(path, fn)) {
				fnParams = paramsOf(path, fn);
			} else if (bound) {
				fnParams = paramsOf(path, boundFunction);
				fnParamsOffset = Math.max(path.fieldCount(Field.arguments, fn) - 1, 0);
			}
		}
		/** @type {Map<string, ExportedVariableInfo>} */
		const fnRenames = new Map();
		/** @type {Identifiers | string[]} */
		let identifiers = ["require", "exports", "module"];
		if (array !== 0) {
			identifiers = {};
			const param = parser.evaluateExpression(parser.nodeOfPath(path, array));
			const result = this.processArray(
				parser,
				expr,
				param,
				identifiers,
				namedModule
			);
			if (!result) return;
		}
		if (fnParams) {
			const names = identifiers;
			fnParams = fnParams.slice(fnParamsOffset).filter((param, idx) => {
				if (names[idx]) {
					fnRenames.set(path.name(param), parser.getVariableInfo(names[idx]));
					return false;
				}
				return true;
			});
		}
		if (fn !== 0 && isUnboundFunctionNode(path, fn)) {
			const inTry = parser.scope.inTry;
			parser.inFunctionScope(
				true,
				/** @type {number[]} */ (fnParams).map(
					(param) => /** @type {Pattern} */ (parser.nodeOfPath(path, param))
				),
				() => {
					for (const [name, varInfo] of fnRenames) {
						parser.setVariable(name, varInfo);
					}
					parser.scope.inTry = inTry;
					walkFunctionBody(parser, path, path.field(0, Field.body, fn));
				}
			);
		} else if (bound) {
			const inTry = parser.scope.inTry;
			parser.inFunctionScope(
				true,
				paramsOf(path, boundFunction)
					.filter(
						(param) =>
							!["require", "module", "exports"].includes(path.name(param))
					)
					.map(
						(param) => /** @type {Pattern} */ (parser.nodeOfPath(path, param))
					),
				() => {
					for (const [name, varInfo] of fnRenames) {
						parser.setVariable(name, varInfo);
					}
					parser.scope.inTry = inTry;
					walkFunctionBody(
						parser,
						path,
						path.field(0, Field.body, boundFunction)
					);
				}
			);
			const count = path.fieldCount(Field.arguments, fn);
			for (let i = 0; i < count; i++) {
				parser.walkExpression(
					parser.nodeOfPath(path, path.field(i, Field.arguments, fn))
				);
			}
		} else if (fn !== 0 || obj !== 0) {
			parser.walkExpression(parser.nodeOfPath(path, fn || obj));
		}

		const dep = this.newDefineDependency(
			path.range(node),
			array !== 0 ? path.range(array) : null,
			fn !== 0 ? path.range(fn) : null,
			obj !== 0 ? path.range(obj) : null,
			namedModule || null
		);
		dep.loc = parser.getLocation(expr);
		if (namedModule) {
			dep.localModule = addLocalModule(parser.state, namedModule);
		}
		parser.state.module.addPresentationalDependency(dep);
		return true;
	}

	/**
	 * New define dependency.
	 * @param {Range} range range
	 * @param {Range | null} arrayRange array range
	 * @param {Range | null} functionRange function range
	 * @param {Range | null} objectRange object range
	 * @param {string | null} namedModule true, when define is called with a name
	 * @returns {AMDDefineDependency} AMDDefineDependency
	 */
	newDefineDependency(
		range,
		arrayRange,
		functionRange,
		objectRange,
		namedModule
	) {
		return new AMDDefineDependency(
			range,
			arrayRange,
			functionRange,
			objectRange,
			namedModule
		);
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

	/**
	 * New require item dependency.
	 * @param {string} request request
	 * @param {Range=} range range
	 * @returns {AMDRequireItemDependency} AMDRequireItemDependency
	 */
	newRequireItemDependency(request, range) {
		return new AMDRequireItemDependency(request, range);
	}
}

module.exports = AMDDefineDependencyParserPlugin;
