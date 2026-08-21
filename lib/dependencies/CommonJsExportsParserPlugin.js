/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const RuntimeGlobals = require("../RuntimeGlobals");
const { evaluateToString } = require("../javascript/JavascriptParserHelpers");
const formatLocation = require("../util/formatLocation");
const { propertyAccess } = require("../util/property");
const CommonJsExportRequireDependency = require("./CommonJsExportRequireDependency");
const CommonJsExportsDependency = require("./CommonJsExportsDependency");
const CommonJsFullRequireDependency = require("./CommonJsFullRequireDependency");
const CommonJsObjectExportDependency = require("./CommonJsObjectExportDependency");
const CommonJsRequireDependency = require("./CommonJsRequireDependency");
const CommonJsSelfReferenceDependency = require("./CommonJsSelfReferenceDependency");
const DynamicExports = require("./DynamicExports");
const HarmonyExports = require("./HarmonyExports");
const ModuleDecoratorDependency = require("./ModuleDecoratorDependency");
const RuntimeRequirementsDependency = require("./RuntimeRequirementsDependency");

const FUNCTION_PROPERTY_DROP_HEAD =
	CommonJsObjectExportDependency.FUNCTION_PROPERTY_DROP_HEAD;

/**
 * @import {
 * 	AssignmentExpression,
 * 	CallExpression,
 * 	Expression,
 * 	FunctionExpression,
 * 	Node,
 * 	ObjectExpression,
 * 	Property,
 * 	SpreadElement,
 * 	Super,
 * 	ThisExpression
 * } from "estree"
 */
/** @import { ExportInfoName } from "../Dependency" */
/** @import ModuleGraph from "../ModuleGraph" */
/** @import BasicEvaluatedExpression from "../javascript/BasicEvaluatedExpression" */
/**
 * @import JavascriptParser, {
 * 	Range,
 * 	Members,
 * 	StatementPath
 * } from "../javascript/JavascriptParser"
 */
/**
 * @import {
 * 	CommonJSDependencyBaseKeywords
 * } from "./CommonJsDependencyHelpers"
 */
/**
 * @import {
 * 	CommonJsObjectExportKind
 * } from "./CommonJsObjectExportDependency"
 */
/**
 * @import {
 * 	JavascriptModuleBuildMeta
 * } from "../javascript/JavascriptModule"
 */

/**
 * This function takes a generic expression and detects whether it is an ObjectExpression.
 * This is used in the context of parsing CommonJS exports to get the value of the property descriptor
 * when the `exports` object is assigned to `Object.defineProperty`.
 *
 * In CommonJS modules, the `exports` object can be assigned to `Object.defineProperty` and therefore
 * webpack has to detect this case and get the value key of the property descriptor. See the following example
 * for more information: https://astexplorer.net/#/gist/83ce51a4e96e59d777df315a6d111da6/8058ead48a1bb53c097738225db0967ef7f70e57
 *
 * This would be an example of a CommonJS module that exports an object with a property descriptor:
 * ```js
 * Object.defineProperty(exports, "__esModule", { value: true });
 * exports.foo = void 0;
 * exports.foo = "bar";
 * ```
 * @param {Expression} expr expression
 * @returns {Expression | undefined} returns the value of property descriptor
 */
const getValueOfPropertyDescription = (expr) => {
	if (expr.type !== "ObjectExpression") return;
	for (const property of expr.properties) {
		if (property.type === "SpreadElement" || property.computed) continue;
		const key = property.key;
		if (key.type !== "Identifier" || key.name !== "value") continue;
		return /** @type {Expression} */ (property.value);
	}
};

/**
 * Extracts the re-exportable expression from a property descriptor, handling
 * both the eager `{ value: <expr> }` form and the lazy
 * `{ get: () => <expr> }` / `{ get() { return <expr>; } }` accessor form used
 * by barrel files (e.g. webpack's own `lib/index.js`). A `set` accessor cannot
 * be reproduced by the rewritten descriptor, so descriptors with a setter are
 * left to the generic handler (which keeps the descriptor verbatim).
 * @param {Expression} expr property descriptor expression
 * @returns {{ expr: Expression, getter: boolean } | undefined} the value expression and whether it is a lazy getter
 */
const getReexportOfPropertyDescriptor = (expr) => {
	if (expr.type !== "ObjectExpression") return;
	/** @type {Expression | undefined} */
	let valueExpr;
	/** @type {Expression | undefined} */
	let getFn;
	for (const property of expr.properties) {
		if (property.type === "SpreadElement" || property.computed) continue;
		const key = property.key;
		if (key.type !== "Identifier") continue;
		// A setter would be silently dropped by the rewrite — bail out.
		if (key.name === "set") return;
		if (key.name === "value") {
			valueExpr = /** @type {Expression} */ (property.value);
		} else if (key.name === "get") {
			getFn = /** @type {Expression} */ (property.value);
		}
	}
	if (valueExpr) return { expr: valueExpr, getter: false };
	if (
		getFn &&
		(getFn.type === "FunctionExpression" ||
			getFn.type === "ArrowFunctionExpression")
	) {
		// Arrow with expression body: `() => require("./x")`.
		if (getFn.body.type !== "BlockStatement") {
			return { expr: /** @type {Expression} */ (getFn.body), getter: true };
		}
		// Function body must be exactly `return <expr>;`.
		if (
			getFn.body.body.length === 1 &&
			getFn.body.body[0].type === "ReturnStatement" &&
			getFn.body.body[0].argument
		) {
			return { expr: getFn.body.body[0].argument, getter: true };
		}
	}
};

/**
 * The purpose of this function is to check whether an expression is a truthy literal or not. This is
 * useful when parsing CommonJS exports, because CommonJS modules can export any value, including falsy
 * values like `null` and `false`. However, exports should only be created if the exported value is truthy.
 * @param {Expression} expr expression being checked
 * @returns {boolean} true, when the expression is a truthy literal
 */
const isTruthyLiteral = (expr) => {
	switch (expr.type) {
		case "Literal":
			return Boolean(expr.value);
		case "UnaryExpression":
			if (expr.operator === "!") return isFalsyLiteral(expr.argument);
	}
	return false;
};

/**
 * The purpose of this function is to check whether an expression is a falsy literal or not. This is
 * useful when parsing CommonJS exports, because CommonJS modules can export any value, including falsy
 * values like `null` and `false`. However, exports should only be created if the exported value is truthy.
 * @param {Expression} expr expression being checked
 * @returns {boolean} true, when the expression is a falsy literal
 */
const isFalsyLiteral = (expr) => {
	switch (expr.type) {
		case "Literal":
			return !expr.value;
		case "UnaryExpression":
			if (expr.operator === "!") return isTruthyLiteral(expr.argument);
	}
	return false;
};

/**
 * Parses require call.
 * @param {JavascriptParser} parser the parser
 * @param {Expression} expr expression
 * @returns {{ argument: BasicEvaluatedExpression, ids: ExportInfoName[] } | undefined} parsed call
 */
const parseRequireCall = (parser, expr) => {
	/** @type {ExportInfoName[]} */
	const ids = [];
	while (expr.type === "MemberExpression") {
		if (expr.object.type === "Super") return;
		if (!expr.property) return;
		const prop = expr.property;
		if (expr.computed) {
			if (prop.type !== "Literal") return;
			ids.push(`${prop.value}`);
		} else {
			if (prop.type !== "Identifier") return;
			ids.push(prop.name);
		}
		expr = expr.object;
	}
	if (expr.type !== "CallExpression" || expr.arguments.length !== 1) return;
	const callee = expr.callee;
	if (
		callee.type !== "Identifier" ||
		parser.getVariableInfo(callee.name) !== "require"
	) {
		return;
	}
	const arg = expr.arguments[0];
	if (arg.type === "SpreadElement") return;
	const argValue = parser.evaluateExpression(arg);
	return { argument: argValue, ids: ids.reverse() };
};

/**
 * Checks if a value is an AST node.
 * @param {unknown} value candidate
 * @returns {value is Node} true when the value is an AST node
 */
const isNode = (value) =>
	typeof value === "object" &&
	value !== null &&
	typeof (/** @type {{ type?: unknown }} */ (value).type) === "string";

/** Positional/metadata keys that never hold child AST nodes. */
const NON_CHILD_KEYS = new Set([
	"type",
	"start",
	"end",
	"loc",
	"range",
	"leadingComments",
	"trailingComments"
]);

/** @type {Map<string, string[]>} per node type: own keys that may hold child nodes */
const childKeysByType = new Map();

/**
 * Returns the keys of a node that may hold child nodes, excluding positional
 * metadata. Computed once per node type and cached: acorn initializes every
 * field of a given type (to `null` when absent), so the key set is stable, and
 * the cache stays allocation-free on the hot path after the first node of each
 * type is seen.
 * @param {Node} node node
 * @returns {string[]} candidate child keys
 */
const getChildKeys = (node) => {
	let keys = childKeysByType.get(node.type);
	if (keys === undefined) {
		keys = Object.keys(node).filter((key) => !NON_CHILD_KEYS.has(key));
		childKeysByType.set(node.type, keys);
	}
	return keys;
};

/**
 * Searches for a `this` belonging to the scanned function's own `this`-scope.
 * Descends into arrow functions, but not into nested functions, static blocks
 * and class field values, which have their own `this`. Class method bodies are
 * function expressions and are skipped by the same rule, while computed keys
 * and `extends` clauses evaluate in the outer scope and are searched. The
 * `this`-scope boundary is enforced when a node is popped, so the generic
 * branch may enumerate any child without crossing it.
 * @param {Node} body function body
 * @param {Node[]} params function params
 * @returns {ThisExpression | undefined} first own `this` expression
 */
const findOwnThisExpression = (body, params) => {
	// the body is popped first, so its `this` wins over a default parameter's
	const stack = [];
	for (let i = 0; i < params.length; i++) stack.push(params[i]);
	stack.push(body);
	let node;
	while ((node = stack.pop()) !== undefined) {
		switch (node.type) {
			case "ThisExpression":
				return node;
			case "FunctionExpression":
			case "FunctionDeclaration":
			case "StaticBlock":
				break;
			case "PropertyDefinition":
				if (node.computed) stack.push(node.key);
				break;
			default: {
				const children =
					/** @type {Record<string, unknown>} */
					(/** @type {unknown} */ (node));
				const keys = getChildKeys(node);
				for (let i = 0; i < keys.length; i++) {
					const value = children[keys[i]];
					if (Array.isArray(value)) {
						for (const item of value) {
							if (isNode(item)) stack.push(item);
						}
					} else if (isNode(value)) {
						stack.push(value);
					}
				}
			}
		}
	}
};

/**
 * Returns the own `this` of a function-expression export value. When such a
 * function is called as a method of the exports object, `this` is the exports
 * object and may reach any sibling export (#21178).
 * @param {JavascriptParser} parser the parser
 * @param {Node} expr the exported value
 * @returns {ThisExpression | undefined} first own `this` expression
 */
const getThisAccessInExportedValue = (parser, expr) =>
	expr.type === "FunctionExpression" &&
	// scanning the body of every exported function is expensive and most of them
	// never mention `this`, so filter on the source text first
	parser.sourceMayContainIdentifier(/** @type {Range} */ (expr.range), "this")
		? findOwnThisExpression(expr.body, expr.params)
		: undefined;

/**
 * Returns the export name an object-literal property contributes, or
 * `undefined` when it cannot contribute one: a spread, a computed or
 * non-string key is unknown at compile time, and `__proto__` sets
 * [[Prototype]] instead of an own property.
 * @param {Property | SpreadElement} property property
 * @returns {string | undefined} export name
 */
const getStaticPropertyName = (property) => {
	if (property.type === "SpreadElement" || property.computed) return;
	const key = property.key;
	/** @type {string | undefined} */
	let name;
	if (key.type === "Identifier") {
		name = key.name;
	} else if (key.type === "Literal" && typeof key.value === "string") {
		name = key.value;
	}
	return name === "__proto__" ? undefined : name;
};

/**
 * @param {Property} property property
 * @returns {CommonJsObjectExportKind} property kind
 */
const getObjectExportKind = (property) => {
	if (property.kind === "get" || property.kind === "set") return property.kind;
	if (property.method) {
		const { async, generator } = /** @type {FunctionExpression} */ (
			property.value
		);
		if (async) return generator ? "asyncGeneratorMethod" : "asyncMethod";
		return generator ? "generatorMethod" : "method";
	}
	return property.shorthand ? "shorthand" : "keyValue";
};

const PLUGIN_NAME = "CommonJsExportsParserPlugin";

class CommonJsExportsParserPlugin {
	/**
	 * Creates an instance of CommonJsExportsParserPlugin.
	 * @param {ModuleGraph} moduleGraph module graph
	 */
	constructor(moduleGraph) {
		/** @type {ModuleGraph} */
		this.moduleGraph = moduleGraph;
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		const enableStructuredExports = () => {
			DynamicExports.enable(parser.state);
		};

		/**
		 * Checks namespace.
		 * @param {boolean} topLevel true, when the export is on top level
		 * @param {Members} members members of the export
		 * @param {Expression | undefined} valueExpr expression for the value
		 * @returns {void}
		 */
		const checkNamespace = (topLevel, members, valueExpr) => {
			if (!DynamicExports.isEnabled(parser.state)) return;
			if (members.length > 0 && members[0] === "__esModule") {
				if (valueExpr && isTruthyLiteral(valueExpr) && topLevel) {
					DynamicExports.setFlagged(parser.state);
				} else {
					DynamicExports.setDynamic(parser.state);
				}
			}
		};
		/**
		 * Processes the provided reason.
		 * @param {string=} reason reason
		 */
		const bailout = (reason) => {
			DynamicExports.bailout(parser.state);
			if (reason) bailoutHint(reason);
		};
		/**
		 * Processes the provided reason.
		 * @param {string} reason reason
		 */
		const bailoutHint = (reason) => {
			this.moduleGraph
				.getOptimizationBailout(parser.state.module)
				.push(`CommonJS bailout: ${reason}`);
		};
		/** @type {unknown} */
		let keptAllExportsForState;
		/**
		 * An exported function accessing its own `this` may reach any export
		 * through it when called as a method of the exports object, so the
		 * whole exports object must be kept (#21178).
		 * @param {Node} valueExpr the exported value
		 * @param {CommonJSDependencyBaseKeywords} base commonjs base keywords
		 * @returns {void}
		 */
		const keepAllExportsOnThisAccess = (valueExpr, base) => {
			// One bailout per module is enough
			if (keptAllExportsForState === parser.state) return;
			const thisExpr = getThisAccessInExportedValue(parser, valueExpr);
			if (thisExpr === undefined) return;
			keptAllExportsForState = parser.state;
			bailoutHint(
				`this in exported function may access any export, so all exports are kept, at ${formatLocation(
					parser.getLocation(thisExpr)
				)}`
			);
			const dep = new CommonJsSelfReferenceDependency(
				/** @type {Range} */ (thisExpr.range),
				base,
				[],
				false
			);
			dep.loc = parser.getLocation(thisExpr);
			parser.state.module.addDependency(dep);
		};

		// metadata //
		parser.hooks.evaluateTypeof
			.for("module")
			.tap(PLUGIN_NAME, evaluateToString("object"));
		parser.hooks.evaluateTypeof
			.for("exports")
			.tap(PLUGIN_NAME, evaluateToString("object"));

		// exporting //

		/**
		 * Handle assign export.
		 * @param {AssignmentExpression} expr expression
		 * @param {CommonJSDependencyBaseKeywords} base commonjs base keywords
		 * @param {Members} members members of the export
		 * @returns {boolean | undefined} true, when the expression was handled
		 */
		const handleAssignExport = (expr, base, members) => {
			if (HarmonyExports.isEnabled(parser.state)) return;
			// Handle reexporting
			const requireCall = parseRequireCall(parser, expr.right);
			if (
				requireCall &&
				requireCall.argument.isString() &&
				(members.length === 0 || members[0] !== "__esModule")
			) {
				enableStructuredExports();
				// It's possible to reexport __esModule, so we must convert to a dynamic module
				if (members.length === 0) DynamicExports.setDynamic(parser.state);
				const dep = new CommonJsExportRequireDependency(
					/** @type {Range} */ (expr.range),
					null,
					base,
					members,
					/** @type {string} */ (requireCall.argument.string),
					requireCall.ids,
					!parser.isStatementLevelExpression(expr)
				);
				dep.loc = parser.getLocation(expr);
				dep.optional = Boolean(parser.scope.inTry);
				parser.state.module.addDependency(dep);
				/** @type {JavascriptModuleBuildMeta} */ (
					parser.state.module.buildMeta
				).treatAsCommonJs = true;

				return true;
			}
			// `module.exports = { … }` — properties are the module's named exports.
			if (members.length === 0) {
				return handleObjectLiteralExport(expr, base);
			}
			enableStructuredExports();
			const remainingMembers = members;
			checkNamespace(
				/** @type {StatementPath} */
				(parser.statementPath).length === 1 &&
					parser.isStatementLevelExpression(expr),
				remainingMembers,
				expr.right
			);
			const dep = new CommonJsExportsDependency(
				/** @type {Range} */ (expr.left.range),
				null,
				base,
				remainingMembers
			);
			dep.loc = parser.getLocation(expr);
			parser.state.module.addDependency(dep);
			/** @type {JavascriptModuleBuildMeta} */ (
				parser.state.module.buildMeta
			).treatAsCommonJs = true;
			keepAllExportsOnThisAccess(expr.right, base);
			parser.walkExpression(expr.right);
			return true;
		};
		/**
		 * Handle top-level `module.exports = { … }` object-literal exports.
		 * @param {AssignmentExpression} expr expression
		 * @param {CommonJSDependencyBaseKeywords} base commonjs base keywords
		 * @returns {boolean | undefined} true, when the expression was handled
		 */
		const handleObjectLiteralExport = (expr, base) => {
			// Only `module.exports = { … }` replaces the whole exports object.
			if (base !== "module.exports") return;
			if (
				/** @type {StatementPath} */ (parser.statementPath).length !== 1 ||
				!parser.isStatementLevelExpression(expr)
			) {
				return;
			}
			const object = expr.right;
			if (object.type !== "ObjectExpression") return;

			const module = parser.state.module;
			/** @type {JavascriptModuleBuildMeta} */ (
				module.buildMeta
			).treatAsCommonJs = true;
			// LHS stays as the text `module.exports` (moduleArgument is "module"
			// unless a top-level `module` binding shadows it, which prevents this hook).
			module.addPresentationalDependency(
				new RuntimeRequirementsDependency([RuntimeGlobals.module])
			);

			// one unknown key makes the whole object opaque, so name them all first
			/** @type {string[]} */
			const names = [];
			for (const property of object.properties) {
				const name = getStaticPropertyName(property);
				if (name === undefined) {
					bailout(
						`module.exports = {…} cannot be statically analysed at ${formatLocation(
							parser.getLocation(expr)
						)}`
					);
					parser.walkExpression(object);
					return true;
				}
				names.push(name);
			}

			enableStructuredExports();

			for (let i = 0; i < object.properties.length; i++) {
				const property = /** @type {Property} */ (object.properties[i]);
				const name = names[i];
				const value = /** @type {Expression} */ (property.value);
				const kind = getObjectExportKind(property);
				// a shorthand has no value text of its own to replace
				const valueRange = /** @type {Range} */ (
					kind === "shorthand" ? property.range : value.range
				);
				// scans the key/value gap, so `/*#__PURE__*/` is picked up here
				const pure =
					kind === "keyValue" &&
					parser.isPure(value, /** @type {Range} */ (property.key.range)[1]);

				if (name === "__esModule") {
					checkNamespace(true, ["__esModule"], value);
				}

				const dep = new CommonJsObjectExportDependency(
					/** @type {Range} */ (property.range),
					/** @type {Range} */ (property.key.range),
					valueRange,
					name,
					kind,
					pure
				);
				dep.loc = parser.getLocation(property);
				module.addDependency(dep);

				keepAllExportsOnThisAccess(value, base);
				// Tag nested requires so unused get/set/method can disconnect them.
				const start = FUNCTION_PROPERTY_DROP_HEAD.has(kind)
					? module.dependencies.length
					: -1;
				parser.walkExpression(value);
				if (start !== -1) {
					const usedByExports = new Set([name]);
					for (let j = start; j < module.dependencies.length; j++) {
						const nested = module.dependencies[j];
						if (
							nested instanceof CommonJsRequireDependency ||
							nested instanceof CommonJsFullRequireDependency
						) {
							nested.usedByExports = usedByExports;
						}
					}
				}
			}
			return true;
		};
		parser.hooks.assignMemberChain
			.for("exports")
			.tap(PLUGIN_NAME, (expr, members) =>
				handleAssignExport(expr, "exports", members)
			);
		parser.hooks.assignMemberChain
			.for("this")
			.tap(PLUGIN_NAME, (expr, members) => {
				if (!parser.scope.topLevelScope) return;
				return handleAssignExport(expr, "this", members);
			});
		parser.hooks.assignMemberChain
			.for("module")
			.tap(PLUGIN_NAME, (expr, members) => {
				if (members[0] !== "exports") return;
				return handleAssignExport(expr, "module.exports", members.slice(1));
			});
		parser.hooks.call
			.for("Object.defineProperty")
			.tap(PLUGIN_NAME, (expression) => {
				const expr = /** @type {CallExpression} */ (expression);
				if (!parser.isStatementLevelExpression(expr)) return;
				if (expr.arguments.length !== 3) return;
				if (expr.arguments[0].type === "SpreadElement") return;
				if (expr.arguments[1].type === "SpreadElement") return;
				if (expr.arguments[2].type === "SpreadElement") return;
				const exportsArg = parser.evaluateExpression(expr.arguments[0]);
				if (!exportsArg.isIdentifier()) return;
				if (
					exportsArg.identifier !== "exports" &&
					exportsArg.identifier !== "module.exports" &&
					(exportsArg.identifier !== "this" || !parser.scope.topLevelScope)
				) {
					return;
				}
				const propertyArg = parser.evaluateExpression(expr.arguments[1]);
				const property = propertyArg.asString();
				if (typeof property !== "string") return;
				enableStructuredExports();
				const descArg = expr.arguments[2];
				// Handle reexporting: `Object.defineProperty(exports, "x", { value: require("./y")[.z] })`
				// and the lazy getter form `{ get: () => require("./y")[.z] }`.
				if (property !== "__esModule") {
					const reexport = getReexportOfPropertyDescriptor(descArg);
					const requireCall =
						reexport && parseRequireCall(parser, reexport.expr);
					if (reexport && requireCall && requireCall.argument.isString()) {
						const dep = new CommonJsExportRequireDependency(
							/** @type {Range} */ (expr.range),
							/** @type {Range} */ (reexport.expr.range),
							`Object.defineProperty(${exportsArg.identifier})`,
							[property],
							/** @type {string} */ (requireCall.argument.string),
							requireCall.ids,
							false
						);
						dep.getter = reexport.getter;
						dep.loc = parser.getLocation(expr);
						dep.optional = Boolean(parser.scope.inTry);
						parser.state.module.addDependency(dep);
						/** @type {JavascriptModuleBuildMeta} */ (
							parser.state.module.buildMeta
						).treatAsCommonJs = true;

						return true;
					}
				}
				checkNamespace(
					/** @type {StatementPath} */
					(parser.statementPath).length === 1,
					[property],
					getValueOfPropertyDescription(descArg)
				);
				const dep = new CommonJsExportsDependency(
					/** @type {Range} */ (expr.range),
					/** @type {Range} */ (expr.arguments[2].range),
					`Object.defineProperty(${exportsArg.identifier})`,
					[property]
				);
				dep.loc = parser.getLocation(expr);
				parser.state.module.addDependency(dep);
				/** @type {JavascriptModuleBuildMeta} */ (
					parser.state.module.buildMeta
				).treatAsCommonJs = true;

				if (descArg.type === "ObjectExpression") {
					// `value`, `get` and `set` descriptor functions are all called
					// with the exports object as `this`
					for (const descProperty of descArg.properties) {
						if (descProperty.type === "SpreadElement") continue;
						keepAllExportsOnThisAccess(
							descProperty.value,
							/** @type {CommonJSDependencyBaseKeywords} */
							(exportsArg.identifier)
						);
					}
				}
				parser.walkExpression(expr.arguments[2]);
				return true;
			});

		// Self reference //

		/**
		 * Handle access export.
		 * @param {Expression | Super} expr expression
		 * @param {CommonJSDependencyBaseKeywords} base commonjs base keywords
		 * @param {Members} members members of the export
		 * @param {CallExpression=} call call expression
		 * @returns {boolean | void} true, when the expression was handled
		 */
		const handleAccessExport = (expr, base, members, call) => {
			if (HarmonyExports.isEnabled(parser.state)) return;
			if (members.length === 0) {
				bailout(
					`${base} is used directly at ${formatLocation(
						parser.getLocation(expr)
					)}`
				);
			}
			if (call && members.length === 1) {
				bailoutHint(
					`${base}${propertyAccess(
						members
					)}(...) prevents optimization as ${base} is passed as call context at ${formatLocation(
						parser.getLocation(expr)
					)}`
				);
			}
			const dep = new CommonJsSelfReferenceDependency(
				/** @type {Range} */ (expr.range),
				base,
				members,
				Boolean(call)
			);
			dep.loc = parser.getLocation(expr);
			parser.state.module.addDependency(dep);
			/** @type {JavascriptModuleBuildMeta} */ (
				parser.state.module.buildMeta
			).treatAsCommonJs = true;

			if (call) {
				parser.walkExpressions(call.arguments);
			}
			return true;
		};
		parser.hooks.callMemberChain
			.for("exports")
			.tap(PLUGIN_NAME, (expr, members) =>
				handleAccessExport(expr.callee, "exports", members, expr)
			);
		parser.hooks.expressionMemberChain
			.for("exports")
			.tap(PLUGIN_NAME, (expr, members) =>
				handleAccessExport(expr, "exports", members)
			);
		parser.hooks.expression
			.for("exports")
			.tap(PLUGIN_NAME, (expr) => handleAccessExport(expr, "exports", []));
		parser.hooks.callMemberChain
			.for("module")
			.tap(PLUGIN_NAME, (expr, members) => {
				if (members[0] !== "exports") return;
				return handleAccessExport(
					expr.callee,
					"module.exports",
					members.slice(1),
					expr
				);
			});
		parser.hooks.expressionMemberChain
			.for("module")
			.tap(PLUGIN_NAME, (expr, members) => {
				if (members[0] !== "exports") return;
				return handleAccessExport(expr, "module.exports", members.slice(1));
			});
		parser.hooks.expression
			.for("module.exports")
			.tap(PLUGIN_NAME, (expr) =>
				handleAccessExport(expr, "module.exports", [])
			);
		parser.hooks.callMemberChain
			.for("this")
			.tap(PLUGIN_NAME, (expr, members) => {
				if (!parser.scope.topLevelScope) return;
				return handleAccessExport(expr.callee, "this", members, expr);
			});
		parser.hooks.expressionMemberChain
			.for("this")
			.tap(PLUGIN_NAME, (expr, members) => {
				if (!parser.scope.topLevelScope) return;
				return handleAccessExport(expr, "this", members);
			});
		parser.hooks.expression.for("this").tap(PLUGIN_NAME, (expr) => {
			if (!parser.scope.topLevelScope) return;
			return handleAccessExport(expr, "this", []);
		});

		// Bailouts //
		parser.hooks.expression.for("module").tap(PLUGIN_NAME, (expr) => {
			const isHarmony = HarmonyExports.isEnabled(parser.state);
			// Silent under ESM, where `HarmonyExports` governs and nothing was lost.
			bailout(
				isHarmony
					? undefined
					: `module is used directly at ${formatLocation(
							parser.getLocation(expr)
						)}`
			);
			const dep = new ModuleDecoratorDependency(
				isHarmony
					? RuntimeGlobals.harmonyModuleDecorator
					: RuntimeGlobals.nodeModuleDecorator,
				!isHarmony
			);
			dep.loc = parser.getLocation(expr);
			parser.state.module.addDependency(dep);
			return true;
		});
	}
}

module.exports = CommonJsExportsParserPlugin;
