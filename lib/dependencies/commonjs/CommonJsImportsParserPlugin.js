/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const BasicEvaluatedExpression = require("../../javascript/BasicEvaluatedExpression");
const {
	evaluateToString,
	expressionIsUnsupported,
	toConstantDependency
} = require("../../javascript/JavascriptParserHelpers");
const {
	Field,
	Flag,
	NodeType,
	Part
} = require("../../javascript/syntax-parser");
const RuntimeGlobals = require("../../runtime/RuntimeGlobals");

const memoize = require("../../util/memoize");
const LocalModuleDependency = require("../amd/LocalModuleDependency");
const { getLocalModule } = require("../amd/LocalModulesHelpers");
const ContextDependencyHelpers = require("../context/ContextDependencyHelpers");
const ConstDependency = require("../core/ConstDependency");
const ESMImportGuard = require("../esm/ESMImportGuard");
const traverseDestructuringAssignmentProperties = require("../helpers/traverseDestructuringAssignmentProperties");
const CommonJsFullRequireDependency = require("./CommonJsFullRequireDependency");
const CommonJsRequireContextDependency = require("./CommonJsRequireContextDependency");
const CommonJsRequireDependency = require("./CommonJsRequireDependency");
const RequireHeaderDependency = require("./RequireHeaderDependency");
const RequireResolveContextDependency = require("./RequireResolveContextDependency");
const RequireResolveDependency = require("./RequireResolveDependency");
const RequireResolveHeaderDependency = require("./RequireResolveHeaderDependency");

const getUnsupportedFeatureWarning = memoize(() =>
	require("../../errors/UnsupportedFeatureWarning")
);

const getCommentCompilationWarning = memoize(() =>
	require("../../errors/CommentCompilationWarning")
);

/** @import { CallExpression, Expression, NewExpression, SpreadElement } from "estree" */
/**
 * @import {
 * 	JavascriptParserOptions
 * } from "../../../declarations/WebpackOptions"
 */
/** @import { ReferencedSpecifiers } from "../../graph/Dependency" */
/**
 * @import JavascriptParser, {
 * 	Range,
 * 	Members,
 * 	CalleeMembers,
 * 	JavascriptNodeReader
 * } from "../../javascript/JavascriptParser"
 */
/** @import LocalModule from "../amd/LocalModule" */

/**
 * Defines the common js import settings type used by this module.
 * @typedef {object} CommonJsImportSettings
 * @property {string=} name
 * @property {string} context
 */

/**
 * Per-`const NAME = require(LITERAL)` binding state used to forward
 * member-access references on `NAME` to the `CommonJsRequireDependency`
 * created for the `require()` call.
 * @typedef {object} RequireBindingData
 * @property {string} request request passed to `require()`
 * @property {ReferencedSpecifiers | null} referencedExports mutable list, pushed to as `NAME.x.y` accesses are walked; null means the whole namespace is used. Separate from `dep` so a deferred require (walked after accesses on `NAME`) still collects them; becomes the dep's shared list on creation.
 * @property {InstanceType<typeof import("./CommonJsRequireDependency")> | null} dep dependency for the `require()` call, null until the `require()` is walked; kept so a later whole-namespace use can null its list directly
 */

const REQUIRE_BINDING_TAG =
	/** @type {import("../../javascript/JavascriptParser").Tag<RequireBindingData>} */ (
		Symbol("CommonJsImportsParserPlugin require binding")
	);

const PLUGIN_NAME = "CommonJsImportsParserPlugin";

/**
 * Walks the tests of a conditional request, which stay in the emitted code.
 * @param {JavascriptParser} parser the parser
 * @param {Expression | SpreadElement} expression the request argument
 * @returns {void}
 */
const walkConditionalTests = (parser, expression) => {
	if (expression.type !== "ConditionalExpression") return;
	parser.walkExpression(expression.test);
	walkConditionalTests(parser, expression.consequent);
	walkConditionalTests(parser, expression.alternate);
};

/**
 * Checks whether a node is a require call expression.
 * @param {JavascriptNodeReader} path the path
 * @param {number} node the node
 * @returns {boolean} true, when the node is `require(...)` or `module.require(...)`
 */
const isRequireCallNode = (path, node) => {
	if (path.type(node) !== NodeType.CallExpression) return false;
	const callee = path.field(0, Field.callee, node);
	const type = path.type(callee);
	if (type === NodeType.Identifier) {
		return path.name(callee) === "require";
	}
	if (type === NodeType.MemberExpression && !path.flag(Flag.computed, callee)) {
		const object = path.field(0, Field.object, callee);
		const property = path.field(0, Field.property, callee);
		return (
			path.type(object) === NodeType.Identifier &&
			path.name(object) === "module" &&
			path.type(property) === NodeType.Identifier &&
			path.name(property) === "require"
		);
	}
	return false;
};

/**
 * Gets require referenced exports from destructuring.
 * @param {JavascriptParser} parser parser
 * @param {CallExpression | NewExpression | number} expr expression, or its id in the tree walk
 * @returns {ReferencedSpecifiers | null} referenced exports from destructuring
 */
const getRequireReferencedExportsFromDestructuring = (parser, expr) => {
	const referencedPropertiesInDestructuring =
		parser.destructuringAssignmentPropertiesFor(expr);
	if (!referencedPropertiesInDestructuring) return null;

	/** @type {ReferencedSpecifiers} */
	const referencedExports = [];
	traverseDestructuringAssignmentProperties(
		referencedPropertiesInDestructuring,
		(stack) => referencedExports.push(stack.map((p) => p.id))
	);
	return referencedExports;
};

/**
 * Creates a require cache dependency.
 * @param {JavascriptParser} parser parser
 * @returns {(expr: Expression) => boolean} handler
 */
const createRequireCacheDependency = (parser) =>
	toConstantDependency(parser, RuntimeGlobals.moduleCache, [
		RuntimeGlobals.moduleCache,
		RuntimeGlobals.moduleId,
		RuntimeGlobals.moduleLoaded
	]);

/**
 * Creates a require as expression handler.
 * @param {JavascriptParser} parser parser
 * @param {JavascriptParserOptions} options options
 * @param {() => undefined | string} getContext context accessor
 * @returns {(expr: Expression) => boolean} handler
 */
const createRequireAsExpressionHandler =
	(parser, options, getContext) => (expr) => {
		const dep = new CommonJsRequireContextDependency(
			{
				request: /** @type {string} */ (options.unknownContextRequest),
				recursive: /** @type {boolean} */ (options.unknownContextRecursive),
				regExp: /** @type {RegExp} */ (options.unknownContextRegExp),
				mode: "sync"
			},
			/** @type {Range} */ (expr.range),
			undefined,
			parser.scope.inShorthand,
			getContext()
		);
		dep.critical =
			options.unknownContextCritical &&
			"require function is used in a way in which dependencies cannot be statically extracted";
		dep.loc = parser.getLocation(expr);
		dep.optional = Boolean(parser.scope.inTry);
		parser.state.current.addDependency(dep);
		return true;
	};

/**
 * A `require(…)` or `new require(…)` call, by the fields the handler reads: the
 * call is its id in the tree walk, else its object, which `getObject` returns.
 * @typedef {(expr: CallExpression | NewExpression | number, range: Range, calleeRange: Range, argumentCount: number, argument: Expression | number | undefined, getObject: () => CallExpression | NewExpression, callNew: boolean) => (boolean | void)} RequireCall
 */

/**
 * Creates the handler of a require call, by the fields it reads.
 * @param {JavascriptParser} parser parser
 * @param {JavascriptParserOptions} options options
 * @param {() => undefined | string} getContext context accessor
 * @param {Map<CallExpression | NewExpression | number, RequireBindingData>=} requireBindingData per-parser `const NAME = require(LITERAL)` binding state; only the free-`require` plugin populates it
 * @returns {RequireCall} handler
 */
const createRequireCall = (parser, options, getContext, requireBindingData) => {
	/**
	 * Process require item.
	 * @param {CallExpression | NewExpression | number} expr expression, or its id in the tree walk
	 * @param {Range} range its range
	 * @param {BasicEvaluatedExpression} param param
	 * @param {boolean=} allowEvaluationOnly when false (conditional require), keep full namespace use
	 * @returns {CommonJsRequireDependency | undefined} created dependency when handled
	 */
	const processRequireItem = (
		expr,
		range,
		param,
		allowEvaluationOnly = true
	) => {
		if (param.isString()) {
			let referencedExports = getRequireReferencedExportsFromDestructuring(
				parser,
				expr
			);
			const binding = requireBindingData && requireBindingData.get(expr);
			if (binding && !referencedExports) {
				// `const NAME = require(LITERAL)` — let later member-access walks
				// on `NAME` populate the dependency's referenced exports.
				referencedExports = binding.referencedExports;
			} else if (
				allowEvaluationOnly &&
				referencedExports === null &&
				!binding &&
				parser.isStatementLevelExpression(expr)
			) {
				// Bare `require(...)` as a statement: result discarded → evaluation only.
				referencedExports = [];
			}
			const dep = new CommonJsRequireDependency(
				/** @type {string} */ (param.string),
				/** @type {Range} */ (param.range),
				getContext(),
				referencedExports,
				range
			);
			if (binding) binding.dep = dep;
			dep.asiSafe = !parser.isAsiPosition(range[0]);
			dep.loc = parser.getLocation(expr);
			dep.optional = Boolean(parser.scope.inTry);
			parser.state.current.addDependency(dep);
			ESMImportGuard.attachDependencyGuards(parser, dep);
			return dep;
		}
	};
	/**
	 * Process require context.
	 * @param {CallExpression | NewExpression} expr expression
	 * @param {BasicEvaluatedExpression} param param
	 * @returns {boolean | void} true when handled
	 */
	const processRequireContext = (expr, param) => {
		const referencedExports = getRequireReferencedExportsFromDestructuring(
			parser,
			expr
		);
		const dep = ContextDependencyHelpers.create(
			CommonJsRequireContextDependency,
			/** @type {Range} */ (expr.range),
			param,
			expr,
			options,
			{
				category: "commonjs",
				referencedExports
			},
			parser,
			undefined,
			getContext()
		);
		if (!dep) return;
		dep.loc = parser.getLocation(expr);
		dep.optional = Boolean(parser.scope.inTry);
		parser.state.current.addDependency(dep);
		return true;
	};

	return (
		expr,
		range,
		calleeRange,
		argumentCount,
		argument,
		getObject,
		callNew
	) => {
		if (options.commonjsMagicComments) {
			const { options: requireOptions, errors: commentErrors } =
				parser.parseCommentOptions(range);

			if (commentErrors) {
				for (const e of commentErrors) {
					const { comment } = e;
					parser.state.module.addWarning(
						new (getCommentCompilationWarning())(
							`Compilation error while processing magic comment(-s): /*${comment.value}*/: ${e.message}`,
							parser.getLocation(comment)
						)
					);
				}
			}
			if (requireOptions && requireOptions.webpackIgnore !== undefined) {
				if (typeof requireOptions.webpackIgnore !== "boolean") {
					parser.state.module.addWarning(
						new (getUnsupportedFeatureWarning())(
							`\`webpackIgnore\` expected a boolean, but received: ${requireOptions.webpackIgnore}.`,
							parser.getLocation(expr)
						)
					);
				} else if (requireOptions.webpackIgnore) {
					// Do not instrument `require()` if `webpackIgnore` is `true`
					return true;
				}
			}
		}

		if (argumentCount !== 1) return;
		/** @type {null | LocalModule} */
		let localModule;
		const param = parser.evaluateExpression(
			/** @type {Expression} */ (argument)
		);
		if (param.isConditional()) {
			let isExpression = false;
			for (const p of /** @type {BasicEvaluatedExpression[]} */ (
				param.options
			)) {
				// Shared valueRange across branches: never mark evaluation-only.
				const requireDep = processRequireItem(expr, range, p, false);
				if (requireDep === undefined) {
					isExpression = true;
				}
			}
			if (!isExpression) {
				walkConditionalTests(
					parser,
					/** @type {Expression} */ (getObject().arguments[0])
				);
				const dep = new RequireHeaderDependency(calleeRange);
				dep.loc = parser.getLocation(expr);
				parser.state.module.addPresentationalDependency(dep);
				return true;
			}
		}
		if (
			param.isString() &&
			(localModule = getLocalModule(
				parser.state,
				/** @type {string} */ (param.string)
			))
		) {
			localModule.flagUsed();
			const dep = new LocalModuleDependency(localModule, range, callNew);
			dep.loc = parser.getLocation(expr);
			parser.state.module.addPresentationalDependency(dep);
		} else {
			const requireDep = processRequireItem(expr, range, param);
			if (requireDep === undefined) {
				processRequireContext(getObject(), param);
			} else {
				requireDep._canConcatenate = true;
				// concatenation replaces the whole NewExpression; the template
				// reapplies the `new` return-value rule
				requireDep.callNew = callNew;
				const dep = new RequireHeaderDependency(calleeRange, requireDep);
				dep.loc = parser.getLocation(expr);
				parser.state.module.addPresentationalDependency(dep);
			}
		}
		return true;
	};
};

/**
 * Creates a require call handler.
 * @param {JavascriptParser} parser parser
 * @param {JavascriptParserOptions} options options
 * @param {() => undefined | string} getContext context accessor
 * @param {Map<CallExpression | NewExpression | number, RequireBindingData>=} requireBindingData per-parser `const NAME = require(LITERAL)` binding state; only the free-`require` plugin populates it
 * @returns {(callNew: boolean) => (expr: CallExpression | NewExpression) => (boolean | void)} handler factory
 */
const createRequireCallHandler = (
	parser,
	options,
	getContext,
	requireBindingData
) => {
	const requireCall = createRequireCall(
		parser,
		options,
		getContext,
		requireBindingData
	);
	return (callNew) => (expr) =>
		requireCall(
			expr,
			/** @type {Range} */ (expr.range),
			/** @type {Range} */ (expr.callee.range),
			expr.arguments.length,
			/** @type {Expression | undefined} */ (expr.arguments[0]),
			() => expr,
			callNew
		);
};

/**
 * Creates a process resolve handler.
 * @param {JavascriptParser} parser parser
 * @param {JavascriptParserOptions} options options
 * @param {() => undefined | string} getContext context accessor
 * @returns {(expr: CallExpression, weak: boolean) => (boolean | void)} resolver
 */
const createProcessResolveHandler = (parser, options, getContext) => {
	/**
	 * Process resolve item.
	 * @param {CallExpression} expr call expression
	 * @param {BasicEvaluatedExpression} param param
	 * @param {boolean} weak weak
	 * @returns {boolean | void} true when handled
	 */
	const processResolveItem = (expr, param, weak) => {
		if (param.isString()) {
			const dep = new RequireResolveDependency(
				/** @type {string} */ (param.string),
				/** @type {Range} */ (param.range),
				getContext()
			);
			dep.loc = parser.getLocation(expr);
			dep.optional = Boolean(parser.scope.inTry);
			dep.weak = weak;
			parser.state.current.addDependency(dep);
			return true;
		}
	};
	/**
	 * Process resolve context.
	 * @param {CallExpression} expr call expression
	 * @param {BasicEvaluatedExpression} param param
	 * @param {boolean} weak weak
	 * @returns {boolean | void} true when handled
	 */
	const processResolveContext = (expr, param, weak) => {
		const dep = ContextDependencyHelpers.create(
			RequireResolveContextDependency,
			/** @type {Range} */ (param.range),
			param,
			expr,
			options,
			{
				category: "commonjs",
				mode: weak ? "weak" : "sync"
			},
			parser,
			getContext()
		);
		if (!dep) return;
		dep.loc = parser.getLocation(expr);
		dep.optional = Boolean(parser.scope.inTry);
		parser.state.current.addDependency(dep);
		return true;
	};

	return (expr, weak) => {
		if (!weak && options.commonjsMagicComments) {
			const { options: requireOptions, errors: commentErrors } =
				parser.parseCommentOptions(/** @type {Range} */ (expr.range));

			if (commentErrors) {
				for (const e of commentErrors) {
					const { comment } = e;
					parser.state.module.addWarning(
						new (getCommentCompilationWarning())(
							`Compilation error while processing magic comment(-s): /*${comment.value}*/: ${e.message}`,
							parser.getLocation(comment)
						)
					);
				}
			}
			if (requireOptions && requireOptions.webpackIgnore !== undefined) {
				if (typeof requireOptions.webpackIgnore !== "boolean") {
					parser.state.module.addWarning(
						new (getUnsupportedFeatureWarning())(
							`\`webpackIgnore\` expected a boolean, but received: ${requireOptions.webpackIgnore}.`,
							parser.getLocation(expr)
						)
					);
				} else if (requireOptions.webpackIgnore) {
					// Do not instrument `require()` if `webpackIgnore` is `true`
					return true;
				}
			}
		}

		if (expr.arguments.length !== 1) return;
		const param = parser.evaluateExpression(expr.arguments[0]);
		const range = /** @type {Range} */ (expr.range);
		const argumentRange = /** @type {Range} */ (expr.arguments[0].range);
		const header = new RequireResolveHeaderDependency([
			range[0],
			argumentRange[0]
		]);
		header.loc = parser.getLocation(expr);
		parser.state.module.addPresentationalDependency(header);
		// A parenthesized expression cannot retain the call's trailing comma.
		const closing = new ConstDependency(")", [argumentRange[1], range[1]]);
		closing.loc = parser.getLocation(expr);
		parser.state.module.addPresentationalDependency(closing);
		if (param.isConditional()) {
			walkConditionalTests(parser, expr.arguments[0]);
			for (const option of /** @type {BasicEvaluatedExpression[]} */ (
				param.options
			)) {
				const result = processResolveItem(expr, option, weak);
				if (result === undefined) {
					processResolveContext(expr, option, weak);
				}
			}
			return true;
		}
		const result = processResolveItem(expr, param, weak);
		if (result === undefined) {
			processResolveContext(expr, param, weak);
		}
		return true;
	};
};

class CommonJsImportsParserPlugin {
	/**
	 * Creates an instance of CommonJsImportsParserPlugin.
	 * @param {JavascriptParserOptions} options parser options
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
		const options = this.options;
		parser.hooks.collectDestructuringAssignmentProperties.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, node) => {
				if (isRequireCallNode(path, node)) return true;
				// `const NAME = require(…); const { a } = NAME;`
				if (
					path.type(node) === NodeType.Identifier &&
					parser.getTagData(path.name(node), REQUIRE_BINDING_TAG)
				) {
					return true;
				}
			}
		);

		const getContext = () => {
			if (parser.currentTagData) {
				const { context } =
					/** @type {CommonJsImportSettings} */
					(parser.currentTagData);
				return context;
			}
		};

		// #region metadata
		/**
		 * Tap require expression.
		 * @param {string} expression expression
		 * @param {() => Members} getMembers get members
		 */
		const tapRequireExpression = (expression, getMembers) => {
			parser.hooks.typeof
				.for(expression)
				.tap(
					PLUGIN_NAME,
					toConstantDependency(parser, JSON.stringify("function"))
				);
			parser.hooks.evaluateTypeof
				.for(expression)
				.tap(PLUGIN_NAME, evaluateToString("function"));
			// every `require(…)` evaluates its callee, so this reads the range by id
			parser.hooks.evaluateIdentifier
				.for(expression)
				.tap({ name: PLUGIN_NAME, path: true }, (path, node) =>
					new BasicEvaluatedExpression()
						.setIdentifier(expression, "require", getMembers)
						.setSideEffects(false)
						.setRange(path.range(node))
						.setTruthy()
				);
		};
		tapRequireExpression("require", () => []);
		tapRequireExpression("require.resolve", () => ["resolve"]);
		tapRequireExpression("require.resolveWeak", () => ["resolveWeak"]);
		// #endregion

		// Weird stuff //
		parser.hooks.assign.for("require").tap(PLUGIN_NAME, (expr) => {
			// to not leak to global "require", we need to define a local require here.
			const dep = new ConstDependency("var require;", 0);
			dep.loc = parser.getLocation(expr);
			parser.state.module.addPresentationalDependency(dep);
			return true;
		});

		// #region Unsupported
		parser.hooks.call
			.for("require.main.require")
			.tap(
				PLUGIN_NAME,
				expressionIsUnsupported(
					parser,
					"require.main.require is not supported by webpack."
				)
			);
		parser.hooks.expression
			.for("module.parent.require")
			.tap(
				PLUGIN_NAME,
				expressionIsUnsupported(
					parser,
					"module.parent.require is not supported by webpack."
				)
			);
		parser.hooks.call
			.for("module.parent.require")
			.tap(
				PLUGIN_NAME,
				expressionIsUnsupported(
					parser,
					"module.parent.require is not supported by webpack."
				)
			);
		// #endregion

		// #region Renaming
		/**
		 * Returns true when set undefined.
		 * @param {Expression} expr expression
		 * @returns {boolean} true when set undefined
		 */
		const defineUndefined = (expr) => {
			// To avoid "not defined" error, replace the value with undefined
			const dep = new ConstDependency(
				"undefined",
				/** @type {Range} */ (expr.range)
			);
			dep.loc = parser.getLocation(expr);
			parser.state.module.addPresentationalDependency(dep);
			return false;
		};
		parser.hooks.canRename.for("require").tap(PLUGIN_NAME, () => true);
		parser.hooks.rename.for("require").tap(PLUGIN_NAME, defineUndefined);
		// #endregion

		// #region Inspection
		const requireCache = createRequireCacheDependency(parser);

		parser.hooks.expression.for("require.cache").tap(PLUGIN_NAME, requireCache);
		// #endregion

		// #region Require as expression
		/**
		 * Require as expression handler.
		 * @param {Expression} expr expression
		 * @returns {boolean} true when handled
		 */
		const requireAsExpressionHandler = createRequireAsExpressionHandler(
			parser,
			options,
			getContext
		);
		parser.hooks.expression
			.for("require")
			.tap(PLUGIN_NAME, requireAsExpressionHandler);
		// #endregion

		// #region Require
		/**
		 * Creates a require handler.
		 * @param {boolean} callNew true, when require is called with new
		 * @returns {(expr: CallExpression | NewExpression) => (boolean | void)} handler
		 */
		// keyed by the call's id in the tree walk, so it is emptied for each module
		/** @type {Map<CallExpression | NewExpression | number, RequireBindingData>} */
		const requireBindingData = new Map();
		parser.hooks.program.tap({ name: PLUGIN_NAME, path: true }, () => {
			requireBindingData.clear();
		});
		parser.hooks.finish.tap({ name: PLUGIN_NAME, path: true }, () => {
			requireBindingData.clear();
		});
		const requireCall = createRequireCall(
			parser,
			options,
			getContext,
			requireBindingData
		);
		/**
		 * Taps a require call by path, as every `require(…)` reaches it.
		 * @param {boolean} callNew true, when require is called with new
		 * @returns {(path: JavascriptNodeReader, node: number) => (boolean | void)} the tap
		 */
		const requireCallByPath = (callNew) => (path, node) => {
			const argumentCount = path.fieldCount(Field.arguments, node);
			return requireCall(
				parser.nodeOfPath(path, node),
				path.range(node),
				path.range(path.field(0, Field.callee, node)),
				argumentCount,
				argumentCount === 1
					? parser.nodeOfPath(path, path.field(0, Field.arguments, node))
					: undefined,
				() => /** @type {CallExpression | NewExpression} */ (path.object(node)),
				callNew
			);
		};
		parser.hooks.call
			.for("require")
			.tap({ name: PLUGIN_NAME, path: true }, requireCallByPath(false));
		parser.hooks.new
			.for("require")
			.tap({ name: PLUGIN_NAME, path: true }, requireCallByPath(true));
		parser.hooks.call
			.for("module.require")
			.tap({ name: PLUGIN_NAME, path: true }, requireCallByPath(false));
		parser.hooks.new
			.for("module.require")
			.tap({ name: PLUGIN_NAME, path: true }, requireCallByPath(true));
		// #endregion

		// #region Require with property access
		/**
		 * Returns true when handled.
		 * @param {Expression} expr expression
		 * @param {CalleeMembers} calleeMembers callee members
		 * @param {CallExpression} callExpr call expression
		 * @param {Members} members members
		 * @param {Range[]} memberRanges member ranges
		 * @returns {boolean | void} true when handled
		 */
		const chainHandler = (
			expr,
			calleeMembers,
			callExpr,
			members,
			memberRanges
		) => {
			if (callExpr.arguments.length !== 1) return;
			const param = parser.evaluateExpression(callExpr.arguments[0]);
			if (
				param.isString() &&
				!getLocalModule(parser.state, /** @type {string} */ (param.string))
			) {
				const dep = new CommonJsFullRequireDependency(
					/** @type {string} */ (param.string),
					/** @type {Range} */ (expr.range),
					members,
					/** @type {Range[]} */ memberRanges
				);
				dep.asiSafe = !parser.isAsiPosition(
					/** @type {Range} */ (expr.range)[0]
				);
				dep.optional = Boolean(parser.scope.inTry);
				dep._canConcatenate = true;
				dep.loc = parser.getLocation(expr);
				parser.state.current.addDependency(dep);
				ESMImportGuard.attachDependencyGuards(parser, dep);
				return true;
			}
		};
		/**
		 * Call chain handler.
		 * @param {CallExpression} expr expression
		 * @param {CalleeMembers} calleeMembers callee members
		 * @param {CallExpression} callExpr call expression
		 * @param {Members} members members
		 * @param {Range[]} memberRanges member ranges
		 * @returns {boolean | void} true when handled
		 */
		const callChainHandler = (
			expr,
			calleeMembers,
			callExpr,
			members,
			memberRanges
		) => {
			if (callExpr.arguments.length !== 1) return;
			const param = parser.evaluateExpression(callExpr.arguments[0]);
			if (
				param.isString() &&
				!getLocalModule(parser.state, /** @type {string} */ (param.string))
			) {
				const dep = new CommonJsFullRequireDependency(
					/** @type {string} */ (param.string),
					/** @type {Range} */ (expr.callee.range),
					members,
					/** @type {Range[]} */ memberRanges
				);
				dep.call = true;
				dep.namespaceObjectAsContext = Boolean(
					options.strictThisContextOnImports
				);
				dep.asiSafe = !parser.isAsiPosition(
					/** @type {Range} */ (expr.range)[0]
				);
				dep.optional = Boolean(parser.scope.inTry);
				dep._canConcatenate = true;
				dep.loc = parser.getLocation(expr.callee);
				parser.state.current.addDependency(dep);
				ESMImportGuard.attachDependencyGuards(parser, dep);
				parser.walkExpressions(expr.arguments);
				return true;
			}
		};
		parser.hooks.memberChainOfCallMemberChain
			.for("require")
			.tap(PLUGIN_NAME, chainHandler);
		parser.hooks.memberChainOfCallMemberChain
			.for("module.require")
			.tap(PLUGIN_NAME, chainHandler);
		parser.hooks.callMemberChainOfCallMemberChain
			.for("require")
			.tap(PLUGIN_NAME, callChainHandler);
		parser.hooks.callMemberChainOfCallMemberChain
			.for("module.require")
			.tap(PLUGIN_NAME, callChainHandler);
		// #endregion

		// #region Require bound to a const variable

		// Track `const NAME = require(LITERAL)`, so a static member access on `NAME`
		// forwards to the same dependency as a referenced export and a CommonJS
		// module bound to a name still tree-shakes; it reads ids, as every declarator comes here.
		parser.hooks.preDeclarator.tap(
			{ name: PLUGIN_NAME, path: true },
			(path, declarator, statement) => {
				if (path.textOf(Part.kind, statement) !== "const") return;
				const id = path.field(0, Field.id, declarator);
				if (path.type(id) !== NodeType.Identifier) return;
				const init = path.field(0, Field.init, declarator);
				if (init === 0 || path.type(init) !== NodeType.CallExpression) return;
				const callee = path.field(0, Field.callee, init);
				if (
					path.type(callee) !== NodeType.Identifier ||
					path.name(callee) !== "require" ||
					path.fieldCount(Field.arguments, init) !== 1
				) {
					return;
				}
				const arg = path.field(0, Field.arguments, init);
				const request = path.value(arg);
				if (
					path.type(arg) !== NodeType.Literal ||
					typeof request !== "string"
				) {
					return;
				}
				// Only attach binding state when `require` resolves to the free
				// `require` (i.e. it isn't shadowed in the current scope).
				const requireInfo = parser.getFreeInfoFromVariable("require");
				if (!requireInfo || requireInfo.name !== "require") return;
				/** @type {RequireBindingData} */
				const binding = {
					request,
					referencedExports: [],
					dep: null
				};
				requireBindingData.set(parser.nodeOfPath(path, init), binding);
				parser.tagVariable(path.name(id), REQUIRE_BINDING_TAG, binding);
				return true;
			}
		);

		// every read of a bound require reaches these taps, so they read ids
		parser.hooks.expression
			.for(REQUIRE_BINDING_TAG)
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
				const binding =
					/** @type {RequireBindingData} */
					(parser.currentTagData);
				if (binding) {
					const properties = parser.destructuringAssignmentPropertiesFor(
						parser.nodeOfPath(path, node)
					);
					if (properties && binding.referencedExports) {
						// `const { a } = NAME` — only the destructured keys are read.
						const referencedExports = binding.referencedExports;
						traverseDestructuringAssignmentProperties(properties, (stack) =>
							referencedExports.push(stack.map((p) => p.id))
						);
					} else {
						// `NAME` is read as a value (not as the object of a static member
						// chain), so we have to assume the whole exports object is used.
						binding.referencedExports = null;
						if (binding.dep) {
							binding.dep.referencedExports = null;
						}
					}
				}
				return true;
			});

		parser.hooks.expressionMemberChain
			.for(REQUIRE_BINDING_TAG)
			.tap({ name: PLUGIN_NAME, path: true }, (_path, _node, members) => {
				const binding =
					/** @type {RequireBindingData} */
					(parser.currentTagData);
				if (binding && binding.referencedExports) {
					binding.referencedExports.push(members);
				}
				// Returning truthy suppresses the parser's fallback chain (which
				// would otherwise walk `NAME` as a bare expression and trigger our
				// `expression` hook above, marking the whole namespace as used).
				return true;
			});

		parser.hooks.callMemberChain
			.for(REQUIRE_BINDING_TAG)
			.tap({ name: PLUGIN_NAME, path: true }, (path, node, members) => {
				const binding =
					/** @type {RequireBindingData} */
					(parser.currentTagData);
				if (binding && binding.referencedExports) {
					if (members.length === 0) {
						// `NAME(...)` — calling the require result directly; the
						// whole exports object is observable.
						binding.referencedExports = null;
						if (binding.dep) {
							binding.dep.referencedExports = null;
						}
					} else {
						binding.referencedExports.push({
							names: members,
							namespaceObjectAsContext: Boolean(
								options.strictThisContextOnImports
							)
						});
					}
				}
				const argumentCount = path.fieldCount(Field.arguments, node);
				for (let i = 0; i < argumentCount; i++) {
					parser.walkExpression(
						parser.nodeOfPath(path, path.field(i, Field.arguments, node))
					);
				}
				return true;
			});

		// Re-exporting the binding lets the require result escape, so the whole
		// exports object is observable. Stage -10 runs before the harmony bail tap.
		parser.hooks.exportSpecifier.tap(
			{ name: PLUGIN_NAME, stage: -10, path: true },
			(_path, _statement, id) => {
				const binding =
					/** @type {RequireBindingData | undefined} */
					(parser.getTagData(id, REQUIRE_BINDING_TAG));
				if (binding) {
					binding.referencedExports = null;
					if (binding.dep) {
						binding.dep.referencedExports = null;
					}
				}
			}
		);
		// #endregion

		// #region Require.resolve
		/**
		 * Processes the provided expr.
		 * @param {CallExpression} expr call expression
		 * @param {boolean} weak weak
		 * @returns {boolean | void} true when handled
		 */
		const processResolve = createProcessResolveHandler(
			parser,
			options,
			getContext
		);

		parser.hooks.call
			.for("require.resolve")
			.tap(PLUGIN_NAME, (expr) => processResolve(expr, false));
		parser.hooks.call
			.for("require.resolveWeak")
			.tap(PLUGIN_NAME, (expr) => processResolve(expr, true));
		// #endregion
	}
}

CommonJsImportsParserPlugin.createProcessResolveHandler =
	createProcessResolveHandler;
CommonJsImportsParserPlugin.createRequireAsExpressionHandler =
	createRequireAsExpressionHandler;
CommonJsImportsParserPlugin.createRequireCacheDependency =
	createRequireCacheDependency;
CommonJsImportsParserPlugin.createRequireHandler = createRequireCallHandler;
CommonJsImportsParserPlugin.REQUIRE_BINDING_TAG = REQUIRE_BINDING_TAG;

module.exports = CommonJsImportsParserPlugin;
