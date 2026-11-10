/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const isDependencyKind = require("../../graph/isDependencyKind");
const {
	evaluateToStringByPath
} = require("../../javascript/JavascriptParserHelpers");
const {
	Field,
	Flag,
	NodeType,
	Part
} = require("../../javascript/syntax-parser");
const RuntimeGlobals = require("../../runtime/RuntimeGlobals");
const { recordOptimizationBailout } = require("../../util/buildDiagnostics");
const formatLocation = require("../../util/formatLocation");
const memoize = require("../../util/memoize");
const { propertyAccess } = require("../../util/property");

const RuntimeRequirementsDependency = require("../core/RuntimeRequirementsDependency");
const ESMExports = require("../esm/ESMExports");
const DynamicExports = require("../helpers/DynamicExports");
const CommonJsExportRequireDependency = require("./CommonJsExportRequireDependency");
const CommonJsExportsDependency = require("./CommonJsExportsDependency");
const CommonJsObjectExportDependency = require("./CommonJsObjectExportDependency");
const CommonJsSelfReferenceDependency = require("./CommonJsSelfReferenceDependency");
const ModuleDecoratorDependency = require("./ModuleDecoratorDependency");

const getRequireBindingTag = memoize(
	() => require("./CommonJsImportsParserPlugin").REQUIRE_BINDING_TAG
);

const FUNCTION_PROPERTY_DROP_HEAD =
	CommonJsObjectExportDependency.FUNCTION_PROPERTY_DROP_HEAD;

/**
 * @import {
 * 	FunctionExpression,
 * 	MemberExpression,
 * 	ObjectExpression,
 * 	SpreadElement,
 * 	Super
 * } from "estree"
 */
/**
 * @import {
 * 	JavascriptParserOptions
 * } from "../../../declarations/WebpackOptions"
 */
/** @import CommonJsRequireDependency from "./CommonJsRequireDependency" */
/** @import { ExportInfoName } from "../../graph/Dependency" */

/**
 * @import JavascriptParser, {
 * 	JavascriptNodeReader,
 * 	Range,
 * 	Members,
 * 	MembersOptionals
 * } from "../../javascript/JavascriptParser"
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
/** @import { RequireBindingData } from "./CommonJsImportsParserPlugin" */

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
 * @param {JavascriptNodeReader} path the reader of its nodes
 * @param {number} expr expression
 * @returns {number} the value of the property descriptor, `0` for none
 */
const getValueOfPropertyDescriptionNode = (path, expr) => {
	if (path.type(expr) !== NodeType.ObjectExpression) return 0;
	const count = path.fieldCount(Field.properties, expr);
	for (let i = 0; i < count; i++) {
		const property = path.field(i, Field.properties, expr);
		if (
			path.type(property) === NodeType.SpreadElement ||
			path.flag(Flag.computed, property)
		) {
			continue;
		}
		const key = path.field(0, Field.key, property);
		if (path.type(key) !== NodeType.Identifier || path.name(key) !== "value") {
			continue;
		}
		return path.field(0, Field.value, property);
	}
	return 0;
};

const DESCRIPTOR_ATTRIBUTES = new Set([
	"enumerable",
	"configurable",
	"writable"
]);

/**
 * Whether an attribute value names no binding, like `true` or a minifier's `!0`.
 * @param {JavascriptNodeReader} path the reader of its nodes
 * @param {number} expr attribute value
 * @returns {boolean} true, when the value is a literal, possibly under a unary operator
 */
const isConstantAttributeNode = (path, expr) => {
	const type = path.type(expr);
	return (
		type === NodeType.Literal ||
		(type === NodeType.UnaryExpression &&
			path.type(path.field(0, Field.argument, expr)) === NodeType.Literal)
	);
};

/**
 * Extracts the re-exportable expression from a property descriptor, handling
 * both the eager `{ value: <expr> }` form and the lazy
 * `{ get: () => <expr> }` / `{ get() { return <expr>; } }` accessor form used
 * by barrel files (e.g. webpack's own `lib/index.js`). Any other property must
 * be a literal attribute, since the descriptor is kept as written but not walked.
 * @param {JavascriptNodeReader} path the reader of its nodes
 * @param {number} expr property descriptor expression
 * @returns {{ expr: number, getter: boolean } | undefined} the value expression and whether it is a lazy getter
 */
const getReexportOfPropertyDescriptorNode = (path, expr) => {
	if (path.type(expr) !== NodeType.ObjectExpression) return;
	let valueExpr = 0;
	let getFn = 0;
	const count = path.fieldCount(Field.properties, expr);
	for (let i = 0; i < count; i++) {
		const property = path.field(i, Field.properties, expr);
		if (
			path.type(property) === NodeType.SpreadElement ||
			path.flag(Flag.computed, property)
		) {
			return;
		}
		const key = path.field(0, Field.key, property);
		if (path.type(key) !== NodeType.Identifier) return;
		const name = path.name(key);
		const value = path.field(0, Field.value, property);
		if (name === "value") {
			valueExpr = value;
		} else if (name === "get") {
			getFn = value;
		} else if (
			!DESCRIPTOR_ATTRIBUTES.has(name) ||
			!isConstantAttributeNode(path, value)
		) {
			// a setter, an unknown key or a computed attribute: not a plain re-export
			return;
		}
	}
	if (valueExpr !== 0) return { expr: valueExpr, getter: false };
	if (getFn === 0) return;
	const type = path.type(getFn);
	if (
		type !== NodeType.FunctionExpression &&
		type !== NodeType.ArrowFunctionExpression
	) {
		return;
	}
	// A parameter or the function's own name would shadow a `const` binding the body names.
	if (path.fieldCount(Field.params, getFn) > 0) return;
	if (
		type === NodeType.FunctionExpression &&
		path.field(0, Field.id, getFn) !== 0
	) {
		return;
	}
	// An async or generator getter returns a wrapper, not the re-exported value.
	if (path.flag(Flag.async, getFn) || path.flag(Flag.generator, getFn)) return;
	const body = path.field(0, Field.body, getFn);
	// Arrow with expression body: `() => require("./x")`.
	if (path.type(body) !== NodeType.BlockStatement) {
		return { expr: body, getter: true };
	}
	// Function body must be exactly `return <expr>;`.
	if (path.fieldCount(Field.body, body) !== 1) return;
	const statement = path.field(0, Field.body, body);
	if (path.type(statement) !== NodeType.ReturnStatement) return;
	const argument = path.field(0, Field.argument, statement);
	if (argument !== 0) return { expr: argument, getter: true };
};

/**
 * The purpose of this function is to check whether an expression is a truthy literal or not. This is
 * useful when parsing CommonJS exports, because CommonJS modules can export any value, including falsy
 * values like `null` and `false`. However, exports should only be created if the exported value is truthy.
 * @param {JavascriptNodeReader} path the reader of its nodes
 * @param {number} expr expression being checked, `0` for none
 * @returns {boolean} true, when the expression is a truthy literal
 */
const isTruthyLiteralNode = (path, expr) => {
	if (expr === 0) return false;
	switch (path.type(expr)) {
		case NodeType.Literal:
			return Boolean(path.value(expr));
		case NodeType.UnaryExpression:
			if (path.textOf(Part.operator, expr) === "!") {
				return isFalsyLiteralNode(path, path.field(0, Field.argument, expr));
			}
	}
	return false;
};

/**
 * The purpose of this function is to check whether an expression is a falsy literal or not. This is
 * useful when parsing CommonJS exports, because CommonJS modules can export any value, including falsy
 * values like `null` and `false`. However, exports should only be created if the exported value is truthy.
 * @param {JavascriptNodeReader} path the reader of its nodes
 * @param {number} expr expression being checked
 * @returns {boolean} true, when the expression is a falsy literal
 */
const isFalsyLiteralNode = (path, expr) => {
	switch (path.type(expr)) {
		case NodeType.Literal:
			return !path.value(expr);
		case NodeType.UnaryExpression:
			if (path.textOf(Part.operator, expr) === "!") {
				return isTruthyLiteralNode(path, path.field(0, Field.argument, expr));
			}
	}
	return false;
};

/**
 * `parseRequireCall` for an expression read by id.
 * @param {JavascriptParser} parser the parser
 * @param {JavascriptNodeReader} path the reader of its nodes
 * @param {number} expr expression
 * @returns {{ request: string, ids: ExportInfoName[], binding?: { range: Range, dep: CommonJsRequireDependency } } | undefined} parsed call, with the binding it reads
 */
const parseRequireCallNode = (parser, path, expr) => {
	/** @type {ExportInfoName[]} */
	const ids = [];
	while (path.type(expr) === NodeType.MemberExpression) {
		const object = path.field(0, Field.object, expr);
		if (path.type(object) === NodeType.Super) return;
		const prop = path.field(0, Field.property, expr);
		if (prop === 0) return;
		if (path.flag(Flag.computed, expr)) {
			if (path.type(prop) !== NodeType.Literal) return;
			ids.push(`${path.value(prop)}`);
		} else {
			if (path.type(prop) !== NodeType.Identifier) return;
			ids.push(path.name(prop));
		}
		expr = object;
	}
	const type = path.type(expr);
	if (type === NodeType.Identifier) {
		const binding =
			/** @type {RequireBindingData | undefined} */
			(parser.getTagData(path.name(expr), getRequireBindingTag()));
		// No dependency: `webpackIgnore`, a local module, or not walked yet.
		if (!binding || !binding.dep) return;
		return {
			request: binding.request,
			ids: ids.reverse(),
			binding: { range: path.range(expr), dep: binding.dep }
		};
	}
	if (
		type !== NodeType.CallExpression ||
		path.fieldCount(Field.arguments, expr) !== 1
	) {
		return;
	}
	const callee = path.field(0, Field.callee, expr);
	if (
		path.type(callee) !== NodeType.Identifier ||
		parser.getVariableInfo(path.name(callee)) !== "require"
	) {
		return;
	}
	const arg = path.field(0, Field.arguments, expr);
	if (path.type(arg) === NodeType.SpreadElement) return;
	const argValue = parser.evaluateExpression(parser.nodeOfPath(path, arg));
	if (!argValue.isString()) return;
	return {
		request: /** @type {string} */ (argValue.string),
		ids: ids.reverse()
	};
};

/**
 * Searches for a `this` belonging to a function's own `this`-scope.
 * Descends into arrow functions, but not into nested functions, static blocks
 * and class field values, which have their own `this`. Class method bodies are
 * function expressions and are skipped by the same rule, while computed keys
 * and `extends` clauses evaluate in the outer scope and are searched. The
 * `this`-scope boundary is enforced when a node is popped, so the generic
 * branch may push any child without crossing it.
 * @param {JavascriptNodeReader} path the reader of its nodes
 * @param {number} fn the function
 * @returns {number} the first own `this` expression, `0` for none
 */
const findOwnThisNode = (path, fn) => {
	// the body is popped first, so its `this` wins over a default parameter's
	/** @type {number[]} */
	const stack = [];
	const count = path.fieldCount(Field.params, fn);
	for (let i = 0; i < count; i++) stack.push(path.field(i, Field.params, fn));
	stack.push(path.field(0, Field.body, fn));
	let node;
	while ((node = stack.pop()) !== undefined) {
		switch (path.type(node)) {
			case NodeType.ThisExpression:
				return node;
			case NodeType.FunctionExpression:
			case NodeType.FunctionDeclaration:
			case NodeType.StaticBlock:
				break;
			case NodeType.PropertyDefinition:
				if (path.flag(Flag.computed, node)) {
					stack.push(path.field(0, Field.key, node));
				}
				break;
			default:
				path.pushChildren(node, stack);
		}
	}
	return 0;
};

/**
 * Returns the export name an object-literal property contributes, or
 * `undefined` when it cannot contribute one: a spread, a computed or
 * non-string key is unknown at compile time, and `__proto__` sets
 * [[Prototype]] instead of an own property.
 * @param {JavascriptNodeReader} path the reader of its nodes
 * @param {number} property property
 * @returns {string | undefined} export name
 */
const getStaticPropertyNameNode = (path, property) => {
	if (
		path.type(property) === NodeType.SpreadElement ||
		path.flag(Flag.computed, property)
	) {
		return;
	}
	const key = path.field(0, Field.key, property);
	/** @type {string | undefined} */
	let name;
	const type = path.type(key);
	if (type === NodeType.Identifier) {
		name = path.name(key);
	} else if (type === NodeType.Literal) {
		const value = path.value(key);
		if (typeof value === "string") name = value;
	}
	return name === "__proto__" ? undefined : name;
};

/**
 * The kind of an object-literal property's export, read by id.
 * @param {JavascriptNodeReader} path the reader of its nodes
 * @param {number} property property
 * @returns {CommonJsObjectExportKind} kind
 */
const getObjectExportKindNode = (path, property) => {
	const kind = path.textOf(Part.kind, property);
	if (kind === "get" || kind === "set") return kind;
	if (path.flag(Flag.method, property)) {
		const value = path.field(0, Field.value, property);
		const async = path.flag(Flag.async, value);
		const generator = path.flag(Flag.generator, value);
		if (async) return generator ? "asyncGeneratorMethod" : "asyncMethod";
		return generator ? "generatorMethod" : "method";
	}
	return path.flag(Flag.shorthand, property) ? "shorthand" : "keyValue";
};

const PLUGIN_NAME = "CommonJsExportsParserPlugin";

class CommonJsExportsParserPlugin {
	/**
	 * Creates an instance of CommonJsExportsParserPlugin.
	 * @param {JavascriptParserOptions["topLevelThis"]} topLevelThis what top-level `this` refers to
	 */
	constructor(topLevelThis) {
		/** @type {boolean} */
		this.thisAsExports = topLevelThis !== "global";
	}

	/**
	 * Applies the plugin by registering its hooks on the compiler.
	 * @param {JavascriptParser} parser the parser
	 * @returns {void}
	 */
	apply(parser) {
		const { thisAsExports } = this;
		const enableStructuredExports = () => {
			DynamicExports.enable(parser.state);
		};

		/**
		 * Checks namespace.
		 * @param {boolean} topLevel true, when the export is on top level
		 * @param {Members} members members of the export
		 * @param {boolean} truthy true, when the value is a truthy literal
		 * @returns {void}
		 */
		const checkNamespace = (topLevel, members, truthy) => {
			if (!DynamicExports.isEnabled(parser.state)) return;
			if (members.length > 0 && members[0] === "__esModule") {
				if (truthy && topLevel) {
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
			recordOptimizationBailout(
				parser.state.module.buildInfo,
				`CommonJS bailout: ${reason}`
			);
		};
		/** @type {JavascriptParser["state"] | undefined} */
		let keptAllExportsForState;
		/**
		 * An exported function accessing its own `this` may reach any export
		 * through it when called as a method of the exports object, so the
		 * whole exports object must be kept (#21178).
		 * @param {JavascriptNodeReader} path the path the tap got
		 * @param {number} value the exported value
		 * @param {CommonJSDependencyBaseKeywords} base commonjs base keywords
		 * @returns {void}
		 */
		const keepAllExportsOnThisAccessNode = (path, value, base) => {
			// One bailout per module is enough
			if (keptAllExportsForState === parser.state) return;
			// scanning the body of every exported function is expensive and most of
			// them never mention `this`, so filter on the source text first
			if (
				path.type(value) !== NodeType.FunctionExpression ||
				!parser.sourceMayContainIdentifier(path.range(value), "this")
			) {
				return;
			}
			const thisNode = findOwnThisNode(path, value);
			if (thisNode === 0) return;
			keptAllExportsForState = parser.state;
			const loc = parser.getLocation(parser.nodeOfPath(path, thisNode));
			bailoutHint(
				`this in exported function may access any export, so all exports are kept, at ${formatLocation(
					loc
				)}`
			);
			const dep = new CommonJsSelfReferenceDependency(
				path.range(thisNode),
				base,
				[],
				false
			);
			dep.loc = loc;
			parser.state.module.addDependency(dep);
		};

		// metadata //
		parser.hooks.evaluateTypeof
			.for("module")
			.tap({ name: PLUGIN_NAME, path: true }, evaluateToStringByPath("object"));
		parser.hooks.evaluateTypeof
			.for("exports")
			.tap({ name: PLUGIN_NAME, path: true }, evaluateToStringByPath("object"));

		// exporting //

		/**
		 * Handle assign export, read by id.
		 * @param {JavascriptNodeReader} path the path the tap got
		 * @param {number} expr the assignment
		 * @param {CommonJSDependencyBaseKeywords} base commonjs base keywords
		 * @param {Members} members members of the export
		 * @returns {boolean | undefined} true, when the expression was handled
		 */
		const handleAssignExport = (path, expr, base, members) => {
			if (ESMExports.isEnabled(parser.state)) return;
			const right = path.field(0, Field.right, expr);
			const node = parser.nodeOfPath(path, expr);
			// Handle reexporting; `+=` and the like combine with the current value
			const requireCall =
				path.textOf(Part.operator, expr) === "="
					? parseRequireCallNode(parser, path, right)
					: undefined;
			if (
				requireCall &&
				(members.length === 0 || members[0] !== "__esModule")
			) {
				enableStructuredExports();
				// It's possible to reexport __esModule, so we must convert to a dynamic module
				if (members.length === 0) DynamicExports.setDynamic(parser.state);
				const range = path.range(expr);
				const dep = new CommonJsExportRequireDependency(
					range,
					null,
					base,
					members,
					requireCall.request,
					requireCall.ids,
					!parser.isStatementLevelExpression(node)
				);
				if (requireCall.binding) {
					dep.bindingRange = requireCall.binding.range;
					dep.bindingDependency = requireCall.binding.dep;
				}
				dep.asiSafe = !parser.isAsiPosition(range[0]);
				dep.loc = parser.getLocation(node);
				dep.optional = Boolean(parser.scope.inTry);
				parser.state.module.addDependency(dep);
				parser.state.module.buildMeta.treatAsCommonJs = true;

				return true;
			}
			// `module.exports = { … }` — properties are the module's named exports.
			if (members.length === 0) {
				// Only `module.exports = { … }` replaces the whole exports object.
				if (
					base !== "module.exports" ||
					path.type(right) !== NodeType.ObjectExpression
				) {
					return;
				}
				return handleObjectLiteralExportNode(path, expr);
			}
			enableStructuredExports();
			const remainingMembers = members;
			checkNamespace(
				parser.statementDepth === 1 && parser.isStatementLevelExpression(node),
				remainingMembers,
				remainingMembers[0] === "__esModule" && isTruthyLiteralNode(path, right)
			);
			const dep = new CommonJsExportsDependency(
				path.range(path.field(0, Field.left, expr)),
				null,
				base,
				remainingMembers
			);
			dep.loc = parser.getLocation(node);
			parser.state.module.addDependency(dep);
			parser.state.module.buildMeta.treatAsCommonJs = true;
			keepAllExportsOnThisAccessNode(path, right, base);
			parser.walkExpression(parser.nodeOfPath(path, right));
			return true;
		};
		/**
		 * `handleObjectLiteralExport` for `module.exports = { … }`, read by id.
		 * @param {JavascriptNodeReader} path the path the tap got
		 * @param {number} expr the assignment
		 * @returns {boolean | undefined} true, when the expression was handled
		 */
		const handleObjectLiteralExportNode = (path, expr) => {
			if (
				parser.statementDepth !== 1 ||
				!parser.isStatementLevelExpression(parser.nodeOfPath(path, expr))
			) {
				return;
			}
			const object = path.field(0, Field.right, expr);

			const module = parser.state.module;
			module.buildMeta.treatAsCommonJs = true;
			// LHS stays as the text `module.exports` (moduleArgument is "module"
			// unless a top-level `module` binding shadows it, which prevents this hook).
			module.addPresentationalDependency(
				new RuntimeRequirementsDependency([RuntimeGlobals.module])
			);

			// one unknown key makes the whole object opaque, so name them all first
			const count = path.fieldCount(Field.properties, object);
			/** @type {string[]} */
			const names = [];
			for (let i = 0; i < count; i++) {
				const name = getStaticPropertyNameNode(
					path,
					path.field(i, Field.properties, object)
				);
				if (name === undefined) {
					bailout(
						`module.exports = {…} cannot be statically analysed at ${formatLocation(
							parser.getLocation(parser.nodeOfPath(path, expr))
						)}`
					);
					parser.walkExpression(parser.nodeOfPath(path, object));
					return true;
				}
				names.push(name);
			}

			enableStructuredExports();

			for (let i = 0; i < count; i++) {
				const property = path.field(i, Field.properties, object);
				const name = names[i];
				const value = path.field(0, Field.value, property);
				const key = path.field(0, Field.key, property);
				const kind = getObjectExportKindNode(path, property);
				// a shorthand has no value text of its own to replace
				const valueRange = path.range(kind === "shorthand" ? property : value);
				// scans the key/value gap, so `/*#__PURE__*/` is picked up here
				const pure =
					kind === "keyValue" &&
					parser.isPure(parser.nodeOfPath(path, value), path.end(key));

				if (name === "__esModule") {
					checkNamespace(
						true,
						["__esModule"],
						isTruthyLiteralNode(path, value)
					);
				}

				const dep = new CommonJsObjectExportDependency(
					path.range(property),
					path.range(key),
					valueRange,
					name,
					kind,
					pure
				);
				dep.loc = parser.getLocation(parser.nodeOfPath(path, property));
				module.addDependency(dep);

				keepAllExportsOnThisAccessNode(path, value, "module.exports");
				// Tag nested requires so unused get/set/method can disconnect them.
				const start = FUNCTION_PROPERTY_DROP_HEAD.has(kind)
					? module.dependencies.length
					: -1;
				parser.walkExpression(parser.nodeOfPath(path, value));
				if (start !== -1) {
					const usedByExports = new Set([name]);
					for (let j = start; j < module.dependencies.length; j++) {
						const nested = module.dependencies[j];
						if (isDependencyKind(nested, "commonjs-require")) {
							nested.usedByExports = usedByExports;
						}
					}
				}
			}
			return true;
		};
		// every `exports.…` write reaches this tap, so it reads ids
		parser.hooks.assignMemberChain
			.for("exports")
			.tap({ name: PLUGIN_NAME, path: true }, (path, expr, members) =>
				handleAssignExport(path, expr, "exports", members)
			);
		if (thisAsExports) {
			parser.hooks.assignMemberChain
				.for("this")
				// `this` in any function reaches these taps, so they read the node
				// only at the top level, where it is the exports object
				.tap({ name: PLUGIN_NAME, path: true }, (path, expr, members) => {
					if (!parser.scope.topLevelScope) return;
					return handleAssignExport(path, expr, "this", members);
				});
		}
		// every `module.…` write reaches this tap, so it reads ids
		parser.hooks.assignMemberChain
			.for("module")
			.tap({ name: PLUGIN_NAME, path: true }, (path, node, members) => {
				if (members[0] !== "exports") return;
				return handleAssignExport(
					path,
					node,
					"module.exports",
					members.slice(1)
				);
			});
		// every `Object.defineProperty(…)` reaches this tap, so it reads ids until
		// the first argument evaluates to the exports object
		parser.hooks.call
			.for("Object.defineProperty")
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
				if (path.fieldCount(Field.arguments, node) !== 3) return;
				for (let i = 0; i < 3; i++) {
					const arg = path.field(i, Field.arguments, node);
					if (path.type(arg) === NodeType.SpreadElement) return;
				}
				if (!parser.isStatementLevelExpression(parser.nodeOfPath(path, node))) {
					return;
				}
				const exportsArg = parser.evaluateExpression(
					parser.nodeOfPath(path, path.field(0, Field.arguments, node))
				);
				if (!exportsArg.isIdentifier()) return;
				if (
					exportsArg.identifier !== "exports" &&
					exportsArg.identifier !== "module.exports" &&
					(exportsArg.identifier !== "this" ||
						!thisAsExports ||
						!parser.scope.topLevelScope)
				) {
					return;
				}
				const propertyArg = parser.evaluateExpression(
					parser.nodeOfPath(path, path.field(1, Field.arguments, node))
				);
				const property = propertyArg.asString();
				if (typeof property !== "string") return;
				enableStructuredExports();
				const descArg = path.field(2, Field.arguments, node);
				const range = path.range(node);
				// Handle reexporting: `Object.defineProperty(exports, "x", { value: require("./y")[.z] })`
				// and the lazy getter form `{ get: () => require("./y")[.z] }`.
				if (property !== "__esModule") {
					const reexport = getReexportOfPropertyDescriptorNode(path, descArg);
					const requireCall =
						reexport && parseRequireCallNode(parser, path, reexport.expr);
					if (reexport && requireCall) {
						const dep = new CommonJsExportRequireDependency(
							range,
							path.range(reexport.expr),
							`Object.defineProperty(${exportsArg.identifier})`,
							[property],
							requireCall.request,
							requireCall.ids,
							false
						);
						dep.getter = reexport.getter;
						dep.descriptorStart = path.start(descArg);
						if (requireCall.binding) {
							dep.bindingRange = requireCall.binding.range;
							dep.bindingDependency = requireCall.binding.dep;
						}
						dep.asiSafe = !parser.isAsiPosition(range[0]);
						dep.loc = parser.getLocation(parser.nodeOfPath(path, node));
						dep.optional = Boolean(parser.scope.inTry);
						parser.state.module.addDependency(dep);
						parser.state.module.buildMeta.treatAsCommonJs = true;

						return true;
					}
				}
				checkNamespace(
					parser.statementDepth === 1,
					[property],
					isTruthyLiteralNode(
						path,
						getValueOfPropertyDescriptionNode(path, descArg)
					)
				);
				const dep = new CommonJsExportsDependency(
					range,
					path.range(descArg),
					`Object.defineProperty(${exportsArg.identifier})`,
					[property]
				);
				dep.loc = parser.getLocation(parser.nodeOfPath(path, node));
				parser.state.module.addDependency(dep);
				parser.state.module.buildMeta.treatAsCommonJs = true;

				if (path.type(descArg) === NodeType.ObjectExpression) {
					// `value`, `get` and `set` descriptor functions are all called
					// with the exports object as `this`
					const count = path.fieldCount(Field.properties, descArg);
					for (let i = 0; i < count; i++) {
						const descProperty = path.field(i, Field.properties, descArg);
						if (path.type(descProperty) === NodeType.SpreadElement) continue;
						keepAllExportsOnThisAccessNode(
							path,
							path.field(0, Field.value, descProperty),
							/** @type {CommonJSDependencyBaseKeywords} */
							(exportsArg.identifier)
						);
					}
				}
				parser.walkExpression(parser.nodeOfPath(path, descArg));
				return true;
			});

		// Self reference //

		/**
		 * Handle access export, read by id.
		 * @param {JavascriptNodeReader} path the path the tap got
		 * @param {number} expr expression
		 * @param {CommonJSDependencyBaseKeywords} base commonjs base keywords
		 * @param {Members} members members of the export
		 * @param {MembersOptionals=} membersOptionals optional members of the export
		 * @param {number=} call the call, `0` for none
		 * @returns {boolean | void} true, when the expression was handled
		 */
		const handleAccessExport = (
			path,
			expr,
			base,
			members,
			membersOptionals,
			call = 0
		) => {
			if (ESMExports.isEnabled(parser.state)) return;
			const optionalMember = membersOptionals
				? membersOptionals.indexOf(true)
				: -1;
			if (optionalMember >= 0) {
				// Keep the optional suffix in the source; only its prefix is renamed.
				if (path.type(expr) === NodeType.ChainExpression) {
					expr = path.field(0, Field.expression, expr);
				}
				for (let i = members.length; i > optionalMember; i--) {
					expr = path.field(0, Field.object, expr);
				}
				members = members.slice(0, optionalMember);
			}
			const isCall = call !== 0 && optionalMember < 0;
			const node = parser.nodeOfPath(path, expr);
			if (members.length === 0) {
				bailout(
					`${base} is used directly at ${formatLocation(
						parser.getLocation(node)
					)}`
				);
			}
			if (isCall && members.length === 1) {
				bailoutHint(
					`${base}${propertyAccess(
						members
					)}(...) prevents optimization as ${base} is passed as call context at ${formatLocation(
						parser.getLocation(node)
					)}`
				);
			}
			const dep = new CommonJsSelfReferenceDependency(
				path.range(expr),
				base,
				members,
				isCall
			);
			dep.loc = parser.getLocation(node);
			parser.state.module.addDependency(dep);
			parser.state.module.buildMeta.treatAsCommonJs = true;

			if (call !== 0) {
				const count = path.fieldCount(Field.arguments, call);
				for (let i = 0; i < count; i++) {
					parser.walkExpression(
						parser.nodeOfPath(path, path.field(i, Field.arguments, call))
					);
				}
			}
			return true;
		};
		// every read of the exports object reaches these taps, so they read ids
		parser.hooks.callMemberChain
			.for("exports")
			.tap(
				{ name: PLUGIN_NAME, path: true },
				(path, node, members, membersOptionals) =>
					handleAccessExport(
						path,
						path.field(0, Field.callee, node),
						"exports",
						members,
						membersOptionals,
						node
					)
			);
		parser.hooks.expressionMemberChain
			.for("exports")
			.tap(
				{ name: PLUGIN_NAME, path: true },
				(path, node, members, membersOptionals) =>
					handleAccessExport(path, node, "exports", members, membersOptionals)
			);
		parser.hooks.expression
			.for("exports")
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) =>
				handleAccessExport(path, node, "exports", [])
			);
		parser.hooks.callMemberChain
			.for("module")
			.tap(
				{ name: PLUGIN_NAME, path: true },
				(path, node, members, membersOptionals) => {
					if (members[0] !== "exports") return;
					return handleAccessExport(
						path,
						path.field(0, Field.callee, node),
						"module.exports",
						members.slice(1),
						membersOptionals.slice(1),
						node
					);
				}
			);
		parser.hooks.expressionMemberChain
			.for("module")
			.tap(
				{ name: PLUGIN_NAME, path: true },
				(path, node, members, membersOptionals) => {
					if (members[0] !== "exports") return;
					return handleAccessExport(
						path,
						node,
						"module.exports",
						members.slice(1),
						membersOptionals.slice(1)
					);
				}
			);
		parser.hooks.expression
			.for("module.exports")
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) =>
				handleAccessExport(path, node, "module.exports", [])
			);
		if (thisAsExports) {
			parser.hooks.callMemberChain
				.for("this")
				.tap(
					{ name: PLUGIN_NAME, path: true },
					(path, node, members, membersOptionals) => {
						if (!parser.scope.topLevelScope) return;
						return handleAccessExport(
							path,
							path.field(0, Field.callee, node),
							"this",
							members,
							membersOptionals,
							node
						);
					}
				);
			parser.hooks.expressionMemberChain
				.for("this")
				.tap(
					{ name: PLUGIN_NAME, path: true },
					(path, node, members, membersOptionals) => {
						if (!parser.scope.topLevelScope) return;
						return handleAccessExport(
							path,
							node,
							"this",
							members,
							membersOptionals
						);
					}
				);
			parser.hooks.expression
				.for("this")
				.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
					if (!parser.scope.topLevelScope) return;
					return handleAccessExport(path, node, "this", []);
				});
		}

		// Bailouts //
		parser.hooks.expression
			.for("module")
			.tap({ name: PLUGIN_NAME, path: true }, (path, node) => {
				const expr = parser.nodeOfPath(path, node);
				const isHarmony = ESMExports.isEnabled(parser.state);
				// Silent under ESM, where `ESMExports` governs and nothing was lost.
				bailout(
					isHarmony
						? undefined
						: `module is used directly at ${formatLocation(
								parser.getLocation(expr)
							)}`
				);
				const dep = new ModuleDecoratorDependency(
					isHarmony
						? RuntimeGlobals.esmModuleDecorator
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
