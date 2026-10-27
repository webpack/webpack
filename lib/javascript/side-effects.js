/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Alexander Akait @alexander-akait
*/

"use strict";

const { Field, Flag, NodeType, Part } = require("./syntax-parser");

/** @typedef {Pick<import("./syntax-parser").SyntaxTree, "type" | "field" | "fieldCount" | "flag" | "textOf" | "value" | "name">} SyntaxReader */
/** @typedef {import("./syntax-printer").CompressOptions} CompressOptions */
/** @typedef {import("./syntax-printer").NativeCondition} NativeCondition */
/** @typedef {import("./syntax-printer").NativeName} NativeName */

/**
 * What a query asks of its caller: what a name's read does, which calls a
 * `#__PURE__` annotation marks.
 * @typedef {object} SideEffectsContext
 * @property {(node: number, typeofRead: boolean) => boolean} readHasSideEffects whether reading a name may throw or run code, `typeofRead` where `typeof` reads it
 * @property {(node: number) => boolean} readsGlobalMember whether a property of a name reads without running anything: a known global's
 * @property {(node: number) => PrimitiveKind | undefined} nameKind what a name's value converts as, undefined where it is not known
 * @property {(node: number) => boolean} isPureCall whether a call or `new` is marked pure, only its arguments then running code
 * @property {boolean=} pureConversions whether converting a value to a primitive is taken to run no code, as webpack's `isPure` takes it
 * @property {((node: number) => boolean | undefined)=} decides what the caller answers for a node before the rules read it, undefined to leave it to them
 */

/**
 * terser's `sloppy && es >= N && ...` chain: the first falsy condition's value,
 * or `true` when every condition holds.
 * @param {NativeCondition[]} conditions what the entry is gated on, in order
 * @param {CompressOptions["unsafe"]} sloppy the compressor's `unsafe` option, as given
 * @param {CompressOptions["builtins_ecma"]} es the compressor's `builtins_ecma` option, as given
 * @returns {boolean} `true`, or the falsy value the chain stops at
 */
const evaluateNativeConditions = (conditions, sloppy, es) => {
	for (const condition of conditions) {
		const value = condition === "sloppy" ? sloppy : es >= condition;
		if (!value) return value;
	}
	return true;
};

/**
 * The set terser's `makePredicate(remove_false([...]))` builds from a list.
 * @param {NativeName[]} names the list, with its conditions
 * @param {CompressOptions["unsafe"]} sloppy the compressor's `unsafe` option, as given
 * @param {CompressOptions["builtins_ecma"]} es the compressor's `builtins_ecma` option, as given
 * @returns {Set<PropertyKey>} each name whose conditions hold
 */
const selectNativeNames = (names, sloppy, es) => {
	/** @type {Set<PropertyKey>} */
	const selected = new Set();
	for (const entry of names) {
		if (typeof entry === "string") {
			selected.add(entry);
			continue;
		}
		const value = evaluateNativeConditions(entry.when, sloppy, es);
		// A falsy `unsafe` other than `false` survives `remove_false`, as in terser.
		if (value === true) selected.add(entry.name);
		else if (value !== false) selected.add(value);
	}
	return selected;
};

// The annotation marking a call or `new` pure, as terser's parser reads it.
const PURE_ANNOTATION = /[@#]__PURE__/;

// The nodes whose evaluation runs nothing whatever they hold, by ESTree type.
const INERT_TYPES = new Set([
	"Literal",
	"ThisExpression",
	"FunctionExpression",
	"ArrowFunctionExpression",
	"FunctionDeclaration",
	"MetaProperty",
	"PrivateIdentifier"
]);
// The same, by `NodeType`.
const INERT_NODE_TYPES = new Uint8Array(256);
for (const type of INERT_TYPES) {
	INERT_NODE_TYPES[/** @type {Record<string, number>} */ (NodeType)[type]] = 1;
}

/** @type {Map<string, Set<PropertyKey>>} */
const readGlobalsByOptions = new Map();

/**
 * The globals nothing declares whose read runs nothing and never throws, as
 * webpack's improvements read them: every global the language or a browser
 * page defines, terser's `pure_access_globals` among them.
 * @param {CompressOptions["unsafe"]} sloppy the `unsafe` option, as given
 * @param {CompressOptions["builtins_ecma"]} es the `builtins_ecma` option, as given
 * @returns {Set<PropertyKey>} the globals, shared: never changed
 */
const globalsReadWithoutEffect = (sloppy, es) => {
	const key = `${sloppy}|${es}`;
	let globals = readGlobalsByOptions.get(key);
	if (globals === undefined) {
		const {
			nativeObjectTables,
			pureBuiltIns
		} = require("./syntax-printer-data");

		const { globals: pure, hostGlobals } = pureBuiltIns();
		globals = selectNativeNames(
			nativeObjectTables().NATIVE_PURE_ACCESS_GLOBALS,
			sloppy,
			es
		);
		for (const name of pure) globals.add(name);
		for (const name of hostGlobals) globals.add(name);
		readGlobalsByOptions.set(key, globals);
	}
	return globals;
};

/**
 * @param {SyntaxReader} tree the tree
 * @param {number} node a node, 0 for none
 * @returns {number} the node parentheses around it hold
 */
const unwrap = (tree, node) => {
	while (node !== 0 && tree.type(node) === NodeType.ParenthesizedExpression) {
		node = tree.field(0, Field.expression, node);
	}
	return node;
};

/**
 * terser's `_dot_throw` where `pure_getters` is "strict", the default: only
 * a value known to be no `null`, `undefined` or object with a getter is safe.
 * @param {SyntaxReader} tree the tree
 * @param {number} node an expression
 * @returns {boolean} whether reading a property of its value may throw or run a getter
 */
const mayThrowOnAccess = (tree, node) => {
	node = unwrap(tree, node);
	switch (tree.type(node)) {
		case NodeType.Literal:
			return tree.value(node) === null;
		case NodeType.ArrayExpression:
		case NodeType.FunctionExpression:
		case NodeType.ArrowFunctionExpression:
		case NodeType.ClassExpression:
			return false;
		case NodeType.ObjectExpression: {
			const count = tree.fieldCount(Field.properties, node);
			for (let i = 0; i < count; i++) {
				const property = tree.field(i, Field.properties, node);
				if (tree.type(property) === NodeType.SpreadElement) {
					if (mayThrowOnAccess(tree, tree.field(0, Field.argument, property))) {
						return true;
					}
				} else if (
					tree.textOf(Part.kind, property) !== "init" ||
					tree.flag(Flag.method, property)
				) {
					return true;
				}
			}
			return false;
		}
		case NodeType.UnaryExpression:
			return tree.textOf(Part.operator, node) === "void";
		case NodeType.LogicalExpression:
			return (
				mayThrowOnAccess(tree, tree.field(0, Field.left, node)) ||
				mayThrowOnAccess(tree, tree.field(0, Field.right, node))
			);
		case NodeType.AssignmentExpression: {
			const operator = tree.textOf(Part.operator, node);
			if (operator === "=") {
				return mayThrowOnAccess(tree, tree.field(0, Field.right, node));
			}
			return operator === "&&=" || operator === "||=" || operator === "??=";
		}
		case NodeType.ConditionalExpression:
			return (
				mayThrowOnAccess(tree, tree.field(0, Field.consequent, node)) ||
				mayThrowOnAccess(tree, tree.field(0, Field.alternate, node))
			);
		case NodeType.SequenceExpression:
			return mayThrowOnAccess(
				tree,
				tree.field(
					tree.fieldCount(Field.expressions, node) - 1,
					Field.expressions,
					node
				)
			);
		case NodeType.ChainExpression:
			return mayThrowOnAccess(tree, tree.field(0, Field.expression, node));
		case NodeType.MemberExpression: {
			const property = tree.field(0, Field.property, node);
			if (
				!tree.flag(Flag.computed, node) &&
				tree.type(property) === NodeType.Identifier &&
				tree.name(property) === "prototype"
			) {
				const type = tree.type(unwrap(tree, tree.field(0, Field.object, node)));
				return (
					type !== NodeType.FunctionExpression &&
					type !== NodeType.ClassExpression
				);
			}
			return true;
		}
		default:
			return true;
	}
};

/** @typedef {"number" | "string" | "bigint" | "numeric" | "primitive" | undefined} PrimitiveKind what a value converts as, "numeric" a number or a bigint, undefined where unknown: an object or a symbol may run code */

// The operators yielding a boolean, which converts as a number.
const RELATION_OPERATORS = new Set([
	"==",
	"!=",
	"===",
	"!==",
	"<",
	">",
	"<=",
	">=",
	"in",
	"instanceof"
]);

/**
 * The compressor's `primitiveKind`: what a value converts as, three levels deep.
 * @param {SyntaxReader} tree the tree
 * @param {number} node an expression
 * @param {number} depth how much deeper it may look
 * @param {SideEffectsContext} context what names hold
 * @returns {PrimitiveKind | undefined} its kind, undefined where it may be an object or a symbol
 */
const primitiveKind = (tree, node, depth, context) => {
	if (depth < 0) return;
	node = unwrap(tree, node);
	switch (tree.type(node)) {
		case NodeType.Literal: {
			const value = tree.value(node);
			switch (typeof value) {
				case "number":
				case "boolean":
					return "number";
				case "string":
					return "string";
				case "bigint":
					return "bigint";
				default:
					return tree.textOf(Part.raw, node) === "null" ? "number" : undefined;
			}
		}
		case NodeType.TemplateLiteral:
			return "string";
		case NodeType.UpdateExpression:
			return "numeric";
		case NodeType.UnaryExpression: {
			const operator = tree.textOf(Part.operator, node);
			if (operator === "typeof") return "string";
			if (operator !== "-" && operator !== "~") return "number";
			const kind = primitiveKind(
				tree,
				tree.field(0, Field.argument, node),
				depth - 1,
				context
			);
			return kind === undefined || kind === "bigint" || kind === "numeric"
				? kind
				: kind === "primitive"
					? "numeric"
					: "number";
		}
		case NodeType.SequenceExpression:
			return primitiveKind(
				tree,
				tree.field(
					tree.fieldCount(Field.expressions, node) - 1,
					Field.expressions,
					node
				),
				depth - 1,
				context
			);
		case NodeType.ConditionalExpression:
			return sameKind(
				tree,
				tree.field(0, Field.consequent, node),
				tree.field(0, Field.alternate, node),
				depth,
				context
			);
		case NodeType.LogicalExpression:
			return sameKind(
				tree,
				tree.field(0, Field.left, node),
				tree.field(0, Field.right, node),
				depth,
				context
			);
		case NodeType.AssignmentExpression:
			return tree.textOf(Part.operator, node) === "="
				? primitiveKind(
						tree,
						tree.field(0, Field.right, node),
						depth - 1,
						context
					)
				: undefined;
		case NodeType.BinaryExpression: {
			const operator = /** @type {string} */ (tree.textOf(Part.operator, node));
			if (RELATION_OPERATORS.has(operator)) return "number";
			if (operator === ">>>") return "number";
			const left = primitiveKind(
				tree,
				tree.field(0, Field.left, node),
				depth - 1,
				context
			);
			const right = primitiveKind(
				tree,
				tree.field(0, Field.right, node),
				depth - 1,
				context
			);
			if (operator === "+") {
				if (left === "string" || right === "string") return "string";
				return left === right && (left === "number" || left === "bigint")
					? left
					: "primitive";
			}
			if (left === "bigint" && right === "bigint") return "bigint";
			return left !== undefined &&
				right !== undefined &&
				left !== "bigint" &&
				right !== "bigint" &&
				left !== "numeric" &&
				right !== "numeric" &&
				left !== "primitive" &&
				right !== "primitive"
				? "number"
				: "numeric";
		}
		case NodeType.Identifier:
			return context.nameKind(node);
		default:
			return undefined;
	}
};

/**
 * @param {SyntaxReader} tree the tree
 * @param {number} left one value
 * @param {number} right the other
 * @param {number} depth how much deeper it may look
 * @param {SideEffectsContext} context what names hold
 * @returns {PrimitiveKind | undefined} the kind both share, undefined where they differ
 */
const sameKind = (tree, left, right, depth, context) => {
	const kind = primitiveKind(tree, left, depth - 1, context);
	return kind !== undefined &&
		kind === primitiveKind(tree, right, depth - 1, context)
		? kind
		: undefined;
};

/**
 * The compressor's `convertedKind`: a regular expression converts as a string.
 * @param {SyntaxReader} tree the tree
 * @param {number} node an expression
 * @param {SideEffectsContext} context what names hold
 * @returns {PrimitiveKind | undefined} what it converts as, undefined where converting it may run code
 */
const convertedKind = (tree, node, context) => {
	node = unwrap(tree, node);
	if (tree.type(node) === NodeType.Literal) {
		const raw = tree.textOf(Part.raw, node);
		if (raw !== null && raw.charCodeAt(0) === 47) return "string";
	}
	return primitiveKind(tree, node, 3, context);
};

/**
 * @param {PrimitiveKind | undefined} kind a converted kind
 * @returns {boolean} whether converting it to a number runs nothing and never throws
 */
const becomesNumber = (kind) => kind === "number" || kind === "string";

/**
 * The compressor's `convertsUnknown` and `throwsForBigInt`, as its
 * corrections read them: a `valueOf` or `toString` may run, or a mix throw.
 * @param {SyntaxReader} tree the tree
 * @param {string} operator a binary operator, not a relation
 * @param {number} left its left operand
 * @param {number} right its right operand
 * @param {SideEffectsContext} context what names hold
 * @returns {boolean} whether applying it may run code or throw, its operands aside
 */
const binaryConverts = (tree, operator, left, right, context) => {
	const leftKind = convertedKind(tree, left, context);
	const rightKind = convertedKind(tree, right, context);
	if (leftKind === undefined || rightKind === undefined) return true;
	if (operator === "+" && (leftKind === "string" || rightKind === "string")) {
		return false;
	}
	if (leftKind === "bigint" || rightKind === "bigint") {
		// A bigint mixes with nothing else, `>>>` throws on one, and so do a
		// division by `0n` and a negative exponent, which no literal is.
		if (leftKind !== rightKind || operator === ">>>") return true;
		if (operator !== "/" && operator !== "%" && operator !== "**") return false;
		const divisor = unwrap(tree, right);
		if (tree.type(divisor) !== NodeType.Literal) return true;
		return operator !== "**" && !tree.value(divisor);
	}
	return !(becomesNumber(leftKind) && becomesNumber(rightKind));
};

/**
 * @param {SyntaxReader} tree the tree
 * @param {number} field a list `Field`
 * @param {number} node the node holding the list
 * @param {SideEffectsContext} context what names and annotations do
 * @returns {boolean} whether any item has effects, a spread always: it runs an iterator
 */
const listHasSideEffects = (tree, field, node, context) => {
	const count = tree.fieldCount(field, node);
	for (let i = 0; i < count; i++) {
		const item = tree.field(i, field, node);
		if (
			item !== 0 &&
			(tree.type(item) === NodeType.SpreadElement ||
				hasSideEffects(tree, item, context))
		) {
			return true;
		}
	}
	return false;
};

/**
 * @param {SyntaxReader} tree the tree
 * @param {number} node a property, method or field of an object or class
 * @param {boolean} valueRuns whether its value runs where it is defined: an object's, a static field's
 * @param {SideEffectsContext} context what names and annotations do
 * @returns {boolean} whether defining it has effects
 */
const memberHasSideEffects = (tree, node, valueRuns, context) => {
	if (
		tree.flag(Flag.computed, node) &&
		hasSideEffects(tree, tree.field(0, Field.key, node), context)
	) {
		return true;
	}
	const value = tree.field(0, Field.value, node);
	return valueRuns && value !== 0 && hasSideEffects(tree, value, context);
};

/**
 * The compressor's `extendsNoConstructor`: what defining a class throws on.
 * @param {SyntaxReader} tree the tree
 * @param {number} node a class's heritage, past parentheses
 * @returns {boolean} whether it is no constructor: an arrow, an async or generator function, a literal other than `null`
 */
const extendsNoConstructor = (tree, node) => {
	switch (tree.type(node)) {
		case NodeType.ArrowFunctionExpression:
		case NodeType.ObjectExpression:
		case NodeType.ArrayExpression:
		case NodeType.TemplateLiteral:
			return true;
		case NodeType.FunctionExpression:
			return tree.flag(Flag.async, node) || tree.flag(Flag.generator, node);
		case NodeType.Literal:
			return tree.textOf(Part.raw, node) !== "null";
		default:
			return false;
	}
};

/**
 * terser's `has_side_effects`, the compressor's rules, read off a
 * `SyntaxTree`; a spread and a `typeof` of a name in its dead zone count.
 * @param {SyntaxReader} tree the tree
 * @param {number} node an expression
 * @param {SideEffectsContext} context what names and annotations do
 * @returns {boolean} whether evaluating it may do anything but make its value: call, write, throw or run a getter
 */
const hasSideEffects = (tree, node, context) => {
	node = unwrap(tree, node);
	if (context.decides !== undefined) {
		const decided = context.decides(node);
		if (decided !== undefined) return decided;
	}
	return ruledSideEffects(tree, node, context);
};

/**
 * `hasSideEffects` of a node, by the rules alone.
 * @param {SyntaxReader} tree the tree
 * @param {number} node an expression or a declaration, unwrapped
 * @param {SideEffectsContext} context what names and annotations do
 * @returns {boolean} whether evaluating it may do anything but make its value
 */
const ruledSideEffects = (tree, node, context) => {
	const type = tree.type(node);
	if (INERT_NODE_TYPES[type] === 1) return false;
	switch (type) {
		case NodeType.VariableDeclaration: {
			// `using` disposes of its values when the block ends.
			const kind = tree.textOf(Part.kind, node);
			if (kind === "using" || kind === "await using") return true;
			const count = tree.fieldCount(Field.declarations, node);
			for (let i = 0; i < count; i++) {
				const init = tree.field(
					0,
					Field.init,
					tree.field(i, Field.declarations, node)
				);
				if (init !== 0 && hasSideEffects(tree, init, context)) return true;
			}
			return false;
		}
		case NodeType.Identifier:
			return context.readHasSideEffects(node, false);
		case NodeType.TemplateLiteral: {
			const count = tree.fieldCount(Field.expressions, node);
			for (let i = 0; i < count; i++) {
				// A substitution converts to a string, an object by its methods.
				const expression = tree.field(i, Field.expressions, node);
				if (
					(context.pureConversions !== true &&
						convertedKind(tree, expression, context) === undefined) ||
					hasSideEffects(tree, expression, context)
				) {
					return true;
				}
			}
			return false;
		}
		case NodeType.SequenceExpression:
			return listHasSideEffects(tree, Field.expressions, node, context);
		case NodeType.ArrayExpression:
			return listHasSideEffects(tree, Field.elements, node, context);
		case NodeType.BinaryExpression: {
			const operator = /** @type {string} */ (tree.textOf(Part.operator, node));
			const left = tree.field(0, Field.left, node);
			const right = tree.field(0, Field.right, node);
			// `in` and `instanceof` throw on what is no object, or run a getter.
			if (operator === "in" || operator === "instanceof") return true;
			if (
				context.pureConversions !== true &&
				!RELATION_OPERATORS.has(operator) &&
				binaryConverts(tree, operator, left, right, context)
			) {
				return true;
			}
			return (
				hasSideEffects(tree, left, context) ||
				hasSideEffects(tree, right, context)
			);
		}
		case NodeType.LogicalExpression:
			return (
				hasSideEffects(tree, tree.field(0, Field.left, node), context) ||
				hasSideEffects(tree, tree.field(0, Field.right, node), context)
			);
		case NodeType.ConditionalExpression:
			return (
				hasSideEffects(tree, tree.field(0, Field.test, node), context) ||
				hasSideEffects(tree, tree.field(0, Field.consequent, node), context) ||
				hasSideEffects(tree, tree.field(0, Field.alternate, node), context)
			);
		case NodeType.UnaryExpression: {
			const operator = tree.textOf(Part.operator, node);
			if (operator === "delete") return true;
			const argument = unwrap(tree, tree.field(0, Field.argument, node));
			// `typeof` reads a name nothing declares without a throw.
			if (
				operator === "typeof" &&
				tree.type(argument) === NodeType.Identifier
			) {
				return context.readHasSideEffects(argument, true);
			}
			const kind =
				context.pureConversions !== true &&
				(operator === "-" || operator === "~" || operator === "+")
					? convertedKind(tree, argument, context)
					: "number";
			// A negation converts, a bigint `+` throws.
			if (
				kind === undefined ||
				(operator === "+" ? !becomesNumber(kind) : kind === "primitive")
			) {
				return true;
			}
			return hasSideEffects(tree, argument, context);
		}
		case NodeType.ObjectExpression: {
			const count = tree.fieldCount(Field.properties, node);
			for (let i = 0; i < count; i++) {
				const property = tree.field(i, Field.properties, node);
				if (
					tree.type(property) !== NodeType.Property ||
					memberHasSideEffects(tree, property, true, context)
				) {
					return true;
				}
			}
			return false;
		}
		case NodeType.ClassExpression:
		case NodeType.ClassDeclaration: {
			const superClass = unwrap(tree, tree.field(0, Field.superClass, node));
			if (
				superClass !== 0 &&
				(extendsNoConstructor(tree, superClass) ||
					hasSideEffects(tree, superClass, context))
			) {
				return true;
			}
			const body = tree.field(0, Field.body, node);
			const count = tree.fieldCount(Field.body, body);
			for (let i = 0; i < count; i++) {
				const member = tree.field(i, Field.body, body);
				const type = tree.type(member);
				// A computed key converts to a name, which may be `prototype`, the one
				// a static member throws on; its own effects the member's checks read.
				if (
					type !== NodeType.StaticBlock &&
					tree.flag(Flag.computed, member) &&
					(context.pureConversions !== true || tree.flag(Flag.static, member))
				) {
					return true;
				}
				if (
					type === NodeType.StaticBlock
						? tree.fieldCount(Field.body, member) !== 0
						: memberHasSideEffects(
								tree,
								member,
								type === NodeType.PropertyDefinition &&
									tree.flag(Flag.static, member),
								context
							)
				) {
					return true;
				}
			}
			return false;
		}
		case NodeType.MemberExpression: {
			const optional = tree.flag(Flag.optional, node);
			const object = unwrap(tree, tree.field(0, Field.object, node));
			if (
				!optional &&
				!tree.flag(Flag.computed, node) &&
				tree.type(object) === NodeType.Identifier &&
				context.readsGlobalMember(object)
			) {
				return false;
			}
			if (!optional && mayThrowOnAccess(tree, object)) return true;
			return (
				(tree.flag(Flag.computed, node) &&
					hasSideEffects(tree, tree.field(0, Field.property, node), context)) ||
				hasSideEffects(tree, object, context)
			);
		}
		case NodeType.ChainExpression:
			return hasSideEffects(
				tree,
				tree.field(0, Field.expression, node),
				context
			);
		case NodeType.CallExpression:
		case NodeType.NewExpression:
			return (
				!context.isPureCall(node) ||
				listHasSideEffects(tree, Field.arguments, node, context)
			);
		case NodeType.TaggedTemplateExpression:
			return (
				!context.isPureCall(node) ||
				listHasSideEffects(
					tree,
					Field.expressions,
					tree.field(0, Field.quasi, node),
					context
				)
			);
		default:
			return true;
	}
};

module.exports.INERT_TYPES = INERT_TYPES;
module.exports.PURE_ANNOTATION = PURE_ANNOTATION;
module.exports.evaluateNativeConditions = evaluateNativeConditions;
module.exports.hasSideEffects = hasSideEffects;
module.exports.globalsReadWithoutEffect = globalsReadWithoutEffect;
module.exports.selectNativeNames = selectNativeNames;
