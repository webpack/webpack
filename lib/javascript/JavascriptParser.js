/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { HookMap, SyncBailHook } = require("tapable");
const WebpackError = require("../WebpackError");
const Parser = require("../module/Parser");
const binarySearchBounds = require("../util/binarySearchBounds");
const {
	CompilerHintNotationRegExp,
	createMagicCommentContext,
	getCommentsInRange,
	parseCommentOptionsInRange
} = require("../util/magicComment");
const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
const StackedMap = require("./StackedMap");
const { nonASCIIwhitespace } = require("./syntax-parser");
const {
	BLOCK_DECLARATIONS,
	EstreeView,
	Field,
	Flag,
	HOISTED_DECLARATIONS,
	LEGACY_ASSERT_ATTRIBUTES,
	MAX_MASKED_INDEX,
	MODULE_DECLARATIONS,
	NodeType,
	Part,
	buildLineStarts,
	declaresIntoBlock,
	hasOctalEscape,
	isIdentifierChar,
	overflowFrom,
	parseProgram,
	positionAt,
	takeParsedTree
} = require("./syntax-parser");

/** @import { BuiltJavascriptModule } from "./JavascriptModule" */
/** @import { CollectedComment, EcmaVersion, SyntaxTree } from "./syntax-parser" */
/**
 * What a `{ path: true }` tap reads nodes through: the node ids it is handed,
 * read as the CSS and HTML paths read theirs.
 * @typedef {Pick<EstreeView, "type" | "start" | "end" | "range" | "name" | "value" | "fieldCount" | "field" | "flag" | "textOf" | "legacyAssert" | "pushChildren" | "object">} JavascriptNodeReader
 */
/**
 * A hook's `{ path: true }` tap, reading its nodes through the path as CSS and
 * HTML visitors read theirs: `path.type(node)`, `path.field(i, Field.body, node)`.
 * @template T the arguments, each node as its id
 * @template R the result
 * @typedef {object} PathTaps
 * @property {(options: { name: string, path: true, stage?: number, before?: string }, fn: (path: JavascriptNodeReader, ...args: AsArray<T>) => R) => void} tap registers a tap reading the path
 */
/** @import { SideEffectsContext } from "./side-effects" */
/**
 * @import {
 * 	AssignmentExpression,
 * 	BinaryExpression,
 * 	BlockStatement,
 * 	SequenceExpression,
 * 	CallExpression,
 * 	StaticBlock,
 * 	ClassDeclaration,
 * 	ForStatement,
 * 	SwitchStatement,
 * 	ClassExpression,
 * 	SourceLocation,
 * 	ConditionalExpression,
 * 	Declaration,
 * 	PrivateIdentifier,
 * 	PropertyDefinition,
 * 	Expression,
 * 	ImportDeclaration,
 * 	Identifier,
 * 	VariableDeclaration,
 * 	IfStatement,
 * 	LabeledStatement,
 * 	Literal,
 * 	LogicalExpression,
 * 	ChainExpression,
 * 	MemberExpression,
 * 	YieldExpression,
 * 	MetaProperty,
 * 	Property,
 * 	AssignmentPattern,
 * 	Pattern,
 * 	UpdateExpression,
 * 	ObjectExpression,
 * 	UnaryExpression,
 * 	ArrayExpression,
 * 	ArrayPattern,
 * 	AwaitExpression,
 * 	ThisExpression,
 * 	RestElement,
 * 	ObjectPattern,
 * 	SwitchCase,
 * 	CatchClause,
 * 	VariableDeclarator,
 * 	ForInStatement,
 * 	ForOfStatement,
 * 	ReturnStatement,
 * 	WithStatement,
 * 	ThrowStatement,
 * 	MethodDefinition,
 * 	NewExpression,
 * 	SpreadElement,
 * 	FunctionExpression,
 * 	WhileStatement,
 * 	ArrowFunctionExpression,
 * 	ExpressionStatement,
 * 	ExportAllDeclaration,
 * 	ExportNamedDeclaration,
 * 	FunctionDeclaration,
 * 	DoWhileStatement,
 * 	TryStatement,
 * 	Node,
 * 	Program,
 * 	Directive,
 * 	Statement,
 * 	ExportDefaultDeclaration,
 * 	Super,
 * 	TaggedTemplateExpression,
 * 	TemplateElement,
 * 	TemplateLiteral,
 * 	ModuleDeclaration,
 * 	MaybeNamedFunctionDeclaration,
 * 	MaybeNamedClassDeclaration
 * } from "estree"
 */
/** @import { DependencyLocation } from "../graph/Dependency" */
/** @import { MagicCommentOptions } from "../util/magicComment" */
/** @typedef {import("estree").Comment & { start: number, end: number, loc?: SourceLocation | null }} Comment */
/**
 * Defines the shared type used by this module.
 * @template T
 * @typedef {import("tapable").AsArray<T>} AsArray<T>
 */
/** @import { ParserState, PreparsedAst } from "../module/Parser" */

/** @import LocalModule from "../dependencies/amd/LocalModule" */
/**
 * @import {
 * 	ESMStarExportsList
 * } from "../dependencies/esm/ESMExportImportedSpecifierDependency"
 */

/**
 * Defines the known javascript parser state type used by this module.
 * The `harmony*` properties forward to their `esm*` namesake.
 * @typedef {object} KnownJavascriptParserState
 * @property {Set<string>=} esmNamedExports
 * @property {InstanceType<ESMStarExportsList>=} esmStarExports
 * @property {number=} lastESMImportOrder
 * @property {LocalModule[]=} localModules
 * @property {Set<string>=} harmonyNamedExports deprecated, use `esmNamedExports`
 * @property {InstanceType<ESMStarExportsList>=} harmonyStarExports deprecated, use `esmStarExports`
 * @property {number=} lastHarmonyImportOrder deprecated, use `lastESMImportOrder`
 * @property {GuardFrame[]=} guardStack the guard frames of the branches being walked, innermost last
 */

/** @typedef {ParserState<BuiltJavascriptModule> & KnownJavascriptParserState} JavascriptParserState */

/** @import Compilation from "../Compilation" */
/** @import Module from "../module/Module" */

/** @typedef {{ name: string | VariableInfo, rootInfo: string | VariableInfo, getMembers: () => Members, getMembersOptionals: () => MembersOptionals, getMemberRanges: () => MemberRanges }} GetInfoResult */
/** @typedef {{ consequent?: GuardFrame, alternate?: GuardFrame }} GuardCollection per-branch guard frames pushed onto the parser state guard stack */
/** @typedef {Statement | ModuleDeclaration | Expression | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration} StatementPathItem */
/** @typedef {(ident: string) => void} OnIdentString */
/** @typedef {(ident: string, identifier: Identifier) => void} OnIdent */
/** @typedef {StatementPathItem[]} StatementPath */
/** @typedef {(Statement | ModuleDeclaration)[]} HoistedDeclarations the declarations one scope hoists, in source order */
/** @typedef {(ModuleDeclaration | Statement | undefined)[]} ModuleDeclarations the program's import and re-export declarations in source order, each followed by the statement written before it */
/** @typedef {number | number[]} BlockDeclarations which statements of one list declare into its block scope: a mask of their indices, or the indices themselves once one is too large to mask */

/** @typedef {Set<DestructuringAssignmentProperty>} DestructuringAssignmentProperties */

// TODO remove cast when @types/estree has been updated to import phases
/** @typedef {import("estree").ImportExpression & { phase?: "defer" | "source" }} ImportExpression */

/** @type {string[]} */
const EMPTY_ARRAY = [];
/** @type {HoistedDeclarations} */
const EMPTY_HOISTED_DECLARATIONS = [];
// what the module pass reports; `export default` is the block pass's
const MODULE_STATEMENT_TYPES = new Set([
	"ImportDeclaration",
	"ExportNamedDeclaration",
	"ExportAllDeclaration"
]);
// what the parser records per scope, and so what the hoisting pass reaches
const RECORDED_STATEMENT_TYPES = new Set([
	"VariableDeclaration",
	"FunctionDeclaration",
	"ClassDeclaration"
]);
/** @type {ModuleDeclarations} */
const EMPTY_MODULE_DECLARATIONS = [];
// what the parser records per statement list, and so what the block pass
// reaches. An expression statement is recorded only when it assigns to an
// object pattern, so a tap on that type is not served from the list.
const BLOCK_DECLARATION_TYPES = new Set([
	"VariableDeclaration",
	"FunctionDeclaration",
	"ClassDeclaration",
	"ExportNamedDeclaration",
	"ExportDefaultDeclaration"
]);

/** @type {MembersOptionals} */
const EMPTY_MEMBERS_OPTIONALS = [];

const ALLOWED_MEMBER_TYPES_CALL_EXPRESSION = 0b01;
const ALLOWED_MEMBER_TYPES_EXPRESSION = 0b10;
const ALLOWED_MEMBER_TYPES_ALL = 0b11;

// Shared `() => false` so the members-optionals fallback in walkCallExpression
// doesn't allocate a fresh closure per identifier-rooted call.
const RETURN_FALSE = () => false;

// Shared `() => []` for the member-less identifier/this evaluation results,
// replacing three fresh closures per evaluated free variable.
const RETURN_EMPTY_ARRAY = () => [];

// Shared no-result fallback for the identifier evaluators.
const RETURN_UNDEFINED = () => undefined;

/** @type {typeof import("./side-effects") | undefined} */
let sideEffects;

/**
 * @returns {typeof import("./side-effects")} the purity rules `isPure` shares with the minifier, loaded on first use
 */
const getSideEffects = () =>
	sideEffects === undefined
		? (sideEffects = require("./side-effects"))
		: sideEffects;

// What `isPure` judges by the shared rules, beside the operators below; the
// evaluator judges the rest, which it alone may find constant.
const RULED_PURITY_TYPES = /** @type {(keyof typeof NodeType)[]} */ ([
	"ArrayExpression",
	"ArrowFunctionExpression",
	"CallExpression",
	"ChainExpression",
	"ClassDeclaration",
	"ClassExpression",
	"ConditionalExpression",
	"FunctionDeclaration",
	"FunctionExpression",
	"Identifier",
	"Literal",
	"LogicalExpression",
	"MetaProperty",
	"NewExpression",
	"ObjectExpression",
	"PrivateIdentifier",
	"SequenceExpression",
	"TaggedTemplateExpression",
	"TemplateLiteral",
	"ThisExpression",
	"VariableDeclaration"
]);

/** @type {Uint8Array | undefined} */
let ruledPurityNodeTypes;

/**
 * @param {number} type `NodeType.UnaryExpression` or `NodeType.BinaryExpression`
 * @param {string} operator its operator
 * @returns {boolean} whether the evaluator judges it: an operator that may convert its operands
 */
const isLeftToEvaluatorOperator = (type, operator) =>
	type === NodeType.UnaryExpression
		? operator !== "typeof" && operator !== "void" && operator !== "!"
		: operator !== "===" && operator !== "!==";

/**
 * Whether the evaluator, rather than the rules, judges a node the side-effect
 * rules leave undecided.
 * @param {Node | undefined} node the node, read for a unary or binary operator
 * @param {number} type its `NodeType`
 * @returns {boolean} whether the evaluator judges it
 */
const isLeftToEvaluator = (node, type) => {
	switch (type) {
		case NodeType.UnaryExpression:
		case NodeType.BinaryExpression:
			return isLeftToEvaluatorOperator(
				type,
				/** @type {UnaryExpression | BinaryExpression} */ (node).operator
			);
		default:
			if (ruledPurityNodeTypes === undefined) {
				ruledPurityNodeTypes = new Uint8Array(256);
				for (const name of RULED_PURITY_TYPES) {
					ruledPurityNodeTypes[NodeType[name]] = 1;
				}
			}
			return ruledPurityNodeTypes[type] !== 1;
	}
};

/**
 * @param {Node} node a node `isPure` reads
 * @returns {boolean} whether it is a class with a superclass and its own constructor, which `isPure` keeps
 */
const isDerivedWithConstructor = (node) =>
	(node.type === "ClassDeclaration" || node.type === "ClassExpression") &&
	Boolean(node.superClass) &&
	node.body.body.some(
		(member) =>
			member.type === "MethodDefinition" && member.kind === "constructor"
	);

/** @typedef {Record<string, string> & { _isLegacyAssert?: boolean }} ImportAttributes */

// Conceptually pairs with ./syntax's LEGACY_ASSERT_ATTRIBUTES marker, but is
// pinned here by its public `JavascriptParser.getImportAttributes` typing.
/**
 * Gets import attributes. With a path, the node is a declaration's id.
 * @param {ImportDeclaration | ExportNamedDeclaration | ExportAllDeclaration | ImportExpression | number} node node with assertions
 * @param {JavascriptNodeReader=} path the reader of the node, when it is an id
 * @returns {ImportAttributes | undefined} import attributes
 */
const getImportAttributes = (node, path) => {
	if (typeof node === "number") {
		const reader = /** @type {JavascriptNodeReader} */ (path);
		const count = reader.fieldCount(Field.attributes, node);
		if (count === 0) return;
		const result = /** @type {ImportAttributes} */ ({});
		for (let i = 0; i < count; i++) {
			const attribute = reader.field(i, Field.attributes, node);
			const key = reader.field(0, Field.key, attribute);
			result[
				reader.type(key) === NodeType.Identifier
					? reader.name(key)
					: /** @type {string} */ (reader.value(key))
			] = /** @type {string} */ (
				reader.value(reader.field(0, Field.value, attribute))
			);
		}
		if (reader.legacyAssert(node)) result._isLegacyAssert = true;
		return result;
	}
	if (node.type === "ImportExpression") {
		if (!node.options || node.options.type !== "ObjectExpression") return;
		// The runtime reads `with` (or legacy `assert`) by name, wherever it
		// sits and however it is quoted; a repeated key keeps its last value.
		/** @type {Property | undefined} */
		let withProperty;
		/** @type {Property | undefined} */
		let assertProperty;
		for (const property of node.options.properties) {
			if (property.type !== "Property" || property.computed) continue;
			const name =
				property.key.type === "Identifier"
					? property.key.name
					: /** @type {Literal} */ (property.key).value;
			if (name === "with") withProperty = property;
			else if (name === "assert") assertProperty = property;
		}
		const attributesProperty = withProperty || assertProperty;
		if (
			attributesProperty &&
			attributesProperty.value.type === "ObjectExpression" &&
			attributesProperty.value.properties.length > 0
		) {
			const properties =
				/** @type {Property[]} */
				(attributesProperty.value.properties);
			const result = /** @type {ImportAttributes} */ ({});
			for (const property of properties) {
				const key =
					/** @type {string} */
					(
						property.key.type === "Identifier"
							? property.key.name
							: /** @type {Literal} */ (property.key).value
					);
				result[key] =
					/** @type {string} */
					(/** @type {Literal} */ (property.value).value);
			}

			if (attributesProperty === assertProperty) {
				result._isLegacyAssert = true;
			}

			return result;
		}

		return;
	}

	if (node.attributes === undefined || node.attributes.length === 0) {
		return;
	}

	const result = /** @type {ImportAttributes} */ ({});

	for (const attribute of node.attributes) {
		const key =
			/** @type {string} */
			(
				attribute.key.type === "Identifier"
					? attribute.key.name
					: attribute.key.value
			);

		result[key] = /** @type {string} */ (attribute.value.value);
	}

	if (
		/** @type {typeof node.attributes & { [LEGACY_ASSERT_ATTRIBUTES]?: boolean }} */
		(node.attributes)[LEGACY_ASSERT_ATTRIBUTES]
	) {
		result._isLegacyAssert = true;
	}

	return result;
};

/** @typedef {typeof VariableInfoFlags.Evaluated | typeof VariableInfoFlags.Free | typeof VariableInfoFlags.Normal | typeof VariableInfoFlags.Tagged} VariableInfoFlagsType */

const VariableInfoFlags = Object.freeze({
	Evaluated: 0b000,
	Free: 0b001,
	Normal: 0b010,
	Tagged: 0b100
});

class VariableInfo {
	/**
	 * Creates an instance of VariableInfo.
	 * @param {ScopeInfo} declaredScope scope in which the variable is declared
	 * @param {string | undefined} name which name the variable use, defined name or free name or tagged name
	 * @param {VariableInfoFlagsType} flags how the variable is created
	 * @param {TagInfo | undefined} tagInfo info about tags
	 */
	constructor(declaredScope, name, flags, tagInfo) {
		/** @type {ScopeInfo} */
		this.declaredScope = declaredScope;
		/** @type {string | undefined} */
		this.name = name;
		/** @type {VariableInfoFlagsType} */
		this.flags = flags;
		/** @type {TagInfo | undefined} */
		this.tagInfo = tagInfo;
	}

	/**
	 * Checks whether this variable info is free.
	 * @returns {boolean} the variable is free or not
	 */
	isFree() {
		return (this.flags & VariableInfoFlags.Free) > 0;
	}

	/**
	 * Checks whether this variable info is tagged.
	 * @returns {boolean} the variable is tagged by tagVariable or not
	 */
	isTagged() {
		return (this.flags & VariableInfoFlags.Tagged) > 0;
	}
}

/** @typedef {string | ScopeInfo | VariableInfo} ExportedVariableInfo */
/** @typedef {Literal | string | null | undefined} ImportSource */

/**
 * Defines the internal parse options type used by this module.
 * @typedef {Omit<ParseOptions, "sourceType" | "ecmaVersion"> & { sourceType: "module" | "script" | "auto" }} InternalParseOptions
 */

/**
 * Defines the parse options type used by this module.
 * @typedef {object} ParseOptions
 * @property {"module" | "script"} sourceType
 * @property {EcmaVersion} ecmaVersion
 * @property {boolean=} locations
 * @property {boolean=} comments
 * @property {boolean=} ranges
 * @property {boolean=} allowHashBang
 * @property {boolean=} allowReturnOutsideFunction
 * @property {boolean=} importPhases enable parsing of the import phase proposals (import defer / import source)
 */

/**
 * Defines the parse result type used by this module.
 * @typedef {object} ParseResult
 * @property {Program} ast
 * @property {Comment[]} comments
 */

/**
 * Defines the parse function type used by this module.
 * @typedef {(code: string, options: ParseOptions) => ParseResult} ParseFunction
 */

/**
 * A variable tag, carrying the type of the data a variable is tagged with.
 * @template [T=TagData]
 * @typedef {symbol & { readonly __tagData?: T }} Tag
 */

/**
 * @import {
 * 	ESMSettings
 * } from "../dependencies/esm/ESMImportDependencyParserPlugin"
 */
/** @import { ImportSettings } from "../dependencies/import/ImportParserPlugin" */
/** @import { GuardFrame } from "../dependencies/esm/ESMImportGuard" */
/**
 * @import {
 * 	CommonJsImportSettings
 * } from "../dependencies/commonjs/CommonJsImportsParserPlugin"
 */
/** @import { CompatibilitySettings } from "./CompatibilityPlugin" */
/** @import { TopLevelSymbol } from "../optimize/InnerGraph" */

/** @typedef {ESMSettings | ImportSettings | CommonJsImportSettings | TopLevelSymbol | CompatibilitySettings} KnownTagData */
// The open branch is whatever a plugin tags a variable with.
/** @typedef {KnownTagData | EXPECTED_OBJECT} TagData */

/**
 * Defines the tag info type used by this module.
 * @typedef {object} TagInfo
 * @property {Tag} tag
 * @property {TagData=} data
 * @property {TagInfo | undefined} next
 */

/** @typedef {string[]} CalleeMembers */
/** @typedef {string[]} Members */
/** @typedef {UpdateExpression | ForInStatement | ForOfStatement | AssignmentExpression} WriteStatement a construct that writes to the reference it carries */
/** @typedef {boolean[]} MembersOptionals */
/** @typedef {Range[]} MemberRanges */

const SCOPE_INFO_TERMINATED_RETURN = 1;
const SCOPE_INFO_TERMINATED_THROW = 2;

/**
 * Defines the scope info type used by this module.
 * @typedef {object} ScopeInfo
 * @property {StackedMap<string, VariableInfo | ScopeInfo>} definitions
 * @property {boolean | "arrow"} topLevelScope
 * @property {boolean | string} inShorthand
 * @property {boolean} inTaggedTemplateTag
 * @property {boolean} inTry
 * @property {boolean} isStrict
 * @property {boolean} isAsmJs
 * @property {undefined | 1 | 2} terminated
 */

/** @typedef {[number, number]} Range */

/**
 * Defines the destructuring assignment property type used by this module.
 * Carries only the range — consumers derive line/column via `getLocation`.
 * @typedef {object} DestructuringAssignmentProperty
 * @property {string} id
 * @property {Range} range
 * @property {Set<DestructuringAssignmentProperty> | undefined=} pattern
 * @property {boolean | string} shorthand
 * @property {boolean=} computed whether the key is a computed `[expression]` other than a literal
 */

/**
 * Helper function for joining two ranges into a single range. This is useful
 * when working with AST nodes, as it allows you to combine the ranges of child nodes
 * to create the range of the _parent node_.
 * @param {Range} startRange start range to join
 * @param {Range} endRange end range to join
 * @returns {Range} joined range
 * @example
 * ```js
 * 	const startRange = [0, 5];
 * 	const endRange = [10, 15];
 * 	const joinedRange = joinRanges(startRange, endRange);
 * 	console.log(joinedRange); // [0, 15]
 * ```
 */
const joinRanges = (startRange, endRange) => {
	if (!endRange) return startRange;
	if (!startRange) return endRange;
	return [startRange[0], endRange[1]];
};

/**
 * Helper function used to generate a string representation of a
 * [member expression](https://github.com/estree/estree/blob/master/es5.md#memberexpression).
 * @param {string} object object to name
 * @param {Members} members members in source order
 * @returns {string} member expression as a string
 * @example
 * ```js
 * const members = ["property1", "property2", "property3"]; // Members parsed from the AST
 * const name = objectAndMembersToName("myObject", members);
 *
 * console.log(name); // "myObject.property1.property2.property3"
 * ```
 */
const objectAndMembersToName = (object, members) => {
	let name = object;
	for (let i = 0; i < members.length; i++) {
		name = `${name}.${members[i]}`;
	}
	return name;
};

/**
 * The range of the object below each of the first `count` members of a chain,
 * in source order: what `extractMemberExpressionChain` reports as memberRanges.
 * @param {Expression | Super} expression a member expression
 * @param {number} count how many members the chain has
 * @returns {MemberRanges} the ranges
 */
const memberRangesOf = (expression, count) => {
	/** @type {MemberRanges} */
	const ranges = [];
	let expr = /** @type {MemberExpression} */ (expression);
	for (let i = 0; i < count; i++) {
		const object = expr.object;
		ranges.push(/** @type {Range} */ (object.range));
		expr = /** @type {MemberExpression} */ (object);
	}
	if (count > 1) ranges.reverse();
	return ranges;
};

/**
 * `memberRangesOf` for a node of the tree, by id.
 * @param {SyntaxTree} tree the tree
 * @param {number} id a member expression
 * @param {number} count how many members the chain has
 * @returns {MemberRanges} the ranges
 */
const memberRangesOfNode = (tree, id, count) => {
	/** @type {MemberRanges} */
	const ranges = [];
	let node = id;
	for (let i = 0; i < count; i++) {
		node = tree.field(0, Field.object, node);
		ranges.push(tree.range(node));
	}
	if (count > 1) ranges.reverse();
	return ranges;
};

/**
 * The cooked text of a template literal without expressions, a static member.
 * @param {SyntaxTree} tree the tree
 * @param {number} id a node
 * @returns {string | undefined} its text, undefined for any other node
 */
const cookedOf = (tree, id) => {
	if (
		tree.type(id) !== NodeType.TemplateLiteral ||
		tree.fieldCount(Field.expressions, id) !== 0
	) {
		return;
	}
	const quasi = /** @type {TemplateElement["value"]} */ (
		tree.value(tree.field(0, Field.quasis, id))
	);
	return typeof quasi.cooked === "string" ? quasi.cooked : undefined;
};

/**
 * `getRootName` for a node of the tree, by id.
 * @param {SyntaxTree} tree the tree
 * @param {number} id a node
 * @returns {string | undefined} its root name
 */
const rootNameOf = (tree, id) => {
	switch (tree.type(id)) {
		case NodeType.Identifier:
			return tree.name(id);
		case NodeType.ThisExpression:
			return "this";
		case NodeType.MetaProperty:
			return `${tree.name(tree.field(0, Field.meta, id))}.${tree.name(
				tree.field(0, Field.property, id)
			)}`;
		default:
			return undefined;
	}
};

/**
 * In simple logical cases, we can use valueAsExpression to assist us in evaluating the expression on
 * either side of a [BinaryExpression](https://github.com/estree/estree/blob/master/es5.md#binaryexpression).
 * This supports scenarios in webpack like conditionally `import()`'ing modules based on some simple evaluation:
 *
 * ```js
 * if (1 === 3) {
 *  import("./moduleA"); // webpack will auto evaluate this and not import the modules
 * }
 * ```
 *
 * Additional scenarios include evaluation of strings inside of dynamic import statements:
 *
 * ```js
 * const foo = "foo";
 * const bar = "bar";
 *
 * import("./" + foo + bar); // webpack will auto evaluate this into import("./foobar")
 * ```
 * @param {boolean | number | bigint | string} value the value to convert to an expression
 * @param {Range} range the range of the expression
 * @param {boolean} sideEffects whether the expression has side effects
 * @returns {BasicEvaluatedExpression | undefined} the evaluated expression
 * @example
 *
 * ```js
 * const binaryExpr = new BinaryExpression("+",
 * 	{ type: "Literal", value: 2 },
 * 	{ type: "Literal", value: 3 }
 * );
 *
 * const leftValue = 2;
 * const rightValue = 3;
 *
 * const leftExpr = valueAsExpression(leftValue, binaryExpr.left, false);
 * const rightExpr = valueAsExpression(rightValue, binaryExpr.right, false);
 * const result = new BasicEvaluatedExpression()
 * 	.setNumber(leftExpr.number + rightExpr.number)
 * 	.setRange(binaryExpr.range);
 *
 * console.log(result.number); // Output: 5
 * ```
 */
const valueAsExpression = (value, range, sideEffects) => {
	switch (typeof value) {
		case "boolean":
			return new BasicEvaluatedExpression()
				.setBoolean(value)
				.setSideEffects(sideEffects)
				.setRange(range);
		case "number":
			return new BasicEvaluatedExpression()
				.setNumber(value)
				.setSideEffects(sideEffects)
				.setRange(range);
		case "bigint":
			return new BasicEvaluatedExpression()
				.setBigInt(value)
				.setSideEffects(sideEffects)
				.setRange(range);
		case "string":
			return new BasicEvaluatedExpression()
				.setString(value)
				.setSideEffects(sideEffects)
				.setRange(range);
	}
};

// The constant operators, shared so evaluating `a - b` allocates no handler.
// JavaScript coerces any operand; each cast only lets TypeScript type the operator.

/** @typedef {ReturnType<BasicEvaluatedExpression["asCompileTimeValue"]>} CompileTimeValue */

/**
 * @param {CompileTimeValue} l left operand
 * @param {CompileTimeValue} r right operand
 * @returns {number | bigint} the result
 */
const SUBTRACT = (l, r) =>
	/** @type {number} */ (l) - /** @type {number} */ (r);

/**
 * @param {CompileTimeValue} l left operand
 * @param {CompileTimeValue} r right operand
 * @returns {number | bigint} the result
 */
const MULTIPLY = (l, r) =>
	/** @type {number} */ (l) * /** @type {number} */ (r);

/**
 * @param {CompileTimeValue} l left operand
 * @param {CompileTimeValue} r right operand
 * @returns {number | bigint} the result
 */
const DIVIDE = (l, r) => /** @type {number} */ (l) / /** @type {number} */ (r);

/**
 * @param {CompileTimeValue} l left operand
 * @param {CompileTimeValue} r right operand
 * @returns {number | bigint} the result
 */
const POWER = (l, r) => /** @type {number} */ (l) ** /** @type {number} */ (r);

/**
 * @param {CompileTimeValue} l left operand
 * @param {CompileTimeValue} r right operand
 * @returns {number | bigint} the result
 */
const BITWISE_AND = (l, r) =>
	/** @type {number} */ (l) & /** @type {number} */ (r);

/**
 * @param {CompileTimeValue} l left operand
 * @param {CompileTimeValue} r right operand
 * @returns {number | bigint} the result
 */
const BITWISE_OR = (l, r) =>
	/** @type {number} */ (l) | /** @type {number} */ (r);

/**
 * @param {CompileTimeValue} l left operand
 * @param {CompileTimeValue} r right operand
 * @returns {number | bigint} the result
 */
const BITWISE_XOR = (l, r) =>
	/** @type {number} */ (l) ^ /** @type {number} */ (r);

/**
 * @param {CompileTimeValue} l left operand
 * @param {CompileTimeValue} r right operand
 * @returns {number} the result
 */
const UNSIGNED_SHIFT_RIGHT = (l, r) =>
	/** @type {number} */ (l) >>> /** @type {number} */ (r);

/**
 * @param {CompileTimeValue} l left operand
 * @param {CompileTimeValue} r right operand
 * @returns {number | bigint} the result
 */
const SHIFT_RIGHT = (l, r) =>
	/** @type {number} */ (l) >> /** @type {number} */ (r);

/**
 * @param {CompileTimeValue} l left operand
 * @param {CompileTimeValue} r right operand
 * @returns {number | bigint} the result
 */
const SHIFT_LEFT = (l, r) =>
	/** @type {number} */ (l) << /** @type {number} */ (r);

/**
 * @param {CompileTimeValue} l left operand
 * @param {CompileTimeValue} r right operand
 * @returns {boolean} the result
 */
const LESS_THAN = (l, r) =>
	/** @type {number} */ (l) < /** @type {number} */ (r);

/**
 * @param {CompileTimeValue} l left operand
 * @param {CompileTimeValue} r right operand
 * @returns {boolean} the result
 */
const GREATER_THAN = (l, r) =>
	/** @type {number} */ (l) > /** @type {number} */ (r);

/**
 * @param {CompileTimeValue} l left operand
 * @param {CompileTimeValue} r right operand
 * @returns {boolean} the result
 */
const LESS_THAN_OR_EQUAL = (l, r) =>
	/** @type {number} */ (l) <= /** @type {number} */ (r);

/**
 * @param {CompileTimeValue} l left operand
 * @param {CompileTimeValue} r right operand
 * @returns {boolean} the result
 */
const GREATER_THAN_OR_EQUAL = (l, r) =>
	/** @type {number} */ (l) >= /** @type {number} */ (r);

/**
 * @param {CompileTimeValue} v operand
 * @returns {number | bigint} the result
 */
const BITWISE_NOT = (v) => ~(/** @type {number} */ (v));

/**
 * @param {CompileTimeValue} v operand
 * @returns {number} the result
 */
// eslint-disable-next-line no-implicit-coercion
const TO_NUMBER = (v) => +(/** @type {number} */ (v));

/**
 * @param {CompileTimeValue} v operand
 * @returns {number | bigint} the result
 */
const NEGATE = (v) => -(/** @type {number} */ (v));

/**
 * Evaluates a binary expression if and only if it is a const operation (e.g. 1 + 2, "a" + "b", etc.).
 * @template T
 * @param {JavascriptParser} parser the parser evaluating the expression
 * @param {BinaryExpression} expr the binary expression
 * @param {(leftOperand: T, rightOperand: T) => boolean | number | bigint | string} operandHandler the handler for the operation (e.g. (a, b) => a + b)
 * @returns {BasicEvaluatedExpression | undefined} the evaluated expression
 */
const handleConstOperation = (parser, expr, operandHandler) => {
	const left = parser.evaluateExpression(
		parser._childOf(expr, Field.left, "left")
	);
	if (!left.isCompileTimeValue()) return;

	const right = parser.evaluateExpression(
		parser._childOf(expr, Field.right, "right")
	);
	if (!right.isCompileTimeValue()) return;

	let result;
	try {
		result = operandHandler(
			/** @type {T} */ (left.asCompileTimeValue()),
			/** @type {T} */ (right.asCompileTimeValue())
		);
	} catch (_err) {
		// The operation throws at runtime (`1n - 1`, `1n / 0n`): leave it unfolded.
		return;
	}
	return valueAsExpression(
		result,
		parser._rangeOf(expr),
		left.couldHaveSideEffects() || right.couldHaveSideEffects()
	);
};

/**
 * Helper function to determine if two booleans are always different. This is used in `handleStrictEqualityComparison`
 * to determine if an expressions boolean or nullish conversion is equal or not.
 * @param {boolean} a first boolean to compare
 * @param {boolean} b second boolean to compare
 * @returns {boolean} true if the two booleans are always different, false otherwise
 */
const isAlwaysDifferent = (a, b) =>
	(a === true && b === false) || (a === false && b === true);

/**
 * Handle template string compare.
 * @param {BasicEvaluatedExpression} left left
 * @param {BasicEvaluatedExpression} right right
 * @param {Range} range the comparison's range
 * @param {boolean} eql true for "===" and false for "!=="
 * @returns {BasicEvaluatedExpression | undefined} result
 */
const handleTemplateStringCompare = (left, right, range, eql) => {
	/**
	 * Returns value.
	 * @param {BasicEvaluatedExpression[]} parts parts
	 * @returns {string} value
	 */
	const getPrefix = (parts) => {
		let value = "";
		for (const p of parts) {
			const v = p.asString();
			if (v !== undefined) value += v;
			else break;
		}
		return value;
	};
	/**
	 * Returns value.
	 * @param {BasicEvaluatedExpression[]} parts parts
	 * @returns {string} value
	 */
	const getSuffix = (parts) => {
		let value = "";
		for (let i = parts.length - 1; i >= 0; i--) {
			const v = parts[i].asString();
			if (v !== undefined) value = v + value;
			else break;
		}
		return value;
	};
	const leftPrefix = getPrefix(
		/** @type {BasicEvaluatedExpression[]} */ (left.parts)
	);
	const rightPrefix = getPrefix(
		/** @type {BasicEvaluatedExpression[]} */ (right.parts)
	);
	const leftSuffix = getSuffix(
		/** @type {BasicEvaluatedExpression[]} */ (left.parts)
	);
	const rightSuffix = getSuffix(
		/** @type {BasicEvaluatedExpression[]} */ (right.parts)
	);
	const lenPrefix = Math.min(leftPrefix.length, rightPrefix.length);
	const lenSuffix = Math.min(leftSuffix.length, rightSuffix.length);
	const prefixMismatch =
		lenPrefix > 0 &&
		leftPrefix.slice(0, lenPrefix) !== rightPrefix.slice(0, lenPrefix);
	const suffixMismatch =
		lenSuffix > 0 &&
		leftSuffix.slice(-lenSuffix) !== rightSuffix.slice(-lenSuffix);
	if (prefixMismatch || suffixMismatch) {
		return new BasicEvaluatedExpression()
			.setRange(range)
			.setBoolean(!eql)
			.setSideEffects(
				left.couldHaveSideEffects() || right.couldHaveSideEffects()
			);
	}
};

/**
 * Helper function to handle BinaryExpressions using strict equality comparisons (e.g. "===" and "!==").
 * @param {JavascriptParser} parser the parser evaluating the expression
 * @param {BinaryExpression} expr the binary expression
 * @param {boolean} eql true for "===" and false for "!=="
 * @returns {BasicEvaluatedExpression | undefined} the evaluated expression
 */
const handleStrictEqualityComparison = (parser, expr, eql) => {
	const left = parser.evaluateExpression(
		parser._childOf(expr, Field.left, "left")
	);
	const right = parser.evaluateExpression(
		parser._childOf(expr, Field.right, "right")
	);

	const leftConst = left.isCompileTimeValue();
	const rightConst = right.isCompileTimeValue();

	if (leftConst && rightConst) {
		return new BasicEvaluatedExpression()
			.setRange(parser._rangeOf(expr))
			.setBoolean(
				eql === (left.asCompileTimeValue() === right.asCompileTimeValue())
			)
			.setSideEffects(
				left.couldHaveSideEffects() || right.couldHaveSideEffects()
			);
	}

	if (left.isArray() && right.isArray()) {
		return new BasicEvaluatedExpression()
			.setRange(parser._rangeOf(expr))
			.setBoolean(!eql)
			.setSideEffects(
				left.couldHaveSideEffects() || right.couldHaveSideEffects()
			);
	}
	if (left.isTemplateString() && right.isTemplateString()) {
		return handleTemplateStringCompare(left, right, parser._rangeOf(expr), eql);
	}

	const leftPrimitive = left.isPrimitiveType();
	const rightPrimitive = right.isPrimitiveType();

	if (
		// Primitive !== Object or
		// compile-time object types are never equal to something at runtime
		(leftPrimitive === false && (leftConst || rightPrimitive === true)) ||
		(rightPrimitive === false && (rightConst || leftPrimitive === true)) ||
		// Different nullish or boolish status also means not equal
		isAlwaysDifferent(
			/** @type {boolean} */ (left.asBool()),
			/** @type {boolean} */ (right.asBool())
		) ||
		isAlwaysDifferent(
			/** @type {boolean} */ (left.asNullish()),
			/** @type {boolean} */ (right.asNullish())
		)
	) {
		return new BasicEvaluatedExpression()
			.setRange(parser._rangeOf(expr))
			.setBoolean(!eql)
			.setSideEffects(
				left.couldHaveSideEffects() || right.couldHaveSideEffects()
			);
	}
};

/**
 * Helper function to handle BinaryExpressions using abstract equality comparisons (e.g. "==" and "!=").
 * @param {JavascriptParser} parser the parser evaluating the expression
 * @param {BinaryExpression} expr the binary expression
 * @param {boolean} eql true for "==" and false for "!="
 * @returns {BasicEvaluatedExpression | undefined} the evaluated expression
 */
const handleAbstractEqualityComparison = (parser, expr, eql) => {
	const left = parser.evaluateExpression(
		parser._childOf(expr, Field.left, "left")
	);
	const right = parser.evaluateExpression(
		parser._childOf(expr, Field.right, "right")
	);

	const leftConst = left.isCompileTimeValue();
	const rightConst = right.isCompileTimeValue();

	if (leftConst && rightConst) {
		return new BasicEvaluatedExpression()
			.setRange(parser._rangeOf(expr))
			.setBoolean(
				eql ===
					// eslint-disable-next-line eqeqeq
					(left.asCompileTimeValue() == right.asCompileTimeValue())
			)
			.setSideEffects(
				left.couldHaveSideEffects() || right.couldHaveSideEffects()
			);
	}

	if (left.isArray() && right.isArray()) {
		return new BasicEvaluatedExpression()
			.setRange(parser._rangeOf(expr))
			.setBoolean(!eql)
			.setSideEffects(
				left.couldHaveSideEffects() || right.couldHaveSideEffects()
			);
	}
	if (left.isTemplateString() && right.isTemplateString()) {
		return handleTemplateStringCompare(left, right, parser._rangeOf(expr), eql);
	}
};

/**
 * Evaluates a UnaryExpression if and only if it is a basic const operator (e.g. +a, -a, ~a).
 * @template T
 * @param {JavascriptParser} parser the parser evaluating the expression
 * @param {UnaryExpression | number} expr the unary expression, an id in the tree walk
 * @param {(operand: T) => boolean | number | bigint | string} operandHandler handler for the operand
 * @returns {BasicEvaluatedExpression | undefined} evaluated expression
 */
const handleUnaryConstOperation = (parser, expr, operandHandler) => {
	const argument = parser.evaluateExpression(
		parser._childOf(expr, Field.argument, "argument")
	);
	if (!argument.isCompileTimeValue()) return;
	let result;
	try {
		result = operandHandler(/** @type {T} */ (argument.asCompileTimeValue()));
	} catch (_err) {
		// The operation throws at runtime (`+1n`): leave it unfolded.
		return;
	}
	return valueAsExpression(
		result,
		parser._rangeOf(expr),
		argument.couldHaveSideEffects()
	);
};

/**
 * Grabs the name of a given expression and returns it as a string or undefined. Has particular
 * handling for [Identifiers](https://github.com/estree/estree/blob/master/es5.md#identifier),
 * [ThisExpressions](https://github.com/estree/estree/blob/master/es5.md#identifier), and
 * [MetaProperties](https://github.com/estree/estree/blob/master/es2015.md#metaproperty) which is
 * specifically for handling the `new.target` meta property.
 * @param {Expression | SpreadElement | Super} expression expression
 * @returns {string | "this" | undefined} name or variable info
 */
const getRootName = (expression) => {
	switch (expression.type) {
		case "Identifier":
			return expression.name;
		case "ThisExpression":
			return "this";
		case "MetaProperty":
			return `${expression.meta.name}.${expression.property.name}`;
		default:
			return undefined;
	}
};

/**
 * @param {string} type AST node type
 * @returns {boolean} true for FunctionExpression or ArrowFunctionExpression
 */
const isFunctionExpression = (type) =>
	type === "FunctionExpression" || type === "ArrowFunctionExpression";

/**
 * @param {FunctionExpression | ArrowFunctionExpression} fn function
 * @returns {boolean} true when all params are plain identifiers
 */
const isSimpleFunction = (fn) => {
	const params = fn.params;
	for (let i = 0; i < params.length; i++) {
		if (params[i].type !== "Identifier") return false;
	}
	return true;
};

/**
 * `isSimpleFunction` for a function of the tree, by id.
 * @param {SyntaxTree} tree the tree
 * @param {number} fn the function
 * @returns {boolean} true when all params are plain identifiers
 */
const hasOnlyNameParams = (tree, fn) => {
	const count = tree.fieldCount(Field.params, fn);
	for (let i = 0; i < count; i++) {
		if (tree.type(tree.field(i, Field.params, fn)) !== NodeType.Identifier) {
			return false;
		}
	}
	return true;
};

/** @type {ParseOptions} */
const defaultParserOptions = {
	sourceType: "module",
	ecmaVersion: "latest",
	ranges: false,
	locations: false,
	comments: false,
	// https://github.com/tc39/proposal-hashbang
	allowHashBang: true
};

// Read-only snippet ASTs for `evaluate()`, released with the compilation;
// DefinePlugin evaluates the same strings once per usage per module.
/** @type {WeakMap<Compilation, Map<string, Program>>} */
const evaluateAstCaches = new WeakMap();
// The inner map is strong while the compilation lives, so cap it
const EVALUATE_AST_CACHE_LIMIT = 4096;

/**
 * Add one declaration, starting the list at the first — most scopes declare
 * nothing, and the shared empty list spares them an array.
 * @param {HoistedDeclarations} hoisted the list so far
 * @param {Statement | ModuleDeclaration} declaration what to add
 * @returns {HoistedDeclarations} the list holding it
 */
const addHoistedDeclaration = (hoisted, declaration) => {
	if (hoisted === EMPTY_HOISTED_DECLARATIONS) return [declaration];
	hoisted.push(declaration);
	return hoisted;
};

/**
 * Collect the declarations that hoist to one scope, for an AST that did not
 * come from webpack's parser and so carries no record of its own.
 * @param {(Statement | ModuleDeclaration)[]} statements the scope's statements
 * @param {HoistedDeclarations} hoisted the list so far
 * @returns {HoistedDeclarations} the list holding what they declare
 */
const collectHoistedDeclarations = (statements, hoisted) => {
	for (let index = 0, len = statements.length; index < len; index++) {
		hoisted = collectHoistedDeclaration(statements[index], hoisted);
	}
	return hoisted;
};

/**
 * Collect from one statement, descending exactly as far as a `var` reaches:
 * through blocks and loop bodies, never into another function.
 * @param {Statement | ModuleDeclaration} statement the statement
 * @param {HoistedDeclarations} hoisted the list so far
 * @returns {HoistedDeclarations} the list holding what it declares
 */
const collectHoistedDeclaration = (statement, hoisted) => {
	switch (statement.type) {
		case "VariableDeclaration":
			if (statement.kind === "var") {
				hoisted = addHoistedDeclaration(hoisted, statement);
			}
			break;
		case "FunctionDeclaration":
		case "ClassDeclaration":
			hoisted = addHoistedDeclaration(hoisted, statement);
			break;
		case "BlockStatement":
			hoisted = collectHoistedDeclarations(statement.body, hoisted);
			break;
		case "IfStatement":
			hoisted = collectHoistedDeclaration(statement.consequent, hoisted);
			if (statement.alternate) {
				hoisted = collectHoistedDeclaration(statement.alternate, hoisted);
			}
			break;
		case "ForStatement":
			if (statement.init && statement.init.type === "VariableDeclaration") {
				hoisted = collectHoistedDeclaration(statement.init, hoisted);
			}
			hoisted = collectHoistedDeclaration(statement.body, hoisted);
			break;
		case "ForInStatement":
		case "ForOfStatement":
			if (statement.left.type === "VariableDeclaration") {
				hoisted = collectHoistedDeclaration(statement.left, hoisted);
			}
			hoisted = collectHoistedDeclaration(statement.body, hoisted);
			break;
		case "WhileStatement":
		case "DoWhileStatement":
		case "LabeledStatement":
		case "WithStatement":
			hoisted = collectHoistedDeclaration(statement.body, hoisted);
			break;
		case "TryStatement":
			hoisted = collectHoistedDeclaration(statement.block, hoisted);
			if (statement.handler) {
				hoisted = collectHoistedDeclaration(statement.handler.body, hoisted);
			}
			if (statement.finalizer) {
				hoisted = collectHoistedDeclaration(statement.finalizer, hoisted);
			}
			break;
		case "SwitchStatement": {
			const cases = statement.cases;
			for (let index = 0, len = cases.length; index < len; index++) {
				hoisted = collectHoistedDeclarations(cases[index].consequent, hoisted);
			}
			break;
		}
	}
	return hoisted;
};

/**
 * What the program imports and re-exports: the parser's own record, or a scan
 * of the top-level statements for an AST some other parser built.
 * @param {Program} ast the program
 * @param {boolean} trusted whether the parser's own record may be read
 * @returns {ModuleDeclarations} the declarations, in source order
 */
const moduleDeclarationsOf = (ast, trusted) => {
	if (trusted) {
		const recorded =
			/** @type {Program & { [MODULE_DECLARATIONS]?: ModuleDeclarations }} */
			(ast)[MODULE_DECLARATIONS];
		if (recorded !== undefined) return recorded;
	}
	/** @type {ModuleDeclarations} */
	let declarations = EMPTY_MODULE_DECLARATIONS;
	const body = ast.body;
	for (let index = 0, len = body.length; index < len; index++) {
		const statement = body[index];
		if (MODULE_STATEMENT_TYPES.has(statement.type)) {
			if (declarations === EMPTY_MODULE_DECLARATIONS) declarations = [];
			declarations.push(statement, index === 0 ? undefined : body[index - 1]);
		}
	}
	return declarations;
};

/**
 * Parses as the goal asks, an `auto` source as a module and then, where that
 * fails, as a script, reporting the module parse's error when both fail.
 * @template T
 * @param {"module" | "script" | "auto"} type the goal the parser was made for
 * @param {(sourceType: "module" | "script" | "auto") => T} parseAs parses as one goal
 * @returns {T} what the parse that succeeded returned
 */
const parseInGoal = (type, parseAs) => {
	if (type !== "auto") return parseAs(type);
	try {
		return parseAs("auto");
	} catch (error) {
		try {
			return parseAs("script");
		} catch (_err) {
			throw error;
		}
	}
};

/**
 * `collectHoistedDeclarations` for a list of statements of the tree, by id.
 * @param {SyntaxTree} tree the tree
 * @param {number} owner the node holding the list
 * @param {number} field the `Field` holding the statements
 * @param {number[]} hoisted the declarations found so far, added to
 * @returns {void}
 */
const collectHoistedDeclarationsNode = (tree, owner, field, hoisted) => {
	const count = tree.fieldCount(field, owner);
	for (let index = 0; index < count; index++) {
		collectHoistedDeclarationNode(
			tree,
			tree.field(index, field, owner),
			hoisted
		);
	}
};

/**
 * `collectHoistedDeclaration` for a statement of the tree, by id.
 * @param {SyntaxTree} tree the tree
 * @param {number} id the statement, or `0` for none
 * @param {number[]} hoisted the declarations found so far, added to
 * @returns {void}
 */
const collectHoistedDeclarationNode = (tree, id, hoisted) => {
	switch (tree.type(id)) {
		case NodeType.VariableDeclaration:
			if (tree.textOf(Part.kind, id) === "var") hoisted.push(id);
			break;
		case NodeType.FunctionDeclaration:
		case NodeType.ClassDeclaration:
			hoisted.push(id);
			break;
		case NodeType.BlockStatement:
			collectHoistedDeclarationsNode(tree, id, Field.body, hoisted);
			break;
		case NodeType.IfStatement:
			collectHoistedDeclarationNode(
				tree,
				tree.field(0, Field.consequent, id),
				hoisted
			);
			collectHoistedDeclarationNode(
				tree,
				tree.field(0, Field.alternate, id),
				hoisted
			);
			break;
		case NodeType.ForStatement: {
			const init = tree.field(0, Field.init, id);
			if (tree.type(init) === NodeType.VariableDeclaration) {
				collectHoistedDeclarationNode(tree, init, hoisted);
			}
			collectHoistedDeclarationNode(
				tree,
				tree.field(0, Field.body, id),
				hoisted
			);
			break;
		}
		case NodeType.ForInStatement:
		case NodeType.ForOfStatement: {
			const left = tree.field(0, Field.left, id);
			if (tree.type(left) === NodeType.VariableDeclaration) {
				collectHoistedDeclarationNode(tree, left, hoisted);
			}
			collectHoistedDeclarationNode(
				tree,
				tree.field(0, Field.body, id),
				hoisted
			);
			break;
		}
		case NodeType.WhileStatement:
		case NodeType.DoWhileStatement:
		case NodeType.LabeledStatement:
		case NodeType.WithStatement:
			collectHoistedDeclarationNode(
				tree,
				tree.field(0, Field.body, id),
				hoisted
			);
			break;
		case NodeType.TryStatement: {
			collectHoistedDeclarationNode(
				tree,
				tree.field(0, Field.block, id),
				hoisted
			);
			const handler = tree.field(0, Field.handler, id);
			if (handler !== 0) {
				collectHoistedDeclarationNode(
					tree,
					tree.field(0, Field.body, handler),
					hoisted
				);
			}
			collectHoistedDeclarationNode(
				tree,
				tree.field(0, Field.finalizer, id),
				hoisted
			);
			break;
		}
		case NodeType.SwitchStatement: {
			const count = tree.fieldCount(Field.cases, id);
			for (let index = 0; index < count; index++) {
				collectHoistedDeclarationsNode(
					tree,
					tree.field(index, Field.cases, id),
					Field.consequent,
					hoisted
				);
			}
			break;
		}
	}
};

/**
 * What hoists to the scope the node opens: the parser's own record, or a walk
 * of the body for an AST some other parser built.
 * @param {Program | BlockStatement} node the node owning the scope
 * @param {boolean} trusted whether the parser's own record may be read
 * @param {SyntaxTree=} tree the tree the node is a lazy object of, which is read in place
 * @returns {HoistedDeclarations} the declarations, in source order
 */
const hoistedDeclarationsOf = (node, trusted, tree) => {
	if (tree !== undefined) {
		const owner = tree.nodeOf(/** @type {Node} */ (node));
		if (owner !== 0) {
			/** @type {number[]} */
			const ids = [];
			collectHoistedDeclarationsNode(tree, owner, Field.body, ids);
			if (ids.length === 0) return EMPTY_HOISTED_DECLARATIONS;
			return /** @type {HoistedDeclarations} */ (/** @type {unknown} */ (ids));
		}
	}
	if (trusted) {
		const recorded =
			/** @type {(Program | BlockStatement) & { [HOISTED_DECLARATIONS]?: HoistedDeclarations }} */
			(node)[HOISTED_DECLARATIONS];
		if (recorded !== undefined) return recorded;
	}
	return collectHoistedDeclarations(node.body, EMPTY_HOISTED_DECLARATIONS);
};

/**
 * Whether a statement is one of the list's own, or the declaration of an
 * `export` that is, rather than nested in one of them. It is found by its start
 * offset since the list is in source order.
 * @param {(Statement | ModuleDeclaration)[]} statements the list
 * @param {Statement | ModuleDeclaration | MaybeNamedFunctionDeclaration} statement the statement to find
 * @returns {boolean} whether the list holds it directly
 */
const holdsStatement = (statements, statement) => {
	const start = /** @type {Range} */ (statement.range)[0];
	let low = 0;
	let high = statements.length - 1;
	while (low <= high) {
		const middle = (low + high) >>> 1;
		const candidate = statements[middle];
		if (candidate === statement) return true;
		if (/** @type {Range} */ (candidate.range)[0] < start) low = middle + 1;
		else high = middle - 1;
	}
	// the last statement starting before it is the one that could hold it
	const holder = high >= 0 ? statements[high] : undefined;
	return (
		holder !== undefined &&
		(holder.type === "ExportNamedDeclaration" ||
			holder.type === "ExportDefaultDeclaration") &&
		holder.declaration === statement
	);
};

/**
 * `holdsStatement` by id: whether a node's `body` holds a statement directly,
 * or as the declaration of an `export`, found by its start offset.
 * @param {SyntaxTree} tree the tree
 * @param {number} owner the program or block
 * @param {number} statement the statement to find
 * @returns {boolean} whether the body holds it directly
 */
const holdsStatementNode = (tree, owner, statement) => {
	const start = tree.start(statement);
	let low = 0;
	let high = tree.fieldCount(Field.body, owner) - 1;
	while (low <= high) {
		const middle = (low + high) >>> 1;
		const candidate = tree.field(middle, Field.body, owner);
		if (candidate === statement) return true;
		if (tree.start(candidate) < start) low = middle + 1;
		else high = middle - 1;
	}
	// the last statement starting before it is the one that could hold it
	if (high < 0) return false;
	const holder = tree.field(high, Field.body, owner);
	const type = tree.type(holder);
	return (
		(type === NodeType.ExportNamedDeclaration ||
			type === NodeType.ExportDefaultDeclaration) &&
		tree.field(0, Field.declaration, holder) === statement
	);
};

/**
 * Which statements of a list declare into its block scope, scanned for an AST
 * some other parser built. The parser's own record is read instead when there
 * is one.
 * @param {(Statement | ModuleDeclaration)[]} statements the list
 * @returns {BlockDeclarations} their indices, in source order
 */
const collectBlockDeclarations = (statements) => {
	let mask = 0;
	/** @type {number[] | undefined} */
	let overflow;
	for (let index = 0, len = statements.length; index < len; index++) {
		if (!declaresIntoBlock(statements[index])) continue;
		if (overflow !== undefined) overflow.push(index);
		else if (index <= MAX_MASKED_INDEX) mask |= 1 << index;
		else overflow = overflowFrom(mask, index);
	}
	return overflow === undefined ? mask : overflow;
};

/**
 * `collectBlockDeclarations` for a list of statements of the tree, by id.
 * @param {SyntaxTree} tree the tree
 * @param {number} owner the node holding the list
 * @param {number} field the `Field` holding the statements
 * @returns {BlockDeclarations} which of them declare, as `collectBlockDeclarations` reports
 */
const collectBlockDeclarationsNode = (tree, owner, field) => {
	let mask = 0;
	/** @type {number[] | undefined} */
	let overflow;
	const count = tree.fieldCount(field, owner);
	for (let index = 0; index < count; index++) {
		const statement = tree.field(index, field, owner);
		let declares;
		switch (tree.type(statement)) {
			case NodeType.VariableDeclaration:
			case NodeType.FunctionDeclaration:
			case NodeType.ClassDeclaration:
			case NodeType.ExportNamedDeclaration:
			case NodeType.ExportDefaultDeclaration:
				declares = true;
				break;
			case NodeType.ExpressionStatement: {
				const expression = tree.field(0, Field.expression, statement);
				declares =
					tree.type(expression) === NodeType.AssignmentExpression &&
					tree.type(tree.field(0, Field.left, expression)) ===
						NodeType.ObjectPattern;
				break;
			}
			default:
				declares = false;
		}
		if (!declares) continue;
		if (overflow !== undefined) overflow.push(index);
		else if (index <= MAX_MASKED_INDEX) mask |= 1 << index;
		else overflow = overflowFrom(mask, index);
	}
	return overflow === undefined ? mask : overflow;
};

/**
 * @param {Comment} comment comment to compare
 * @param {number} position source offset
 * @returns {number} comparison of the comment end with the offset
 */
const compareCommentEnd = (comment, position) =>
	/** @type {Range} */ (comment.range)[1] - position;

/**
 * Whether the source between two offsets is whitespace only.
 * @param {string} source the module source
 * @param {number} start where to start
 * @param {number} end where to stop
 * @returns {boolean} whether nothing but whitespace lies between them
 */
const onlyWhitespaceBetween = (source, start, end) => {
	for (let index = start; index < end; index++) {
		const code = source.charCodeAt(index);
		// the classification `skipSpace` uses: anything else is a token, and a
		// token means the run of comments before the statement has ended
		if (
			code !== 32 &&
			code !== 160 &&
			!(code > 8 && code < 14) &&
			!(code >= 5760 && nonASCIIwhitespace.test(source[index]))
		) {
			return false;
		}
	}
	return true;
};

const CLASS_NAME = "JavascriptParser";

// Reserved words in strict mode, so unusable as binding names there (12.7.2).
const STRICT_MODE_RESERVED_WORDS = new Set([
	"implements",
	"interface",
	"let",
	"package",
	"private",
	"protected",
	"public",
	"static",
	"yield"
]);

const STRICT_MODE_OUTPUT_REASON =
	"The output is an ES module, which runs in strict mode.";
// `await` is reserved by the module goal rather than by strict mode itself.
const MODULE_GOAL_OUTPUT_REASON =
	'The output is an ES module, where "await" is a reserved word.';

/** @typedef {SyncBailHook<[Node], boolean | void>} PathHook a hook of `PATH_HOOK_NODES`, as their table reads them */
/** @typedef {JavascriptParser["hooks"]} PathHooks */
/**
 * The hooks of a hook map by name, as a method calling them reads them: a map
 * whose hooks also take `{ path: true }` taps is one too.
 * @template T the arguments
 * @template R the result
 * @typedef {{ get(key: string | symbol): SyncBailHook<T, R> | undefined }} HooksByName
 */

/**
 * The hooks a `{ path: true }` tap can read through the path, each with a bit
 * for every argument that is a node: bit 0 for the first, bit 1 for the next.
 * @type {Partial<Record<keyof PathHooks, number>>}
 */
const PATH_HOOK_NODES = {
	evaluateTypeof: 1,
	evaluate: 1,
	evaluateIdentifier: 1,
	evaluateDefinedIdentifier: 1,
	evaluateNewExpression: 1,
	evaluateCallExpression: 1,
	evaluateCallExpressionMember: 1,
	isPure: 1,
	preStatement: 1,
	preStatementByType: 1,
	blockPreStatement: 1,
	blockPreStatementByType: 1,
	statement: 1,
	statementIf: 1,
	collectGuards: 1,
	classExtendsExpression: 3,
	classBodyElement: 3,
	classBodyValue: 7,
	label: 1,
	import: 1,
	importSpecifier: 1,
	export: 1,
	exportImport: 1,
	exportDeclaration: 3,
	exportExpression: 3,
	exportSpecifier: 1,
	exportImportSpecifier: 1,
	preDeclarator: 3,
	declarator: 3,
	varDeclaration: 1,
	varDeclarationLet: 1,
	varDeclarationConst: 1,
	varDeclarationUsing: 1,
	varDeclarationVar: 1,
	pattern: 1,
	collectDestructuringAssignmentProperties: 1,
	canRename: 1,
	rename: 1,
	assign: 1,
	write: 1,
	writeMemberChain: 1,
	assignMemberChain: 1,
	typeof: 1,
	importCall: 3,
	topLevelAwait: 1,
	call: 1,
	callMemberChain: 1,
	memberChainOfCallMemberChain: 5,
	callMemberChainOfCallMemberChain: 5,
	optionalChaining: 1,
	new: 1,
	binaryExpression: 1,
	expression: 1,
	expressionMemberChain: 1,
	unhandledExpressionMemberChain: 1,
	expressionConditionalOperator: 1,
	expressionLogicalOperator: 1,
	program: 1,
	terminate: 1,
	finish: 1,
	unusedStatement: 1
};

/**
 * A node argument a `{ path: true }` tap gets: its id in the view, `0` for none.
 * @param {EstreeView} view the view
 * @param {Node | null | undefined} node the argument
 * @returns {number} its id
 */
const nodeIdOf = (view, node) =>
	node === null || node === undefined ? 0 : view.add(node);

/**
 * A node argument a `{ path: true }` tap gets while the parse walks the tree:
 * an id the walk passed as it is, a lazy object of the tree as its id.
 * @param {SyntaxTree} tree the tree
 * @param {unknown} node the argument
 * @returns {number} its id, `0` for none, `-1` for an object of no tree's
 */
const treeIdOf = (tree, node) => {
	if (typeof node === "number") return node;
	if (node === null || node === undefined) return 0;
	return tree.nodeOf(/** @type {Node} */ (node)) || -1;
};

// The ESTree type of each `NodeType`, the key `hooks.evaluate` is read by.
/** @type {string[]} */
const NODE_TYPE_NAMES = [];
for (const name of Object.keys(NodeType)) {
	NODE_TYPE_NAMES[/** @type {Record<string, number>} */ (NodeType)[name]] =
		name;
}

/**
 * A tap without `path` on a hook the id walk calls: each node argument it
 * passes as an id reaches the tap as the node's object, made on first use.
 * @template R
 * @param {(...args: EXPECTED_ANY[]) => R} fn the tap's function
 * @param {number} nodes a bit for each argument that is a node
 * @param {JavascriptParser} parser the parser
 * @returns {(...args: EXPECTED_ANY[]) => R} the function to tap instead
 */
const objectTapOf = (fn, nodes, parser) => {
	/**
	 * @param {unknown} arg an argument
	 * @param {number} bit its bit in `nodes`
	 * @returns {unknown} the argument, a node id as its object
	 */
	const objectOf = (arg, bit) =>
		(nodes & bit) !== 0 && typeof arg === "number" && arg !== 0
			? /** @type {SyntaxTree} */ (parser._tree).estree(arg)
			: arg;
	return (
		/** @type {unknown} */ a,
		/** @type {unknown} */ b,
		/** @type {unknown} */ c,
		/** @type {unknown} */ d,
		/** @type {unknown} */ e
	) => fn(objectOf(a, 1), objectOf(b, 2), objectOf(c, 4), d, e);
};

/**
 * Lets a hook take `{ path: true }` taps: such a tap gets the path, then each
 * node argument as its id. Other taps are tapped as they are, and the hook
 * gets no interceptor, so a call to it compiles as before.
 * @template T
 * @template R
 * @param {SyncBailHook<T, R>} hook the hook
 * @param {number} nodes a bit for each argument that is a node
 * @param {JavascriptParser} parser the parser whose parse the path reads
 * @returns {void}
 */
const takePathTaps = (hook, nodes, parser) => {
	const tap = hook.tap;
	hook.tap = (options, fn) => {
		if (
			typeof options !== "object" ||
			options === null ||
			/** @type {{ path?: boolean }} */ (options).path !== true
		) {
			// TODO in the next major release: remove ESTree object taps and arguments; plugins call toEstreeObject
			return tap.call(
				hook,
				options,
				parser._idHooks &&
					/** @type {{ ids?: boolean }} */ (options).ids !== true
					? /** @type {(...args: AsArray<T>) => R} */ (
							objectTapOf(fn, nodes, parser)
						)
					: fn
			);
		}
		const pathFn =
			/** @type {(path: JavascriptNodeReader, ...args: (AsArray<T>[number] | number)[]) => R} */ (
				fn
			);
		/** @type {(...args: AsArray<T>[number][]) => R} */
		const general = (
			/** @type {AsArray<T>[number]} */ a,
			/** @type {AsArray<T>[number]} */ b,
			/** @type {AsArray<T>[number]} */ c,
			/** @type {AsArray<T>[number]} */ d,
			/** @type {AsArray<T>[number]} */ e
		) => {
			const tree = parser._tree;
			if (tree !== undefined) {
				const ia = (nodes & 1) !== 0 ? treeIdOf(tree, a) : a;
				const ib = (nodes & 2) !== 0 ? treeIdOf(tree, b) : b;
				const ic = (nodes & 4) !== 0 ? treeIdOf(tree, c) : c;
				if (ia !== -1 && ib !== -1 && ic !== -1) {
					return pathFn(
						/** @type {JavascriptNodeReader} */ (/** @type {unknown} */ (tree)),
						ia,
						ib,
						ic,
						d,
						e
					);
				}
			}
			const view = parser._pathViewOf();
			return pathFn(
				view,
				(nodes & 1) !== 0 ? nodeIdOf(view, /** @type {Node} */ (a)) : a,
				(nodes & 2) !== 0 ? nodeIdOf(view, /** @type {Node} */ (b)) : b,
				(nodes & 4) !== 0 ? nodeIdOf(view, /** @type {Node} */ (c)) : c,
				d,
				e
			);
		};
		// WHY: the tree walk passes a hook its node as an id, so a hook with one
		// node, as most are, calls its path taps without converting any argument;
		// every path tap pays this wrapper, a million calls in a large build.
		const wrapper =
			nodes === 1
				? (
						/** @type {AsArray<T>[number]} */ a,
						/** @type {AsArray<T>[number]} */ b,
						/** @type {AsArray<T>[number]} */ c,
						/** @type {AsArray<T>[number]} */ d,
						/** @type {AsArray<T>[number]} */ e
					) => {
						const tree = parser._tree;
						return tree !== undefined && typeof a === "number"
							? pathFn(
									/** @type {JavascriptNodeReader} */ (
										/** @type {unknown} */ (tree)
									),
									a,
									b,
									c,
									d,
									e
								)
							: general(a, b, c, d, e);
					}
				: general;
		return tap.call(
			hook,
			options,
			/** @type {(...args: AsArray<T>) => R} */ (wrapper)
		);
	};
};

/**
 * @extends {Parser<BuiltJavascriptModule>}
 */
class JavascriptParser extends Parser {
	/**
	 * Creates an instance of JavascriptParser.
	 * @param {"module" | "script" | "auto"=} sourceType default source type
	 * @param {{ parse?: ParseFunction, typescript?: boolean, importPhases?: boolean, strictModeViolations?: "error" | "warn" | false }=} options parser options
	 */
	constructor(sourceType = "auto", options = {}) {
		super();
		this.hooks = Object.freeze({
			evaluateTypeof: new HookMap(
				() =>
					/** @type {PathTaps<[number], BasicEvaluatedExpression | null | undefined> & SyncBailHook<[UnaryExpression], BasicEvaluatedExpression | null | undefined>} */ (
						new SyncBailHook(["expression"])
					)
			),
			evaluate: new HookMap(
				() =>
					/** @type {PathTaps<[number], BasicEvaluatedExpression | null | undefined> & SyncBailHook<[Expression | SpreadElement | PrivateIdentifier | Super], BasicEvaluatedExpression | null | undefined>} */ (
						new SyncBailHook(["expression"])
					)
			),
			evaluateIdentifier: new HookMap(
				() =>
					/** @type {PathTaps<[number], BasicEvaluatedExpression | null | undefined> & SyncBailHook<[Identifier | ThisExpression | MemberExpression | MetaProperty], BasicEvaluatedExpression | null | undefined>} */ (
						new SyncBailHook(["expression"])
					)
			),
			evaluateDefinedIdentifier: new HookMap(
				() =>
					/** @type {PathTaps<[number], BasicEvaluatedExpression | null | undefined> & SyncBailHook<[Identifier | ThisExpression | MemberExpression], BasicEvaluatedExpression | null | undefined>} */ (
						new SyncBailHook(["expression"])
					)
			),
			/**
			 * @since 5.73.0
			 */
			evaluateNewExpression: new HookMap(
				() =>
					/** @type {PathTaps<[number], BasicEvaluatedExpression | null | undefined> & SyncBailHook<[NewExpression], BasicEvaluatedExpression | null | undefined>} */ (
						new SyncBailHook(["expression"])
					)
			),
			/**
			 * @since 5.73.0
			 */
			evaluateCallExpression: new HookMap(
				() =>
					/** @type {PathTaps<[number], BasicEvaluatedExpression | null | undefined> & SyncBailHook<[CallExpression], BasicEvaluatedExpression | null | undefined>} */ (
						new SyncBailHook(["expression"])
					)
			),
			evaluateCallExpressionMember: new HookMap(
				() =>
					/** @type {PathTaps<[number, BasicEvaluatedExpression], BasicEvaluatedExpression | null | undefined> & SyncBailHook<[CallExpression, BasicEvaluatedExpression], BasicEvaluatedExpression | null | undefined>} */ (
						new SyncBailHook(["expression", "param"])
					)
			),
			isPure: new HookMap(
				() =>
					/** @type {PathTaps<[number, number], boolean | void> & SyncBailHook<[Expression | Declaration | PrivateIdentifier | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration, number], boolean | void>} */ (
						new SyncBailHook(["expression", "commentsStartPosition"])
					)
			),
			/**
			 * Every statement the hoisting pass reads, which a tap on this turns
			 * back into a walk of them all. Tap `preStatementByType` instead.
			 * @deprecated TODO in the next major release: remove, with the statement walk it turns on
			 */
			preStatement:
				/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Statement | ModuleDeclaration | MaybeNamedClassDeclaration | MaybeNamedFunctionDeclaration], boolean | void>} */ (
					new SyncBailHook(["statement"])
				),
			/**
			 * Each declaration the parser records: a variable, function or class
			 * one. Any other type turns the pass back into a walk of every
			 * statement, and goes away with that walk in the next major release.
			 * @since 5.109.0
			 */
			preStatementByType: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Statement | ModuleDeclaration | MaybeNamedClassDeclaration | MaybeNamedFunctionDeclaration], boolean | void>} */ (
						new SyncBailHook(["statement"])
					)
			),

			/**
			 * Every statement the block pass reads, which a tap on this turns back
			 * into a walk of them all. Tap `blockPreStatementByType` instead.
			 * @deprecated TODO in the next major release: remove, with the statement walk it turns on
			 */
			blockPreStatement:
				/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Statement | ModuleDeclaration | MaybeNamedClassDeclaration | MaybeNamedFunctionDeclaration], boolean | void>} */ (
					new SyncBailHook(["declaration"])
				),
			/**
			 * Each statement the parser records for the block pass: a variable, class
			 * or export declaration. Any other type turns the pass back into a walk
			 * of every statement, and goes away with that walk in the next major release.
			 * @since 5.109.0
			 */
			blockPreStatementByType: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Statement | ModuleDeclaration | MaybeNamedClassDeclaration | MaybeNamedFunctionDeclaration], boolean | void>} */ (
						new SyncBailHook(["declaration"])
					)
			),
			statement:
				/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Statement | ModuleDeclaration | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration], boolean | void>} */ (
					new SyncBailHook(["statement"])
				),
			statementIf:
				/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[IfStatement], boolean | void>} */ (
					new SyncBailHook(["statement"])
				),
			/**
			 * @since 5.105.0
			 */
			collectGuards:
				/** @type {PathTaps<[number], GuardCollection | void> & SyncBailHook<[Expression], GuardCollection | void>} */ (
					new SyncBailHook(["expression"])
				),
			classExtendsExpression:
				/** @type {PathTaps<[number, number], boolean | void> & SyncBailHook<[Expression, ClassExpression | ClassDeclaration | MaybeNamedClassDeclaration], boolean | void>} */ (
					new SyncBailHook(["expression", "classDefinition"])
				),
			classBodyElement:
				/** @type {PathTaps<[number, number], boolean | void> & SyncBailHook<[MethodDefinition | PropertyDefinition | StaticBlock, ClassExpression | ClassDeclaration | MaybeNamedClassDeclaration], boolean | void>} */ (
					new SyncBailHook(["element", "classDefinition"])
				),
			/**
			 * @since 5.36.0
			 */
			classBodyValue:
				/** @type {PathTaps<[number, number, number], boolean | void> & SyncBailHook<[Expression, MethodDefinition | PropertyDefinition, ClassExpression | ClassDeclaration | MaybeNamedClassDeclaration], boolean | void>} */ (
					new SyncBailHook(["expression", "element", "classDefinition"])
				),
			label: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[LabeledStatement], boolean | void>} */ (
						new SyncBailHook(["statement"])
					)
			),
			import:
				/** @type {PathTaps<[number, ImportSource], boolean | void> & SyncBailHook<[ImportDeclaration, ImportSource], boolean | void>} */ (
					new SyncBailHook(["statement", "source"])
				),
			importSpecifier:
				/** @type {PathTaps<[number, ImportSource, string | null, string], boolean | void> & SyncBailHook<[ImportDeclaration, ImportSource, string | null, string], boolean | void>} */ (
					new SyncBailHook([
						"statement",
						"source",
						"exportName",
						"identifierName"
					])
				),
			export:
				/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[ExportDefaultDeclaration | ExportNamedDeclaration], boolean | void>} */ (
					new SyncBailHook(["statement"])
				),
			exportImport:
				/** @type {PathTaps<[number, ImportSource], boolean | void> & SyncBailHook<[ExportNamedDeclaration | ExportAllDeclaration, ImportSource], boolean | void>} */ (
					new SyncBailHook(["statement", "source"])
				),
			exportDeclaration:
				/** @type {PathTaps<[number, number], boolean | void> & SyncBailHook<[ExportDefaultDeclaration | ExportNamedDeclaration | ExportAllDeclaration, Declaration], boolean | void>} */ (
					new SyncBailHook(["statement", "declaration"])
				),
			exportExpression:
				/** @type {PathTaps<[number, number], boolean | void> & SyncBailHook<[ExportDefaultDeclaration, MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration | Expression], boolean | void>} */ (
					new SyncBailHook(["statement", "node"])
				),
			exportSpecifier:
				/** @type {PathTaps<[number, string, string, number | undefined], boolean | void> & SyncBailHook<[ExportDefaultDeclaration | ExportNamedDeclaration | ExportAllDeclaration, string, string, number | undefined], boolean | void>} */ (
					new SyncBailHook([
						"statement",
						"identifierName",
						"exportName",
						"index"
					])
				),
			exportImportSpecifier:
				/** @type {PathTaps<[number, ImportSource, string | null, string | null, number | undefined], boolean | void> & SyncBailHook<[ExportNamedDeclaration | ExportAllDeclaration, ImportSource, string | null, string | null, number | undefined], boolean | void>} */ (
					new SyncBailHook([
						"statement",
						"source",
						"identifierName",
						"exportName",
						"index"
					])
				),
			preDeclarator:
				/** @type {PathTaps<[number, number], boolean | void> & SyncBailHook<[VariableDeclarator, VariableDeclaration], boolean | void>} */ (
					new SyncBailHook(["declarator", "statement"])
				),
			declarator:
				/** @type {PathTaps<[number, number], boolean | void> & SyncBailHook<[VariableDeclarator, Statement], boolean | void>} */ (
					new SyncBailHook(["declarator", "statement"])
				),
			varDeclaration: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Identifier], boolean | void>} */ (
						new SyncBailHook(["declaration"])
					)
			),
			varDeclarationLet: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Identifier], boolean | void>} */ (
						new SyncBailHook(["declaration"])
					)
			),
			varDeclarationConst: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Identifier], boolean | void>} */ (
						new SyncBailHook(["declaration"])
					)
			),
			/**
			 * @since 5.100.0
			 */
			varDeclarationUsing: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Identifier], boolean | void>} */ (
						new SyncBailHook(["declaration"])
					)
			),
			varDeclarationVar: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Identifier], boolean | void>} */ (
						new SyncBailHook(["declaration"])
					)
			),
			pattern: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Identifier], boolean | void>} */ (
						new SyncBailHook(["pattern"])
					)
			),
			/**
			 * @since 5.101.3
			 */
			collectDestructuringAssignmentProperties:
				/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Expression], boolean | void>} */ (
					new SyncBailHook(["expression"])
				),
			canRename: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Expression], boolean | void>} */ (
						new SyncBailHook(["initExpression"])
					)
			),
			rename: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Expression], boolean | void>} */ (
						new SyncBailHook(["initExpression"])
					)
			),
			assign: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[AssignmentExpression], boolean | void>} */ (
						new SyncBailHook(["expression"])
					)
			),
			write: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[WriteStatement], boolean | void>} */ (
						new SyncBailHook(["node"])
					)
			),
			writeMemberChain: new HookMap(
				() =>
					/** @type {PathTaps<[number, Members], boolean | void> & SyncBailHook<[WriteStatement, Members], boolean | void>} */ (
						new SyncBailHook(["node", "members"])
					)
			),
			assignMemberChain: new HookMap(
				() =>
					/** @type {PathTaps<[number, Members], boolean | void> & SyncBailHook<[AssignmentExpression, Members], boolean | void>} */ (
						new SyncBailHook(["expression", "members"])
					)
			),
			typeof: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Expression], boolean | void>} */ (
						new SyncBailHook(["expression"])
					)
			),
			importCall:
				/** @type {PathTaps<[number, number], boolean | void> & SyncBailHook<[ImportExpression, CallExpression?], boolean | void>} */ (
					new SyncBailHook(["expression", "importThen"])
				),
			topLevelAwait:
				/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Expression | ForOfStatement | VariableDeclaration], boolean | void>} */ (
					new SyncBailHook(["expression"])
				),
			call: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[CallExpression], boolean | void>} */ (
						new SyncBailHook(["expression"])
					)
			),
			/** Something like "a.b()" */
			callMemberChain: new HookMap(
				() =>
					/** @type {PathTaps<[number, Members, MembersOptionals, MemberRanges], boolean | void> & SyncBailHook<[CallExpression, Members, MembersOptionals, MemberRanges], boolean | void>} */ (
						new SyncBailHook([
							"expression",
							"members",
							"membersOptionals",
							"memberRanges"
						])
					)
			),
			/** Something like "a.b().c.d" */
			memberChainOfCallMemberChain: new HookMap(
				() =>
					/** @type {PathTaps<[number, CalleeMembers, number, Members, MemberRanges], boolean | void> & SyncBailHook<[Expression, CalleeMembers, CallExpression, Members, MemberRanges], boolean | void>} */ (
						new SyncBailHook([
							"expression",
							"calleeMembers",
							"callExpression",
							"members",
							"memberRanges"
						])
					)
			),
			/** Something like "a.b().c.d()"" */
			callMemberChainOfCallMemberChain: new HookMap(
				() =>
					/** @type {PathTaps<[number, CalleeMembers, number, Members, MemberRanges], boolean | void> & SyncBailHook<[CallExpression, CalleeMembers, CallExpression, Members, MemberRanges], boolean | void>} */ (
						new SyncBailHook([
							"expression",
							"calleeMembers",
							"innerCallExpression",
							"members",
							"memberRanges"
						])
					)
			),
			optionalChaining:
				/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[ChainExpression], boolean | void>} */ (
					new SyncBailHook(["optionalChaining"])
				),
			new: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[NewExpression], boolean | void>} */ (
						new SyncBailHook(["expression"])
					)
			),
			/**
			 * @since 5.71.0
			 */
			binaryExpression:
				/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[BinaryExpression], boolean | void>} */ (
					new SyncBailHook(["binaryExpression"])
				),
			expression: new HookMap(
				() =>
					/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Expression], boolean | void>} */ (
						new SyncBailHook(["expression"])
					)
			),
			expressionMemberChain: new HookMap(
				() =>
					/** @type {PathTaps<[number, Members, MembersOptionals, MemberRanges], boolean | void> & SyncBailHook<[MemberExpression, Members, MembersOptionals, MemberRanges], boolean | void>} */ (
						new SyncBailHook([
							"expression",
							"members",
							"membersOptionals",
							"memberRanges"
						])
					)
			),
			unhandledExpressionMemberChain: new HookMap(
				() =>
					/** @type {PathTaps<[number, Members], boolean | void> & SyncBailHook<[MemberExpression, Members], boolean | void>} */ (
						new SyncBailHook(["expression", "members"])
					)
			),
			expressionConditionalOperator:
				/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[ConditionalExpression], boolean | void>} */ (
					new SyncBailHook(["expression"])
				),
			expressionLogicalOperator:
				/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[LogicalExpression], boolean | void>} */ (
					new SyncBailHook(["expression"])
				),
			// A tap with `{ name, path: true }` reads the program through the path
			// (experimental); any other tap gets its ESTree object.
			program:
				/** @type {PathTaps<[number, Comment[]], boolean | void> & SyncBailHook<[Program, Comment[]], boolean | void>} */ (
					new SyncBailHook(["ast", "comments"])
				),
			/**
			 * @since 5.99.0
			 */
			terminate:
				/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[ThrowStatement | ReturnStatement], boolean | void>} */ (
					new SyncBailHook(["statement"])
				),
			finish:
				/** @type {PathTaps<[number, Comment[]], boolean | void> & SyncBailHook<[Program, Comment[]], boolean | void>} */ (
					new SyncBailHook(["ast", "comments"])
				),
			/**
			 * @since 5.99.9
			 */
			unusedStatement:
				/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[Statement], boolean | void>} */ (
					new SyncBailHook(["statement"])
				)
		});
		this.sourceType = sourceType;
		this.options = options;

		/** @type {ScopeInfo} */
		this.scope = /** @type {ScopeInfo} */ (
			/** @type {ScopeInfo | undefined} */ (undefined)
		);
		/** @type {JavascriptParserState} */
		this.state = /** @type {JavascriptParserState} */ (
			/** @type {JavascriptParserState | undefined} */ (undefined)
		);
		/** @type {Comment[] | undefined} */
		this.comments = undefined;
		// ASI overrides keyed by statement-end offset: true forces an ASI
		// position, false forces a real semicolon. Absent offsets are derived
		// from the source text. Allocated lazily by set/unsetAsiPosition.
		/** @type {Map<number, boolean> | undefined} */
		this.semicolons = undefined;
		// the statements the walk is in, innermost last: the tree walk keeps a
		// statement as its id until `statementPath` is read
		/** @type {(StatementPathItem | number)[] | undefined} */
		this._statementPath = undefined;
		/** @type {StatementPathItem | number | undefined} */
		this._prevStatement = undefined;
		/** @type {boolean} */
		this._hasParserRecord = false;
		// internal: parse into the syntax tree and walk its lazy objects, which
		// build only what the walk and the taps read
		// TODO in the next major release: remove the ESTree walk and this switch; walk a preparsed AST through fromEstreeObject
		/** @type {boolean} */
		this._walkTree = true;
		// the tree the walk reads by id, while `_walkTree` parses into one
		/** @type {SyntaxTree | undefined} */
		this._tree = undefined;
		// whether the hooks the id walk calls hand a tap without `path` objects
		this._idHooks = false;
		// The view `{ path: true }` taps read the parse's nodes through, made on
		// the first such tap of a parse, and one kept for the next parse.
		/** @type {EstreeView | undefined} */
		this._pathView = undefined;
		/** @type {EstreeView | undefined} */
		this._sparePathView = undefined;
		// The program being parsed, whose directives the view marks.
		/** @type {Program | undefined} */
		this._pathProgram = undefined;
		for (const name of /** @type {(keyof PathHooks)[]} */ (
			Object.keys(PATH_HOOK_NODES)
		)) {
			const hook = /** @type {PathHook | HookMap<PathHook>} */ (
				this.hooks[name]
			);
			const nodes = /** @type {number} */ (PATH_HOOK_NODES[name]);
			if (hook instanceof HookMap) {
				hook.intercept(
					/** @type {{ factory: (key: string, made: PathHook) => PathHook }} */ ({
						factory: (key, made) => {
							takePathTaps(made, nodes, this);
							return made;
						}
					})
				);
			} else {
				takePathTaps(hook, nodes, this);
			}
		}
		// the scope last hoisted into, whose statements its block pass reads next,
		// as its node in the tree walk
		/** @type {Program | BlockStatement | number | undefined} */
		this._scopeOwner = undefined;
		// BACKWARD-COMPAT START

		// WHY: the hoisting pass reaches declarations alone, so a tap that
		// expects every statement would quietly stop seeing most of them. Such a
		// tap turns the pass back into the walk it used to be, which no build
		// webpack's own plugins drive ever asks for.
		/** @type {boolean} */
		this._needsFullPreWalk = false;
		this.hooks.preStatementByType.intercept({
			factory: (/** @type {string} */ type, hook) => {
				if (!RECORDED_STATEMENT_TYPES.has(type)) {
					this._needsFullPreWalk = true;
				}
				return hook;
			}
		});

		// The same for the block pass, over the types the parser records for it.
		/** @type {boolean} */
		this._needsFullBlockPreWalk = false;
		this.hooks.blockPreStatementByType.intercept({
			factory: (/** @type {string} */ type, hook) => {
				if (!BLOCK_DECLARATION_TYPES.has(type)) {
					this._needsFullBlockPreWalk = true;
				}
				return hook;
			}
		});
		// BACKWARD-COMPAT END
		/** @type {WeakMap<Expression, DestructuringAssignmentProperties> | undefined} */
		this.destructuringAssignmentProperties = undefined;
		/** @type {Map<number, DestructuringAssignmentProperties> | undefined} */
		this._destructuringNodes = undefined;
		/** @type {TagData | undefined} */
		this.currentTagData = undefined;
		// True while parsing a loose module whose code is emitted as strict ESM.
		this._strictInModuleOutput = false;
		// Source text of the current parse, for offset → line/column mapping.
		/** @type {string | undefined} */
		this._source = undefined;
		// The view an `isPure` query reads its expression through, made on
		// first use, and whether a query reads it.
		/** @type {EstreeView | undefined} */
		this._pureView = undefined;
		/** @type {SideEffectsContext | undefined} */
		this._pureViewContext = undefined;
		// the context an `isPure` query reads the parse's tree in place with
		/** @type {SideEffectsContext | undefined} */
		this._pureTreeContext = undefined;
		this._pureViewBusy = false;
		// Where the innermost `isPure` query's annotation comments may start.
		this._pureCommentsStartPos = 0;
		// Offset of each line's first character, built on first getLocation use.
		/** @type {number[] | undefined} */
		this._lineStarts = undefined;
		// The last member expression resolved, kept while the node and the scope
		// it resolved in stay the same: the walk and an evaluate of one node meet
		/** @type {Expression | Super | undefined} */
		this._memberExpression = undefined;
		/** @type {ScopeInfo | undefined} */
		this._memberScope = undefined;
		/** @type {number} */
		this._memberMask = 0;
		/** @type {0 | 1 | 2} */
		this._memberType = 0;
		/** @type {string} */
		this._memberName = "";
		/** @type {string | VariableInfo | undefined} */
		this._memberRootInfo = undefined;
		/** @type {Members} */
		this._members = EMPTY_ARRAY;
		/** @type {MembersOptionals} */
		this._membersOptionals = EMPTY_MEMBERS_OPTIONALS;
		// the root call, its id when the tree resolved it
		/** @type {CallExpression | number | undefined} */
		this._memberCall = undefined;
		// the node of the tree `_resolveMemberExpressionNode` last resolved
		this._memberNode = 0;
		/** @type {string} */
		this._memberCalleeName = "";
		/** @type {CalleeMembers} */
		this._memberCalleeMembers = EMPTY_ARRAY;
		/** @type {CallExpressionInfo | ExpressionExpressionInfo | undefined} */
		this._memberInfo = undefined;
		// True while only the parser's own taps sit on evaluate.for("Identifier");
		// recomputed per parse, gates the defined-identifier fast paths.
		this._evalIdentOwnTaps = false;
		this.magicCommentContext = createMagicCommentContext();
		// Reused for enterPatterns on every scope entry to avoid per-scope closures.
		/** @type {OnIdentString} */
		this._defineVariable = (ident) => this.defineVariable(ident);
		// The expression an identifier evaluator is running for, read by the
		// shared `_evaluateDefinedIdentifier` instead of a closure per evaluation
		/** @type {Identifier | ThisExpression | MemberExpression | undefined} */
		this._evaluatingExpression = undefined;
		/** @type {(name?: string) => BasicEvaluatedExpression | null | undefined} */
		this._evaluateDefinedIdentifier = (name) => {
			const hook = this.hooks.evaluateDefinedIdentifier.get(
				/** @type {string} */ (name)
			);
			if (hook !== undefined) {
				return hook.call(
					/** @type {Identifier | ThisExpression | MemberExpression} */
					(this._evaluatingExpression)
				);
			}
		};
		this._initializeEvaluating();
		// keyed taps are free for every other member chain, and a shadowed
		// `arguments` binding never dispatches the free-variable hooks
		this.hooks.expressionMemberChain
			.for("arguments")
			.tap(CLASS_NAME, (expression, members) => {
				if (this._strictInModuleOutput) {
					this._checkStrictModeArgumentsMember(members[0], expression);
				}
			});
		this.hooks.callMemberChain
			.for("arguments")
			.tap(CLASS_NAME, (expression, members) => {
				// longer chains re-enter the member walk, which reports them
				if (this._strictInModuleOutput && members.length === 1) {
					this._checkStrictModeArgumentsMember(members[0], expression);
				}
			});
	}

	_initializeEvaluating() {
		// `ids`: in the tree walk it reads the literal by id
		this.hooks.evaluate
			.for("Literal")
			.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				(_expr) => {
					const tree = this._tree;
					const value =
						typeof _expr === "number"
							? /** @type {SyntaxTree} */ (tree).value(_expr)
							: /** @type {Literal} */ (_expr).value;
					const range = this._rangeOf(_expr);

					switch (typeof value) {
						case "number":
							return new BasicEvaluatedExpression()
								.setNumber(value)
								.setRange(range);
						case "bigint":
							return new BasicEvaluatedExpression()
								.setBigInt(value)
								.setRange(range);
						case "string":
							return new BasicEvaluatedExpression()
								.setString(value)
								.setRange(range);
						case "boolean":
							return new BasicEvaluatedExpression()
								.setBoolean(value)
								.setRange(range);
					}
					if (value === null) {
						return new BasicEvaluatedExpression().setNull().setRange(range);
					}
					if (value instanceof RegExp) {
						return new BasicEvaluatedExpression()
							.setRegExp(value)
							.setRange(range);
					}
				}
			);
		// only `new RegExp(…)` reads the node's object
		this.hooks.evaluate
			.for("NewExpression")
			.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				(_node) => {
					const tree = this._tree;
					if (typeof _node === "number") {
						const calleeNode = /** @type {SyntaxTree} */ (tree).field(
							0,
							Field.callee,
							_node
						);
						if (
							/** @type {SyntaxTree} */ (tree).type(calleeNode) !==
							NodeType.Identifier
						) {
							return;
						}
						const calleeName = /** @type {SyntaxTree} */ (tree).name(
							calleeNode
						);
						if (calleeName !== "RegExp") {
							return this._callHooksForName1(
								this.hooks.evaluateNewExpression,
								calleeName,
								/** @type {EXPECTED_ANY} */ (_node)
							);
						}
					}
					const expr = /** @type {NewExpression} */ (
						typeof _node === "number"
							? /** @type {SyntaxTree} */ (tree).estree(_node)
							: _node
					);
					const callee = expr.callee;
					if (callee.type !== "Identifier") return;
					if (callee.name !== "RegExp") {
						return this._callHooksForName1(
							this.hooks.evaluateNewExpression,
							callee.name,
							expr
						);
					} else if (
						expr.arguments.length > 2 ||
						this.getVariableInfo("RegExp") !== "RegExp"
					) {
						return;
					}

					/** @type {undefined | string} */
					let regExp;
					const arg1 = expr.arguments[0];

					if (arg1) {
						if (arg1.type === "SpreadElement") return;

						const evaluatedRegExp = this.evaluateExpression(arg1);

						if (!evaluatedRegExp) return;

						regExp = evaluatedRegExp.asString();

						if (!regExp) return;
					} else {
						return (
							new BasicEvaluatedExpression()
								// eslint-disable-next-line prefer-regex-literals
								.setRegExp(new RegExp(""))
								.setRange(/** @type {Range} */ (expr.range))
						);
					}

					/** @type {undefined | string} */
					let flags;
					const arg2 = expr.arguments[1];

					if (arg2) {
						if (arg2.type === "SpreadElement") return;

						const evaluatedFlags = this.evaluateExpression(arg2);

						if (!evaluatedFlags) return;

						if (!evaluatedFlags.isUndefined()) {
							flags = evaluatedFlags.asString();

							if (
								flags === undefined ||
								!BasicEvaluatedExpression.isValidRegExpFlags(flags)
							) {
								return;
							}
						}
					}

					return new BasicEvaluatedExpression()
						.setRegExp(flags ? new RegExp(regExp, flags) : new RegExp(regExp))
						.setRange(/** @type {Range} */ (expr.range));
				}
			);
		// `ids`: in the tree walk it reads the expression by id
		this.hooks.evaluate
			.for("LogicalExpression")
			.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				(_expr) => {
					const expr = /** @type {LogicalExpression} */ (_expr);
					const operator = this._operatorOf(expr);

					const left = this.evaluateExpression(
						this._childOf(expr, Field.left, "left")
					);
					let returnRight = false;
					/** @type {boolean | undefined} */
					let allowedRight;
					if (operator === "&&") {
						const leftAsBool = left.asBool();
						if (leftAsBool === false) {
							return left.setRange(this._rangeOf(expr));
						}
						returnRight = leftAsBool === true;
						allowedRight = false;
					} else if (operator === "||") {
						const leftAsBool = left.asBool();
						if (leftAsBool === true) {
							return left.setRange(this._rangeOf(expr));
						}
						returnRight = leftAsBool === false;
						allowedRight = true;
					} else if (operator === "??") {
						const leftAsNullish = left.asNullish();
						if (leftAsNullish === false) {
							return left.setRange(this._rangeOf(expr));
						}
						if (leftAsNullish !== true) return;
						returnRight = true;
					} else {
						return;
					}
					const right = this.evaluateExpression(
						this._childOf(expr, Field.right, "right")
					);
					if (returnRight) {
						if (left.couldHaveSideEffects()) right.setSideEffects();
						return right.setRange(this._rangeOf(expr));
					}

					const asBool = right.asBool();

					if (allowedRight === true && asBool === true) {
						return new BasicEvaluatedExpression()
							.setRange(this._rangeOf(expr))
							.setTruthy();
					} else if (allowedRight === false && asBool === false) {
						return new BasicEvaluatedExpression()
							.setRange(this._rangeOf(expr))
							.setFalsy();
					}
				}
			);

		// `ids`: in the tree walk it reads the expression by id
		this.hooks.evaluate
			.for("BinaryExpression")
			.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				(_expr) => {
					const expr = /** @type {BinaryExpression} */ (_expr);
					const operator = this._operatorOf(expr);

					if (operator === "+") {
						const left = this.evaluateExpression(
							this._childOf(expr, Field.left, "left")
						);
						const right = this.evaluateExpression(
							this._childOf(expr, Field.right, "right")
						);
						const res = new BasicEvaluatedExpression();
						if (left.isString()) {
							if (right.isString()) {
								res.setString(
									/** @type {string} */ (left.string) +
										/** @type {string} */ (right.string)
								);
							} else if (right.isNumber()) {
								res.setString(
									/** @type {string} */ (left.string) + right.number
								);
							} else if (
								right.isWrapped() &&
								right.prefix &&
								right.prefix.isString()
							) {
								// "left" + ("prefix" + inner + "postfix")
								// => ("leftPrefix" + inner + "postfix")
								res.setWrapped(
									new BasicEvaluatedExpression()
										.setString(
											/** @type {string} */ (left.string) +
												/** @type {string} */ (right.prefix.string)
										)
										.setRange(
											joinRanges(
												/** @type {Range} */ (left.range),
												/** @type {Range} */ (right.prefix.range)
											)
										),
									right.postfix,
									right.wrappedInnerExpressions
								);
							} else if (right.isWrapped()) {
								// "left" + ([null] + inner + "postfix")
								// => ("left" + inner + "postfix")
								res.setWrapped(
									left,
									right.postfix,
									right.wrappedInnerExpressions
								);
							} else {
								// "left" + expr
								// => ("left" + expr + "")
								res.setWrapped(left, null, [right]);
							}
						} else if (left.isNumber()) {
							if (right.isString()) {
								res.setString(
									left.number + /** @type {string} */ (right.string)
								);
							} else if (right.isNumber()) {
								res.setNumber(
									/** @type {number} */ (left.number) +
										/** @type {number} */ (right.number)
								);
							} else {
								return;
							}
						} else if (left.isBigInt()) {
							if (right.isBigInt()) {
								res.setBigInt(
									/** @type {bigint} */ (left.bigint) +
										/** @type {bigint} */ (right.bigint)
								);
							}
						} else if (left.isWrapped()) {
							if (left.postfix && left.postfix.isString() && right.isString()) {
								// ("prefix" + inner + "postfix") + "right"
								// => ("prefix" + inner + "postfixRight")
								res.setWrapped(
									left.prefix,
									new BasicEvaluatedExpression()
										.setString(
											/** @type {string} */ (left.postfix.string) +
												/** @type {string} */ (right.string)
										)
										.setRange(
											joinRanges(
												/** @type {Range} */ (left.postfix.range),
												/** @type {Range} */ (right.range)
											)
										),
									left.wrappedInnerExpressions
								);
							} else if (
								left.postfix &&
								left.postfix.isString() &&
								right.isNumber()
							) {
								// ("prefix" + inner + "postfix") + 123
								// => ("prefix" + inner + "postfix123")
								res.setWrapped(
									left.prefix,
									new BasicEvaluatedExpression()
										.setString(
											/** @type {string} */ (left.postfix.string) +
												/** @type {number} */ (right.number)
										)
										.setRange(
											joinRanges(
												/** @type {Range} */ (left.postfix.range),
												/** @type {Range} */ (right.range)
											)
										),
									left.wrappedInnerExpressions
								);
							} else if (right.isString()) {
								// ("prefix" + inner + [null]) + "right"
								// => ("prefix" + inner + "right")
								res.setWrapped(
									left.prefix,
									right,
									left.wrappedInnerExpressions
								);
							} else if (right.isNumber()) {
								// ("prefix" + inner + [null]) + 123
								// => ("prefix" + inner + "123")
								res.setWrapped(
									left.prefix,
									new BasicEvaluatedExpression()
										.setString(String(right.number))
										.setRange(/** @type {Range} */ (right.range)),
									left.wrappedInnerExpressions
								);
							} else if (right.isWrapped()) {
								// ("prefix1" + inner1 + "postfix1") + ("prefix2" + inner2 + "postfix2")
								// ("prefix1" + inner1 + "postfix1" + "prefix2" + inner2 + "postfix2")
								res.setWrapped(
									left.prefix,
									right.postfix,
									left.wrappedInnerExpressions &&
										right.wrappedInnerExpressions && [
											...left.wrappedInnerExpressions,
											...(left.postfix ? [left.postfix] : []),
											...(right.prefix ? [right.prefix] : []),
											...right.wrappedInnerExpressions
										]
								);
							} else {
								// ("prefix" + inner + postfix) + expr
								// => ("prefix" + inner + postfix + expr + [null])
								res.setWrapped(
									left.prefix,
									null,
									left.wrappedInnerExpressions && [
										...left.wrappedInnerExpressions,
										...(left.postfix ? [left.postfix, right] : [right])
									]
								);
							}
						} else if (right.isString()) {
							// left + "right"
							// => ([null] + left + "right")
							res.setWrapped(null, right, [left]);
						} else if (right.isWrapped()) {
							// left + (prefix + inner + "postfix")
							// => ([null] + left + prefix + inner + "postfix")
							res.setWrapped(
								null,
								right.postfix,
								right.wrappedInnerExpressions && [
									...(right.prefix ? [left, right.prefix] : [left]),
									...right.wrappedInnerExpressions
								]
							);
						} else {
							return;
						}
						if (left.couldHaveSideEffects() || right.couldHaveSideEffects()) {
							res.setSideEffects();
						}
						res.setRange(this._rangeOf(expr));
						return res;
					} else if (operator === "-") {
						return handleConstOperation(this, expr, SUBTRACT);
					} else if (operator === "*") {
						return handleConstOperation(this, expr, MULTIPLY);
					} else if (operator === "/") {
						return handleConstOperation(this, expr, DIVIDE);
					} else if (operator === "**") {
						return handleConstOperation(this, expr, POWER);
					} else if (operator === "===") {
						return handleStrictEqualityComparison(this, expr, true);
					} else if (operator === "==") {
						return handleAbstractEqualityComparison(this, expr, true);
					} else if (operator === "!==") {
						return handleStrictEqualityComparison(this, expr, false);
					} else if (operator === "!=") {
						return handleAbstractEqualityComparison(this, expr, false);
					} else if (operator === "&") {
						return handleConstOperation(this, expr, BITWISE_AND);
					} else if (operator === "|") {
						return handleConstOperation(this, expr, BITWISE_OR);
					} else if (operator === "^") {
						return handleConstOperation(this, expr, BITWISE_XOR);
					} else if (operator === ">>>") {
						return handleConstOperation(this, expr, UNSIGNED_SHIFT_RIGHT);
					} else if (operator === ">>") {
						return handleConstOperation(this, expr, SHIFT_RIGHT);
					} else if (operator === "<<") {
						return handleConstOperation(this, expr, SHIFT_LEFT);
					} else if (operator === "<") {
						return handleConstOperation(this, expr, LESS_THAN);
					} else if (operator === ">") {
						return handleConstOperation(this, expr, GREATER_THAN);
					} else if (operator === "<=") {
						return handleConstOperation(this, expr, LESS_THAN_OR_EQUAL);
					} else if (operator === ">=") {
						return handleConstOperation(this, expr, GREATER_THAN_OR_EQUAL);
					} else if (operator === "in") {
						// `x in y` always evaluates to a boolean, so it is never nullish
						const left = this.evaluateExpression(
							this._childOf(expr, Field.left, "left")
						);
						const right = this.evaluateExpression(
							this._childOf(expr, Field.right, "right")
						);
						return new BasicEvaluatedExpression()
							.setNullish(false)
							.setSideEffects(
								left.couldHaveSideEffects() || right.couldHaveSideEffects()
							)
							.setRange(this._rangeOf(expr));
					}
				}
			);
		// only `typeof` reads the node's object
		this.hooks.evaluate
			.for("UnaryExpression")
			.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				(_node) => {
					const operator = this._operatorOf(_node);
					if (operator === "typeof") {
						const tree = this._tree;
						const argument = this._childOf(_node, Field.argument, "argument");
						const argumentType =
							typeof argument === "number"
								? NODE_TYPE_NAMES[
										/** @type {SyntaxTree} */ (tree).type(argument)
									]
								: argument.type;
						// a name and a function read by id; the rest read the node's object
						switch (argumentType) {
							case "Identifier": {
								const res = this._callHooksForName1(
									this.hooks.evaluateTypeof,
									typeof argument === "number"
										? /** @type {SyntaxTree} */ (tree).name(argument)
										: /** @type {Identifier} */ (argument).name,
									/** @type {EXPECTED_ANY} */ (_node)
								);
								if (res !== undefined) return res;
								break;
							}
							case "FunctionExpression": {
								return new BasicEvaluatedExpression()
									.setString("function")
									.setRange(this._rangeOf(_node));
							}
							case "MetaProperty":
							case "MemberExpression":
							case "ChainExpression": {
								const expr = /** @type {UnaryExpression} */ (
									typeof _node === "number"
										? /** @type {SyntaxTree} */ (tree).estree(_node)
										: _node
								);
								const res =
									argumentType === "MetaProperty"
										? this._callHooksForName1(
												this.hooks.evaluateTypeof,
												/** @type {string} */
												(getRootName(expr.argument)),
												expr
											)
										: this.callHooksForExpression(
												this.hooks.evaluateTypeof,
												argumentType === "ChainExpression"
													? /** @type {ChainExpression} */ (expr.argument)
															.expression
													: expr.argument,
												expr
											);
								if (res !== undefined) return res;
								break;
							}
						}
						const arg = this.evaluateExpression(argument);
						if (arg.isUnknown()) return;
						if (arg.isString()) {
							return new BasicEvaluatedExpression()
								.setString("string")
								.setRange(this._rangeOf(_node));
						}
						if (arg.isWrapped()) {
							return new BasicEvaluatedExpression()
								.setString("string")
								.setSideEffects()
								.setRange(this._rangeOf(_node));
						}
						if (arg.isUndefined()) {
							return new BasicEvaluatedExpression()
								.setString("undefined")
								.setRange(this._rangeOf(_node));
						}
						if (arg.isNumber()) {
							return new BasicEvaluatedExpression()
								.setString("number")
								.setRange(this._rangeOf(_node));
						}
						if (arg.isBigInt()) {
							return new BasicEvaluatedExpression()
								.setString("bigint")
								.setRange(this._rangeOf(_node));
						}
						if (arg.isBoolean()) {
							return new BasicEvaluatedExpression()
								.setString("boolean")
								.setRange(this._rangeOf(_node));
						}
						if (arg.isConstArray() || arg.isRegExp() || arg.isNull()) {
							return new BasicEvaluatedExpression()
								.setString("object")
								.setRange(this._rangeOf(_node));
						}
						if (arg.isArray()) {
							return new BasicEvaluatedExpression()
								.setString("object")
								.setSideEffects(arg.couldHaveSideEffects())
								.setRange(this._rangeOf(_node));
						}
					} else if (operator === "!") {
						const argument = this.evaluateExpression(
							this._childOf(_node, Field.argument, "argument")
						);
						const bool = argument.asBool();
						if (typeof bool !== "boolean") return;
						return new BasicEvaluatedExpression()
							.setBoolean(!bool)
							.setSideEffects(argument.couldHaveSideEffects())
							.setRange(this._rangeOf(_node));
					} else if (operator === "~") {
						return handleUnaryConstOperation(
							this,
							/** @type {UnaryExpression | number} */ (_node),
							BITWISE_NOT
						);
					} else if (operator === "+") {
						return handleUnaryConstOperation(
							this,
							/** @type {UnaryExpression | number} */ (_node),
							TO_NUMBER
						);
					} else if (operator === "-") {
						return handleUnaryConstOperation(
							this,
							/** @type {UnaryExpression | number} */ (_node),
							NEGATE
						);
					}
				}
			);
		this.hooks.evaluateTypeof
			.for("undefined")
			.tap(CLASS_NAME, (expr) =>
				new BasicEvaluatedExpression()
					.setString("undefined")
					.setRange(/** @type {Range} */ (expr.range))
			);
		this.hooks.evaluate
			.for("Identifier")
			.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				(expr) => {
					const name =
						typeof expr === "number"
							? /** @type {SyntaxTree} */ (this._tree).name(expr)
							: /** @type {Identifier} */ (expr).name;
					if (name === "undefined") {
						return new BasicEvaluatedExpression()
							.setUndefined()
							.setRange(this._rangeOf(expr));
					}
				}
			);
		/**
		 * Tap evaluate with variable info.
		 * @param {"Identifier" | "ThisExpression" | "MemberExpression"} exprType expression type name
		 * @param {(node: Expression | SpreadElement) => GetInfoResult | undefined} getInfo get info
		 * @returns {void}
		 */
		const tapEvaluateWithVariableInfo = (exprType, getInfo) => {
			/** @type {Expression | undefined} */
			let cachedExpression;
			/** @type {GetInfoResult | undefined} */
			let cachedInfo;
			// `ids`: in the tree walk it gets the node's id, as getInfo reads it
			this.hooks.evaluate
				.for(exprType)
				.tap(
					/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
					(expr) => {
						const expression =
							/** @type {Identifier | ThisExpression | MemberExpression} */ (
								expr
							);

						const info = getInfo(expression);
						// Cache the result (even when undefined) so the stage-100 tap below
						// reuses it instead of recomputing getInfo — getMemberExpressionInfo
						// is expensive and previously ran twice for every rejected member.
						cachedExpression = expression;
						cachedInfo = info;
						if (info !== undefined) {
							// saved around the call: a hook may evaluate another identifier
							const outer = this._evaluatingExpression;
							this._evaluatingExpression = expression;
							const result = this.callHooksForInfoWithFallback(
								this.hooks.evaluateIdentifier,
								info.name,
								RETURN_UNDEFINED,
								this._evaluateDefinedIdentifier,
								expression
							);
							this._evaluatingExpression = outer;
							return result;
						}
					}
				);
			this.hooks.evaluate.for(exprType).tap(
				/** @type {{ name: string, stage: number }} */ ({
					name: CLASS_NAME,
					stage: 100,
					ids: true
				}),
				(expr) => {
					const expression =
						/** @type {Identifier | ThisExpression | MemberExpression} */
						(expr);
					const info =
						cachedExpression === expression ? cachedInfo : getInfo(expression);
					if (info !== undefined) {
						return new BasicEvaluatedExpression()
							.setIdentifier(
								info.name,
								info.rootInfo,
								info.getMembers,
								info.getMembersOptionals,
								info.getMemberRanges
							)
							.setRange(
								typeof expression === "number"
									? /** @type {SyntaxTree} */ (this._tree).range(expression)
									: /** @type {Range} */ (expression.range)
							);
					}
				}
			);
			this.hooks.finish.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				() => {
					// Cleanup for GC
					cachedExpression = cachedInfo = undefined;
				}
			);
		};
		tapEvaluateWithVariableInfo("Identifier", (expr) => {
			const info = this.getVariableInfo(
				typeof expr === "number"
					? /** @type {SyntaxTree} */ (this._tree).name(expr)
					: /** @type {Identifier} */ (expr).name
			);
			if (
				typeof info === "string" ||
				(JavascriptParser.isVariableInfo(info) &&
					(info.isFree() ||
						info.isTagged() ||
						// Walk `tagInfo` in `callHooksForInfo` if tagInfo is present.
						info.tagInfo !== undefined))
			) {
				return {
					name: info,
					rootInfo: info,
					getMembers: RETURN_EMPTY_ARRAY,
					getMembersOptionals: RETURN_EMPTY_ARRAY,
					getMemberRanges: RETURN_EMPTY_ARRAY
				};
			}
		});
		tapEvaluateWithVariableInfo("ThisExpression", (_expr) => {
			const info = this.getVariableInfo("this");
			if (
				typeof info === "string" ||
				(JavascriptParser.isVariableInfo(info) &&
					(info.isFree() || info.isTagged()))
			) {
				return {
					name: info,
					rootInfo: info,
					getMembers: RETURN_EMPTY_ARRAY,
					getMembersOptionals: RETURN_EMPTY_ARRAY,
					getMemberRanges: RETURN_EMPTY_ARRAY
				};
			}
		});
		this.hooks.evaluate.for("MetaProperty").tap(CLASS_NAME, (expr) => {
			const metaProperty = /** @type {MetaProperty} */ (expr);

			return this._callHooksForName1(
				this.hooks.evaluateIdentifier,
				/** @type {string} */
				(getRootName(metaProperty)),
				metaProperty
			);
		});
		tapEvaluateWithVariableInfo("MemberExpression", (expr) =>
			this.getMemberExpressionInfo(
				/** @type {MemberExpression} */ (expr),
				ALLOWED_MEMBER_TYPES_EXPRESSION
			)
		);

		// `ids`: in the tree walk it reads the callee by id
		this.hooks.evaluate
			.for("CallExpression")
			.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				(expression) => {
					if (typeof expression === "number") {
						return this._evaluateCallNode(expression);
					}
					const expr = /** @type {CallExpression} */ (expression);
					if (
						expr.callee.type === "MemberExpression" &&
						expr.callee.property.type ===
							(expr.callee.computed ? "Literal" : "Identifier")
					) {
						// type Super also possible here
						const param = this.evaluateExpression(
							/** @type {Expression} */ (expr.callee.object)
						);
						const property =
							expr.callee.property.type === "Literal"
								? `${expr.callee.property.value}`
								: expr.callee.property.name;
						const hook = this.hooks.evaluateCallExpressionMember.get(property);
						if (hook !== undefined) {
							return hook.call(expr, param);
						}
					} else if (expr.callee.type === "Identifier") {
						return this._callHooksForName1(
							this.hooks.evaluateCallExpression,
							expr.callee.name,
							expr
						);
					}
				}
			);
		this.hooks.evaluateCallExpressionMember
			.for("indexOf")
			// `ids`: string methods evaluate their arguments by id
			.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				(expr, param) => {
					if (!param.isString()) return;
					const args = this._childrenOf(expr, Field.arguments, "arguments");
					if (args.length === 0) return;
					const [arg1, arg2] = args;
					if (this._isSpread(arg1)) return;
					const arg1Eval = this.evaluateExpression(arg1);
					if (!arg1Eval.isString()) return;
					const arg1Value = /** @type {string} */ (arg1Eval.string);
					/** @type {number} */
					let result;
					if (arg2) {
						if (this._isSpread(arg2)) return;
						const arg2Eval = this.evaluateExpression(arg2);
						if (!arg2Eval.isNumber()) return;
						result = /** @type {string} */ (param.string).indexOf(
							arg1Value,
							arg2Eval.number
						);
					} else {
						result = /** @type {string} */ (param.string).indexOf(arg1Value);
					}
					return new BasicEvaluatedExpression()
						.setNumber(result)
						.setSideEffects(param.couldHaveSideEffects())
						.setRange(this._rangeOf(expr));
				}
			);
		this.hooks.evaluateCallExpressionMember
			.for("replace")
			.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				(expr, param) => {
					if (!param.isString()) return;
					const args = this._childrenOf(expr, Field.arguments, "arguments");
					if (args.length !== 2) return;
					if (this._isSpread(args[0])) return;
					if (this._isSpread(args[1])) return;
					const arg1 = this.evaluateExpression(args[0]);
					const arg2 = this.evaluateExpression(args[1]);
					if (!arg1.isString() && !arg1.isRegExp()) return;
					const arg1Value = /** @type {string | RegExp} */ (
						arg1.regExp || arg1.string
					);
					if (!arg2.isString()) return;
					const arg2Value = /** @type {string} */ (arg2.string);
					return new BasicEvaluatedExpression()
						.setString(
							/** @type {string} */ (param.string).replace(arg1Value, arg2Value)
						)
						.setSideEffects(param.couldHaveSideEffects())
						.setRange(this._rangeOf(expr));
				}
			);
		for (const fn of ["substr", "substring", "slice"]) {
			this.hooks.evaluateCallExpressionMember
				.for(fn)
				.tap(
					/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
					(expr, param) => {
						if (!param.isString()) return;
						/** @type {BasicEvaluatedExpression} */
						let arg1;
						/** @type {string} */
						let result;
						const str = /** @type {string} */ (param.string);
						const args = this._childrenOf(expr, Field.arguments, "arguments");
						switch (args.length) {
							case 1:
								if (this._isSpread(args[0])) return;
								arg1 = this.evaluateExpression(args[0]);
								if (!arg1.isNumber()) return;
								result = str[
									/** @type {"substr" | "substring" | "slice"} */ (fn)
								](/** @type {number} */ (arg1.number));
								break;
							case 2: {
								if (this._isSpread(args[0])) return;
								if (this._isSpread(args[1])) return;
								arg1 = this.evaluateExpression(args[0]);
								const arg2 = this.evaluateExpression(args[1]);
								if (!arg1.isNumber()) return;
								if (!arg2.isNumber()) return;
								result = str[
									/** @type {"substr" | "substring" | "slice"} */ (fn)
								](
									/** @type {number} */ (arg1.number),
									/** @type {number} */ (arg2.number)
								);
								break;
							}
							default:
								return;
						}
						return new BasicEvaluatedExpression()
							.setString(result)
							.setSideEffects(param.couldHaveSideEffects())
							.setRange(this._rangeOf(expr));
					}
				);
		}

		/**
		 * Gets simplified template result.
		 * @param {"cooked" | "raw"} kind kind of values to get
		 * @param {TemplateLiteral} templateLiteralExpr TemplateLiteral expr
		 * @returns {{ quasis: BasicEvaluatedExpression[], parts: BasicEvaluatedExpression[] }} Simplified template
		 */
		const getSimplifiedTemplateResult = (kind, templateLiteralExpr) => {
			/** @type {BasicEvaluatedExpression[]} */
			const quasis = [];
			/** @type {BasicEvaluatedExpression[]} */
			const parts = [];

			for (let i = 0; i < templateLiteralExpr.quasis.length; i++) {
				const quasiExpr = templateLiteralExpr.quasis[i];
				const quasi = quasiExpr.value[kind];

				if (i > 0) {
					const prevExpr = parts[parts.length - 1];
					const expr = this.evaluateExpression(
						templateLiteralExpr.expressions[i - 1]
					);
					const exprAsString = expr.asString();
					if (
						typeof exprAsString === "string" &&
						!expr.couldHaveSideEffects()
					) {
						// We can merge quasi + expr + quasi when expr
						// is a const string

						prevExpr.setString(prevExpr.string + exprAsString + quasi);
						prevExpr.setRange([
							/** @type {Range} */ (prevExpr.range)[0],
							/** @type {Range} */ (quasiExpr.range)[1]
						]);
						// We unset the expression as it doesn't match to a single expression
						prevExpr.setExpression(undefined);
						continue;
					}
					parts.push(expr);
				}

				const part = new BasicEvaluatedExpression()
					.setString(/** @type {string} */ (quasi))
					.setRange(/** @type {Range} */ (quasiExpr.range))
					.setExpression(quasiExpr);
				quasis.push(part);
				parts.push(part);
			}
			return {
				quasis,
				parts
			};
		};

		/**
		 * `getSimplifiedTemplateResult` for a template literal of the tree, by id.
		 * @param {"cooked" | "raw"} kind kind of values to get
		 * @param {number} template the template literal
		 * @returns {{ quasis: BasicEvaluatedExpression[], parts: BasicEvaluatedExpression[] }} Simplified template
		 */
		const getSimplifiedTemplateResultNode = (kind, template) => {
			const tree = /** @type {SyntaxTree} */ (this._tree);
			/** @type {BasicEvaluatedExpression[]} */
			const quasis = [];
			/** @type {BasicEvaluatedExpression[]} */
			const parts = [];
			const count = tree.fieldCount(Field.quasis, template);
			for (let i = 0; i < count; i++) {
				const quasiId = tree.field(i, Field.quasis, template);
				const quasi =
					/** @type {TemplateElement["value"]} */
					(tree.value(quasiId))[kind];
				if (i > 0) {
					const prevExpr = parts[parts.length - 1];
					const expr = this._evaluateNode(
						tree.field(i - 1, Field.expressions, template)
					);
					const exprAsString = expr.asString();
					if (
						typeof exprAsString === "string" &&
						!expr.couldHaveSideEffects()
					) {
						// merges quasi + expr + quasi for a const string expr
						prevExpr.setString(prevExpr.string + exprAsString + quasi);
						prevExpr.setRange([
							/** @type {Range} */ (prevExpr.range)[0],
							tree.end(quasiId)
						]);
						// it matches no single expression any more
						prevExpr.setExpression(undefined);
						continue;
					}
					parts.push(expr);
				}
				const part = new BasicEvaluatedExpression()
					.setString(/** @type {string} */ (quasi))
					.setRange(tree.range(quasiId))
					.setNode(tree, quasiId);
				quasis.push(part);
				parts.push(part);
			}
			return { quasis, parts };
		};

		// `ids`: every template literal evaluates, so it reads them by id
		this.hooks.evaluate
			.for("TemplateLiteral")
			.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				(_node) => {
					const { quasis, parts } =
						typeof _node === "number"
							? getSimplifiedTemplateResultNode("cooked", _node)
							: getSimplifiedTemplateResult(
									"cooked",
									/** @type {TemplateLiteral} */ (_node)
								);
					if (parts.length === 1) {
						return parts[0].setRange(this._rangeOf(_node));
					}
					return new BasicEvaluatedExpression()
						.setTemplateString(quasis, parts, "cooked")
						.setRange(this._rangeOf(_node));
				}
			);
		this.hooks.evaluate
			.for("TaggedTemplateExpression")
			.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				(_node) => {
					const tree = /** @type {SyntaxTree} */ (this._tree);
					const node = /** @type {TaggedTemplateExpression} */ (_node);
					const tag = this.evaluateExpression(
						typeof _node === "number"
							? /** @type {EXPECTED_ANY} */ (tree.field(0, Field.tag, _node))
							: node.tag
					);

					if (tag.isIdentifier() && tag.identifier === "String.raw") {
						const { quasis, parts } =
							typeof _node === "number"
								? getSimplifiedTemplateResultNode(
										"raw",
										tree.field(0, Field.quasi, _node)
									)
								: getSimplifiedTemplateResult("raw", node.quasi);
						return new BasicEvaluatedExpression()
							.setTemplateString(quasis, parts, "raw")
							.setRange(this._rangeOf(_node));
					}
				}
			);

		this.hooks.evaluateCallExpressionMember
			.for("concat")
			.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				(expr, param) => {
					if (!param.isString() && !param.isWrapped()) return;
					const args = this._childrenOf(expr, Field.arguments, "arguments");
					/** @type {undefined | BasicEvaluatedExpression} */
					let stringSuffix;
					let hasUnknownParams = false;
					/** @type {BasicEvaluatedExpression[]} */
					const innerExpressions = [];
					for (let i = args.length - 1; i >= 0; i--) {
						const arg = args[i];
						if (this._isSpread(arg)) return;
						const argExpr = this.evaluateExpression(arg);
						if (
							hasUnknownParams ||
							(!argExpr.isString() && !argExpr.isNumber())
						) {
							hasUnknownParams = true;
							innerExpressions.push(argExpr);
							continue;
						}

						const value = argExpr.isString()
							? /** @type {string} */ (argExpr.string)
							: String(argExpr.number);

						/** @type {string} */
						const newString =
							value +
							(stringSuffix ? /** @type {string} */ (stringSuffix.string) : "");
						const newRange = /** @type {Range} */ ([
							/** @type {Range} */ (argExpr.range)[0],
							/** @type {Range} */ ((stringSuffix || argExpr).range)[1]
						]);
						stringSuffix = new BasicEvaluatedExpression()
							.setString(newString)
							.setSideEffects(
								(stringSuffix && stringSuffix.couldHaveSideEffects()) ||
									argExpr.couldHaveSideEffects()
							)
							.setRange(newRange);
					}

					if (hasUnknownParams) {
						const prefix = param.isString() ? param : param.prefix;
						const inner =
							param.isWrapped() && param.wrappedInnerExpressions
								? [
										...param.wrappedInnerExpressions,
										...innerExpressions.reverse()
									]
								: innerExpressions.reverse();
						return new BasicEvaluatedExpression()
							.setWrapped(prefix, stringSuffix, inner)
							.setRange(this._rangeOf(expr));
					} else if (param.isWrapped()) {
						const postfix = stringSuffix || param.postfix;
						const inner = param.wrappedInnerExpressions
							? [
									...param.wrappedInnerExpressions,
									...innerExpressions.reverse()
								]
							: innerExpressions.reverse();
						return new BasicEvaluatedExpression()
							.setWrapped(param.prefix, postfix, inner)
							.setRange(this._rangeOf(expr));
					}
					const newString =
						/** @type {string} */ (param.string) +
						(stringSuffix ? stringSuffix.string : "");
					return new BasicEvaluatedExpression()
						.setString(newString)
						.setSideEffects(
							(stringSuffix && stringSuffix.couldHaveSideEffects()) ||
								param.couldHaveSideEffects()
						)
						.setRange(this._rangeOf(expr));
				}
			);
		this.hooks.evaluateCallExpressionMember
			.for("split")
			.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				(expr, param) => {
					if (!param.isString()) return;
					const args = this._childrenOf(expr, Field.arguments, "arguments");
					if (args.length !== 1) return;
					if (this._isSpread(args[0])) return;
					/** @type {string[]} */
					let result;
					const arg = this.evaluateExpression(args[0]);
					if (arg.isString()) {
						result =
							/** @type {string} */
							(param.string).split(/** @type {string} */ (arg.string));
					} else if (arg.isRegExp()) {
						result = /** @type {string} */ (param.string).split(
							/** @type {RegExp} */ (arg.regExp)
						);
					} else {
						return;
					}
					return new BasicEvaluatedExpression()
						.setArray(result)
						.setSideEffects(param.couldHaveSideEffects())
						.setRange(this._rangeOf(expr));
				}
			);
		// `ids`: in the tree walk it reads the conditional by id
		this.hooks.evaluate
			.for("ConditionalExpression")
			.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				(_expr) => {
					const expr = /** @type {ConditionalExpression} */ (_expr);

					const condition = this.evaluateExpression(
						this._childOf(expr, Field.test, "test")
					);
					const conditionValue = condition.asBool();
					/** @type {BasicEvaluatedExpression} */
					let res;
					if (conditionValue === undefined) {
						const consequent = this.evaluateExpression(
							this._childOf(expr, Field.consequent, "consequent")
						);
						const alternate = this.evaluateExpression(
							this._childOf(expr, Field.alternate, "alternate")
						);
						res = new BasicEvaluatedExpression();
						if (consequent.isConditional()) {
							res.setOptions(
								/** @type {BasicEvaluatedExpression[]} */ (consequent.options)
							);
						} else {
							res.setOptions([consequent]);
						}
						if (alternate.isConditional()) {
							res.addOptions(
								/** @type {BasicEvaluatedExpression[]} */ (alternate.options)
							);
						} else {
							res.addOptions([alternate]);
						}
					} else {
						res = this.evaluateExpression(
							conditionValue
								? this._childOf(expr, Field.consequent, "consequent")
								: this._childOf(expr, Field.alternate, "alternate")
						);
						if (condition.couldHaveSideEffects()) res.setSideEffects();
					}
					res.setRange(this._rangeOf(expr));
					return res;
				}
			);
		// `ids`: in the tree walk it reads the elements by id
		this.hooks.evaluate
			.for("ArrayExpression")
			.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				(_expr) => {
					/** @type {BasicEvaluatedExpression[]} */
					const items = [];
					// every element is evaluated, as a hook may count on it, before a hole
					// or a spread leaves the array unknown
					let known = true;
					if (typeof _expr === "number") {
						const tree = /** @type {SyntaxTree} */ (this._tree);
						const count = tree.fieldCount(Field.elements, _expr);
						for (let i = 0; i < count; i++) {
							const element = tree.field(i, Field.elements, _expr);
							if (
								element === 0 ||
								tree.type(element) === NodeType.SpreadElement
							) {
								known = false;
							} else {
								items.push(
									this.evaluateExpression(/** @type {EXPECTED_ANY} */ (element))
								);
							}
						}
					} else {
						for (const element of /** @type {ArrayExpression} */ (_expr)
							.elements) {
							if (element === null || element.type === "SpreadElement") {
								known = false;
							} else {
								items.push(this.evaluateExpression(element));
							}
						}
					}
					if (!known) return;
					return new BasicEvaluatedExpression()
						.setItems(items)
						.setRange(this._rangeOf(_expr));
				}
			);
		this.hooks.evaluate.for("ChainExpression").tap(CLASS_NAME, (_expr) => {
			const expr = /** @type {ChainExpression} */ (_expr);
			/** @type {Expression[]} */
			const optionalExpressionsStack = [];
			/** @type {Expression | Super} */
			let next = expr.expression;

			while (
				next.type === "MemberExpression" ||
				next.type === "CallExpression"
			) {
				if (next.type === "MemberExpression") {
					if (next.optional) {
						// SuperNode can not be optional
						optionalExpressionsStack.push(
							/** @type {Expression} */ (next.object)
						);
					}
					next = next.object;
				} else {
					if (next.optional) {
						// SuperNode can not be optional
						optionalExpressionsStack.push(
							/** @type {Expression} */ (next.callee)
						);
					}
					next = next.callee;
				}
			}

			while (optionalExpressionsStack.length > 0) {
				const expression =
					/** @type {Expression} */
					(optionalExpressionsStack.pop());
				const evaluated = this.evaluateExpression(expression);

				if (evaluated.asNullish()) {
					return evaluated.setRange(/** @type {Range} */ (_expr.range));
				}
			}
			return this.evaluateExpression(expr.expression);
		});
		// `ids`: in the tree walk it reads the expressions by id
		this.hooks.evaluate
			.for("SequenceExpression")
			.tap(
				/** @type {{ name: string }} */ ({ name: CLASS_NAME, ids: true }),
				(expr) => {
					const range = this._rangeOf(expr);
					if (!range) return;
					const expressions = this._childrenOf(
						expr,
						Field.expressions,
						"expressions"
					);
					let commentsStartPos = range[0];
					for (let i = 0; i < expressions.length - 1; i++) {
						const item = expressions[i];
						const itemRange = this._rangeOf(item);
						if (!itemRange) return;
						if (
							!this.isPure(/** @type {Expression} */ (item), commentsStartPos)
						) {
							return;
						}
						commentsStartPos = itemRange[1];
					}
					const last = expressions[expressions.length - 1];
					const evaluated = this.evaluateExpression(last);
					if (!evaluated.isCompileTimeValue()) return;
					return evaluated.setRange(range);
				}
			);
	}

	/**
	 * Destructuring assignment properties for.
	 * @param {Expression | number} node node, or its id in the tree walk
	 * @returns {DestructuringAssignmentProperties | undefined} destructured identifiers
	 */
	destructuringAssignmentPropertiesFor(node) {
		const nodes = this._destructuringNodes;
		if (nodes !== undefined) {
			if (nodes.size === 0) return;
			return nodes.get(
				typeof node === "number"
					? node
					: /** @type {SyntaxTree} */ (this._tree).nodeOf(node)
			);
		}
		if (!this.destructuringAssignmentProperties) return;
		return this.destructuringAssignmentProperties.get(
			/** @type {Expression} */ (node)
		);
	}

	/**
	 * Gets rename identifier.
	 * @param {Expression | SpreadElement} expr expression
	 * @returns {string | VariableInfo | undefined} identifier
	 */
	getRenameIdentifier(expr) {
		const tree = this._tree;
		const isNode = typeof expr === "number";
		const type = isNode
			? NODE_TYPE_NAMES[/** @type {SyntaxTree} */ (tree).type(expr)]
			: expr.type;
		if (type === "Identifier" && this._evalIdentOwnTaps) {
			const name = isNode
				? /** @type {SyntaxTree} */ (tree).name(expr)
				: /** @type {Identifier} */ (expr).name;
			// the evaluation could only fall through — never an identifier result
			if (name !== "undefined" && this._isDefinedPlainVariable(name)) return;
		}
		const result = this.evaluateExpression(expr);
		if (result.isIdentifier()) {
			return result.identifier;
		}
	}

	/**
	 * Processes the provided classy.
	 * @param {ClassExpression | ClassDeclaration | MaybeNamedClassDeclaration} classy a class node
	 * @returns {void}
	 */
	walkClass(classy) {
		if (
			classy.superClass &&
			!this.hooks.classExtendsExpression.call(classy.superClass, classy)
		) {
			this.walkExpression(classy.superClass);
		}
		if (classy.body && classy.body.type === "ClassBody") {
			/** @type {Identifier[]} */
			const scopeParams = [];
			// Add class name in scope for recursive calls
			if (classy.id) {
				scopeParams.push(classy.id);
			}
			this.inClassScope(true, scopeParams, () => {
				for (const classElement of classy.body.body) {
					if (!this.hooks.classBodyElement.call(classElement, classy)) {
						if (classElement.type === "StaticBlock") {
							const wasTopLevel = this.scope.topLevelScope;
							this.scope.topLevelScope = false;
							this.walkBlockStatement(classElement);
							this.scope.topLevelScope = wasTopLevel;
						} else {
							if (classElement.computed && classElement.key) {
								this.walkExpression(classElement.key);
							}

							if (
								classElement.value &&
								!this.hooks.classBodyValue.call(
									classElement.value,
									classElement,
									classy
								)
							) {
								const wasTopLevel = this.scope.topLevelScope;
								this.scope.topLevelScope = false;
								this.walkExpression(classElement.value);
								this.scope.topLevelScope = wasTopLevel;
							}
						}
					}
				}
			});
		}
	}

	/**
	 * Report what the program imports and re-exports, before anything reads a
	 * name. The list is what the parser recorded, in source order.
	 * @param {ModuleDeclarations} declarations the program's module declarations
	 */
	_modulePreWalkDeclarations(declarations) {
		for (let index = 0, len = declarations.length; index < len; index += 2) {
			const statement =
				/** @type {ModuleDeclaration} */
				(declarations[index]);
			// what precedes it decides whether removing it joins two statements
			this._prevStatement =
				/** @type {Statement | undefined} */
				(declarations[index + 1]);
			/** @type {StatementPath} */
			(this._statementPath).push(statement);
			switch (statement.type) {
				case "ImportDeclaration":
					this.modulePreWalkImportDeclaration(statement);
					break;
				case "ExportAllDeclaration":
					this.modulePreWalkExportAllDeclaration(statement);
					break;
				case "ExportNamedDeclaration":
					this.modulePreWalkExportNamedDeclaration(statement);
					break;
			}
			this._prevStatement =
				/** @type {StatementPath} */
				(this._statementPath).pop();
		}
	}

	/**
	 * Module pre walk of the program's module declarations, by id.
	 * @param {number} program the program
	 * @returns {void}
	 */
	_modulePreWalkDeclarationsNode(program) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const statementPath =
			/** @type {(StatementPathItem | number)[]} */
			(this._statementPath);
		const count = tree.fieldCount(Field.body, program);
		for (let index = 0; index < count; index++) {
			const statement = tree.field(index, Field.body, program);
			const type = tree.type(statement);
			if (
				type !== NodeType.ImportDeclaration &&
				type !== NodeType.ExportAllDeclaration &&
				type !== NodeType.ExportNamedDeclaration
			) {
				continue;
			}
			// what precedes it decides whether removing it joins two statements
			this._prevStatement =
				index === 0 ? undefined : tree.field(index - 1, Field.body, program);
			statementPath.push(statement);
			if (type === NodeType.ImportDeclaration) {
				this._modulePreWalkImportDeclarationNode(statement);
			} else {
				this._modulePreWalkExportImportNode(statement);
			}
			this._prevStatement = statementPath.pop();
		}
	}

	/**
	 * Declare what the scope the node opens hoists, before anything reads a
	 * name in it.
	 * @param {Program | BlockStatement | number} node the node owning the scope, an id in the tree walk
	 */
	_preWalkScope(node) {
		this._scopeOwner = node;
		const tree = this._tree;
		// BACKWARD-COMPAT START
		if (this._needsFullPreWalk || this.hooks.preStatement.taps.length !== 0) {
			const owner =
				typeof node === "number"
					? /** @type {Program | BlockStatement} */ (
							/** @type {SyntaxTree} */ (tree).estree(node)
						)
					: node;
			if (owner.type === "Program") this.preWalkStatements(owner.body);
			else this.preWalkStatement(owner);
			return;
		}
		// BACKWARD-COMPAT END
		if (typeof node === "number") {
			/** @type {number[]} */
			const ids = [];
			collectHoistedDeclarationsNode(
				/** @type {SyntaxTree} */ (tree),
				node,
				Field.body,
				ids
			);
			this._preWalkHoistedDeclarations(ids);
			return;
		}
		this._preWalkHoistedDeclarations(
			hoistedDeclarationsOf(node, this._hasParserRecord, tree)
		);
	}

	/**
	 * Declare what hoists to the scope being entered, from what the parser
	 * recorded while reading it. `prevStatement` is not available here.
	 * @param {HoistedDeclarations | number[]} hoisted what the scope declares
	 */
	_preWalkHoistedDeclarations(hoisted) {
		for (let index = 0, len = hoisted.length; index < len; index++) {
			// WHY: the statements between two declarations are not read here, so
			// the one before this declaration is unknown rather than the previous
			// declaration. A tap needing it taps `preStatement`, which walks.
			this._prevStatement = undefined;
			const declaration = hoisted[index];
			if (typeof declaration === "number") {
				this._preWalkHoistedNode(declaration);
			} else {
				this.preWalkStatement(declaration);
			}
		}
	}

	/**
	 * `preWalkStatement` for a declaration of the tree the scope hoists, by
	 * id: a `var` declares from the tree, the rest are walked as their object.
	 * @param {number} id the declaration
	 * @returns {void}
	 */
	_preWalkHoistedNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const { preStatement, preStatementByType } = this.hooks;
		const type = tree.type(id);
		if (
			type === NodeType.FunctionDeclaration &&
			preStatement.taps.length === 0 &&
			!this._strictInModuleOutput
		) {
			this._preWalkFunctionDeclarationNode(id);
			return;
		}
		if (type === NodeType.ClassDeclaration && preStatement.taps.length === 0) {
			// only the typed hook sees a class here, as in preWalkStatement
			const statementPath =
				/** @type {(StatementPathItem | number)[]} */
				(this._statementPath);
			statementPath.push(id);
			const typed = preStatementByType.get("ClassDeclaration");
			if (typed !== undefined) typed.call(/** @type {EXPECTED_ANY} */ (id));
			this._prevStatement = statementPath.pop();
			return;
		}
		if (
			type !== NodeType.VariableDeclaration ||
			preStatement.taps.length !== 0
		) {
			this.preWalkStatement(/** @type {Statement} */ (tree.estree(id)));
			return;
		}
		/** @type {(StatementPathItem | number)[]} */
		(this._statementPath).push(id);
		const typed = preStatementByType.get("VariableDeclaration");
		if (typed === undefined || !typed.call(/** @type {EXPECTED_ANY} */ (id))) {
			this._preWalkVariableDeclarationNode(id, this.hooks.varDeclarationVar);
		}
		this._prevStatement =
			/** @type {(StatementPathItem | number)[]} */
			(this._statementPath).pop();
	}

	/**
	 * `preWalkStatement` for a function declaration of the tree, by id: one
	 * its block binds is left to the block pass, as the object walk does.
	 * @param {number} id the declaration
	 * @returns {void}
	 */
	_preWalkFunctionDeclarationNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const statementPath =
			/** @type {(StatementPathItem | number)[]} */
			(this._statementPath);
		statementPath.push(id);
		let bail = this._isBlockScopedFunction(id);
		if (!bail) {
			const typed = this.hooks.preStatementByType.get("FunctionDeclaration");
			if (typed !== undefined) {
				bail = Boolean(typed.call(/** @type {EXPECTED_ANY} */ (id)));
			}
		}
		if (!bail) {
			const name = tree.field(0, Field.id, id);
			if (name !== 0) this.defineVariable(tree.name(name));
		}
		this._prevStatement = statementPath.pop();
	}

	/**
	 * Whether a function declaration stays in its block rather than hoisting to
	 * the scope last pre-walked, which only sloppy-mode Annex B lets it do.
	 * @param {FunctionDeclaration | MaybeNamedFunctionDeclaration | number} statement function declaration, an id in the tree walk
	 * @returns {boolean} whether its block, not the scope, binds it
	 */
	_isBlockScopedFunction(statement) {
		const owner = this._scopeOwner;
		if (owner === undefined) return false;
		const tree = this._tree;
		const node =
			typeof statement === "number"
				? statement
				: tree !== undefined
					? tree.nodeOf(/** @type {Node} */ (statement))
					: 0;
		const object = /** @type {FunctionDeclaration} */ (statement);
		// WHY: strictness is read here, not in the parser: `javascript/auto`
		// reads a script as a strict module first.
		if (!(
			this.scope.isStrict ||
			(node !== 0
				? /** @type {SyntaxTree} */ (tree).flag(
						Flag.generator | Flag.async,
						node
					)
				: object.generator === true || object.async === true)
		)) {
			return false;
		}
		const ownerNode =
			typeof owner === "number"
				? owner
				: tree !== undefined
					? tree.nodeOf(owner)
					: 0;
		if (node !== 0 && ownerNode !== 0) {
			return !holdsStatementNode(
				/** @type {SyntaxTree} */ (tree),
				ownerNode,
				node
			);
		}
		const ownerObject =
			typeof owner === "number"
				? /** @type {Program | BlockStatement} */ (
						/** @type {SyntaxTree} */ (tree).estree(owner)
					)
				: owner;
		return !holdsStatement(
			ownerObject.body,
			node !== 0
				? /** @type {FunctionDeclaration} */ (
						/** @type {SyntaxTree} */ (tree).estree(node)
					)
				: object
		);
	}

	// BACKWARD-COMPAT START
	/**
	 * Walk every statement of a scope to declare what hoists to it. Only a tap
	 * on the deprecated `preStatement` hook asks for this.
	 * @param {(Statement | ModuleDeclaration)[]} statements statements
	 * @deprecated TODO in the next major release: remove, with the `preStatement` hook
	 */
	preWalkStatements(statements) {
		for (let index = 0, len = statements.length; index < len; index++) {
			this.preWalkStatement(statements[index]);
		}
	}

	/**
	 * Pre walk block statement.
	 * @param {BlockStatement} statement block statement
	 * @deprecated TODO in the next major release: remove, with the `preStatement` hook
	 */
	preWalkBlockStatement(statement) {
		this.preWalkStatements(statement.body);
	}

	/**
	 * Pre walk if statement.
	 * @param {IfStatement} statement if statement
	 * @deprecated TODO in the next major release: remove, with the `preStatement` hook
	 */
	preWalkIfStatement(statement) {
		this.preWalkStatement(statement.consequent);
		if (statement.alternate) {
			this.preWalkStatement(statement.alternate);
		}
	}

	/**
	 * Pre walk labeled statement.
	 * @param {LabeledStatement} statement labeled statement
	 * @deprecated TODO in the next major release: remove, with the `preStatement` hook
	 */
	preWalkLabeledStatement(statement) {
		this.preWalkStatement(statement.body);
	}

	/**
	 * Pre walk with statement.
	 * @param {WithStatement} statement with statement
	 * @deprecated TODO in the next major release: remove, with the `preStatement` hook
	 */
	preWalkWithStatement(statement) {
		this.preWalkStatement(statement.body);
	}

	/**
	 * Pre walk switch statement.
	 * @param {SwitchStatement} statement switch statement
	 * @deprecated TODO in the next major release: remove, with the `preStatement` hook
	 */
	preWalkSwitchStatement(statement) {
		this.preWalkSwitchCases(statement.cases);
	}

	/**
	 * Pre walk switch cases.
	 * @param {SwitchCase[]} switchCases switch cases
	 * @deprecated TODO in the next major release: remove, with the `preStatement` hook
	 */
	preWalkSwitchCases(switchCases) {
		for (let index = 0, len = switchCases.length; index < len; index++) {
			this.preWalkStatements(switchCases[index].consequent);
		}
	}

	/**
	 * Pre walk try statement.
	 * @param {TryStatement} statement try statement
	 * @deprecated TODO in the next major release: remove, with the `preStatement` hook
	 */
	preWalkTryStatement(statement) {
		this.preWalkStatement(statement.block);
		if (statement.handler) this.preWalkCatchClause(statement.handler);
		if (statement.finalizer) this.preWalkStatement(statement.finalizer);
	}

	/**
	 * Pre walk catch clause.
	 * @param {CatchClause} catchClause catch clause
	 * @deprecated TODO in the next major release: remove, with the `preStatement` hook
	 */
	preWalkCatchClause(catchClause) {
		this.preWalkStatement(catchClause.body);
	}

	/**
	 * Pre walk while statement.
	 * @param {WhileStatement} statement while statement
	 * @deprecated TODO in the next major release: remove, with the `preStatement` hook
	 */
	preWalkWhileStatement(statement) {
		this.preWalkStatement(statement.body);
	}

	/**
	 * Pre walk do while statement.
	 * @param {DoWhileStatement} statement do while statement
	 * @deprecated TODO in the next major release: remove, with the `preStatement` hook
	 */
	preWalkDoWhileStatement(statement) {
		this.preWalkStatement(statement.body);
	}

	/**
	 * Pre walk for statement.
	 * @param {ForStatement} statement for statement
	 * @deprecated TODO in the next major release: remove, with the `preStatement` hook
	 */
	preWalkForStatement(statement) {
		if (statement.init && statement.init.type === "VariableDeclaration") {
			this.preWalkStatement(statement.init);
		}
		this.preWalkStatement(statement.body);
	}

	/**
	 * Pre walk for in statement.
	 * @param {ForInStatement} statement for in statement
	 * @deprecated TODO in the next major release: remove, with the `preStatement` hook
	 */
	preWalkForInStatement(statement) {
		if (statement.left.type === "VariableDeclaration") {
			this.preWalkStatement(statement.left);
		}
		this.preWalkStatement(statement.body);
	}

	/**
	 * Pre walk for of statement. `for await` is reported by the walk, not here.
	 * @param {ForOfStatement} statement for of statement
	 * @deprecated TODO in the next major release: remove, with the `preStatement` hook
	 */
	preWalkForOfStatement(statement) {
		if (statement.left.type === "VariableDeclaration") {
			this.preWalkStatement(statement.left);
		}
		this.preWalkStatement(statement.body);
	}

	/**
	 * Scan every top-level statement for the program's module declarations.
	 * The parser records them now, so nothing inside webpack scans for them.
	 * @deprecated TODO in the next major release: remove
	 * @param {(Statement | ModuleDeclaration)[]} statements statements
	 */
	modulePreWalkStatements(statements) {
		/** @type {ModuleDeclarations} */
		const declarations = [];
		for (let index = 0, len = statements.length; index < len; index++) {
			const statement = statements[index];
			if (MODULE_STATEMENT_TYPES.has(statement.type)) {
				declarations.push(
					statement,
					index === 0 ? undefined : statements[index - 1]
				);
			}
		}
		this._modulePreWalkDeclarations(declarations);
	}
	// BACKWARD-COMPAT END

	// BACKWARD-COMPAT START
	/**
	 * Walk every statement of a list to declare what it binds. Only a tap on the
	 * deprecated `blockPreStatement` hook asks for this.
	 * @param {(Statement | ModuleDeclaration)[]} statements statements
	 * @deprecated TODO in the next major release: remove, with the `blockPreStatement` hook
	 */
	blockPreWalkStatements(statements) {
		for (let index = 0, len = statements.length; index < len; index++) {
			const statement = statements[index];
			this.blockPreWalkStatement(statement);
		}
	}
	// BACKWARD-COMPAT END

	/**
	 * Declare what the statement list binds into its own block scope, before any
	 * of it is walked. The list is what the parser recorded while reading it.
	 * @param {Program | BlockStatement | StaticBlock | SwitchCase} node the node owning the list
	 * @param {(Statement | ModuleDeclaration)[]} statements the list it holds
	 */
	_blockPreWalkScope(node, statements) {
		// BACKWARD-COMPAT START
		if (
			this._needsFullBlockPreWalk ||
			this.hooks.blockPreStatement.taps.length !== 0
		) {
			this.blockPreWalkStatements(statements);
			return;
		}
		// BACKWARD-COMPAT END
		/** @type {BlockDeclarations | undefined} */
		let recorded;
		if (this._hasParserRecord) {
			recorded =
				/** @type {typeof node & { [BLOCK_DECLARATIONS]?: BlockDeclarations }} */
				(node)[BLOCK_DECLARATIONS];
			// 72.8% of the lists a build reads declare nothing, and saying so is
			// the whole pass for them
			if (recorded === 0) return;
		}
		if (recorded === undefined) {
			const tree = this._tree;
			const owner =
				tree !== undefined ? tree.nodeOf(/** @type {Node} */ (node)) : 0;
			recorded =
				owner !== 0
					? collectBlockDeclarationsNode(
							/** @type {SyntaxTree} */ (tree),
							owner,
							/** @type {SyntaxTree} */ (tree).type(owner) ===
								NodeType.SwitchCase
								? Field.consequent
								: Field.body
						)
					: collectBlockDeclarations(statements);
			if (recorded === 0) return;
		}
		this._blockPreWalkDeclarations(statements, recorded);
	}

	/**
	 * `_blockPreWalkScope` for a list of statements of the tree, by id: only a
	 * statement that declares gets an object, and `prevStatement` an id.
	 * @param {number} owner the node holding the list
	 * @param {number} field the `Field` holding the statements
	 * @returns {void}
	 */
	_blockPreWalkScopeNode(owner, field) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		// BACKWARD-COMPAT START
		if (
			this._needsFullBlockPreWalk ||
			this.hooks.blockPreStatement.taps.length !== 0
		) {
			this.blockPreWalkStatements(
				/** @type {(Statement | ModuleDeclaration)[]} */ (
					/** @type {Record<string, unknown>} */ (
						/** @type {unknown} */ (tree.estree(owner))
					)[field === Field.body ? "body" : "consequent"]
				)
			);
			return;
		}
		// BACKWARD-COMPAT END
		const declarations = collectBlockDeclarationsNode(tree, owner, field);
		if (declarations === 0) return;
		/**
		 * @param {number} index which statement declares
		 */
		const preWalkAt = (index) => {
			if (index !== 0) {
				this._prevStatement = tree.field(index - 1, field, owner);
			}
			this._blockPreWalkStatementNode(tree.field(index, field, owner));
		};
		if (typeof declarations === "number") {
			for (let bits = declarations; bits !== 0; bits &= bits - 1) {
				preWalkAt(31 - Math.clz32(bits & -bits));
			}
			return;
		}
		for (let index = 0; index < declarations.length; index++) {
			preWalkAt(declarations[index]);
		}
	}

	/**
	 * Declare what the recorded statements of the list bind, in source order.
	 * @param {(Statement | ModuleDeclaration)[]} statements the whole list
	 * @param {BlockDeclarations} declarations which of them declare
	 */
	_blockPreWalkDeclarations(statements, declarations) {
		if (typeof declarations === "number") {
			for (let bits = declarations; bits !== 0; bits &= bits - 1) {
				this._blockPreWalkAt(statements, 31 - Math.clz32(bits & -bits));
			}
			return;
		}
		for (let index = 0, len = declarations.length; index < len; index++) {
			this._blockPreWalkAt(statements, declarations[index]);
		}
	}

	/**
	 * Declare what one statement of the list binds, with the statement written
	 * before it, so a tap reading `prevStatement` sees what the walk would show.
	 * @param {(Statement | ModuleDeclaration)[]} statements the whole list
	 * @param {number} index which statement declares
	 */
	_blockPreWalkAt(statements, index) {
		// the first statement of the list has nothing before it, and leaves
		// whatever the caller set standing, as walking the whole list did
		if (index !== 0) this._prevStatement = statements[index - 1];
		this.blockPreWalkStatement(statements[index]);
	}

	/**
	 * Walking iterates the statements and expressions and processes them
	 * @param {(Statement | ModuleDeclaration)[]} statements statements
	 */
	walkStatements(statements) {
		let onlyFunctionDeclaration = false;

		for (let index = 0, len = statements.length; index < len; index++) {
			const statement = statements[index];

			if (
				onlyFunctionDeclaration &&
				statement.type !== "FunctionDeclaration" &&
				this.hooks.unusedStatement.call(/** @type {Statement} */ (statement))
			) {
				continue;
			}

			this.walkStatement(statement);

			if (this.scope.terminated) {
				onlyFunctionDeclaration = true;
			}
		}
	}

	/**
	 * Walking iterates the statements and expressions and processes them
	 * @param {Statement | ModuleDeclaration | MaybeNamedClassDeclaration | MaybeNamedFunctionDeclaration} statement statement
	 */
	preWalkStatement(statement) {
		/** @type {StatementPath} */
		(this._statementPath).push(statement);
		const { preStatement, preStatementByType } = this.hooks;
		// skip the broadcast entirely when nothing taps it; type-keyed taps
		// only run for their statement type
		let bail =
			preStatement.taps.length !== 0 ? preStatement.call(statement) : undefined;
		if (!bail) {
			// WHY: a block-scoped function is the block pass's; the full pre-walk
			// still shows it to `preStatement`, but not to the typed hooks, which
			// would declare it in the scope (`InnerGraphPlugin` tags it top-level).
			if (
				statement.type === "FunctionDeclaration" &&
				this._isBlockScopedFunction(statement)
			) {
				bail = true;
			} else {
				const typed = preStatementByType.get(statement.type);
				if (typed !== undefined) bail = typed.call(statement);
			}
		}
		if (bail) {
			this._prevStatement =
				/** @type {StatementPath} */
				(this._statementPath).pop();
			return;
		}
		// a class declaration reaches here for the typed hook alone: defining it
		// is the block pass's. The rest are only walked into by the deprecated
		// statement walk, which a tap expecting every statement turns back on.
		switch (statement.type) {
			case "VariableDeclaration":
				this.preWalkVariableDeclaration(statement);
				break;
			case "FunctionDeclaration":
				this.preWalkFunctionDeclaration(statement);
				break;
			case "IfStatement":
				this.preWalkIfStatement(statement);
				break;
			case "BlockStatement":
				this.preWalkBlockStatement(statement);
				break;
			case "ForStatement":
				this.preWalkForStatement(statement);
				break;
			case "TryStatement":
				this.preWalkTryStatement(statement);
				break;
			case "SwitchStatement":
				this.preWalkSwitchStatement(statement);
				break;
			case "WhileStatement":
				this.preWalkWhileStatement(statement);
				break;
			case "ForInStatement":
				this.preWalkForInStatement(statement);
				break;
			case "ForOfStatement":
				this.preWalkForOfStatement(statement);
				break;
			case "DoWhileStatement":
				this.preWalkDoWhileStatement(statement);
				break;
			case "LabeledStatement":
				this.preWalkLabeledStatement(statement);
				break;
			case "WithStatement":
				this.preWalkWithStatement(statement);
				break;
		}
		this._prevStatement =
			/** @type {StatementPath} */
			(this._statementPath).pop();
	}

	/**
	 * Block pre walk statement.
	 * @param {Statement | ModuleDeclaration | MaybeNamedClassDeclaration | MaybeNamedFunctionDeclaration} statement statement
	 */
	blockPreWalkStatement(statement) {
		/** @type {StatementPath} */
		(this._statementPath).push(statement);
		const { blockPreStatement, blockPreStatementByType } = this.hooks;
		let bail =
			blockPreStatement.taps.length !== 0
				? blockPreStatement.call(statement)
				: undefined;
		if (!bail) {
			const typed = blockPreStatementByType.get(statement.type);
			if (typed !== undefined) bail = typed.call(statement);
		}
		if (bail) {
			this._prevStatement =
				/** @type {StatementPath} */
				(this._statementPath).pop();
			return;
		}
		// cases ordered by measured statement frequency
		switch (statement.type) {
			case "VariableDeclaration":
				this.blockPreWalkVariableDeclaration(statement);
				break;
			case "ExpressionStatement":
				this.blockPreWalkExpressionStatement(statement);
				break;
			case "ClassDeclaration":
				this.blockPreWalkClassDeclaration(statement);
				break;
			case "FunctionDeclaration":
				this.blockPreWalkFunctionDeclaration(statement);
				break;
			case "ExportNamedDeclaration":
				this.blockPreWalkExportNamedDeclaration(statement);
				break;
			case "ExportDefaultDeclaration":
				this.blockPreWalkExportDefaultDeclaration(statement);
		}
		this._prevStatement =
			/** @type {StatementPath} */
			(this._statementPath).pop();
	}

	/**
	 * `blockPreWalkStatement` by id: a `let`, `const` or `using` declaration
	 * and a function declaration declare from the tree, the rest walk as objects.
	 * @param {number} id the statement
	 * @returns {void}
	 */
	_blockPreWalkStatementNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const type = tree.type(id);
		const { blockPreStatement, blockPreStatementByType } = this.hooks;
		if (
			(type !== NodeType.VariableDeclaration &&
				type !== NodeType.FunctionDeclaration &&
				type !== NodeType.ExportNamedDeclaration &&
				type !== NodeType.ExportDefaultDeclaration &&
				type !== NodeType.ExpressionStatement &&
				type !== NodeType.ClassDeclaration &&
				type !== NodeType.BlockStatement) ||
			blockPreStatement.taps.length !== 0 ||
			blockPreStatementByType.get(NODE_TYPE_NAMES[type]) !== undefined
		) {
			this.blockPreWalkStatement(
				/** @type {Statement | ModuleDeclaration} */ (tree.estree(id))
			);
			return;
		}
		const statementPath =
			/** @type {(StatementPathItem | number)[]} */
			(this._statementPath);
		statementPath.push(id);
		if (type === NodeType.VariableDeclaration) {
			this._blockPreWalkVariableDeclarationNode(id);
		} else if (type === NodeType.FunctionDeclaration) {
			const name = tree.field(0, Field.id, id);
			if (name !== 0 && this._isBlockScopedFunction(id)) {
				this.defineVariable(tree.name(name));
			}
		} else if (type === NodeType.ExportNamedDeclaration) {
			this._blockPreWalkExportNamedNode(id);
		} else if (type === NodeType.ExportDefaultDeclaration) {
			this._blockPreWalkExportDefaultNode(id);
		} else if (type === NodeType.ExpressionStatement) {
			const expression = tree.field(0, Field.expression, id);
			if (tree.type(expression) === NodeType.AssignmentExpression) {
				this._enterDestructuringAssignmentNode(
					tree.field(0, Field.left, expression),
					tree.field(0, Field.right, expression)
				);
			}
		} else if (type === NodeType.ClassDeclaration) {
			const name = tree.field(0, Field.id, id);
			if (name !== 0) {
				if (this._strictInModuleOutput) {
					this._checkStrictModeBinding(
						tree.name(name),
						/** @type {Identifier} */ (tree.estree(name))
					);
				}
				this.defineVariable(tree.name(name));
			}
		}
		this._prevStatement = statementPath.pop();
	}

	/**
	 * `blockPreWalkVariableDeclaration` for a declaration of the tree, by id.
	 * @param {number} id the declaration
	 * @returns {void}
	 */
	_blockPreWalkVariableDeclarationNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const kind = tree.textOf(Part.kind, id);
		if (kind === "var") return;
		if (kind === "await using" && this.scope.topLevelScope === true) {
			this.hooks.topLevelAwait.call(/** @type {EXPECTED_ANY} */ (id));
		}
		this._preWalkVariableDeclarationNode(
			id,
			kind === "const"
				? this.hooks.varDeclarationConst
				: kind === "using" || kind === "await using"
					? this.hooks.varDeclarationUsing
					: this.hooks.varDeclarationLet
		);
	}

	/**
	 * Walks the body of a loop: a block's statements in the loop's scope, as
	 * the object walk does, or any other statement nested.
	 * @param {number} body the body
	 * @returns {void}
	 */
	_walkLoopBodyNode(body) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		if (tree.type(body) === NodeType.BlockStatement) {
			// no need to add additional scope
			const prev = this._prevStatement;
			this._blockPreWalkScopeNode(body, Field.body);
			this._prevStatement = prev;
			this._walkStatementsNode(body, Field.body);
		} else {
			this._walkNestedStatementNode(body);
		}
	}

	/**
	 * `walkForStatement` for a loop of the tree, by id.
	 * @param {number} id the loop
	 * @returns {void}
	 */
	_walkForNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const oldScope = this._enterBlockScope();
		const init = tree.field(0, Field.init, id);
		if (init !== 0) {
			if (tree.type(init) === NodeType.VariableDeclaration) {
				this._blockPreWalkVariableDeclarationNode(init);
				this._prevStatement = undefined;
				this._walkStatementNode(init);
			} else {
				this._walkExpressionNode(init);
			}
		}
		const test = tree.field(0, Field.test, id);
		if (test !== 0) this._walkExpressionNode(test);
		const update = tree.field(0, Field.update, id);
		if (update !== 0) this._walkExpressionNode(update);
		this._walkLoopBodyNode(tree.field(0, Field.body, id));
		this._exitBlockScope(oldScope, false);
	}

	/**
	 * `walkForInStatement` and `walkForOfStatement` for a loop of the tree, by
	 * id: a target other than a declaration is walked as its object.
	 * @param {number} id the loop
	 * @returns {void}
	 */
	_walkForInOfNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		if (
			tree.type(id) === NodeType.ForOfStatement &&
			tree.flag(Flag.await, id) &&
			this.scope.topLevelScope === true
		) {
			this.hooks.topLevelAwait.call(/** @type {EXPECTED_ANY} */ (id));
		}
		const oldScope = this._enterBlockScope();
		const left = tree.field(0, Field.left, id);
		if (tree.type(left) === NodeType.VariableDeclaration) {
			this._blockPreWalkVariableDeclarationNode(left);
			this._walkVariableDeclarationNode(left);
		} else {
			const target = /** @type {Pattern} */ (tree.estree(left));
			if (
				!this._walkWriteTarget(
					target,
					/** @type {ForInStatement | ForOfStatement} */ (tree.estree(id))
				)
			) {
				this.walkPattern(target);
			}
		}
		this._walkExpressionNode(tree.field(0, Field.right, id));
		this._walkLoopBodyNode(tree.field(0, Field.body, id));
		this._exitBlockScope(oldScope, false);
	}

	/**
	 * `walkTryStatement` for a statement of the tree, by id.
	 * @param {number} id the statement
	 * @returns {void}
	 */
	_walkTryNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const block = tree.field(0, Field.block, id);
		if (this.scope.inTry) {
			this._walkStatementNode(block);
		} else {
			this.scope.inTry = true;
			this._walkStatementNode(block);
			this.scope.inTry = false;
		}

		const tryTerminated = this.scope.terminated;
		this.scope.terminated = undefined;

		const handler = tree.field(0, Field.handler, id);
		if (handler !== 0) this._walkCatchClauseNode(handler);

		const handlerTerminated = this.scope.terminated;
		this.scope.terminated = undefined;

		const finalizer = tree.field(0, Field.finalizer, id);
		if (finalizer !== 0) this._walkStatementNode(finalizer);

		const finalizerTerminated = this.scope.terminated;
		this.scope.terminated = undefined;

		if (finalizerTerminated) {
			this.scope.terminated = finalizerTerminated;
		} else if (tryTerminated && (handler !== 0 ? handlerTerminated : true)) {
			this.scope.terminated = handlerTerminated || tryTerminated;
		}
	}

	/**
	 * `walkCatchClause` for a clause of the tree, by id: a parameter other than
	 * a plain name is entered and walked as its object.
	 * @param {number} id the clause
	 * @returns {void}
	 */
	_walkCatchClauseNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const oldScope = this._enterBlockScope();
		// Error binding is optional in catch clause since ECMAScript 2019
		const param = tree.field(0, Field.param, id);
		if (param !== 0) {
			if (
				tree.type(param) === NodeType.Identifier &&
				!this._strictInModuleOutput
			) {
				this._enterNameNode(param);
			} else {
				const pattern = /** @type {Pattern} */ (tree.estree(param));
				this.enterPattern(pattern, (ident, identifier) => {
					if (this._strictInModuleOutput) {
						this._checkStrictModeBinding(ident, identifier);
					}
					this.defineVariable(ident);
				});
				this.walkPattern(pattern);
			}
		}
		const body = tree.field(0, Field.body, id);
		const prev = this._prevStatement;
		this._blockPreWalkStatementNode(body);
		this._prevStatement = prev;
		this._walkStatementNode(body);

		this._exitBlockScope(oldScope, true);
	}

	/**
	 * `walkSwitchStatement` for a statement of the tree, by id.
	 * @param {number} id the statement
	 * @returns {void}
	 */
	_walkSwitchNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		this._walkExpressionNode(tree.field(0, Field.discriminant, id));
		const oldScope = this._enterBlockScope();
		const count = tree.fieldCount(Field.cases, id);
		// pre-walk every case first: a `const` declared in a later case is already
		// in scope for an earlier case that reads it (and fails at runtime)
		for (let index = 0; index < count; index++) {
			const switchCase = tree.field(index, Field.cases, id);
			if (tree.fieldCount(Field.consequent, switchCase) > 0) {
				const prev = this._prevStatement;
				this._blockPreWalkScopeNode(switchCase, Field.consequent);
				this._prevStatement = prev;
			}
		}
		for (let index = 0; index < count; index++) {
			const switchCase = tree.field(index, Field.cases, id);
			const test = tree.field(0, Field.test, switchCase);
			if (test !== 0) this._walkExpressionNode(test);
			if (tree.fieldCount(Field.consequent, switchCase) > 0) {
				this._walkStatementsNode(switchCase, Field.consequent);
				this.scope.terminated = undefined;
			}
		}
		this._exitBlockScope(oldScope, false);
	}

	/**
	 * The name an export specifier's local or exported side spells.
	 * @param {number} name an identifier or a string literal
	 * @returns {string} the name
	 */
	_moduleExportNameNode(name) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		return tree.type(name) === NodeType.Identifier
			? tree.name(name)
			: /** @type {string} */ (tree.value(name));
	}

	/**
	 * Pre-walks the declaration an export holds as the scope and block passes
	 * do, so it declares before anything reads it.
	 * @param {number} declaration the declaration
	 * @returns {void}
	 */
	_preWalkExportedDeclarationNode(declaration) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const prev = this._prevStatement;
		if (
			tree.type(declaration) === NodeType.VariableDeclaration &&
			tree.textOf(Part.kind, declaration) !== "var"
		) {
			// as `preWalkStatement` does: only a typed tap sees one that is not a `var`
			const { preStatement, preStatementByType } = this.hooks;
			if (preStatement.taps.length !== 0) {
				this.preWalkStatement(
					/** @type {Statement} */ (tree.estree(declaration))
				);
			} else {
				const statementPath =
					/** @type {(StatementPathItem | number)[]} */
					(this._statementPath);
				statementPath.push(declaration);
				const typed = preStatementByType.get("VariableDeclaration");
				if (typed !== undefined) {
					typed.call(/** @type {EXPECTED_ANY} */ (declaration));
				}
				statementPath.pop();
			}
		} else {
			this._preWalkHoistedNode(declaration);
		}
		this._prevStatement = prev;
		this._blockPreWalkStatementNode(declaration);
	}

	/**
	 * `enterDeclaration` for a declaration of the tree, by id: a destructured
	 * binding is entered as its object.
	 * @param {number} declaration the declaration
	 * @param {(name: string) => void} onName called with each name it declares, as `enterPattern` calls back
	 * @returns {void}
	 */
	_enterDeclarationNode(declaration, onName) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		switch (tree.type(declaration)) {
			case NodeType.VariableDeclaration: {
				const count = tree.fieldCount(Field.declarations, declaration);
				for (let i = 0; i < count; i++) {
					const id = tree.field(
						0,
						Field.id,
						tree.field(i, Field.declarations, declaration)
					);
					if (tree.type(id) === NodeType.Identifier) {
						this._enterNameNodeWith(id, onName);
					} else {
						this.enterPattern(
							/** @type {Pattern} */ (tree.estree(id)),
							(name) => onName(name)
						);
					}
				}
				break;
			}
			case NodeType.FunctionDeclaration:
			case NodeType.ClassDeclaration: {
				const id = tree.field(0, Field.id, declaration);
				if (id !== 0) this._enterNameNodeWith(id, onName);
				break;
			}
		}
	}

	/**
	 * `enterIdentifier` for a name of the tree, by id.
	 * @param {number} id the identifier
	 * @param {(name: string) => void} onName called with the name unless a `pattern` hook takes it
	 * @returns {void}
	 */
	_enterNameNodeWith(id, onName) {
		const name = /** @type {SyntaxTree} */ (this._tree).name(id);
		if (!this._callHooksForName1(this.hooks.pattern, name, id)) onName(name);
	}

	/**
	 * `blockPreWalkExportNamedDeclaration` for an export of the tree, by id.
	 * @param {number} id the `export` statement
	 * @returns {void}
	 */
	_blockPreWalkExportNamedNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		if (tree.field(0, Field.source, id) !== 0) return;
		const statement = /** @type {EXPECTED_ANY} */ (id);
		this.hooks.export.call(statement);
		const declaration = tree.field(0, Field.declaration, id);
		if (
			declaration !== 0 &&
			!this.hooks.exportDeclaration.call(
				statement,
				/** @type {EXPECTED_ANY} */ (declaration)
			)
		) {
			this._preWalkExportedDeclarationNode(declaration);
			let index = 0;
			this._enterDeclarationNode(declaration, (def) => {
				this.hooks.exportSpecifier.call(statement, def, def, index++);
			});
		}
		const count = tree.fieldCount(Field.specifiers, id);
		for (let index = 0; index < count; index++) {
			const specifier = tree.field(index, Field.specifiers, id);
			if (tree.type(specifier) !== NodeType.ExportSpecifier) continue;
			this.hooks.exportSpecifier.call(
				statement,
				this._moduleExportNameNode(tree.field(0, Field.local, specifier)),
				this._moduleExportNameNode(tree.field(0, Field.exported, specifier)),
				index
			);
		}
	}

	/**
	 * `blockPreWalkExportDefaultDeclaration` for an export of the tree, by id.
	 * @param {number} id the `export default` statement
	 * @returns {void}
	 */
	_blockPreWalkExportDefaultNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const declaration = tree.field(0, Field.declaration, id);
		const type = tree.type(declaration);
		if (
			type !== NodeType.FunctionDeclaration &&
			type !== NodeType.ClassDeclaration
		) {
			return;
		}
		this._preWalkExportedDeclarationNode(declaration);
		const name = tree.field(0, Field.id, declaration);
		if (name !== 0) {
			this.hooks.exportSpecifier.call(
				/** @type {EXPECTED_ANY} */ (id),
				tree.name(name),
				"default",
				undefined
			);
		}
	}

	/**
	 * Processes the provided statement.
	 * @param {Statement | ModuleDeclaration | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration} statement statement
	 */
	walkStatement(statement) {
		const tree = this._tree;
		if (tree !== undefined) {
			const id =
				typeof statement === "number"
					? statement
					: tree.nodeOf(/** @type {Node} */ (statement));
			if (id !== 0) {
				this._walkStatementNode(id);
				return;
			}
		}
		/** @type {StatementPath} */
		(this._statementPath).push(statement);
		const { statement: statementHook } = this.hooks;
		if (
			statementHook.taps.length === 0 ||
			statementHook.call(statement) === undefined
		) {
			this._walkStatementOfType(statement);
		}
		this._prevStatement =
			/** @type {StatementPath} */
			(this._statementPath).pop();
	}

	/**
	 * Walks a statement by its type, its `statement` hook already called.
	 * @param {Statement | ModuleDeclaration | MaybeNamedClassDeclaration | MaybeNamedFunctionDeclaration} statement statement
	 * @returns {void}
	 */
	_walkStatementOfType(statement) {
		// cases ordered by measured statement frequency; V8 compiles this to
		// sequential compares, so hot types must come first
		switch (statement.type) {
			case "ExpressionStatement":
				this.walkExpressionStatement(statement);
				break;
			case "VariableDeclaration":
				this.walkVariableDeclaration(statement);
				break;
			case "ReturnStatement":
				this.walkReturnStatement(statement);
				break;
			case "IfStatement":
				this.walkIfStatement(statement);
				break;
			case "BlockStatement":
				this.walkBlockStatement(statement);
				break;
			case "FunctionDeclaration":
				this.walkFunctionDeclaration(statement);
				break;
			case "ForStatement":
				this.walkForStatement(statement);
				break;
			case "TryStatement":
				this.walkTryStatement(statement);
				break;
			case "SwitchStatement":
				this.walkSwitchStatement(statement);
				break;
			case "ThrowStatement":
				this.walkThrowStatement(statement);
				break;
			case "WhileStatement":
				this.walkWhileStatement(statement);
				break;
			case "ClassDeclaration":
				this.walkClassDeclaration(statement);
				break;
			case "ForInStatement":
				this.walkForInStatement(statement);
				break;
			case "ForOfStatement":
				this.walkForOfStatement(statement);
				break;
			case "DoWhileStatement":
				this.walkDoWhileStatement(statement);
				break;
			case "ExportNamedDeclaration":
				this.walkExportNamedDeclaration(statement);
				break;
			case "ExportDefaultDeclaration":
				this.walkExportDefaultDeclaration(statement);
				break;
			case "LabeledStatement":
				this.walkLabeledStatement(statement);
				break;
			case "WithStatement":
				this.walkWithStatement(statement);
				break;
		}
	}

	/**
	 * `walkStatements` over a list field of a node of the tree, by id.
	 * @param {number} owner the node holding the list
	 * @param {number} field the `Field` holding the statements
	 * @returns {void}
	 */
	_walkStatementsNode(owner, field) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const count = tree.fieldCount(field, owner);
		let onlyFunctionDeclaration = false;
		for (let index = 0; index < count; index++) {
			const id = tree.field(index, field, owner);
			if (
				onlyFunctionDeclaration &&
				tree.type(id) !== NodeType.FunctionDeclaration &&
				this._callNode(this.hooks.unusedStatement, id)
			) {
				continue;
			}
			this._walkStatementNode(id);
			if (this.scope.terminated) {
				onlyFunctionDeclaration = true;
			}
		}
	}

	/**
	 * `walkStatement` for a statement of the tree, by id: its children are
	 * walked by id where the walk can, so a node no hook reads gets no object.
	 * @param {number} id the statement
	 * @returns {void}
	 */
	_walkStatementNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		/** @type {(StatementPathItem | number)[]} */
		(this._statementPath).push(id);
		const { statement: statementHook } = this.hooks;
		if (
			statementHook.taps.length === 0 ||
			statementHook.call(/** @type {EXPECTED_ANY} */ (id)) === undefined
		) {
			switch (tree.type(id)) {
				case NodeType.ExpressionStatement:
					this._walkExpressionNode(tree.field(0, Field.expression, id));
					break;
				case NodeType.ReturnStatement:
				case NodeType.ThrowStatement:
					this._walkTerminatingStatementNode(id);
					break;
				case NodeType.IfStatement:
					this._walkIfStatementNode(id);
					break;
				case NodeType.FunctionDeclaration:
					this._walkFunctionNode(id);
					break;
				case NodeType.VariableDeclaration:
					this._walkVariableDeclarationNode(id);
					break;
				case NodeType.BlockStatement: {
					const oldScope = this._enterBlockScope();
					const prev = this._prevStatement;
					this._blockPreWalkScopeNode(id, Field.body);
					this._prevStatement = prev;
					this._walkStatementsNode(id, Field.body);
					this._exitBlockScope(oldScope, true);
					break;
				}
				case NodeType.ExportNamedDeclaration: {
					const declaration = tree.field(0, Field.declaration, id);
					if (declaration !== 0) this._walkStatementNode(declaration);
					break;
				}
				case NodeType.ExportDefaultDeclaration:
					this._walkExportDefaultNode(id);
					break;
				case NodeType.ForStatement:
					this._walkForNode(id);
					break;
				case NodeType.ForInStatement:
				case NodeType.ForOfStatement:
					this._walkForInOfNode(id);
					break;
				case NodeType.WhileStatement: {
					const oldScope = this._enterBlockScope();
					this._walkExpressionNode(tree.field(0, Field.test, id));
					this._walkNestedStatementNode(tree.field(0, Field.body, id));
					this._exitBlockScope(oldScope, false);
					break;
				}
				case NodeType.DoWhileStatement: {
					const oldScope = this._enterBlockScope();
					this._walkNestedStatementNode(tree.field(0, Field.body, id));
					this._walkExpressionNode(tree.field(0, Field.test, id));
					this._exitBlockScope(oldScope, false);
					break;
				}
				case NodeType.TryStatement:
					this._walkTryNode(id);
					break;
				case NodeType.ClassDeclaration:
					this._walkClassNode(id);
					break;
				case NodeType.SwitchStatement:
					this._walkSwitchNode(id);
					break;
				case NodeType.EmptyStatement:
				case NodeType.BreakStatement:
				case NodeType.ContinueStatement:
				case NodeType.DebuggerStatement:
				case NodeType.ImportDeclaration:
				case NodeType.ExportAllDeclaration:
					break;
				default:
					this._walkStatementOfType(/** @type {Statement} */ (tree.estree(id)));
			}
		}
		this._prevStatement =
			/** @type {(StatementPathItem | number)[]} */
			(this._statementPath).pop();
	}

	/**
	 * `walkClass` for a class of the tree, by id.
	 * @param {number} id the class declaration or expression
	 * @returns {void}
	 */
	_walkClassNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const classy = /** @type {EXPECTED_ANY} */ (id);
		const superClass = tree.field(0, Field.superClass, id);
		if (
			superClass !== 0 &&
			!this.hooks.classExtendsExpression.call(
				/** @type {EXPECTED_ANY} */ (superClass),
				classy
			)
		) {
			this._walkExpressionNode(superClass);
		}
		const body = tree.field(0, Field.body, id);
		if (body === 0 || tree.type(body) !== NodeType.ClassBody) return;
		const name = tree.field(0, Field.id, id);
		this.inClassScope(true, [], () => {
			// Add class name in scope for recursive calls
			if (name !== 0) this._enterNameNodeWith(name, this._defineVariable);
			const count = tree.fieldCount(Field.body, body);
			for (let i = 0; i < count; i++) {
				const element = tree.field(i, Field.body, body);
				if (
					this.hooks.classBodyElement.call(
						/** @type {EXPECTED_ANY} */ (element),
						classy
					)
				) {
					continue;
				}
				if (tree.type(element) === NodeType.StaticBlock) {
					const wasTopLevel = this.scope.topLevelScope;
					this.scope.topLevelScope = false;
					const oldScope = this._enterBlockScope();
					const prev = this._prevStatement;
					this._blockPreWalkScopeNode(element, Field.body);
					this._prevStatement = prev;
					this._walkStatementsNode(element, Field.body);
					this._exitBlockScope(oldScope, true);
					this.scope.topLevelScope = wasTopLevel;
					continue;
				}
				const key = tree.field(0, Field.key, element);
				if (key !== 0 && tree.flag(Flag.computed, element)) {
					this._walkExpressionNode(key);
				}
				const value = tree.field(0, Field.value, element);
				if (
					value !== 0 &&
					!this.hooks.classBodyValue.call(
						/** @type {EXPECTED_ANY} */ (value),
						/** @type {EXPECTED_ANY} */ (element),
						classy
					)
				) {
					const wasTopLevel = this.scope.topLevelScope;
					this.scope.topLevelScope = false;
					this._walkExpressionNode(value);
					this.scope.topLevelScope = wasTopLevel;
				}
			}
		});
	}

	/**
	 * `walkExportDefaultDeclaration` for an export of the tree, by id.
	 * @param {number} id the `export default` statement
	 * @returns {void}
	 */
	_walkExportDefaultNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const statement = /** @type {EXPECTED_ANY} */ (id);
		this.hooks.export.call(statement);
		const declaration = tree.field(0, Field.declaration, id);
		const type = tree.type(declaration);
		const isDeclaration =
			type === NodeType.FunctionDeclaration ||
			type === NodeType.ClassDeclaration;
		const node = /** @type {EXPECTED_ANY} */ (declaration);
		if (isDeclaration && tree.field(0, Field.id, declaration) !== 0) {
			if (!this.hooks.exportDeclaration.call(statement, node)) {
				this._walkStatementNode(declaration);
			}
			return;
		}
		// `export default function() {}` and `export default class {}` are
		// declarations without a name, which are walked as expressions are
		if (isDeclaration) this._walkStatementNode(declaration);
		else this._walkExpressionNode(declaration);
		this.hooks.exportExpression.call(statement, node);
	}

	/**
	 * `walkNestedStatement` for a statement of the tree, by id.
	 * @param {number} id the nested statement
	 * @returns {void}
	 */
	_walkNestedStatementNode(id) {
		this._prevStatement = undefined;
		this._walkStatementNode(id);
	}

	/**
	 * `walkTerminatingStatement` for a `return` or `throw` of the tree, by id.
	 * @param {number} id the statement
	 * @returns {void}
	 */
	_walkTerminatingStatementNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const argument = tree.field(0, Field.argument, id);
		if (argument !== 0) this._walkExpressionNode(argument);
		if (this.scope.topLevelScope === true) return;
		if (this._callNode(this.hooks.terminate, id)) {
			this.scope.terminated =
				tree.type(id) === NodeType.ReturnStatement
					? SCOPE_INFO_TERMINATED_RETURN
					: SCOPE_INFO_TERMINATED_THROW;
		}
	}

	/**
	 * `walkIfStatement` for an `if` of the tree, by id.
	 * @param {number} id the `if`
	 * @returns {void}
	 */
	_walkIfStatementNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const consequent = tree.field(0, Field.consequent, id);
		const alternate = tree.field(0, Field.alternate, id);
		const result = this._callNode(this.hooks.statementIf, id);
		if (result === undefined) {
			const test = tree.field(0, Field.test, id);
			const guard = this._callNode(this.hooks.collectGuards, test);
			this._walkExpressionNode(test);
			if (guard && guard.consequent) {
				this.walkGuardedBranch(guard.consequent, () =>
					this._walkNestedStatementNode(consequent)
				);
			} else {
				this._walkNestedStatementNode(consequent);
			}
			const consequentTerminated = this.scope.terminated;
			this.scope.terminated = undefined;
			if (alternate !== 0) {
				if (guard && guard.alternate) {
					this.walkGuardedBranch(guard.alternate, () =>
						this._walkNestedStatementNode(alternate)
					);
				} else {
					this._walkNestedStatementNode(alternate);
				}
			}
			const alternateTerminated = this.scope.terminated;
			this.scope.terminated =
				consequentTerminated && alternateTerminated
					? alternateTerminated
					: undefined;
		} else if (result) {
			this._walkNestedStatementNode(consequent);
		} else if (alternate !== 0) {
			this._walkNestedStatementNode(alternate);
		}
	}

	/**
	 * `walkExpressions` over a list field of a node of the tree, by id.
	 * @param {number} owner the node holding the list
	 * @param {number} field the `Field` holding the expressions
	 * @returns {void}
	 */
	_walkExpressionsNode(owner, field) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const count = tree.fieldCount(field, owner);
		for (let i = 0; i < count; i++) {
			const id = tree.field(i, field, owner);
			if (id !== 0) this._walkExpressionNode(id);
		}
	}

	/**
	 * `walkExpression` for an expression of the tree, by id: the nodes it
	 * walks by id get an object only for a hook that has taps, and every
	 * other type is walked as its object.
	 * @param {number} id the expression
	 * @returns {void}
	 */
	_walkExpressionNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		switch (tree.type(id)) {
			case NodeType.Identifier:
				this._callHooksForName1(this.hooks.expression, tree.name(id), id);
				break;
			case NodeType.Literal:
				if (this._strictInModuleOutput) {
					this._checkStrictModeLiteral(
						/** @type {Literal} */ (tree.estree(id))
					);
				}
				break;
			case NodeType.ThisExpression:
				this._callHooksForName1(this.hooks.expression, "this", id);
				break;
			case NodeType.MemberExpression:
				this._walkMemberExpressionNode(id);
				break;
			case NodeType.CallExpression:
				this._walkCallExpressionNode(id);
				break;
			case NodeType.FunctionExpression:
			case NodeType.ArrowFunctionExpression:
				this._walkFunctionNode(id);
				break;
			case NodeType.AssignmentExpression:
				this._walkAssignmentExpressionNode(id);
				break;
			case NodeType.ConditionalExpression:
				this._walkConditionalExpressionNode(id);
				break;
			case NodeType.UnaryExpression:
				if (this._operatorOf(id) === "typeof") {
					const argument = tree.field(0, Field.argument, id);
					const node = /** @type {EXPECTED_ANY} */ (id);
					if (
						this.callHooksForExpression(
							this.hooks.typeof,
							/** @type {EXPECTED_ANY} */ (argument),
							node
						) === true
					) {
						break;
					}
					if (
						tree.type(argument) === NodeType.ChainExpression &&
						this.callHooksForExpression(
							this.hooks.typeof,
							/** @type {EXPECTED_ANY} */ (
								tree.field(0, Field.expression, argument)
							),
							node
						) === true
					) {
						break;
					}
					this._walkExpressionNode(argument);
				} else {
					const argument = tree.field(0, Field.argument, id);
					if (
						this._strictInModuleOutput &&
						tree.type(argument) === NodeType.Identifier &&
						this._operatorOf(id) === "delete"
					) {
						this._reportStrictModeViolation(
							`Deleting the unqualified identifier "${tree.name(
								argument
							)}" is not allowed`,
							/** @type {UnaryExpression} */ (tree.estree(id))
						);
					}
					this._walkExpressionNode(argument);
				}
				break;
			case NodeType.BinaryExpression:
				if (this._callNode(this.hooks.binaryExpression, id) === undefined) {
					this._walkExpressionNode(tree.field(0, Field.left, id));
					this._walkExpressionNode(tree.field(0, Field.right, id));
				}
				break;
			case NodeType.LogicalExpression: {
				const result = this._callNode(this.hooks.expressionLogicalOperator, id);
				if (result === undefined) {
					this._walkExpressionNode(tree.field(0, Field.left, id));
					this._walkExpressionNode(tree.field(0, Field.right, id));
				} else if (result) {
					this._walkExpressionNode(tree.field(0, Field.right, id));
				}
				break;
			}
			case NodeType.ArrayExpression:
				this._walkExpressionsNode(id, Field.elements);
				break;
			case NodeType.ObjectExpression: {
				const count = tree.fieldCount(Field.properties, id);
				for (let i = 0; i < count; i++) {
					this._walkPropertyNode(tree.field(i, Field.properties, id));
				}
				break;
			}
			case NodeType.TemplateLiteral:
				this._walkExpressionsNode(id, Field.expressions);
				break;
			case NodeType.TaggedTemplateExpression:
				this.scope.inTaggedTemplateTag = true;
				this._walkExpressionNode(tree.field(0, Field.tag, id));
				this.scope.inTaggedTemplateTag = false;
				this._walkExpressionsNode(
					tree.field(0, Field.quasi, id),
					Field.expressions
				);
				break;
			case NodeType.SpreadElement:
				this._walkExpressionNode(tree.field(0, Field.argument, id));
				break;
			case NodeType.AwaitExpression:
				if (this.scope.topLevelScope === true) {
					this._callNode(this.hooks.topLevelAwait, id);
				}
				this._walkExpressionNode(tree.field(0, Field.argument, id));
				break;
			case NodeType.NewExpression: {
				const callee = tree.field(0, Field.callee, id);
				if (
					this.callHooksForExpression(
						this.hooks.new,
						/** @type {EXPECTED_ANY} */ (callee),
						/** @type {EXPECTED_ANY} */ (id)
					) === true
				) {
					break;
				}
				this._walkExpressionNode(callee);
				this._walkExpressionsNode(id, Field.arguments);
				break;
			}
			case NodeType.UpdateExpression: {
				const argument = tree.field(0, Field.argument, id);
				// a name walks by id; the strict-mode check and other targets read objects
				if (
					tree.type(argument) !== NodeType.Identifier ||
					this._strictInModuleOutput
				) {
					this._walkExpressionObject(
						/** @type {Expression} */ (tree.estree(id))
					);
					break;
				}
				if (
					!this._callHooksForName1(
						this.hooks.write,
						tree.name(argument),
						/** @type {EXPECTED_ANY} */ (id)
					)
				) {
					this._walkExpressionNode(argument);
				}
				break;
			}
			case NodeType.SequenceExpression:
				this._walkSequenceNode(id);
				break;
			case NodeType.ClassExpression:
				// only `await` is checked as a class's name, as for declarations
				if (this._strictInModuleOutput && tree.field(0, Field.id, id) !== 0) {
					this._walkExpressionObject(
						/** @type {Expression} */ (tree.estree(id))
					);
				} else {
					this._walkClassNode(id);
				}
				break;
			case NodeType.YieldExpression: {
				const argument = tree.field(0, Field.argument, id);
				if (argument !== 0) this._walkExpressionNode(argument);
				break;
			}
			default:
				this._walkExpressionObject(/** @type {Expression} */ (tree.estree(id)));
		}
	}

	/**
	 * `walkSequenceExpression` for a sequence of the tree, by id: one that is
	 * a statement walks each expression as a statement of its own.
	 * @param {number} id the sequence
	 * @returns {void}
	 */
	_walkSequenceNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const path =
			/** @type {(StatementPathItem | number)[]} */
			(this._statementPath);
		const currentItem = path[path.length - 1];
		const current =
			typeof currentItem === "number"
				? currentItem
				: tree.nodeOf(/** @type {Node} */ (currentItem));
		if (
			current !== id &&
			!(
				current !== 0 &&
				tree.type(current) === NodeType.ExpressionStatement &&
				tree.field(0, Field.expression, current) === id
			)
		) {
			this._walkExpressionsNode(id, Field.expressions);
			return;
		}
		// We treat sequence expressions like statements when they are one statement level
		// This has some benefits for optimizations that only work on statement level
		const old = /** @type {StatementPathItem | number} */ (path.pop());
		const prev = this._prevStatement;
		const count = tree.fieldCount(Field.expressions, id);
		for (let i = 0; i < count; i++) {
			const expression = tree.field(i, Field.expressions, id);
			path.push(expression);
			this._walkExpressionNode(expression);
			this._prevStatement = path.pop();
		}
		this._prevStatement = prev;
		path.push(old);
	}

	/**
	 * `walkVariableDeclaration` for a declaration of the tree, by id.
	 * @param {number} id the declaration
	 * @returns {void}
	 */
	_walkVariableDeclarationNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const { declarator: declaratorHook } = this.hooks;
		const count = tree.fieldCount(Field.declarations, id);
		for (let i = 0; i < count; i++) {
			const declarator = tree.field(i, Field.declarations, id);
			const target = tree.field(0, Field.id, declarator);
			const init = tree.field(0, Field.init, declarator);
			const renameIdentifier =
				init !== 0 &&
				this.getRenameIdentifier(/** @type {EXPECTED_ANY} */ (init));
			if (renameIdentifier && tree.type(target) === NodeType.Identifier) {
				const hook = this.hooks.canRename.get(renameIdentifier);
				const initNode = /** @type {EXPECTED_ANY} */ (init);
				if (hook !== undefined && hook.call(initNode)) {
					// renaming with "var a = b;"
					const hook = this.hooks.rename.get(renameIdentifier);
					if (hook === undefined || !hook.call(initNode)) {
						this.setVariable(tree.name(target), renameIdentifier);
					}
					continue;
				}
			}
			if (
				(declaratorHook.taps.length === 0 &&
					declaratorHook.interceptors.length === 0) ||
				!declaratorHook.call(
					/** @type {EXPECTED_ANY} */ (declarator),
					/** @type {EXPECTED_ANY} */ (id)
				)
			) {
				if (tree.type(target) !== NodeType.Identifier) {
					this._walkPatternNode(target);
				}
				if (init !== 0) this._walkExpressionNode(init);
			}
		}
	}

	/**
	 * `walkAssignmentExpression` for an assignment of the tree, by id: to a
	 * name or a member; any other target is walked as its object.
	 * @param {number} id the assignment
	 * @returns {void}
	 */
	_walkAssignmentExpressionNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const left = tree.field(0, Field.left, id);
		const right = tree.field(0, Field.right, id);
		const leftType = tree.type(left);
		if (leftType === NodeType.Identifier) {
			const leftName = tree.name(left);
			if (this._strictInModuleOutput) {
				this._checkStrictModeAssignTarget(
					leftName,
					/** @type {AssignmentExpression} */ (tree.estree(id))
				);
			}
			const renameIdentifier = this.getRenameIdentifier(
				/** @type {EXPECTED_ANY} */ (right)
			);
			if (
				renameIdentifier &&
				this._callHooksForInfo1(this.hooks.canRename, renameIdentifier, right)
			) {
				// renaming "a = b;"
				if (
					!this._callHooksForInfo1(this.hooks.rename, renameIdentifier, right)
				) {
					this.setVariable(
						leftName,
						typeof renameIdentifier === "string"
							? this.getVariableInfo(renameIdentifier)
							: renameIdentifier
					);
				}
				return;
			}
			this._walkExpressionNode(right);
			if (
				!this._callHooksForName1(this.hooks.pattern, leftName, left) &&
				!this._callHooksForName1(this.hooks.assign, leftName, id)
			) {
				this._walkExpressionNode(left);
			}
		} else if (leftType === NodeType.MemberExpression) {
			if (
				this._resolveMemberExpressionNode(
					left,
					ALLOWED_MEMBER_TYPES_EXPRESSION
				) === 1 &&
				this._hasHooksForInfo(
					this.hooks.assignMemberChain,
					/** @type {string | VariableInfo} */ (this._memberRootInfo)
				) &&
				this.callHooksForInfo(
					this.hooks.assignMemberChain,
					/** @type {string | VariableInfo} */ (this._memberRootInfo),
					/** @type {EXPECTED_ANY} */ (id),
					this._members
				)
			) {
				return;
			}
			this._walkExpressionNode(right);
			this._walkExpressionNode(left);
		} else {
			this._walkExpressionObject(
				/** @type {AssignmentExpression} */ (tree.estree(id))
			);
		}
	}

	/**
	 * `walkConditionalExpression` for a conditional of the tree, by id.
	 * @param {number} id the conditional
	 * @returns {void}
	 */
	_walkConditionalExpressionNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const consequent = tree.field(0, Field.consequent, id);
		const alternate = tree.field(0, Field.alternate, id);
		const result = this._callNode(this.hooks.expressionConditionalOperator, id);
		if (result === undefined) {
			const test = tree.field(0, Field.test, id);
			const guard = this._callNode(this.hooks.collectGuards, test);
			this._walkExpressionNode(test);
			if (guard && guard.consequent) {
				this.walkGuardedBranch(guard.consequent, () =>
					this._walkExpressionNode(consequent)
				);
			} else {
				this._walkExpressionNode(consequent);
			}
			if (alternate !== 0) {
				if (guard && guard.alternate) {
					this.walkGuardedBranch(guard.alternate, () =>
						this._walkExpressionNode(alternate)
					);
				} else {
					this._walkExpressionNode(alternate);
				}
			}
		} else if (result) {
			this._walkExpressionNode(consequent);
		} else if (alternate !== 0) {
			this._walkExpressionNode(alternate);
		}
	}

	/**
	 * `walkFunctionDeclaration`, `walkFunctionExpression` and
	 * `walkArrowFunctionExpression` for a function of the tree, by id: its
	 * parameters are walked as objects, its body by id.
	 * @param {number} id the function
	 * @returns {void}
	 */
	_walkFunctionNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const type = tree.type(id);
		const isArrow = type === NodeType.ArrowFunctionExpression;
		const wasTopLevel = this.scope.topLevelScope;
		this.scope.topLevelScope = isArrow && wasTopLevel ? "arrow" : false;
		const paramCount = tree.fieldCount(Field.params, id);
		/** @type {ScopeInfo} */
		let oldScope;
		if (!this._strictInModuleOutput) {
			oldScope = this._openFunctionScope(!isArrow);
			let plainNames = true;
			for (let i = 0; i < paramCount; i++) {
				const param = tree.field(i, Field.params, id);
				if (tree.type(param) === NodeType.Identifier) {
					this._enterNameNode(param);
				} else {
					plainNames = false;
					this._enterPatternNode(param, this._defineVariable);
				}
			}
			if (type === NodeType.FunctionExpression) {
				const name = tree.field(0, Field.id, id);
				if (name !== 0) this._enterNameNode(name);
			}
			// plain names walk nothing, as walkPattern does
			if (!plainNames) {
				for (let i = 0; i < paramCount; i++) {
					this._walkPatternNode(tree.field(i, Field.params, id));
				}
			}
		} else {
			const fn =
				/** @type {FunctionDeclaration | FunctionExpression | ArrowFunctionExpression} */ (
					tree.estree(id)
				);
			const params = fn.params;
			/** @type {(string | Pattern)[]} */
			let scopeParams = params;
			if (this._strictInModuleOutput) this._checkStrictModeParams(params);
			if (type === NodeType.FunctionExpression) {
				const name = /** @type {FunctionExpression} */ (fn).id;
				if (name) {
					scopeParams = [...params, name];
					if (this._strictInModuleOutput) {
						this._checkStrictModeBinding(name.name, name);
					}
				}
			}
			oldScope = this._enterFunctionScope(!isArrow, scopeParams);
			for (const param of params) {
				this.walkPattern(param);
			}
		}
		const bodyId = tree.field(0, Field.body, id);
		if (tree.type(bodyId) === NodeType.BlockStatement) {
			this._detectModeNode(bodyId);
			const prev = this._prevStatement;
			this._preWalkScope(bodyId);
			this._prevStatement = prev;
			this._walkStatementNode(bodyId);
		} else {
			this._walkExpressionNode(bodyId);
		}
		this.scope = oldScope;
		this.scope.topLevelScope = wasTopLevel;
	}

	/**
	 * `enterIdentifier` with `_defineVariable` for a name of the tree, by id.
	 * @param {number} id the identifier
	 * @returns {void}
	 */
	_enterNameNode(id) {
		const name = /** @type {SyntaxTree} */ (this._tree).name(id);
		if (!this._callHooksForName1(this.hooks.pattern, name, id)) {
			this.defineVariable(name);
		}
	}

	/**
	 * `walkProperty` for a property of an object of the tree, by id.
	 * @param {number} id the property or spread
	 * @returns {void}
	 */
	_walkPropertyNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		if (tree.type(id) === NodeType.SpreadElement) {
			this._walkExpressionNode(tree.field(0, Field.argument, id));
			return;
		}
		if (tree.flag(Flag.computed, id)) {
			this._walkExpressionNode(tree.field(0, Field.key, id));
		}
		const value = tree.field(0, Field.value, id);
		if (
			tree.flag(Flag.shorthand, id) &&
			tree.type(value) === NodeType.Identifier
		) {
			this.scope.inShorthand = tree.name(value);
			this._callHooksForName1(this.hooks.expression, tree.name(value), value);
			this.scope.inShorthand = false;
		} else {
			this._walkExpressionNode(value);
		}
	}

	/**
	 * `getMemberExpressionRoot` for a node of the tree, by id.
	 * @param {number} id the expression
	 * @returns {number} the object below the chain's last static member
	 */
	_memberRootNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		let expression = id;
		while (tree.type(expression) === NodeType.MemberExpression) {
			const property = tree.field(0, Field.property, expression);
			const type = tree.type(property);
			if (tree.flag(Flag.computed, expression)) {
				if (
					type !== NodeType.Literal &&
					cookedOf(tree, property) === undefined
				) {
					break;
				}
			} else if (type !== NodeType.Identifier) {
				break;
			}
			expression = tree.field(0, Field.object, expression);
		}
		return expression;
	}

	/**
	 * `_extractMembers` for a node of the tree, by id: the static members from
	 * the chain down to `root`.
	 * @param {number} id the chain
	 * @param {number} root the node `_memberRootNode` stopped at
	 * @returns {void}
	 */
	_extractMembersNode(id, root) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		/** @type {Members} */
		const members = [];
		/** @type {MembersOptionals} */
		const membersOptionals = [];
		for (
			let node = id;
			node !== root;
			node = tree.field(0, Field.object, node)
		) {
			const property = tree.field(0, Field.property, node);
			switch (tree.type(property)) {
				case NodeType.Identifier:
					members.push(tree.name(property));
					break;
				case NodeType.Literal:
					members.push(`${tree.value(property)}`);
					break;
				default:
					members.push(/** @type {string} */ (cookedOf(tree, property)));
			}
			membersOptionals.push(tree.flag(Flag.optional, node));
		}
		if (members.length > 1) {
			members.reverse();
			membersOptionals.reverse();
		}
		this._members = members;
		this._membersOptionals = membersOptionals;
	}

	/**
	 * `_resolveMemberExpression` for a node of the tree, by id: the same
	 * result and slots, cached by id, with only a call root's object made.
	 * @param {number} id the member expression
	 * @param {number} allowedTypes which types of root may be resolved
	 * @returns {0 | 1 | 2} 0 when no hook can see it, 1 for a name, 2 for a call root
	 */
	_resolveMemberExpressionNode(id, allowedTypes) {
		if (id === this._memberNode && this._memberScope === this.scope) {
			const type = this._memberType;
			if (type !== 0) {
				// the root kind is a fact of the node; the mask only says whether to report it
				const bit =
					type === 2
						? ALLOWED_MEMBER_TYPES_CALL_EXPRESSION
						: ALLOWED_MEMBER_TYPES_EXPRESSION;
				return (allowedTypes & bit) === 0 ? 0 : type;
			}
			if ((allowedTypes & ~this._memberMask) === 0) return 0;
		}
		const tree = /** @type {SyntaxTree} */ (this._tree);
		this._memberExpression = undefined;
		this._memberNode = id;
		this._memberScope = this.scope;
		this._memberMask = allowedTypes;
		this._memberType = 0;
		this._memberInfo = undefined;
		const root = this._memberRootNode(id);
		switch (tree.type(root)) {
			case NodeType.CallExpression: {
				if ((allowedTypes & ALLOWED_MEMBER_TYPES_CALL_EXPRESSION) === 0) {
					return 0;
				}
				const callee = tree.field(0, Field.callee, root);
				const calleeIsMember = tree.type(callee) === NodeType.MemberExpression;
				const calleeRoot = calleeIsMember
					? this._memberRootNode(callee)
					: callee;
				const rootName = rootNameOf(tree, calleeRoot);
				if (!rootName) return this._rejectMemberExpression();
				const resolvedRoot = this._resolveMemberRoot(rootName);
				if (resolvedRoot === undefined) return this._rejectMemberExpression();
				let rootMembers = EMPTY_ARRAY;
				if (calleeIsMember) {
					this._extractMembersNode(callee, calleeRoot);
					rootMembers = this._members;
				}
				this._extractMembersNode(id, root);
				const calleeName = objectAndMembersToName(resolvedRoot, rootMembers);
				this._memberType = 2;
				this._memberCall = root;
				this._memberCalleeName = calleeName;
				this._memberCalleeMembers = rootMembers;
				this._memberName = objectAndMembersToName(
					`${calleeName}()`,
					this._members
				);
				return 2;
			}
			case NodeType.Identifier:
			case NodeType.MetaProperty:
			case NodeType.ThisExpression: {
				if ((allowedTypes & ALLOWED_MEMBER_TYPES_EXPRESSION) === 0) return 0;
				const rootName = rootNameOf(tree, root);
				if (!rootName) return this._rejectMemberExpression();
				const resolvedRoot = this._resolveMemberRoot(rootName);
				if (resolvedRoot === undefined) return this._rejectMemberExpression();
				this._extractMembersNode(id, root);
				this._memberType = 1;
				this._memberName = objectAndMembersToName(resolvedRoot, this._members);
				return 1;
			}
		}
		return this._rejectMemberExpression();
	}

	/**
	 * `walkMemberExpression` for a node of the tree, by id.
	 * @param {number} id the member expression
	 * @returns {void}
	 */
	_walkMemberExpressionNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const type = this._resolveMemberExpressionNode(
			id,
			ALLOWED_MEMBER_TYPES_ALL
		);
		if (type === 1) {
			// copied out first: a hook may resolve another chain and reuse the slots
			const name = this._memberName;
			const rootInfo = /** @type {string | VariableInfo} */ (
				this._memberRootInfo
			);
			const members = this._members;
			const membersOptionals = this._membersOptionals;
			if (this._callHooksForInfo1(this.hooks.expression, name, id) === true) {
				return;
			}
			if (
				this._hasHooksForInfo(this.hooks.expressionMemberChain, rootInfo) &&
				this.callHooksForInfo(
					this.hooks.expressionMemberChain,
					rootInfo,
					/** @type {EXPECTED_ANY} */ (id),
					members,
					membersOptionals,
					memberRangesOfNode(tree, id, members.length)
				) === true
			) {
				return;
			}
			this._walkMemberChainNode(
				id,
				id,
				name,
				rootInfo,
				members,
				members.length
			);
			return;
		}
		if (type === 2) {
			const call = /** @type {number} */ (this._memberCall);
			const rootInfo = /** @type {string | VariableInfo} */ (
				this._memberRootInfo
			);
			if (
				this._hasHooksForInfo(
					this.hooks.memberChainOfCallMemberChain,
					rootInfo
				) &&
				this.callHooksForInfo(
					this.hooks.memberChainOfCallMemberChain,
					rootInfo,
					/** @type {EXPECTED_ANY} */ (id),
					this._memberCalleeMembers,
					/** @type {EXPECTED_ANY} */ (call),
					this._members,
					memberRangesOfNode(tree, id, this._members.length)
				) === true
			) {
				return;
			}
			// the chain's computed members are literals, so only the call walks
			this._walkExpressionNode(call);
			return;
		}
		this._walkExpressionNode(tree.field(0, Field.object, id));
		if (tree.flag(Flag.computed, id)) {
			this._walkExpressionNode(tree.field(0, Field.property, id));
		}
	}

	/**
	 * `walkCallExpression` for a call of the tree, by id: the callee is
	 * evaluated as its object and the rest walked by id. A call any of the
	 * object walk's special cases may apply to is walked as its object.
	 * @param {number} id the call
	 * @returns {void}
	 */
	_walkCallExpressionNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const calleeId = tree.field(0, Field.callee, id);
		const calleeType = tree.type(calleeId);
		if (calleeType === NodeType.MemberExpression) {
			const object = tree.field(0, Field.object, calleeId);
			const objectType = tree.type(object);
			if (
				objectType === NodeType.FunctionExpression ||
				objectType === NodeType.ArrowFunctionExpression
			) {
				const property = tree.field(0, Field.property, calleeId);
				const method = tree.flag(Flag.computed, calleeId)
					? ""
					: tree.name(property);
				if (
					(method === "call" || method === "bind") &&
					tree.fieldCount(Field.arguments, id) > 0 &&
					hasOnlyNameParams(tree, object)
				) {
					// (function(…) { }.call/bind(?, …))
					this._walkIIFENode(object, id, 1, tree.field(0, Field.arguments, id));
					return;
				}
			} else if (objectType === NodeType.ImportExpression) {
				this._walkExpressionObject(
					/** @type {CallExpression} */ (tree.estree(id))
				);
				return;
			} else if (
				tree.type(this._memberRootNode(calleeId)) === NodeType.CallExpression &&
				this._resolveMemberExpression(
					/** @type {EXPECTED_ANY} */ (calleeId),
					ALLOWED_MEMBER_TYPES_CALL_EXPRESSION
				) === 2
			) {
				const rootInfo = /** @type {string | VariableInfo} */ (
					this._memberRootInfo
				);
				const members = this._members;
				if (
					this._hasHooksForInfo(
						this.hooks.callMemberChainOfCallMemberChain,
						rootInfo
					) &&
					this.callHooksForInfo(
						this.hooks.callMemberChainOfCallMemberChain,
						rootInfo,
						/** @type {EXPECTED_ANY} */ (id),
						this._memberCalleeMembers,
						/** @type {EXPECTED_ANY} */ (this._memberCall),
						members,
						memberRangesOfNode(tree, calleeId, members.length)
					) === true
				) {
					return;
				}
			}
		} else if (
			(calleeType === NodeType.FunctionExpression ||
				calleeType === NodeType.ArrowFunctionExpression) &&
			hasOnlyNameParams(tree, calleeId)
		) {
			// (function(…) { }(…))
			this._walkIIFENode(calleeId, id, 0, 0);
			return;
		}
		if (calleeType === NodeType.Identifier && this._evalIdentOwnTaps) {
			const name = tree.name(calleeId);
			if (name !== "undefined" && this._isDefinedPlainVariable(name)) {
				// a defined, untagged callee can only evaluate to the fallthrough
				// result, so no call hooks apply
				this._walkExpressionNode(calleeId);
				this._walkExpressionsNode(id, Field.arguments);
				return;
			}
		}
		const callee = this.evaluateExpression(
			/** @type {EXPECTED_ANY} */ (calleeId)
		);
		if (callee.isIdentifier()) {
			const rootInfo =
				/** @type {NonNullable<BasicEvaluatedExpression["rootInfo"]>} */
				(callee.rootInfo);
			if (this._hasHooksForInfo(this.hooks.callMemberChain, rootInfo)) {
				const members =
					/** @type {NonNullable<BasicEvaluatedExpression["getMembers"]>} */
					(callee.getMembers)();
				const result1 = this.callHooksForInfo(
					this.hooks.callMemberChain,
					rootInfo,
					/** @type {EXPECTED_ANY} */ (id),
					members,
					callee.getMembersOptionals
						? callee.getMembersOptionals()
						: members.map(RETURN_FALSE),
					callee.getMemberRanges ? callee.getMemberRanges() : []
				);
				if (result1 === true) return;
			}
			const result2 = this._callHooksForInfo1(
				this.hooks.call,
				/** @type {NonNullable<BasicEvaluatedExpression["identifier"]>} */
				(callee.identifier),
				id
			);
			if (result2 === true) return;
		}
		if (calleeType === NodeType.MemberExpression) {
			// because of call context the callee's object walks as an expression
			this._walkExpressionNode(tree.field(0, Field.object, calleeId));
			if (tree.flag(Flag.computed, calleeId)) {
				this._walkExpressionNode(tree.field(0, Field.property, calleeId));
			}
		} else {
			this._walkExpressionNode(calleeId);
		}
		this._walkExpressionsNode(id, Field.arguments);
	}

	/**
	 * `_walkIIFE` for a called function of the tree, by id; a loose script
	 * emitted as strict ESM walks the call as its object, to check the names.
	 * @param {number} fn the function, its parameters all plain names
	 * @param {number} call the call that passes it its arguments
	 * @param {number} first the index of the call's first argument it gets
	 * @param {number} currentThis the `this` it is called with, `0` for none
	 * @returns {void}
	 */
	_walkIIFENode(fn, call, first, currentThis) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		if (this._strictInModuleOutput) {
			this._walkExpressionObject(
				/** @type {CallExpression} */ (tree.estree(call))
			);
			return;
		}
		/**
		 * @param {number} argOrThis an argument or `this`
		 * @returns {string | VariableInfo | undefined} its variable info, when it renames
		 */
		const getVarInfo = (argOrThis) => {
			const node = /** @type {EXPECTED_ANY} */ (argOrThis);
			const renameIdentifier = this.getRenameIdentifier(node);
			if (
				renameIdentifier &&
				this._callHooksForInfo1(this.hooks.canRename, renameIdentifier, node) &&
				!this._callHooksForInfo1(this.hooks.rename, renameIdentifier, node)
			) {
				return typeof renameIdentifier === "string"
					? /** @type {string} */ (this.getVariableInfo(renameIdentifier))
					: renameIdentifier;
			}
			this.walkExpression(node);
		};
		const type = tree.type(fn);
		const arrow = type === NodeType.ArrowFunctionExpression;
		const renameThis = currentThis !== 0 ? getVarInfo(currentThis) : null;
		const argumentCount = tree.fieldCount(Field.arguments, call);
		/** @type {(string | VariableInfo | undefined)[]} */
		const varInfoForArgs = [];
		for (let i = first; i < argumentCount; i++) {
			varInfoForArgs.push(getVarInfo(tree.field(i, Field.arguments, call)));
		}
		const wasTopLevel = this.scope.topLevelScope;
		this.scope.topLevelScope = wasTopLevel && arrow ? "arrow" : false;
		const oldScope = this._openFunctionScope(true);
		const paramCount = tree.fieldCount(Field.params, fn);
		for (let i = 0; i < paramCount; i++) {
			if (!varInfoForArgs[i]) {
				this._enterNameNode(tree.field(i, Field.params, fn));
			}
		}
		// the function's own name, for recursive calls
		if (type === NodeType.FunctionExpression) {
			const name = tree.field(0, Field.id, fn);
			if (name !== 0) this.defineVariable(tree.name(name));
		}
		if (renameThis && !arrow) {
			this.setVariable("this", renameThis);
		}
		const renamed = Math.min(varInfoForArgs.length, paramCount);
		for (let i = 0; i < renamed; i++) {
			const varInfo = varInfoForArgs[i];
			if (varInfo) {
				this.setVariable(tree.name(tree.field(i, Field.params, fn)), varInfo);
			}
		}
		const body = tree.field(0, Field.body, fn);
		if (tree.type(body) === NodeType.BlockStatement) {
			this._detectModeNode(body);
			const prev = this._prevStatement;
			this._preWalkScope(body);
			this._prevStatement = prev;
			this._walkStatementNode(body);
		} else {
			this._walkExpressionNode(body);
		}
		this.scope = oldScope;
		this.scope.topLevelScope = wasTopLevel;
	}

	/**
	 * `_walkMemberChain` for a node of the tree, by id.
	 * @param {number} outer the whole chain, for the unhandled hook
	 * @param {number} id the chain from here inwards
	 * @param {string} name name of `id`
	 * @param {string | VariableInfo} rootInfo root info
	 * @param {Members} members members of the whole chain, in source order
	 * @param {number} end how many of `members` are inside `id`
	 * @returns {void}
	 */
	_walkMemberChainNode(outer, id, name, rootInfo, members, end) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const object = tree.field(0, Field.object, id);
		if (tree.type(object) === NodeType.MemberExpression) {
			const property = members[end - 1];
			name = name.slice(0, -property.length - 1);
			if (
				this._callHooksForInfo1(this.hooks.expression, name, object) === true
			) {
				return;
			}
			this._walkMemberChainNode(
				outer,
				object,
				name,
				rootInfo,
				members,
				end - 1
			);
		} else if (
			!this._hasHooksForInfo(
				this.hooks.unhandledExpressionMemberChain,
				rootInfo
			) ||
			!this.callHooksForInfo(
				this.hooks.unhandledExpressionMemberChain,
				rootInfo,
				/** @type {EXPECTED_ANY} */ (outer),
				members
			)
		) {
			this._walkExpressionNode(object);
		}
		if (tree.flag(Flag.computed, id)) {
			this._walkExpressionNode(tree.field(0, Field.property, id));
		}
	}

	/**
	 * Calls a hook whose one argument is a node of the tree, by id: a tap
	 * without `path` gets the node's object, made then.
	 * @template R
	 * @param {SyncBailHook<[EXPECTED_ANY], R>} hook the hook
	 * @param {number} id the node
	 * @returns {R | undefined} the hook's result
	 */
	_callNode(hook, id) {
		if (hook.taps.length === 0 && hook.interceptors.length === 0) return;
		return hook.call(id);
	}

	/**
	 * Walks a statements that is nested within a parent statement
	 * and can potentially be a non-block statement.
	 * This enforces the nested statement to never be in ASI position.
	 * @param {Statement} statement the nested statement
	 */
	walkNestedStatement(statement) {
		this._prevStatement = undefined;
		this.walkStatement(statement);
	}

	// Real Statements

	/**
	 * Walk block statement.
	 * @param {BlockStatement | StaticBlock} statement block statement
	 */
	walkBlockStatement(statement) {
		const oldScope = this._enterBlockScope();
		const body = statement.body;
		const prev = this._prevStatement;
		this._blockPreWalkScope(statement, body);
		this._prevStatement = prev;
		this.walkStatements(body);

		this._exitBlockScope(oldScope, true);
	}

	/**
	 * Walk expression statement.
	 * @param {ExpressionStatement} statement expression statement
	 */
	walkExpressionStatement(statement) {
		this.walkExpression(statement.expression);
	}

	/**
	 * Walks a conditional branch with its guard frame (if any) pushed onto the
	 * parser-state guard stack for the duration of the branch body.
	 * @param {GuardFrame | undefined | null} frame guard frame, or falsy when the branch is unguarded
	 * @param {() => void} walk branch walk
	 * @returns {void}
	 */
	walkGuardedBranch(frame, walk) {
		if (!frame) {
			walk();
			return;
		}
		const stack = this.state.guardStack || (this.state.guardStack = []);
		stack.push(frame);
		try {
			walk();
		} finally {
			stack.pop();
		}
	}

	/**
	 * Processes the provided statement.
	 * @param {IfStatement} statement if statement
	 */
	walkIfStatement(statement) {
		const result = this.hooks.statementIf.call(statement);
		if (result === undefined) {
			const guard = this.hooks.collectGuards.call(statement.test);
			this.walkExpression(statement.test);
			// allocate the branch closure only when a guard frame needs pushing
			if (guard && guard.consequent) {
				this.walkGuardedBranch(guard.consequent, () =>
					this.walkNestedStatement(statement.consequent)
				);
			} else {
				this.walkNestedStatement(statement.consequent);
			}

			const consequentTerminated = this.scope.terminated;
			this.scope.terminated = undefined;

			if (statement.alternate) {
				const alternate = statement.alternate;
				if (guard && guard.alternate) {
					this.walkGuardedBranch(guard.alternate, () =>
						this.walkNestedStatement(alternate)
					);
				} else {
					this.walkNestedStatement(alternate);
				}
			}

			const alternateTerminated = this.scope.terminated;

			this.scope.terminated =
				consequentTerminated && alternateTerminated
					? alternateTerminated
					: undefined;
		} else if (result) {
			this.walkNestedStatement(statement.consequent);
		} else if (statement.alternate) {
			this.walkNestedStatement(statement.alternate);
		}
	}

	/**
	 * Walk labeled statement.
	 * @param {LabeledStatement} statement with statement
	 */
	walkLabeledStatement(statement) {
		const hook = this.hooks.label.get(statement.label.name);
		if (hook !== undefined) {
			const result = hook.call(statement);
			if (result === true) return;
		}
		const oldScope = this._enterBlockScope();
		this.walkNestedStatement(statement.body);

		this._exitBlockScope(oldScope, false);
	}

	/**
	 * Walk with statement.
	 * @param {WithStatement} statement with statement
	 */
	walkWithStatement(statement) {
		if (this._strictInModuleOutput) {
			this._reportStrictModeViolation(
				"`with` statements are not allowed",
				statement
			);
		}
		const oldScope = this._enterBlockScope();
		this.walkExpression(statement.object);
		this.walkNestedStatement(statement.body);

		this._exitBlockScope(oldScope, false);
	}

	/**
	 * Walk switch statement.
	 * @param {SwitchStatement} statement switch statement
	 */
	walkSwitchStatement(statement) {
		this.walkExpression(statement.discriminant);
		this.walkSwitchCases(statement.cases);
	}

	/**
	 * Walk terminating statement.
	 * @param {ReturnStatement | ThrowStatement} statement return or throw statement
	 */
	walkTerminatingStatement(statement) {
		if (statement.argument) this.walkExpression(statement.argument);
		// Skip top level scope because to handle `export` and `module.exports` after terminate
		if (this.scope.topLevelScope === true) return;
		if (this.hooks.terminate.call(statement)) {
			this.scope.terminated =
				statement.type === "ReturnStatement"
					? SCOPE_INFO_TERMINATED_RETURN
					: SCOPE_INFO_TERMINATED_THROW;
		}
	}

	/**
	 * Walk return statement.
	 * @param {ReturnStatement} statement return statement
	 */
	walkReturnStatement(statement) {
		this.walkTerminatingStatement(statement);
	}

	/**
	 * Walk throw statement.
	 * @param {ThrowStatement} statement return statement
	 */
	walkThrowStatement(statement) {
		this.walkTerminatingStatement(statement);
	}

	/**
	 * Walk try statement.
	 * @param {TryStatement} statement try statement
	 */
	walkTryStatement(statement) {
		if (this.scope.inTry) {
			this.walkStatement(statement.block);
		} else {
			this.scope.inTry = true;
			this.walkStatement(statement.block);
			this.scope.inTry = false;
		}

		const tryTerminated = this.scope.terminated;
		this.scope.terminated = undefined;

		if (statement.handler) this.walkCatchClause(statement.handler);

		const handlerTerminated = this.scope.terminated;
		this.scope.terminated = undefined;

		if (statement.finalizer) {
			this.walkStatement(statement.finalizer);
		}

		const finalizerTerminated = this.scope.terminated;
		this.scope.terminated = undefined;

		if (finalizerTerminated) {
			this.scope.terminated = finalizerTerminated;
		} else if (
			tryTerminated &&
			(statement.handler ? handlerTerminated : true)
		) {
			this.scope.terminated = handlerTerminated || tryTerminated;
		}
	}

	/**
	 * Walk while statement.
	 * @param {WhileStatement} statement while statement
	 */
	walkWhileStatement(statement) {
		const oldScope = this._enterBlockScope();
		this.walkExpression(statement.test);
		this.walkNestedStatement(statement.body);

		this._exitBlockScope(oldScope, false);
	}

	/**
	 * Walk do while statement.
	 * @param {DoWhileStatement} statement do while statement
	 */
	walkDoWhileStatement(statement) {
		const oldScope = this._enterBlockScope();
		this.walkNestedStatement(statement.body);
		this.walkExpression(statement.test);

		this._exitBlockScope(oldScope, false);
	}

	/**
	 * Walk for statement.
	 * @param {ForStatement} statement for statement
	 */
	walkForStatement(statement) {
		const oldScope = this._enterBlockScope();
		if (statement.init) {
			if (statement.init.type === "VariableDeclaration") {
				this.blockPreWalkVariableDeclaration(statement.init);
				this._prevStatement = undefined;
				this.walkStatement(statement.init);
			} else {
				this.walkExpression(statement.init);
			}
		}
		if (statement.test) {
			this.walkExpression(statement.test);
		}
		if (statement.update) {
			this.walkExpression(statement.update);
		}

		const body = statement.body;

		if (body.type === "BlockStatement") {
			// no need to add additional scope
			const prev = this._prevStatement;
			this._blockPreWalkScope(body, body.body);
			this._prevStatement = prev;
			this.walkStatements(body.body);
		} else {
			this.walkNestedStatement(body);
		}

		this._exitBlockScope(oldScope, false);
	}

	/**
	 * Walk for in statement.
	 * @param {ForInStatement} statement for statement
	 */
	walkForInStatement(statement) {
		const oldScope = this._enterBlockScope();
		if (statement.left.type === "VariableDeclaration") {
			this.blockPreWalkVariableDeclaration(statement.left);
			this.walkVariableDeclaration(statement.left);
		} else if (!this._walkWriteTarget(statement.left, statement)) {
			this.walkPattern(statement.left);
		}

		this.walkExpression(statement.right);

		const body = statement.body;

		if (body.type === "BlockStatement") {
			// no need to add additional scope
			const prev = this._prevStatement;
			this._blockPreWalkScope(body, body.body);
			this._prevStatement = prev;
			this.walkStatements(body.body);
		} else {
			this.walkNestedStatement(body);
		}

		this._exitBlockScope(oldScope, false);
	}

	/**
	 * Walk for of statement.
	 * @param {ForOfStatement} statement for statement
	 */
	walkForOfStatement(statement) {
		if (statement.await && this.scope.topLevelScope === true) {
			this.hooks.topLevelAwait.call(statement);
		}
		const oldScope = this._enterBlockScope();
		if (statement.left.type === "VariableDeclaration") {
			this.blockPreWalkVariableDeclaration(statement.left);
			this.walkVariableDeclaration(statement.left);
		} else if (!this._walkWriteTarget(statement.left, statement)) {
			this.walkPattern(statement.left);
		}

		this.walkExpression(statement.right);

		const body = statement.body;

		if (body.type === "BlockStatement") {
			// no need to add additional scope
			const prev = this._prevStatement;
			this._blockPreWalkScope(body, body.body);
			this._prevStatement = prev;
			this.walkStatements(body.body);
		} else {
			this.walkNestedStatement(body);
		}

		this._exitBlockScope(oldScope, false);
	}

	/**
	 * Pre walk function declaration.
	 * @param {FunctionDeclaration | MaybeNamedFunctionDeclaration} statement function declaration
	 */
	preWalkFunctionDeclaration(statement) {
		if (statement.id) {
			if (this._strictInModuleOutput) {
				this._checkStrictModeBinding(statement.id.name, statement.id);
			}
			this.defineVariable(statement.id.name);
		}
	}

	/**
	 * Bind a function declaration in the block holding it, when it does not
	 * hoist to the enclosing scope.
	 * @param {FunctionDeclaration | MaybeNamedFunctionDeclaration} statement function declaration
	 */
	blockPreWalkFunctionDeclaration(statement) {
		if (statement.id && this._isBlockScopedFunction(statement)) {
			this.defineVariable(statement.id.name);
		}
	}

	/**
	 * Walk function declaration.
	 * @param {FunctionDeclaration | MaybeNamedFunctionDeclaration} statement function declaration
	 */
	walkFunctionDeclaration(statement) {
		const wasTopLevel = this.scope.topLevelScope;
		this.scope.topLevelScope = false;
		if (this._strictInModuleOutput) {
			this._checkStrictModeParams(statement.params);
		}
		const oldScope = this._enterFunctionScope(true, statement.params);
		for (const param of statement.params) {
			this.walkPattern(param);
		}

		this.detectMode(statement.body.body);

		const prev = this._prevStatement;

		this._preWalkScope(statement.body);
		this._prevStatement = prev;
		this.walkStatement(statement.body);

		this.scope = oldScope;
		this.scope.topLevelScope = wasTopLevel;
	}

	/**
	 * Block pre walk expression statement.
	 * @param {ExpressionStatement} statement expression statement
	 */
	blockPreWalkExpressionStatement(statement) {
		const expression = statement.expression;
		switch (expression.type) {
			case "AssignmentExpression":
				this.preWalkAssignmentExpression(expression);
		}
	}

	/**
	 * Pre walk assignment expression.
	 * @param {AssignmentExpression} expression assignment expression
	 */
	preWalkAssignmentExpression(expression) {
		this.enterDestructuringAssignment(expression.left, expression.right);
	}

	/**
	 * Enter destructuring assignment.
	 * @param {Pattern} pattern pattern
	 * @param {Expression} expression assignment expression
	 * @returns {Expression | undefined} destructuring expression
	 */
	enterDestructuringAssignment(pattern, expression) {
		const tree = this._tree;
		if (tree !== undefined) {
			const id = this._enterDestructuringAssignmentNode(
				tree.nodeOf(pattern),
				tree.nodeOf(expression)
			);
			return id === 0 ? undefined : /** @type {Expression} */ (tree.estree(id));
		}
		if (
			pattern.type !== "ObjectPattern" ||
			!this.destructuringAssignmentProperties
		) {
			return;
		}

		const expr =
			expression.type === "AwaitExpression" ? expression.argument : expression;

		const destructuring =
			expr.type === "AssignmentExpression"
				? this.enterDestructuringAssignment(expr.left, expr.right)
				: this.hooks.collectDestructuringAssignmentProperties.call(expr)
					? expr
					: undefined;

		if (destructuring) {
			const keys = this._preWalkObjectPattern(pattern);
			if (!keys) return;

			// check multiple assignments
			if (this.destructuringAssignmentProperties.has(destructuring)) {
				const set =
					/** @type {DestructuringAssignmentProperties} */
					(this.destructuringAssignmentProperties.get(destructuring));
				for (const id of keys) set.add(id);
			} else {
				this.destructuringAssignmentProperties.set(destructuring, keys);
			}
		}

		return destructuring;
	}

	/**
	 * Module pre walk import declaration, by id.
	 * @param {number} statement the declaration
	 * @returns {void}
	 */
	_modulePreWalkImportDeclarationNode(statement) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const source = /** @type {ImportSource} */ (
			tree.value(tree.field(0, Field.source, statement))
		);
		const node = /** @type {EXPECTED_ANY} */ (statement);
		this.hooks.import.call(node, source);
		const count = tree.fieldCount(Field.specifiers, statement);
		for (let i = 0; i < count; i++) {
			const specifier = tree.field(i, Field.specifiers, statement);
			const name = tree.name(tree.field(0, Field.local, specifier));
			/** @type {string | null} */
			let id;
			switch (tree.type(specifier)) {
				case NodeType.ImportDefaultSpecifier:
					id = "default";
					break;
				case NodeType.ImportSpecifier: {
					const imported = tree.field(0, Field.imported, specifier);
					id =
						tree.type(imported) === NodeType.Identifier
							? tree.name(imported)
							: /** @type {string} */ (tree.value(imported));
					break;
				}
				default:
					id = null;
			}
			if (!this.hooks.importSpecifier.call(node, source, id, name)) {
				this.defineVariable(name);
			}
		}
	}

	/**
	 * Module pre walk of an `export … from` declaration, by id: a named one
	 * without a source re-exports nothing.
	 * @param {number} statement the `ExportAllDeclaration` or `ExportNamedDeclaration`
	 * @returns {void}
	 */
	_modulePreWalkExportImportNode(statement) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const sourceNode = tree.field(0, Field.source, statement);
		if (sourceNode === 0) return;
		const source = /** @type {ImportSource} */ (tree.value(sourceNode));
		const node = /** @type {EXPECTED_ANY} */ (statement);
		/**
		 * @param {number} name an identifier or a string literal
		 * @returns {string} the name it spells
		 */
		const nameOf = (name) =>
			tree.type(name) === NodeType.Identifier
				? tree.name(name)
				: /** @type {string} */ (tree.value(name));
		this.hooks.exportImport.call(node, source);
		if (tree.type(statement) === NodeType.ExportAllDeclaration) {
			const exported = tree.field(0, Field.exported, statement);
			this.hooks.exportImportSpecifier.call(
				node,
				source,
				null,
				exported === 0 ? null : nameOf(exported),
				0
			);
			return;
		}
		const count = tree.fieldCount(Field.specifiers, statement);
		for (let index = 0; index < count; index++) {
			const specifier = tree.field(index, Field.specifiers, statement);
			if (tree.type(specifier) !== NodeType.ExportSpecifier) continue;
			this.hooks.exportImportSpecifier.call(
				node,
				source,
				nameOf(tree.field(0, Field.local, specifier)),
				nameOf(tree.field(0, Field.exported, specifier)),
				index
			);
		}
	}

	/**
	 * Module pre walk import declaration.
	 * @param {ImportDeclaration} statement statement
	 */
	modulePreWalkImportDeclaration(statement) {
		const source = /** @type {ImportSource} */ (statement.source.value);
		this.hooks.import.call(statement, source);
		for (const specifier of statement.specifiers) {
			const name = specifier.local.name;
			switch (specifier.type) {
				case "ImportDefaultSpecifier":
					if (
						!this.hooks.importSpecifier.call(statement, source, "default", name)
					) {
						this.defineVariable(name);
					}
					break;
				case "ImportSpecifier":
					if (
						!this.hooks.importSpecifier.call(
							statement,
							source,
							/** @type {Identifier} */
							(specifier.imported).name ||
								/** @type {string} */
								(
									/** @type {Literal} */
									(specifier.imported).value
								),
							name
						)
					) {
						this.defineVariable(name);
					}
					break;
				case "ImportNamespaceSpecifier":
					if (!this.hooks.importSpecifier.call(statement, source, null, name)) {
						this.defineVariable(name);
					}
					break;
				default:
					this.defineVariable(name);
			}
		}
	}

	/**
	 * Processes the provided declaration.
	 * @param {Declaration} declaration declaration
	 * @param {OnIdent} onIdent on ident callback
	 */
	enterDeclaration(declaration, onIdent) {
		switch (declaration.type) {
			case "VariableDeclaration":
				for (const declarator of declaration.declarations) {
					switch (declarator.type) {
						case "VariableDeclarator": {
							this.enterPattern(declarator.id, onIdent);
							break;
						}
					}
				}
				break;
			case "FunctionDeclaration":
				this.enterPattern(declaration.id, onIdent);
				break;
			case "ClassDeclaration":
				this.enterPattern(declaration.id, onIdent);
				break;
		}
	}

	/**
	 * Module pre walk export named declaration.
	 * @param {ExportNamedDeclaration} statement statement
	 */
	modulePreWalkExportNamedDeclaration(statement) {
		if (!statement.source) return;
		const source = /** @type {ImportSource} */ (statement.source.value);
		this.hooks.exportImport.call(statement, source);
		if (statement.specifiers) {
			for (
				let specifierIndex = 0;
				specifierIndex < statement.specifiers.length;
				specifierIndex++
			) {
				const specifier = statement.specifiers[specifierIndex];
				switch (specifier.type) {
					case "ExportSpecifier": {
						const localName =
							/** @type {Identifier} */ (specifier.local).name ||
							/** @type {string} */ (
								/** @type {Literal} */ (specifier.local).value
							);
						const name =
							/** @type {Identifier} */
							(specifier.exported).name ||
							/** @type {string} */
							(/** @type {Literal} */ (specifier.exported).value);
						this.hooks.exportImportSpecifier.call(
							statement,
							source,
							localName,
							name,
							specifierIndex
						);
						break;
					}
				}
			}
		}
	}

	/**
	 * Block pre walk export named declaration.
	 * @param {ExportNamedDeclaration} statement statement
	 */
	blockPreWalkExportNamedDeclaration(statement) {
		if (statement.source) return;
		this.hooks.export.call(statement);
		if (
			statement.declaration &&
			!this.hooks.exportDeclaration.call(statement, statement.declaration)
		) {
			const prev = this._prevStatement;
			this.preWalkStatement(statement.declaration);
			this._prevStatement = prev;
			this.blockPreWalkStatement(statement.declaration);
			let index = 0;
			this.enterDeclaration(statement.declaration, (def) => {
				this.hooks.exportSpecifier.call(statement, def, def, index++);
			});
		}
		if (statement.specifiers) {
			for (
				let specifierIndex = 0;
				specifierIndex < statement.specifiers.length;
				specifierIndex++
			) {
				const specifier = statement.specifiers[specifierIndex];
				switch (specifier.type) {
					case "ExportSpecifier": {
						const localName =
							/** @type {Identifier} */ (specifier.local).name ||
							/** @type {string} */ (
								/** @type {Literal} */ (specifier.local).value
							);
						const name =
							/** @type {Identifier} */
							(specifier.exported).name ||
							/** @type {string} */
							(/** @type {Literal} */ (specifier.exported).value);
						this.hooks.exportSpecifier.call(
							statement,
							localName,
							name,
							specifierIndex
						);
						break;
					}
				}
			}
		}
	}

	/**
	 * Walk export named declaration.
	 * @param {ExportNamedDeclaration} statement the statement
	 */
	walkExportNamedDeclaration(statement) {
		if (statement.declaration) {
			this.walkStatement(statement.declaration);
		}
	}

	/**
	 * Block pre walk export default declaration.
	 * @param {ExportDefaultDeclaration} statement statement
	 */
	blockPreWalkExportDefaultDeclaration(statement) {
		if (
			statement.declaration.type === "FunctionDeclaration" ||
			statement.declaration.type === "ClassDeclaration"
		) {
			const prev = this._prevStatement;

			this.preWalkStatement(statement.declaration);
			this._prevStatement = prev;
			this.blockPreWalkStatement(statement.declaration);
		}

		if (
			/** @type {MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration} */
			(statement.declaration).id &&
			statement.declaration.type !== "FunctionExpression" &&
			statement.declaration.type !== "ClassExpression"
		) {
			const declaration =
				/** @type {MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration} */
				(statement.declaration);

			this.hooks.exportSpecifier.call(
				statement,
				/** @type {Identifier} */
				(declaration.id).name,
				"default",
				undefined
			);
		}
	}

	/**
	 * Walk export default declaration.
	 * @param {ExportDefaultDeclaration} statement statement
	 */
	walkExportDefaultDeclaration(statement) {
		this.hooks.export.call(statement);
		if (
			/** @type {FunctionDeclaration | ClassDeclaration} */
			(statement.declaration).id &&
			statement.declaration.type !== "FunctionExpression" &&
			statement.declaration.type !== "ClassExpression"
		) {
			const declaration =
				/** @type {FunctionDeclaration | ClassDeclaration} */
				(statement.declaration);
			if (!this.hooks.exportDeclaration.call(statement, declaration)) {
				this.walkStatement(declaration);
			}
		} else {
			// Acorn parses `export default function() {}` as `FunctionDeclaration` and
			// `export default class {}` as `ClassDeclaration`, both with `id = null`.
			// These nodes must be treated as expressions.
			if (
				statement.declaration.type === "FunctionDeclaration" ||
				statement.declaration.type === "ClassDeclaration"
			) {
				this.walkStatement(statement.declaration);
			} else {
				this.walkExpression(statement.declaration);
			}

			this.hooks.exportExpression.call(statement, statement.declaration);
		}
	}

	/**
	 * Module pre walk export all declaration.
	 * @param {ExportAllDeclaration} statement statement
	 */
	modulePreWalkExportAllDeclaration(statement) {
		const source = /** @type {ImportSource} */ (statement.source.value);
		const name = statement.exported
			? /** @type {Identifier} */
				(statement.exported).name ||
				/** @type {string} */
				(/** @type {Literal} */ (statement.exported).value)
			: null;
		this.hooks.exportImport.call(statement, source);
		this.hooks.exportImportSpecifier.call(statement, source, null, name, 0);
	}

	/**
	 * Pre walk variable declaration.
	 * @param {VariableDeclaration} statement variable declaration
	 */
	preWalkVariableDeclaration(statement) {
		if (statement.kind !== "var") return;
		this._preWalkVariableDeclaration(statement, this.hooks.varDeclarationVar);
	}

	/**
	 * Block pre walk variable declaration.
	 * @param {VariableDeclaration} statement variable declaration
	 */
	blockPreWalkVariableDeclaration(statement) {
		if (statement.kind === "var") return;

		if (statement.kind === "await using" && this.scope.topLevelScope === true) {
			this.hooks.topLevelAwait.call(statement);
		}

		const hookMap =
			statement.kind === "const"
				? this.hooks.varDeclarationConst
				: statement.kind === "using" || statement.kind === "await using"
					? this.hooks.varDeclarationUsing
					: this.hooks.varDeclarationLet;
		this._preWalkVariableDeclaration(statement, hookMap);
	}

	/**
	 * Pre walk variable declaration.
	 * @param {VariableDeclaration} statement variable declaration
	 * @param {HooksByName<[Identifier], boolean | void>} hookMap map of hooks
	 */
	_preWalkVariableDeclaration(statement, hookMap) {
		const tree = this._tree;
		if (tree !== undefined) {
			const node = tree.nodeOf(statement);
			if (node !== 0) {
				this._preWalkVariableDeclarationNode(node, hookMap);
				return;
			}
		}
		/** @type {OnIdent | undefined} */
		let onIdent;
		const checkStrictBindings = this._strictInModuleOutput;
		const declarations = statement.declarations;
		for (let i = 0, len = declarations.length; i < len; i++) {
			const declarator = declarations[i];
			if (declarator.type !== "VariableDeclarator") continue;
			this.preWalkVariableDeclarator(declarator);
			if (this.hooks.preDeclarator.call(declarator, statement)) continue;
			const id = declarator.id;
			if (id.type === "Identifier") {
				if (checkStrictBindings) this._checkStrictModeBinding(id.name, id);
				// fast path: plain `const x =` skips the enterPattern dispatch and
				// the per-declaration onIdent closure (only patterns need it)
				if (!this._callHooksForName1(this.hooks.pattern, id.name, id)) {
					this._defineVariableForDeclaration(id.name, id, hookMap);
				}
			} else {
				if (onIdent === undefined) {
					onIdent = (name, ident) => {
						if (checkStrictBindings) this._checkStrictModeBinding(name, ident);
						this._defineVariableForDeclaration(name, ident, hookMap);
					};
				}
				this.enterPattern(id, onIdent);
			}
		}
	}

	/**
	 * `_preWalkVariableDeclaration` for a declaration of the tree, by id: a
	 * plain name is defined from the tree, and a declarator or binding gets an
	 * object only for a hook that has a tap or for a pattern.
	 * @param {number} node the declaration
	 * @param {HooksByName<[Identifier], boolean | void>} hookMap the hooks of its kind
	 * @returns {void}
	 */
	_preWalkVariableDeclarationNode(node, hookMap) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		/** @type {((name: string, ident: number) => void) | undefined} */
		let onIdent;
		const checkStrictBindings = this._strictInModuleOutput;
		const { preDeclarator } = this.hooks;
		const count = tree.fieldCount(Field.declarations, node);
		for (let i = 0; i < count; i++) {
			const declarator = tree.field(i, Field.declarations, node);
			const id = tree.field(0, Field.id, declarator);
			const idType = tree.type(id);
			// `preWalkVariableDeclarator` reads only a destructured binding
			if (idType === NodeType.ObjectPattern) {
				const init = tree.field(0, Field.init, declarator);
				if (init !== 0) this._enterDestructuringAssignmentNode(id, init);
			}
			if (
				(preDeclarator.taps.length !== 0 ||
					preDeclarator.interceptors.length !== 0) &&
				preDeclarator.call(
					/** @type {EXPECTED_ANY} */ (declarator),
					/** @type {EXPECTED_ANY} */ (node)
				)
			) {
				continue;
			}
			if (idType === NodeType.Identifier) {
				const name = tree.name(id);
				if (checkStrictBindings) {
					this._checkStrictModeBinding(
						name,
						/** @type {Identifier} */ (tree.estree(id))
					);
				}
				if (!this._callHooksForName1(this.hooks.pattern, name, id)) {
					this._defineVariableForDeclaration(name, id, hookMap);
				}
			} else {
				if (onIdent === undefined) {
					onIdent = (name, ident) => {
						if (checkStrictBindings) {
							this._checkStrictModeBinding(
								name,
								/** @type {EXPECTED_ANY} */ (ident)
							);
						}
						this._defineVariableForDeclaration(name, ident, hookMap);
					};
				}
				this._enterPatternNode(id, onIdent);
			}
		}
	}

	/**
	 * Defines a declared variable unless a declaration hook handles it.
	 * @param {string} name variable name
	 * @param {Identifier | number} ident identifier node, or its node in the tree
	 * @param {HooksByName<[Identifier], boolean | void>} hookMap kind-specific declaration hooks
	 * @returns {void}
	 */
	_defineVariableForDeclaration(name, ident, hookMap) {
		let hook = hookMap.get(name);
		if (hook === undefined || !hook.call(/** @type {Identifier} */ (ident))) {
			hook = this.hooks.varDeclaration.get(name);
			if (hook === undefined || !hook.call(/** @type {Identifier} */ (ident))) {
				this.defineVariable(name);
			}
		}
	}

	/**
	 * Pre walk object pattern.
	 * @param {ObjectPattern} objectPattern object pattern
	 * @returns {DestructuringAssignmentProperties | undefined} set of names or undefined if not all keys are identifiers
	 */
	_preWalkObjectPattern(objectPattern) {
		/** @type {DestructuringAssignmentProperties} */
		const props = new Set();
		const properties = objectPattern.properties;
		for (let i = 0; i < properties.length; i++) {
			const property = properties[i];
			if (property.type !== "Property") return;
			if (property.shorthand) {
				if (property.value.type === "Identifier") {
					this.scope.inShorthand = property.value.name;
				} else if (
					property.value.type === "AssignmentPattern" &&
					property.value.left.type === "Identifier"
				) {
					this.scope.inShorthand = property.value.left.name;
				}
			}
			const key = property.key;
			if (key.type === "Identifier" && !property.computed) {
				const pattern =
					property.value.type === "ObjectPattern"
						? this._preWalkObjectPattern(property.value)
						: property.value.type === "ArrayPattern"
							? this._preWalkArrayPattern(property.value)
							: undefined;
				props.add({
					id: key.name,
					range: /** @type {Range} */ (key.range),
					pattern,
					shorthand: this.scope.inShorthand
				});
			} else {
				const id = this.evaluateExpression(key);
				const str = id.asString();
				if (str) {
					const pattern =
						property.value.type === "ObjectPattern"
							? this._preWalkObjectPattern(property.value)
							: property.value.type === "ArrayPattern"
								? this._preWalkArrayPattern(property.value)
								: undefined;
					props.add({
						id: str,
						range: /** @type {Range} */ (key.range),
						pattern,
						shorthand: this.scope.inShorthand,
						computed: property.computed && key.type !== "Literal"
					});
				} else {
					// could not evaluate key
					return;
				}
			}
			this.scope.inShorthand = false;
		}

		return props;
	}

	/**
	 * `enterDestructuringAssignment` for nodes of the tree, by id.
	 * @param {number} pattern the pattern
	 * @param {number} expression the assigned expression
	 * @returns {number} the destructured expression, `0` for none
	 */
	_enterDestructuringAssignmentNode(pattern, expression) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const nodes = this._destructuringNodes;
		if (
			nodes === undefined ||
			pattern === 0 ||
			tree.type(pattern) !== NodeType.ObjectPattern
		) {
			return 0;
		}
		const expr =
			tree.type(expression) === NodeType.AwaitExpression
				? tree.field(0, Field.argument, expression)
				: expression;
		const destructuring =
			tree.type(expr) === NodeType.AssignmentExpression
				? this._enterDestructuringAssignmentNode(
						tree.field(0, Field.left, expr),
						tree.field(0, Field.right, expr)
					)
				: this.hooks.collectDestructuringAssignmentProperties.call(
							/** @type {EXPECTED_ANY} */ (expr)
					  )
					? expr
					: 0;
		if (destructuring !== 0) {
			const keys = this._preWalkObjectPatternNode(pattern);
			if (!keys) return 0;
			// check multiple assignments
			const set = nodes.get(destructuring);
			if (set !== undefined) {
				for (const key of keys) set.add(key);
			} else {
				nodes.set(destructuring, keys);
			}
		}
		return destructuring;
	}

	/**
	 * `_preWalkObjectPattern` for a pattern of the tree, by id.
	 * @param {number} pattern the object pattern
	 * @returns {DestructuringAssignmentProperties | undefined} set of names or undefined if not all keys are identifiers
	 */
	_preWalkObjectPatternNode(pattern) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		/** @type {DestructuringAssignmentProperties} */
		const props = new Set();
		const count = tree.fieldCount(Field.properties, pattern);
		for (let i = 0; i < count; i++) {
			const property = tree.field(i, Field.properties, pattern);
			if (tree.type(property) !== NodeType.Property) return;
			const value = tree.field(0, Field.value, property);
			const valueType = tree.type(value);
			if (tree.flag(Flag.shorthand, property)) {
				if (valueType === NodeType.Identifier) {
					this.scope.inShorthand = tree.name(value);
				} else if (valueType === NodeType.AssignmentPattern) {
					const left = tree.field(0, Field.left, value);
					if (tree.type(left) === NodeType.Identifier) {
						this.scope.inShorthand = tree.name(left);
					}
				}
			}
			const key = tree.field(0, Field.key, property);
			const computed = tree.flag(Flag.computed, property);
			const keyType = tree.type(key);
			if (keyType === NodeType.Identifier && !computed) {
				props.add({
					id: tree.name(key),
					range: tree.range(key),
					pattern: this._preWalkPatternNode(value, valueType),
					shorthand: this.scope.inShorthand
				});
			} else {
				const str = this._evaluateNode(key).asString();
				// could not evaluate key
				if (!str) return;
				props.add({
					id: str,
					range: tree.range(key),
					pattern: this._preWalkPatternNode(value, valueType),
					shorthand: this.scope.inShorthand,
					computed: computed && keyType !== NodeType.Literal
				});
			}
			this.scope.inShorthand = false;
		}
		return props;
	}

	/**
	 * The destructured names of a nested object or array pattern, by id.
	 * @param {number} pattern the pattern
	 * @param {number} type its `NodeType`
	 * @returns {DestructuringAssignmentProperties | undefined} its names, `undefined` for any other node
	 */
	_preWalkPatternNode(pattern, type) {
		return type === NodeType.ObjectPattern
			? this._preWalkObjectPatternNode(pattern)
			: type === NodeType.ArrayPattern
				? this._preWalkArrayPatternNode(pattern)
				: undefined;
	}

	/**
	 * `_preWalkArrayPattern` for a pattern of the tree, by id.
	 * @param {number} pattern the array pattern
	 * @returns {DestructuringAssignmentProperties | undefined} set of names or undefined if not all keys are identifiers
	 */
	_preWalkArrayPatternNode(pattern) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		/** @type {DestructuringAssignmentProperties} */
		const props = new Set();
		const count = tree.fieldCount(Field.elements, pattern);
		for (let i = 0; i < count; i++) {
			const element = tree.field(i, Field.elements, pattern);
			if (element === 0) continue;
			const type = tree.type(element);
			if (type === NodeType.RestElement) return;
			props.add({
				id: `${i}`,
				range: tree.range(element),
				pattern: this._preWalkPatternNode(element, type),
				shorthand: false
			});
		}
		return props;
	}

	/**
	 * Pre walk array pattern.
	 * @param {ArrayPattern} arrayPattern array pattern
	 * @returns {Set<DestructuringAssignmentProperty> | undefined} set of names or undefined if not all keys are identifiers
	 */
	_preWalkArrayPattern(arrayPattern) {
		/** @type {Set<DestructuringAssignmentProperty>} */
		const props = new Set();
		const elements = arrayPattern.elements;
		for (let i = 0; i < elements.length; i++) {
			const element = elements[i];
			if (!element) continue;
			if (element.type === "RestElement") return;
			const pattern =
				element.type === "ObjectPattern"
					? this._preWalkObjectPattern(element)
					: element.type === "ArrayPattern"
						? this._preWalkArrayPattern(element)
						: undefined;
			props.add({
				id: `${i}`,
				range: /** @type {Range} */ (element.range),
				pattern,
				shorthand: false
			});
		}

		return props;
	}

	/**
	 * Pre walk variable declarator.
	 * @param {VariableDeclarator} declarator variable declarator
	 */
	preWalkVariableDeclarator(declarator) {
		if (declarator.init) {
			this.enterDestructuringAssignment(declarator.id, declarator.init);
		}
	}

	/**
	 * Walk variable declaration.
	 * @param {VariableDeclaration} statement variable declaration
	 */
	walkVariableDeclaration(statement) {
		const declarations = statement.declarations;
		for (let i = 0, len = declarations.length; i < len; i++) {
			const declarator = declarations[i];
			switch (declarator.type) {
				case "VariableDeclarator": {
					const renameIdentifier =
						declarator.init && this.getRenameIdentifier(declarator.init);
					if (renameIdentifier && declarator.id.type === "Identifier") {
						const hook = this.hooks.canRename.get(renameIdentifier);
						if (
							hook !== undefined &&
							hook.call(/** @type {Expression} */ (declarator.init))
						) {
							// renaming with "var a = b;"
							const hook = this.hooks.rename.get(renameIdentifier);
							if (
								hook === undefined ||
								!hook.call(/** @type {Expression} */ (declarator.init))
							) {
								this.setVariable(declarator.id.name, renameIdentifier);
							}
							break;
						}
					}
					if (!this.hooks.declarator.call(declarator, statement)) {
						this.walkPattern(declarator.id);
						if (declarator.init) this.walkExpression(declarator.init);
					}
					break;
				}
			}
		}
	}

	/**
	 * Block pre walk class declaration.
	 * @param {ClassDeclaration | MaybeNamedClassDeclaration} statement class declaration
	 */
	blockPreWalkClassDeclaration(statement) {
		if (statement.id) {
			// only `await` reaches here: acorn rejects the other names itself,
			// since a class body is always strict even in a loose script
			if (this._strictInModuleOutput) {
				this._checkStrictModeBinding(statement.id.name, statement.id);
			}
			this.defineVariable(statement.id.name);
		}
	}

	/**
	 * Walk class declaration.
	 * @param {ClassDeclaration | MaybeNamedClassDeclaration} statement class declaration
	 */
	walkClassDeclaration(statement) {
		this.walkClass(statement);
	}

	/**
	 * Processes the provided switch case.
	 * @param {SwitchCase[]} switchCases switch statement
	 */
	walkSwitchCases(switchCases) {
		const oldScope = this._enterBlockScope();
		const len = switchCases.length;

		// pre-walk every case first: a `const` declared in a later case is already
		// in scope for an earlier case that reads it (and fails at runtime)
		for (let index = 0; index < len; index++) {
			const switchCase = switchCases[index];

			if (switchCase.consequent.length > 0) {
				const prev = this._prevStatement;
				this._blockPreWalkScope(switchCase, switchCase.consequent);
				this._prevStatement = prev;
			}
		}

		for (let index = 0; index < len; index++) {
			const switchCase = switchCases[index];

			if (switchCase.test) {
				this.walkExpression(switchCase.test);
			}

			if (switchCase.consequent.length > 0) {
				this.walkStatements(switchCase.consequent);
				this.scope.terminated = undefined;
			}
		}

		this._exitBlockScope(oldScope, false);
	}

	/**
	 * Processes the provided catch clause.
	 * @param {CatchClause} catchClause catch clause
	 */
	walkCatchClause(catchClause) {
		const oldScope = this._enterBlockScope();
		// Error binding is optional in catch clause since ECMAScript 2019
		if (catchClause.param !== null) {
			this.enterPattern(catchClause.param, (ident, identifier) => {
				if (this._strictInModuleOutput) {
					this._checkStrictModeBinding(ident, identifier);
				}
				this.defineVariable(ident);
			});
			this.walkPattern(catchClause.param);
		}
		const prev = this._prevStatement;
		this.blockPreWalkStatement(catchClause.body);
		this._prevStatement = prev;
		this.walkStatement(catchClause.body);

		this._exitBlockScope(oldScope, true);
	}

	/**
	 * Processes the provided pattern.
	 * @param {Pattern} pattern pattern
	 */
	walkPattern(pattern) {
		switch (pattern.type) {
			// plain identifier bindings are the common case and walk nothing
			case "Identifier":
				break;
			case "ObjectPattern":
				this.walkObjectPattern(pattern);
				break;
			case "ArrayPattern":
				this.walkArrayPattern(pattern);
				break;
			case "AssignmentPattern":
				this.walkAssignmentPattern(pattern);
				break;
			case "MemberExpression":
				this.walkMemberExpression(pattern);
				break;
			case "RestElement":
				this.walkRestElement(pattern);
				break;
		}
	}

	/**
	 * Walk assignment pattern.
	 * @param {AssignmentPattern} pattern assignment pattern
	 */
	walkAssignmentPattern(pattern) {
		this.walkExpression(pattern.right);
		this.walkPattern(pattern.left);
	}

	/**
	 * Walk object pattern.
	 * @param {ObjectPattern} pattern pattern
	 */
	walkObjectPattern(pattern) {
		for (let i = 0, len = pattern.properties.length; i < len; i++) {
			const prop = pattern.properties[i];
			if (prop) {
				if (prop.type === "RestElement") {
					continue;
				}
				if (prop.computed) this.walkExpression(prop.key);
				if (prop.value) this.walkPattern(prop.value);
			}
		}
	}

	/**
	 * Walk array pattern.
	 * @param {ArrayPattern} pattern array pattern
	 */
	walkArrayPattern(pattern) {
		for (let i = 0, len = pattern.elements.length; i < len; i++) {
			const element = pattern.elements[i];
			if (element) this.walkPattern(element);
		}
	}

	/**
	 * Processes the provided pattern.
	 * @param {RestElement} pattern rest element
	 */
	walkRestElement(pattern) {
		this.walkPattern(pattern.argument);
	}

	/**
	 * Processes the provided expression.
	 * @param {(Expression | SpreadElement | null)[]} expressions expressions
	 */
	walkExpressions(expressions) {
		for (let i = 0, len = expressions.length; i < len; i++) {
			const expression = expressions[i];
			if (expression) {
				this.walkExpression(expression);
			}
		}
	}

	/**
	 * Processes the provided expression.
	 * @param {Expression | SpreadElement | PrivateIdentifier | Super} expression expression
	 */
	walkExpression(expression) {
		const tree = this._tree;
		if (tree !== undefined) {
			const id =
				typeof expression === "number" ? expression : tree.nodeOf(expression);
			if (id !== 0) {
				this._walkExpressionNode(id);
				return;
			}
		}
		this._walkExpressionObject(expression);
	}

	/**
	 * `walkExpression` for an expression object, by its type.
	 * @param {Expression | SpreadElement | PrivateIdentifier | Super} expression expression
	 * @returns {void}
	 */
	_walkExpressionObject(expression) {
		// cases ordered by measured node frequency (identifiers are ~40% of all
		// expressions) — V8 compiles this to sequential compares, so hot types
		// must come first
		switch (expression.type) {
			case "Identifier":
				this.walkIdentifier(expression);
				break;
			case "MemberExpression":
				this.walkMemberExpression(expression);
				break;
			case "Literal":
				if (this._strictInModuleOutput) {
					this._checkStrictModeLiteral(expression);
				}
				break;
			case "CallExpression":
				this.walkCallExpression(expression);
				break;
			case "BinaryExpression":
				this.walkBinaryExpression(expression);
				break;
			case "AssignmentExpression":
				this.walkAssignmentExpression(expression);
				break;
			case "UnaryExpression":
				this.walkUnaryExpression(expression);
				break;
			case "LogicalExpression":
				this.walkLogicalExpression(expression);
				break;
			case "ArrowFunctionExpression":
				this.walkArrowFunctionExpression(expression);
				break;
			case "ThisExpression":
				this.walkThisExpression(expression);
				break;
			case "ConditionalExpression":
				this.walkConditionalExpression(expression);
				break;
			case "ArrayExpression":
				this.walkArrayExpression(expression);
				break;
			case "ObjectExpression":
				this.walkObjectExpression(expression);
				break;
			case "FunctionExpression":
				this.walkFunctionExpression(expression);
				break;
			case "NewExpression":
				this.walkNewExpression(expression);
				break;
			case "TemplateLiteral":
				this.walkTemplateLiteral(expression);
				break;
			case "SpreadElement":
				this.walkSpreadElement(expression);
				break;
			case "SequenceExpression":
				this.walkSequenceExpression(expression);
				break;
			case "UpdateExpression":
				this.walkUpdateExpression(expression);
				break;
			case "AwaitExpression":
				this.walkAwaitExpression(expression);
				break;
			case "ChainExpression":
				this.walkChainExpression(expression);
				break;
			case "ClassExpression":
				this.walkClassExpression(expression);
				break;
			case "ImportExpression":
				this.walkImportExpression(expression);
				break;
			case "MetaProperty":
				this.walkMetaProperty(expression);
				break;
			case "TaggedTemplateExpression":
				this.walkTaggedTemplateExpression(expression);
				break;
			case "YieldExpression":
				this.walkYieldExpression(expression);
				break;
		}
	}

	/**
	 * Reports octal number literals (`0777`) and octal string escapes (`"\47"`),
	 * both SyntaxErrors in strict-mode ESM output.
	 * @param {Literal} expression literal
	 */
	_checkStrictModeLiteral(expression) {
		const raw = expression.raw;
		if (raw === undefined) return;
		if (typeof expression.value === "number") {
			// Legacy octal (`0777`) or non-octal decimal (`08`) integer literal.
			if (
				raw.length > 1 &&
				raw.charCodeAt(0) === 48 &&
				raw.charCodeAt(1) >= 48 &&
				raw.charCodeAt(1) <= 57
			) {
				this._reportStrictModeViolation(
					"Octal literals are not allowed",
					expression
				);
			}
		} else if (typeof expression.value === "string" && hasOctalEscape(raw)) {
			this._reportStrictModeViolation(
				"Octal escape sequences are not allowed",
				expression
			);
		}
	}

	/**
	 * Walk await expression.
	 * @param {AwaitExpression} expression await expression
	 */
	walkAwaitExpression(expression) {
		if (this.scope.topLevelScope === true) {
			this.hooks.topLevelAwait.call(expression);
		}
		this.walkExpression(expression.argument);
	}

	/**
	 * Walk array expression.
	 * @param {ArrayExpression} expression array expression
	 */
	walkArrayExpression(expression) {
		if (expression.elements) {
			this.walkExpressions(expression.elements);
		}
	}

	/**
	 * Walk spread element.
	 * @param {SpreadElement} expression spread element
	 */
	walkSpreadElement(expression) {
		if (expression.argument) {
			this.walkExpression(expression.argument);
		}
	}

	/**
	 * Walk object expression.
	 * @param {ObjectExpression} expression object expression
	 */
	walkObjectExpression(expression) {
		for (
			let propIndex = 0, len = expression.properties.length;
			propIndex < len;
			propIndex++
		) {
			const prop = expression.properties[propIndex];
			this.walkProperty(prop);
		}
	}

	/**
	 * Processes the provided prop.
	 * @param {Property | SpreadElement} prop property or spread element
	 */
	walkProperty(prop) {
		if (prop.type === "SpreadElement") {
			this.walkExpression(prop.argument);
			return;
		}
		if (prop.computed) {
			this.walkExpression(prop.key);
		}
		if (prop.shorthand && prop.value && prop.value.type === "Identifier") {
			this.scope.inShorthand = prop.value.name;
			this.walkIdentifier(prop.value);
			this.scope.inShorthand = false;
		} else {
			this.walkExpression(
				/** @type {Exclude<Property["value"], AssignmentPattern | ObjectPattern | ArrayPattern | RestElement>} */
				(prop.value)
			);
		}
	}

	/**
	 * Walk function expression.
	 * @param {FunctionExpression} expression arrow function expression
	 */
	walkFunctionExpression(expression) {
		const wasTopLevel = this.scope.topLevelScope;
		this.scope.topLevelScope = false;
		// Only copy params when the function name must be added (recursive calls);
		// inFunctionScope reads params without mutating, like arrow functions.
		const scopeParams = expression.id
			? [...expression.params, expression.id]
			: expression.params;

		if (this._strictInModuleOutput) {
			this._checkStrictModeParams(expression.params);
			if (expression.id) {
				this._checkStrictModeBinding(expression.id.name, expression.id);
			}
		}
		const oldScope = this._enterFunctionScope(true, scopeParams);
		for (const param of expression.params) {
			this.walkPattern(param);
		}

		this.detectMode(expression.body.body);

		const prev = this._prevStatement;

		this._preWalkScope(expression.body);
		this._prevStatement = prev;
		this.walkStatement(expression.body);

		this.scope = oldScope;
		this.scope.topLevelScope = wasTopLevel;
	}

	/**
	 * Walk arrow function expression.
	 * @param {ArrowFunctionExpression} expression arrow function expression
	 */
	walkArrowFunctionExpression(expression) {
		const wasTopLevel = this.scope.topLevelScope;
		this.scope.topLevelScope = wasTopLevel ? "arrow" : false;
		if (this._strictInModuleOutput) {
			this._checkStrictModeParams(expression.params);
		}
		const oldScope = this._enterFunctionScope(false, expression.params);
		for (const param of expression.params) {
			this.walkPattern(param);
		}
		if (expression.body.type === "BlockStatement") {
			this.detectMode(expression.body.body);
			const prev = this._prevStatement;
			this._preWalkScope(expression.body);
			this._prevStatement = prev;
			this.walkStatement(expression.body);
		} else {
			this.walkExpression(expression.body);
		}

		this.scope = oldScope;
		this.scope.topLevelScope = wasTopLevel;
	}

	/**
	 * Walk sequence expression.
	 * @param {SequenceExpression} expression the sequence
	 */
	walkSequenceExpression(expression) {
		if (!expression.expressions) return;
		// We treat sequence expressions like statements when they are one statement level
		// This has some benefits for optimizations that only work on statement level
		const currentStatement =
			/** @type {StatementPath} */
			(this.statementPath)[
				/** @type {StatementPath} */
				(this.statementPath).length - 1
			];
		if (
			currentStatement === expression ||
			(currentStatement.type === "ExpressionStatement" &&
				currentStatement.expression === expression)
		) {
			const old =
				/** @type {StatementPathItem} */
				(/** @type {StatementPath} */ (this.statementPath).pop());
			const prev = this.prevStatement;
			for (const expr of expression.expressions) {
				/** @type {StatementPath} */
				(this.statementPath).push(expr);
				this.walkExpression(expr);
				this.prevStatement =
					/** @type {StatementPath} */
					(this.statementPath).pop();
			}
			this.prevStatement = prev;
			/** @type {StatementPath} */
			(this.statementPath).push(old);
		} else {
			this.walkExpressions(expression.expressions);
		}
	}

	/**
	 * Walk update expression.
	 * @param {UpdateExpression} expression the update expression
	 */
	walkUpdateExpression(expression) {
		if (
			this._strictInModuleOutput &&
			expression.argument.type === "Identifier"
		) {
			this._checkStrictModeAssignTarget(expression.argument.name, expression);
		}
		if (this._walkWriteTarget(expression.argument, expression)) return;
		this.walkExpression(expression.argument);
	}

	/**
	 * Offers a write that is not an assignment's left side — an update's target
	 * or a loop's binding — to the taps that care, `assign` carrying only an
	 * AssignmentExpression.
	 * @param {Expression | Pattern} target the written reference
	 * @param {WriteStatement} node the construct performing the write
	 * @returns {boolean} true when a tap rendered the write itself
	 */
	_walkWriteTarget(target, node) {
		if (target.type === "Identifier") {
			return Boolean(
				this._callHooksForName1(this.hooks.write, target.name, node)
			);
		}
		if (target.type.endsWith("Pattern")) {
			this.enterPattern(/** @type {Pattern} */ (target), (name) => {
				this._callHooksForName1(this.hooks.write, name, node);
			});
			this._walkPatternWriteMembers(target, node);
			return false;
		}
		return Boolean(
			target.type === "MemberExpression" &&
			this._callWriteMemberChain(target, node)
		);
	}

	/**
	 * Offers the member expressions a destructuring target writes to the
	 * `writeMemberChain` taps, which `enterPattern` passes over because they
	 * bind no name.
	 * @param {Pattern | Expression | null} pattern the destructuring target
	 * @param {WriteStatement} node the construct performing the write
	 * @returns {void}
	 */
	_walkPatternWriteMembers(pattern, node) {
		if (!pattern) return;
		switch (pattern.type) {
			case "MemberExpression":
				this._callWriteMemberChain(pattern, node);
				break;
			case "ObjectPattern":
				for (const property of pattern.properties) {
					this._walkPatternWriteMembers(
						property.type === "RestElement"
							? property.argument
							: property.value,
						node
					);
				}
				break;
			case "ArrayPattern":
				for (const element of pattern.elements) {
					this._walkPatternWriteMembers(element, node);
				}
				break;
			case "AssignmentPattern":
				this._walkPatternWriteMembers(pattern.left, node);
				break;
			case "RestElement":
				this._walkPatternWriteMembers(pattern.argument, node);
				break;
		}
	}

	/**
	 * Offers a written member expression to the `writeMemberChain` taps.
	 * @param {MemberExpression} target the written member expression
	 * @param {WriteStatement} node the construct performing the write
	 * @returns {boolean} true when a tap rendered the write itself
	 */
	_callWriteMemberChain(target, node) {
		return Boolean(
			this._resolveMemberExpression(target, ALLOWED_MEMBER_TYPES_EXPRESSION) ===
				1 &&
			this._hasHooksForInfo(
				this.hooks.writeMemberChain,
				/** @type {string | VariableInfo} */ (this._memberRootInfo)
			) &&
			this.callHooksForInfo(
				this.hooks.writeMemberChain,
				/** @type {string | VariableInfo} */ (this._memberRootInfo),
				node,
				this._members
			)
		);
	}

	/**
	 * Reports `arguments.callee` / `arguments.caller` — both throw a TypeError
	 * once the module runs in strict-mode ESM output.
	 * @param {string} name accessed member name
	 * @param {Expression} node node to report the violation at
	 */
	_checkStrictModeArgumentsMember(name, node) {
		if ((name === "callee" || name === "caller") && !this.scope.isStrict) {
			this._reportStrictModeViolation(
				`Accessing "arguments.${name}" is not allowed`,
				node
			);
		}
	}

	/**
	 * Reports an assignment or update target that breaks in strict-mode ESM
	 * output: `eval` / `arguments` are a SyntaxError, the read-only globals
	 * (`undefined`, `NaN`, `Infinity`) a TypeError instead of a silent no-op.
	 * @param {string} name target identifier name
	 * @param {AssignmentExpression | UpdateExpression} node node to report the violation at
	 */
	_checkStrictModeAssignTarget(name, node) {
		if (name === "eval" || name === "arguments") {
			this._reportStrictModeViolation(
				`Assigning to "${name}" is not allowed`,
				node
			);
		} else if (
			(name === "undefined" || name === "NaN" || name === "Infinity") &&
			!this.scope.isStrict &&
			!this.isVariableDefined(name)
		) {
			this._reportStrictModeViolation(
				`Assigning to the read-only global "${name}" is not allowed`,
				node
			);
		}
	}

	/**
	 * Reports a binding name a loose script allows but strict-mode ESM output
	 * rejects — the whole bundle fails to parse, so this is never merely latent.
	 * @param {string} name binding name
	 * @param {Statement | Expression | Identifier} node node to report the violation at
	 */
	_checkStrictModeBinding(name, node) {
		if (name === "eval" || name === "arguments") {
			this._reportStrictModeViolation(
				`"${name}" is not allowed as a binding name`,
				node
			);
		} else if (STRICT_MODE_RESERVED_WORDS.has(name)) {
			this._reportStrictModeViolation(
				`"${name}" is a reserved word in strict mode and is not allowed as a binding name`,
				node
			);
		} else if (name === "await") {
			this._reportStrictModeViolation(
				'"await" is not allowed as a binding name',
				node,
				MODULE_GOAL_OUTPUT_REASON
			);
		}
	}

	/**
	 * Reports strict-mode-only errors in a function's parameter list: a duplicate
	 * simple parameter, or a parameter named `eval` / `arguments`.
	 * @param {(import("estree").Pattern)[]} params function parameters
	 */
	_checkStrictModeParams(params) {
		/** @type {Set<string> | undefined} */
		let seen;
		for (const param of params) {
			if (param.type !== "Identifier") continue;
			const name = param.name;
			if (name === "eval" || name === "arguments") {
				this._reportStrictModeViolation(
					`"${name}" is not allowed as a parameter name`,
					param
				);
			} else if (STRICT_MODE_RESERVED_WORDS.has(name)) {
				this._reportStrictModeViolation(
					`"${name}" is a reserved word in strict mode and is not allowed as a parameter name`,
					param
				);
			} else if (name === "await") {
				this._reportStrictModeViolation(
					'"await" is not allowed as a parameter name',
					param,
					MODULE_GOAL_OUTPUT_REASON
				);
			}
			if (seen === undefined) seen = new Set();
			if (seen.has(name)) {
				this._reportStrictModeViolation(
					`Duplicate parameter name "${name}" is not allowed`,
					param
				);
			} else {
				seen.add(name);
			}
		}
	}

	/**
	 * Walk unary expression.
	 * @param {UnaryExpression} expression the unary expression
	 */
	walkUnaryExpression(expression) {
		if (expression.operator === "typeof") {
			const result = this.callHooksForExpression(
				this.hooks.typeof,
				expression.argument,
				expression
			);
			if (result === true) return;
			if (expression.argument.type === "ChainExpression") {
				const result = this.callHooksForExpression(
					this.hooks.typeof,
					expression.argument.expression,
					expression
				);
				if (result === true) return;
			}
		} else if (
			this._strictInModuleOutput &&
			expression.operator === "delete" &&
			expression.argument.type === "Identifier"
		) {
			this._reportStrictModeViolation(
				`Deleting the unqualified identifier "${expression.argument.name}" is not allowed`,
				expression
			);
		}
		this.walkExpression(expression.argument);
	}

	/**
	 * Reports a construct that a loose script allows but that breaks once the
	 * module is emitted as strict-mode ESM output. Severity comes from the
	 * `strictModeViolations` parser option (`false` disables the checks upfront).
	 * The location is computed here, on the rare violation path only.
	 * @param {string} reason what is not allowed
	 * @param {Statement | Expression | Identifier} node node to report the violation at
	 * @param {string=} outputReason why the output rejects it, defaults to strict mode
	 */
	_reportStrictModeViolation(reason, node, outputReason) {
		const diagnostic = new WebpackError(
			`${reason}. ${
				outputReason === undefined ? STRICT_MODE_OUTPUT_REASON : outputReason
			}`
		);
		diagnostic.loc = this.getLocation(node);
		if (this.options.strictModeViolations === "error") {
			this.state.module.addError(diagnostic);
		} else {
			this.state.module.addWarning(diagnostic);
		}
	}

	/**
	 * Walk left right expression.
	 * @param {LogicalExpression | BinaryExpression} expression the expression
	 */
	walkLeftRightExpression(expression) {
		this.walkExpression(expression.left);
		this.walkExpression(expression.right);
	}

	/**
	 * Walk binary expression.
	 * @param {BinaryExpression} expression the binary expression
	 */
	walkBinaryExpression(expression) {
		if (this.hooks.binaryExpression.call(expression) === undefined) {
			this.walkLeftRightExpression(expression);
		}
	}

	/**
	 * Walk logical expression.
	 * @param {LogicalExpression} expression the logical expression
	 */
	walkLogicalExpression(expression) {
		const result = this.hooks.expressionLogicalOperator.call(expression);
		if (result === undefined) {
			this.walkLeftRightExpression(expression);
		} else if (result) {
			this.walkExpression(expression.right);
		}
	}

	/**
	 * Walk assignment expression.
	 * @param {AssignmentExpression} expression assignment expression
	 */
	walkAssignmentExpression(expression) {
		if (expression.left.type === "Identifier") {
			if (this._strictInModuleOutput) {
				this._checkStrictModeAssignTarget(expression.left.name, expression);
			}
			const renameIdentifier = this.getRenameIdentifier(expression.right);
			if (
				renameIdentifier &&
				this._callHooksForInfo1(
					this.hooks.canRename,
					renameIdentifier,
					expression.right
				)
			) {
				// renaming "a = b;"
				if (
					!this._callHooksForInfo1(
						this.hooks.rename,
						renameIdentifier,
						expression.right
					)
				) {
					this.setVariable(
						expression.left.name,
						typeof renameIdentifier === "string"
							? this.getVariableInfo(renameIdentifier)
							: renameIdentifier
					);
				}
				return;
			}
			this.walkExpression(expression.right);
			// inlined enterPattern → enterIdentifier for the Identifier left side:
			// same hook sequence without the per-assignment closure
			const leftName = expression.left.name;
			if (
				!this._callHooksForName1(
					this.hooks.pattern,
					leftName,
					expression.left
				) &&
				!this._callHooksForName1(this.hooks.assign, leftName, expression)
			) {
				this.walkExpression(expression.left);
			}
		} else if (expression.left.type.endsWith("Pattern")) {
			this.walkExpression(expression.right);
			this.enterPattern(expression.left, (name, _decl) => {
				if (!this._callHooksForName1(this.hooks.assign, name, expression)) {
					this.defineVariable(name);
				}
			});
			this._walkPatternWriteMembers(expression.left, expression);
			this.walkPattern(expression.left);
		} else if (expression.left.type === "MemberExpression") {
			if (
				this._resolveMemberExpression(
					expression.left,
					ALLOWED_MEMBER_TYPES_EXPRESSION
				) === 1 &&
				this._hasHooksForInfo(
					this.hooks.assignMemberChain,
					/** @type {string | VariableInfo} */ (this._memberRootInfo)
				) &&
				this.callHooksForInfo(
					this.hooks.assignMemberChain,
					/** @type {string | VariableInfo} */ (this._memberRootInfo),
					expression,
					this._members
				)
			) {
				return;
			}
			this.walkExpression(expression.right);
			this.walkExpression(expression.left);
		} else {
			this.walkExpression(expression.right);
			this.walkExpression(
				/** @type {Exclude<AssignmentExpression["left"], Identifier | RestElement | MemberExpression | ObjectPattern | ArrayPattern | AssignmentPattern>} */
				(expression.left)
			);
		}
	}

	/**
	 * Walk conditional expression.
	 * @param {ConditionalExpression} expression conditional expression
	 */
	walkConditionalExpression(expression) {
		const result = this.hooks.expressionConditionalOperator.call(expression);
		if (result === undefined) {
			const guard = this.hooks.collectGuards.call(expression.test);
			this.walkExpression(expression.test);
			// allocate the branch closure only when a guard frame needs pushing
			if (guard && guard.consequent) {
				this.walkGuardedBranch(guard.consequent, () =>
					this.walkExpression(expression.consequent)
				);
			} else {
				this.walkExpression(expression.consequent);
			}

			if (expression.alternate) {
				const alternate = expression.alternate;
				if (guard && guard.alternate) {
					this.walkGuardedBranch(guard.alternate, () =>
						this.walkExpression(alternate)
					);
				} else {
					this.walkExpression(alternate);
				}
			}
		} else if (result) {
			this.walkExpression(expression.consequent);
		} else if (expression.alternate) {
			this.walkExpression(expression.alternate);
		}
	}

	/**
	 * Walk new expression.
	 * @param {NewExpression} expression new expression
	 */
	walkNewExpression(expression) {
		const result = this.callHooksForExpression(
			this.hooks.new,
			expression.callee,
			expression
		);
		if (result === true) return;
		this.walkExpression(expression.callee);
		if (expression.arguments) {
			this.walkExpressions(expression.arguments);
		}
	}

	/**
	 * Walk yield expression.
	 * @param {YieldExpression} expression yield expression
	 */
	walkYieldExpression(expression) {
		if (expression.argument) {
			this.walkExpression(expression.argument);
		}
	}

	/**
	 * Walk template literal.
	 * @param {TemplateLiteral} expression template literal
	 */
	walkTemplateLiteral(expression) {
		if (expression.expressions) {
			this.walkExpressions(expression.expressions);
		}
	}

	/**
	 * Walk tagged template expression.
	 * @param {TaggedTemplateExpression} expression tagged template expression
	 */
	walkTaggedTemplateExpression(expression) {
		if (expression.tag) {
			this.scope.inTaggedTemplateTag = true;
			this.walkExpression(expression.tag);
			this.scope.inTaggedTemplateTag = false;
		}
		if (expression.quasi && expression.quasi.expressions) {
			this.walkExpressions(expression.quasi.expressions);
		}
	}

	/**
	 * Walk class expression.
	 * @param {ClassExpression} expression the class expression
	 */
	walkClassExpression(expression) {
		// only `await` reaches here, as for class declarations
		if (this._strictInModuleOutput && expression.id) {
			this._checkStrictModeBinding(expression.id.name, expression.id);
		}
		this.walkClass(expression);
	}

	/**
	 * Walk chain expression.
	 * @param {ChainExpression} expression expression
	 */
	walkChainExpression(expression) {
		const result = this.hooks.optionalChaining.call(expression);

		if (result === undefined) {
			if (expression.expression.type === "CallExpression") {
				this.walkCallExpression(expression.expression);
			} else {
				this.walkMemberExpression(expression.expression);
			}
		}
	}

	/**
	 * Processes the provided function expression.
	 * @private
	 * @param {FunctionExpression | ArrowFunctionExpression} functionExpression function expression
	 * @param {(Expression | SpreadElement)[]} options options
	 * @param {Expression | SpreadElement | null} currentThis current this
	 */
	_walkIIFE(functionExpression, options, currentThis) {
		/**
		 * Returns var info.
		 * @param {Expression | SpreadElement} argOrThis arg or this
		 * @returns {string | VariableInfo | undefined} var info
		 */
		const getVarInfo = (argOrThis) => {
			const renameIdentifier = this.getRenameIdentifier(argOrThis);
			if (
				renameIdentifier &&
				this._callHooksForInfo1(
					this.hooks.canRename,
					renameIdentifier,
					/** @type {Expression} */
					(argOrThis)
				) &&
				!this._callHooksForInfo1(
					this.hooks.rename,
					renameIdentifier,
					/** @type {Expression} */
					(argOrThis)
				)
			) {
				return typeof renameIdentifier === "string"
					? /** @type {string} */ (this.getVariableInfo(renameIdentifier))
					: renameIdentifier;
			}
			this.walkExpression(argOrThis);
		};
		const { params, type } = functionExpression;
		const arrow = type === "ArrowFunctionExpression";
		// the walk skips walkFunctionExpression for a called function expression
		if (this._strictInModuleOutput) {
			this._checkStrictModeParams(params);
			if (type === "FunctionExpression" && functionExpression.id) {
				this._checkStrictModeBinding(
					functionExpression.id.name,
					functionExpression.id
				);
			}
		}
		const renameThis = currentThis ? getVarInfo(currentThis) : null;
		const varInfoForArgs = options.map(getVarInfo);
		const wasTopLevel = this.scope.topLevelScope;
		this.scope.topLevelScope = wasTopLevel && arrow ? "arrow" : false;
		const scopeParams =
			/** @type {(Identifier | string)[]} */
			(params.filter((identifier, idx) => !varInfoForArgs[idx]));

		// Add function name in scope for recursive calls
		if (
			functionExpression.type === "FunctionExpression" &&
			functionExpression.id
		) {
			scopeParams.push(functionExpression.id.name);
		}

		const oldScope = this._enterFunctionScope(true, scopeParams);
		if (renameThis && !arrow) {
			this.setVariable("this", renameThis);
		}
		for (let i = 0; i < varInfoForArgs.length; i++) {
			const varInfo = varInfoForArgs[i];
			if (!varInfo) continue;
			if (!params[i] || params[i].type !== "Identifier") continue;
			this.setVariable(/** @type {Identifier} */ (params[i]).name, varInfo);
		}
		if (functionExpression.body.type === "BlockStatement") {
			this.detectMode(functionExpression.body.body);
			const prev = this._prevStatement;
			this._preWalkScope(functionExpression.body);
			this._prevStatement = prev;
			this.walkStatement(functionExpression.body);
		} else {
			this.walkExpression(functionExpression.body);
		}

		this.scope = oldScope;
		this.scope.topLevelScope = wasTopLevel;
	}

	/**
	 * Walk import expression.
	 * @param {ImportExpression} expression import expression
	 */
	walkImportExpression(expression) {
		const result = this.hooks.importCall.call(expression);
		if (result === true) return;

		this.walkExpression(expression.source);
	}

	/**
	 * Walk call expression.
	 * @param {CallExpression} expression expression
	 */
	walkCallExpression(expression) {
		if (
			expression.callee.type === "MemberExpression" &&
			isFunctionExpression(expression.callee.object.type) &&
			!expression.callee.computed &&
			/** @type {boolean} */
			(
				/** @type {Identifier} */
				(expression.callee.property).name === "call" ||
					/** @type {Identifier} */
					(expression.callee.property).name === "bind"
			) &&
			expression.arguments.length > 0 &&
			isSimpleFunction(
				/** @type {FunctionExpression | ArrowFunctionExpression} */
				(expression.callee.object)
			)
		) {
			// (function(…) { }.call/bind(?, …))
			this._walkIIFE(
				/** @type {FunctionExpression | ArrowFunctionExpression} */
				(expression.callee.object),
				expression.arguments.slice(1),
				expression.arguments[0]
			);
		} else if (
			isFunctionExpression(expression.callee.type) &&
			isSimpleFunction(
				/** @type {FunctionExpression | ArrowFunctionExpression} */
				(expression.callee)
			)
		) {
			// (function(…) { }(…))
			this._walkIIFE(
				/** @type {FunctionExpression | ArrowFunctionExpression} */
				(expression.callee),
				expression.arguments,
				null
			);
		} else {
			if (expression.callee.type === "MemberExpression") {
				// callMemberChainOfCallMemberChain only applies to call-rooted
				// chains (e.g. `a().b()`); for the common identifier/this-rooted
				// callee the CALL lookup always rejects, so gate on the cheap root.
				if (
					this.getMemberExpressionRoot(expression.callee).type ===
					"CallExpression"
				) {
					const exprInfo = this.getMemberExpressionInfo(
						expression.callee,
						ALLOWED_MEMBER_TYPES_CALL_EXPRESSION
					);
					if (exprInfo && exprInfo.type === "call") {
						const result = this.callHooksForInfo(
							this.hooks.callMemberChainOfCallMemberChain,
							exprInfo.rootInfo,
							expression,
							exprInfo.getCalleeMembers(),
							exprInfo.call,
							exprInfo.getMembers(),
							exprInfo.getMemberRanges()
						);
						if (result === true) return;
					}
				}
				// import("./m").then(m => { ... })
				if (
					expression.callee.object.type === "ImportExpression" &&
					expression.callee.property.type === "Identifier" &&
					expression.callee.property.name === "then"
				) {
					const result = this.hooks.importCall.call(
						expression.callee.object,
						expression
					);
					if (result === true) return;
				}
			}
			if (
				expression.callee.type === "Identifier" &&
				this._evalIdentOwnTaps &&
				expression.callee.name !== "undefined" &&
				this._isDefinedPlainVariable(expression.callee.name)
			) {
				// a defined, untagged callee can only evaluate to the fallthrough
				// result, so no call hooks apply — walk callee and arguments
				// directly, skipping the hook dispatch and its result object
				this.walkExpression(expression.callee);
				if (expression.arguments) this.walkExpressions(expression.arguments);
				return;
			}
			const callee = this.evaluateExpression(expression.callee);
			if (callee.isIdentifier()) {
				const rootInfo =
					/** @type {NonNullable<BasicEvaluatedExpression["rootInfo"]>} */
					(callee.rootInfo);
				if (this._hasHooksForInfo(this.hooks.callMemberChain, rootInfo)) {
					const members =
						/** @type {NonNullable<BasicEvaluatedExpression["getMembers"]>} */
						(callee.getMembers)();
					const result1 = this.callHooksForInfo(
						this.hooks.callMemberChain,
						rootInfo,
						expression,
						members,
						callee.getMembersOptionals
							? callee.getMembersOptionals()
							: members.map(RETURN_FALSE),
						callee.getMemberRanges ? callee.getMemberRanges() : []
					);
					if (result1 === true) return;
				}
				const result2 = this._callHooksForInfo1(
					this.hooks.call,
					/** @type {NonNullable<BasicEvaluatedExpression["identifier"]>} */
					(callee.identifier),
					expression
				);
				if (result2 === true) return;
			}

			if (expression.callee) {
				if (expression.callee.type === "MemberExpression") {
					// because of call context we need to walk the call context as expression
					this.walkExpression(expression.callee.object);
					if (expression.callee.computed === true) {
						this.walkExpression(expression.callee.property);
					}
				} else {
					this.walkExpression(expression.callee);
				}
			}
			if (expression.arguments) this.walkExpressions(expression.arguments);
		}
	}

	/**
	 * Walk member expression.
	 * @param {MemberExpression} expression member expression
	 */
	walkMemberExpression(expression) {
		const type = this._resolveMemberExpression(
			expression,
			ALLOWED_MEMBER_TYPES_ALL
		);
		if (type === 1) {
			// copied out first: a hook may resolve another chain and reuse the slots
			const name = this._memberName;
			const rootInfo = /** @type {string | VariableInfo} */ (
				this._memberRootInfo
			);
			const members = this._members;
			const membersOptionals = this._membersOptionals;
			const result1 = this._callHooksForInfo1(
				this.hooks.expression,
				name,
				expression
			);
			if (result1 === true) return;
			if (this._hasHooksForInfo(this.hooks.expressionMemberChain, rootInfo)) {
				const result2 = this.callHooksForInfo(
					this.hooks.expressionMemberChain,
					rootInfo,
					expression,
					members,
					membersOptionals,
					memberRangesOf(expression, members.length)
				);
				if (result2 === true) return;
			}
			this._walkMemberChain(
				expression,
				expression,
				name,
				rootInfo,
				members,
				members.length
			);
			return;
		}
		if (type === 2) {
			const call = /** @type {CallExpression} */ (
				/** @type {unknown} */ (this._memberCall)
			);
			const result = this.callHooksForInfo(
				this.hooks.memberChainOfCallMemberChain,
				/** @type {string | VariableInfo} */ (this._memberRootInfo),
				expression,
				this._memberCalleeMembers,
				call,
				this._members,
				memberRangesOf(expression, this._members.length)
			);
			if (result === true) return;
			// Fast skip over the member chain as we already called memberChainOfCallMemberChain
			// and call computed property are literals anyway
			this.walkExpression(call);
			return;
		}
		this.walkExpression(expression.object);
		if (expression.computed === true) this.walkExpression(expression.property);
	}

	/**
	 * The walk `walkMemberExpressionWithExpressionName` does over a resolved
	 * chain, reading `members` up to `end` instead of popping a copy of it.
	 * @param {MemberExpression} outer the whole chain, for the unhandled hook
	 * @param {MemberExpression} expression the chain from here inwards
	 * @param {string} name name of `expression`
	 * @param {string | VariableInfo} rootInfo root info
	 * @param {Members} members members of the whole chain, in source order
	 * @param {number} end how many of `members` are inside `expression`
	 * @returns {void}
	 */
	_walkMemberChain(outer, expression, name, rootInfo, members, end) {
		if (expression.object.type === "MemberExpression") {
			const property = members[end - 1];
			name = name.slice(0, -property.length - 1);
			const result = this._callHooksForInfo1(
				this.hooks.expression,
				name,
				expression.object
			);
			if (result === true) return;
			this._walkMemberChain(
				outer,
				expression.object,
				name,
				rootInfo,
				members,
				end - 1
			);
		} else if (
			!this._hasHooksForInfo(
				this.hooks.unhandledExpressionMemberChain,
				rootInfo
			) ||
			!this.callHooksForInfo(
				this.hooks.unhandledExpressionMemberChain,
				rootInfo,
				outer,
				members
			)
		) {
			this.walkExpression(expression.object);
		}
		if (expression.computed === true) this.walkExpression(expression.property);
	}

	/**
	 * Walk member expression with expression name.
	 * @template R
	 * @param {MemberExpression} expression member expression
	 * @param {string} name name
	 * @param {string | VariableInfo} rootInfo root info
	 * @param {Members} members members
	 * @param {() => R | undefined} onUnhandled on unhandled callback
	 */
	walkMemberExpressionWithExpressionName(
		expression,
		name,
		rootInfo,
		members,
		onUnhandled
	) {
		if (expression.object.type === "MemberExpression") {
			// A nested MemberExpression keeps its info by calling walkMemberExpression
			// directly. The property comes from `members` rather than the node, which
			// may be a TemplateLiteral and carry neither `.name` nor `.value`.
			const property = members[members.length - 1];
			name = name.slice(0, -property.length - 1);
			members.pop();
			const result = this._callHooksForInfo1(
				this.hooks.expression,
				name,
				expression.object
			);
			if (result === true) return;
			this.walkMemberExpressionWithExpressionName(
				expression.object,
				name,
				rootInfo,
				members,
				onUnhandled
			);
		} else if (!onUnhandled || !onUnhandled()) {
			this.walkExpression(expression.object);
		}
		if (expression.computed === true) this.walkExpression(expression.property);
	}

	/**
	 * Walk this expression.
	 * @param {ThisExpression} expression this expression
	 */
	walkThisExpression(expression) {
		this._callHooksForName1(this.hooks.expression, "this", expression);
	}

	/**
	 * Processes the provided expression.
	 * @param {Identifier} expression identifier
	 */
	walkIdentifier(expression) {
		this._callHooksForName1(this.hooks.expression, expression.name, expression);
	}

	/**
	 * Walk meta property.
	 * @param {MetaProperty} metaProperty meta property
	 */
	walkMetaProperty(metaProperty) {
		this.hooks.expression.for(getRootName(metaProperty)).call(metaProperty);
	}

	/**
	 * Call hooks for expression.
	 * @template T
	 * @template R
	 * @param {HooksByName<T, R>} hookMap hooks the should be called
	 * @param {Expression | Super} expr expression
	 * @param {AsArray<T>} args args for the hook
	 * @returns {R | undefined} result of hook
	 */
	callHooksForExpression(hookMap, expr, ...args) {
		return this.callHooksForExpressionWithFallback(
			hookMap,
			expr,
			undefined,
			undefined,
			...args
		);
	}

	/**
	 * Call hooks for expression with fallback.
	 * @template T
	 * @template R
	 * @param {HooksByName<T, R>} hookMap hooks the should be called
	 * @param {Expression | Super} expr expression info
	 * @param {((name: string, rootInfo: string | ScopeInfo | VariableInfo, getMembers: () => Members) => R) | undefined} fallback callback when variable in not handled by hooks
	 * @param {((result?: string) => R | undefined) | undefined} defined callback when variable is defined
	 * @param {AsArray<T>} args args for the hook
	 * @returns {R | undefined} result of hook
	 */
	callHooksForExpressionWithFallback(
		hookMap,
		expr,
		fallback,
		defined,
		...args
	) {
		const exprName = this.getMemberExpressionInfo(
			expr,
			ALLOWED_MEMBER_TYPES_EXPRESSION
		);
		if (exprName !== undefined) {
			const members = exprName.getMembers();
			return this.callHooksForInfoWithFallback(
				hookMap,
				members.length === 0 ? exprName.rootInfo : exprName.name,
				fallback &&
					((name) => fallback(name, exprName.rootInfo, exprName.getMembers)),
				defined && (() => defined(exprName.name)),
				...args
			);
		}
	}

	/**
	 * Call hooks for name.
	 * @template T
	 * @template R
	 * @param {HooksByName<T, R>} hookMap hooks the should be called
	 * @param {string} name key in map
	 * @param {AsArray<T>} args args for the hook
	 * @returns {R | undefined} result of hook
	 */
	callHooksForName(hookMap, name, ...args) {
		return this._callHooksForInfo(
			hookMap,
			this.getVariableInfo(name),
			undefined,
			undefined,
			args
		);
	}

	/**
	 * Call hooks for info.
	 * @template T
	 * @template R
	 * @param {HooksByName<T, R>} hookMap hooks that should be called
	 * @param {ExportedVariableInfo} info variable info
	 * @param {AsArray<T>} args args for the hook
	 * @returns {R | undefined} result of hook
	 */
	callHooksForInfo(hookMap, info, ...args) {
		return this._callHooksForInfo(hookMap, info, undefined, undefined, args);
	}

	/**
	 * Call hooks for info with fallback.
	 * @template T
	 * @template R
	 * @param {HooksByName<T, R>} hookMap hooks the should be called
	 * @param {ExportedVariableInfo} info variable info
	 * @param {((name: string) => R | undefined) | undefined} fallback callback when variable in not handled by hooks
	 * @param {((result?: string) => R | undefined) | undefined} defined callback when variable is defined
	 * @param {AsArray<T>} args args for the hook
	 * @returns {R | undefined} result of hook
	 */
	callHooksForInfoWithFallback(hookMap, info, fallback, defined, ...args) {
		return this._callHooksForInfo(hookMap, info, fallback, defined, args);
	}

	/**
	 * Shared core for the callHooksFor* helpers. Takes `args` as an already
	 * collected array so the public wrappers each allocate it once instead of
	 * re-collecting it through several rest-parameter layers (hot per identifier).
	 * @template T
	 * @template R
	 * @param {HooksByName<T, R>} hookMap hooks that should be called
	 * @param {ExportedVariableInfo} info variable info
	 * @param {((name: string) => R | undefined) | undefined} fallback callback when variable is not handled by hooks
	 * @param {((result?: string) => R | undefined) | undefined} defined callback when variable is defined
	 * @param {AsArray<T>} args args for the hook
	 * @returns {R | undefined} result of hook
	 */
	_callHooksForInfo(hookMap, info, fallback, defined, args) {
		/** @type {string} */
		let name;
		if (typeof info === "string") {
			name = info;
		} else {
			if (!JavascriptParser.isVariableInfo(info)) {
				if (defined !== undefined) {
					return defined();
				}
				return;
			}
			let tagInfo = info.tagInfo;
			while (tagInfo !== undefined) {
				const hook = hookMap.get(tagInfo.tag);
				if (hook !== undefined) {
					this.currentTagData = tagInfo.data;
					const result = hook.call(...args);
					this.currentTagData = undefined;
					if (result !== undefined) return result;
				}
				tagInfo = tagInfo.next;
			}
			if (!info.isFree() && !info.isTagged()) {
				if (defined !== undefined) {
					return defined();
				}
				return;
			}
			name = /** @type {string} */ (info.name);
		}
		const hook = hookMap.get(name);
		if (hook !== undefined) {
			const result = hook.call(...args);
			if (result !== undefined) return result;
		}
		if (fallback !== undefined) {
			return fallback(name);
		}
	}

	/**
	 * Whether `_callHooksForInfo` would call any hook for this info, so a
	 * caller can skip building the arguments for a name nothing taps.
	 * @template T
	 * @template R
	 * @param {HooksByName<T, R>} hookMap hooks that would be called
	 * @param {ExportedVariableInfo} info variable info
	 * @returns {boolean} true when a hook is registered for the info
	 */
	_hasHooksForInfo(hookMap, info) {
		if (typeof info === "string") return hookMap.get(info) !== undefined;
		if (!JavascriptParser.isVariableInfo(info)) return false;
		let tagInfo = info.tagInfo;
		while (tagInfo !== undefined) {
			if (hookMap.get(tagInfo.tag) !== undefined) return true;
			tagInfo = tagInfo.next;
		}
		if (!info.isFree() && !info.isTagged()) return false;
		return hookMap.get(/** @type {string} */ (info.name)) !== undefined;
	}

	/**
	 * Call hooks for name with fallback.
	 * @template T
	 * @template R
	 * @param {HooksByName<T, R>} hookMap hooks the should be called
	 * @param {string} name key in map
	 * @param {((value: string) => R | undefined) | undefined} fallback callback when variable in not handled by hooks
	 * @param {(() => R) | undefined} defined callback when variable is defined
	 * @param {AsArray<T>} args args for the hook
	 * @returns {R | undefined} result of hook
	 */
	callHooksForNameWithFallback(hookMap, name, fallback, defined, ...args) {
		return this._callHooksForInfo(
			hookMap,
			this.getVariableInfo(name),
			fallback,
			defined,
			args
		);
	}

	/**
	 * Single-argument twin of `callHooksForName` (must stay in sync with
	 * `_callHooksForInfo`): every internal dispatch passes exactly one hook
	 * argument, so this skips the rest-array collection and spread call the
	 * generic path pays per identifier.
	 * @template T
	 * @template R
	 * @param {HooksByName<T, R>} hookMap hooks that should be called
	 * @param {string} name key in map
	 * @param {AsArray<T>[0] | number} arg the single hook argument, or the node of the tree it stands for
	 * @returns {R | undefined} result of hook
	 */
	_callHooksForName1(hookMap, name, arg) {
		return this._callHooksForInfo1(hookMap, this.getVariableInfo(name), arg);
	}

	/**
	 * Single-argument twin of `callHooksForInfo` (must stay in sync with
	 * `_callHooksForInfo`), for the hot dispatch sites that pass one argument
	 * and no fallback/defined callbacks.
	 * @template T
	 * @template R
	 * @param {HooksByName<T, R>} hookMap hooks that should be called
	 * @param {ExportedVariableInfo} info variable info
	 * @param {AsArray<T>[0] | number} arg the single hook argument, or the node of the tree it stands for
	 * @returns {R | undefined} result of hook
	 */
	_callHooksForInfo1(hookMap, info, arg) {
		/** @type {string} */
		let name;
		if (typeof info === "string") {
			name = info;
		} else {
			if (!JavascriptParser.isVariableInfo(info)) {
				return;
			}
			let tagInfo = info.tagInfo;
			while (tagInfo !== undefined) {
				const hook =
					/** @type {SyncBailHook<[AsArray<T>[0]], R> | undefined} */
					(hookMap.get(tagInfo.tag));
				if (hook !== undefined) {
					this.currentTagData = tagInfo.data;
					const result = hook.call(arg);
					this.currentTagData = undefined;
					if (result !== undefined) return result;
				}
				tagInfo = tagInfo.next;
			}
			if (!info.isFree() && !info.isTagged()) {
				return;
			}
			name = /** @type {string} */ (info.name);
		}
		const hook =
			/** @type {SyncBailHook<[AsArray<T>[0]], R> | undefined} */
			(hookMap.get(name));
		if (hook !== undefined) {
			const result = hook.call(arg);
			if (result !== undefined) return result;
		}
	}

	/**
	 * Processes the provided param.
	 * @deprecated
	 * @param {(string | Pattern | Property)[]} params scope params
	 * @param {() => void} fn inner function
	 * @returns {void}
	 */
	inScope(params, fn) {
		const oldScope = this.scope;
		this.scope = {
			topLevelScope: oldScope.topLevelScope,
			inTry: false,
			inShorthand: false,
			inTaggedTemplateTag: false,
			isStrict: oldScope.isStrict,
			isAsmJs: oldScope.isAsmJs,
			terminated: undefined,
			definitions: oldScope.definitions.createChild()
		};

		this.undefineVariable("this");

		this.enterPatterns(params, this._defineVariable);

		fn();

		this.scope = oldScope;
	}

	/**
	 * Processes the provided has thi.
	 * @param {boolean} hasThis true, when this is defined
	 * @param {Identifier[]} params scope params
	 * @param {() => void} fn inner function
	 * @returns {void}
	 */
	inClassScope(hasThis, params, fn) {
		const oldScope = this.scope;
		this.scope = {
			topLevelScope: oldScope.topLevelScope,
			inTry: false,
			inShorthand: false,
			inTaggedTemplateTag: false,
			isStrict: oldScope.isStrict,
			isAsmJs: oldScope.isAsmJs,
			terminated: undefined,
			definitions: oldScope.definitions.createChild()
		};

		if (hasThis) {
			this.undefineVariable("this");
		}

		this.enterPatterns(params, this._defineVariable);

		fn();

		this.scope = oldScope;
	}

	/**
	 * Processes the provided has thi.
	 * @param {boolean} hasThis true, when this is defined
	 * @param {(Pattern | string)[]} params scope params
	 * @param {() => void} fn inner function
	 * @returns {void}
	 */
	inFunctionScope(hasThis, params, fn) {
		const oldScope = this._enterFunctionScope(hasThis, params);
		// as in walkFunctionExpression / walkArrowFunctionExpression
		this.scope.topLevelScope =
			!hasThis && oldScope.topLevelScope ? "arrow" : false;
		fn();
		this.scope = oldScope;
	}

	/**
	 * Processes the provided fn.
	 * @param {() => void} fn inner function
	 * @param {boolean} inExecutedPath executed state
	 * @returns {void}
	 */
	inBlockScope(fn, inExecutedPath = false) {
		const oldScope = this._enterBlockScope();
		fn();
		this._exitBlockScope(oldScope, inExecutedPath);
	}

	/**
	 * Enters a fresh block scope: the closure-free core of `inBlockScope`, used
	 * directly by the internal walkers so each block does not allocate a
	 * closure and context. Pass the returned scope to `_exitBlockScope`.
	 * @returns {ScopeInfo} the previous scope
	 */
	_enterBlockScope() {
		const oldScope = this.scope;
		this.scope = {
			topLevelScope: oldScope.topLevelScope,
			inTry: oldScope.inTry,
			inShorthand: false,
			inTaggedTemplateTag: false,
			isStrict: oldScope.isStrict,
			isAsmJs: oldScope.isAsmJs,
			terminated: oldScope.terminated,
			definitions: oldScope.definitions.createChild()
		};
		return oldScope;
	}

	/**
	 * Leaves a block scope entered with `_enterBlockScope`.
	 * @param {ScopeInfo} oldScope scope returned by `_enterBlockScope`
	 * @param {boolean} inExecutedPath whether termination propagates to the outer scope
	 * @returns {void}
	 */
	_exitBlockScope(oldScope, inExecutedPath) {
		const terminated = this.scope.terminated;
		if (inExecutedPath && terminated) {
			oldScope.terminated = terminated;
		}
		this.scope = oldScope;
	}

	/**
	 * Enters a fresh function scope: the closure-free core of `inFunctionScope`,
	 * used directly by the internal walkers. Restore `this.scope` to the
	 * returned scope when leaving.
	 * @param {boolean} hasThis true, when this is defined
	 * @param {(Pattern | string)[]} params scope params
	 * @returns {ScopeInfo} the previous scope
	 */
	_enterFunctionScope(hasThis, params) {
		const oldScope = this._openFunctionScope(hasThis);
		this.enterPatterns(params, this._defineVariable);
		return oldScope;
	}

	/**
	 * Opens a function's scope, its parameters not yet defined in it.
	 * @param {boolean} hasThis whether the function has its own `this`
	 * @returns {ScopeInfo} the scope it replaces
	 */
	_openFunctionScope(hasThis) {
		const oldScope = this.scope;
		this.scope = {
			topLevelScope: oldScope.topLevelScope,
			inTry: false,
			inShorthand: false,
			inTaggedTemplateTag: false,
			isStrict: oldScope.isStrict,
			isAsmJs: oldScope.isAsmJs,
			terminated: undefined,
			definitions: oldScope.definitions.createChild()
		};
		if (hasThis) {
			this.undefineVariable("this");
		}
		return oldScope;
	}

	/**
	 * The directive a statement spells, or `undefined` when it is not one. An
	 * AST webpack did not parse may leave the metadata off a directive, so the
	 * spelling is recovered from the literal itself there.
	 * @param {Directive | Statement | ModuleDeclaration} statement statement
	 * @returns {string | undefined} the spelling between the quotes
	 */
	getDirective(statement) {
		if (statement.type !== "ExpressionStatement") return undefined;
		const directive = /** @type {Directive} */ (statement).directive;
		if (directive !== undefined || this._hasParserRecord) return directive;
		const expression = statement.expression;
		if (expression.type !== "Literal" || typeof expression.value !== "string") {
			return undefined;
		}
		// a parenthesized string is an expression rather than a directive, and
		// only the statement says so — the literal starts inside the parentheses
		if (
			statement.range !== undefined &&
			expression.range !== undefined &&
			statement.range[0] !== expression.range[0]
		) {
			return undefined;
		}
		// the raw text keeps an escape unexpanded, which is what separates a
		// directive from a string that merely reads like one
		return expression.raw === undefined
			? expression.value
			: expression.raw.slice(1, -1);
	}

	/**
	 * Processes the provided statement.
	 * @param {(Directive | Statement | ModuleDeclaration)[]} statements statements
	 */
	detectMode(statements) {
		const statement = statements.length >= 1 ? statements[0] : undefined;
		if (
			statement === undefined ||
			statement.type !== "ExpressionStatement" ||
			statement.expression.type !== "Literal"
		) {
			return;
		}
		const value = /** @type {Literal} */ (statement.expression).value;
		if (value === "use asm") {
			this.scope.isAsmJs = true;
		}
		for (const directiveStatement of statements) {
			const directive = this.getDirective(directiveStatement);
			if (directive === undefined) break;
			if (directive === "use strict") {
				this.scope.isStrict = true;
				break;
			}
		}
	}

	/**
	 * `detectMode` for the statements of a program or function body of the
	 * tree, by id.
	 * @param {number} owner the program or the body
	 * @returns {void}
	 */
	_detectModeNode(owner) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const first = tree.field(0, Field.body, owner);
		if (
			first === 0 ||
			tree.type(first) !== NodeType.ExpressionStatement ||
			tree.type(tree.field(0, Field.expression, first)) !== NodeType.Literal
		) {
			return;
		}
		if (tree.value(tree.field(0, Field.expression, first)) === "use asm") {
			this.scope.isAsmJs = true;
		}
		// the tree marks each directive of the prologue, as `getDirective` reads it
		const count = tree.fieldCount(Field.body, owner);
		for (let i = 0; i < count; i++) {
			const directive = tree.textOf(
				Part.directive,
				tree.field(i, Field.body, owner)
			);
			if (directive === null) break;
			if (directive === "use strict") {
				this.scope.isStrict = true;
				break;
			}
		}
	}

	/**
	 * Processes the provided pattern.
	 * @param {(string | Pattern | Property)[]} patterns patterns
	 * @param {OnIdentString} onIdent on ident callback
	 */
	enterPatterns(patterns, onIdent) {
		for (let i = 0, len = patterns.length; i < len; i++) {
			const pattern = patterns[i];
			if (typeof pattern !== "string") {
				this.enterPattern(pattern, onIdent);
			} else if (pattern) {
				onIdent(pattern);
			}
		}
	}

	/**
	 * `enterPattern` for a pattern of the tree, by id: `onIdent` gets each
	 * bound name and its identifier's id.
	 * @param {number} pattern the pattern or property, `0` for none
	 * @param {(name: string, ident: number) => void} onIdent callback
	 * @returns {void}
	 */
	_enterPatternNode(pattern, onIdent) {
		if (pattern === 0) return;
		const tree = /** @type {SyntaxTree} */ (this._tree);
		switch (tree.type(pattern)) {
			case NodeType.Identifier: {
				const name = tree.name(pattern);
				if (!this._callHooksForName1(this.hooks.pattern, name, pattern)) {
					onIdent(name, pattern);
				}
				break;
			}
			case NodeType.ObjectPattern: {
				const count = tree.fieldCount(Field.properties, pattern);
				for (let i = 0; i < count; i++) {
					this._enterPatternNode(
						tree.field(i, Field.properties, pattern),
						onIdent
					);
				}
				break;
			}
			case NodeType.Property: {
				const value = tree.field(0, Field.value, pattern);
				if (
					tree.flag(Flag.shorthand, pattern) &&
					tree.type(value) === NodeType.Identifier
				) {
					this.scope.inShorthand = tree.name(value);
					this._enterPatternNode(value, onIdent);
					this.scope.inShorthand = false;
				} else {
					this._enterPatternNode(value, onIdent);
				}
				break;
			}
			case NodeType.ArrayPattern: {
				const count = tree.fieldCount(Field.elements, pattern);
				for (let i = 0; i < count; i++) {
					this._enterPatternNode(
						tree.field(i, Field.elements, pattern),
						onIdent
					);
				}
				break;
			}
			case NodeType.AssignmentPattern:
				this._enterPatternNode(tree.field(0, Field.left, pattern), onIdent);
				break;
			case NodeType.RestElement:
				this._enterPatternNode(tree.field(0, Field.argument, pattern), onIdent);
				break;
		}
	}

	/**
	 * `walkPattern` for a pattern of the tree, by id.
	 * @param {number} pattern the pattern
	 * @returns {void}
	 */
	_walkPatternNode(pattern) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		switch (tree.type(pattern)) {
			case NodeType.ObjectPattern: {
				const count = tree.fieldCount(Field.properties, pattern);
				for (let i = 0; i < count; i++) {
					const property = tree.field(i, Field.properties, pattern);
					if (tree.type(property) === NodeType.RestElement) continue;
					if (tree.flag(Flag.computed, property)) {
						this._walkExpressionNode(tree.field(0, Field.key, property));
					}
					const value = tree.field(0, Field.value, property);
					if (value !== 0) this._walkPatternNode(value);
				}
				break;
			}
			case NodeType.ArrayPattern: {
				const count = tree.fieldCount(Field.elements, pattern);
				for (let i = 0; i < count; i++) {
					const element = tree.field(i, Field.elements, pattern);
					if (element !== 0) this._walkPatternNode(element);
				}
				break;
			}
			case NodeType.AssignmentPattern:
				this._walkExpressionNode(tree.field(0, Field.right, pattern));
				this._walkPatternNode(tree.field(0, Field.left, pattern));
				break;
			case NodeType.MemberExpression:
				this._walkExpressionNode(pattern);
				break;
			case NodeType.RestElement:
				this._walkPatternNode(tree.field(0, Field.argument, pattern));
				break;
		}
	}

	/**
	 * Processes the provided pattern.
	 * @param {Pattern | Property} pattern pattern
	 * @param {OnIdent} onIdent on ident callback
	 */
	enterPattern(pattern, onIdent) {
		if (!pattern) return;
		// plain identifiers dominate bindings, so match them first
		switch (pattern.type) {
			case "Identifier":
				this.enterIdentifier(pattern, onIdent);
				break;
			case "ObjectPattern":
				this.enterObjectPattern(pattern, onIdent);
				break;
			case "Property":
				if (pattern.shorthand && pattern.value.type === "Identifier") {
					this.scope.inShorthand = pattern.value.name;
					this.enterIdentifier(pattern.value, onIdent);
					this.scope.inShorthand = false;
				} else {
					this.enterPattern(/** @type {Pattern} */ (pattern.value), onIdent);
				}
				break;
			case "ArrayPattern":
				this.enterArrayPattern(pattern, onIdent);
				break;
			case "AssignmentPattern":
				this.enterAssignmentPattern(pattern, onIdent);
				break;
			case "RestElement":
				this.enterRestElement(pattern, onIdent);
				break;
		}
	}

	/**
	 * Processes the provided pattern.
	 * @param {Identifier} pattern identifier pattern
	 * @param {OnIdent} onIdent callback
	 */
	enterIdentifier(pattern, onIdent) {
		if (!this._callHooksForName1(this.hooks.pattern, pattern.name, pattern)) {
			onIdent(pattern.name, pattern);
		}
	}

	/**
	 * Enter object pattern.
	 * @param {ObjectPattern} pattern object pattern
	 * @param {OnIdent} onIdent callback
	 */
	enterObjectPattern(pattern, onIdent) {
		for (
			let propIndex = 0, len = pattern.properties.length;
			propIndex < len;
			propIndex++
		) {
			const prop = pattern.properties[propIndex];
			this.enterPattern(prop, onIdent);
		}
	}

	/**
	 * Enter array pattern.
	 * @param {ArrayPattern} pattern object pattern
	 * @param {OnIdent} onIdent callback
	 */
	enterArrayPattern(pattern, onIdent) {
		for (
			let elementIndex = 0, len = pattern.elements.length;
			elementIndex < len;
			elementIndex++
		) {
			const element = pattern.elements[elementIndex];

			if (element) {
				this.enterPattern(element, onIdent);
			}
		}
	}

	/**
	 * Enter rest element.
	 * @param {RestElement} pattern object pattern
	 * @param {OnIdent} onIdent callback
	 */
	enterRestElement(pattern, onIdent) {
		this.enterPattern(pattern.argument, onIdent);
	}

	/**
	 * Enter assignment pattern.
	 * @param {AssignmentPattern} pattern object pattern
	 * @param {OnIdent} onIdent callback
	 */
	enterAssignmentPattern(pattern, onIdent) {
		this.enterPattern(pattern.left, onIdent);
	}

	/**
	 * Evaluate expression.
	 * @param {Expression | SpreadElement | PrivateIdentifier | Super} expression expression node
	 * @returns {BasicEvaluatedExpression} evaluation result
	 */
	evaluateExpression(expression) {
		const tree = this._tree;
		if (tree !== undefined) {
			const id =
				typeof expression === "number"
					? expression
					: tree.nodeOf(/** @type {Node} */ (expression));
			if (id !== 0) return this._evaluateNode(id);
		}
		try {
			const hook = this.hooks.evaluate.get(expression.type);
			if (hook !== undefined) {
				const result = hook.call(expression);
				if (result !== undefined && result !== null) {
					result.setExpression(expression);
					return result;
				}
			}
		} catch (err) {
			// eslint-disable-next-line no-console
			console.warn(err);
			// ignore error
		}
		// no setRange: the range is served lazily from the expression on first
		// read, so plain results don't materialize the node's range array at all
		return new BasicEvaluatedExpression().setExpression(expression);
	}

	/**
	 * A child of a node to evaluate or walk: its id when the node is a lazy
	 * object of the tree, so the child gets no object, else the child itself.
	 * @param {object | number} node the node, or its id
	 * @param {number} field the child's `Field`
	 * @param {string} key the child's ESTree property
	 * @returns {Expression} the child, or its id standing for it
	 */
	_childOf(node, field, key) {
		const tree = this._tree;
		if (tree !== undefined) {
			const id =
				typeof node === "number"
					? node
					: tree.nodeOf(/** @type {Node} */ (node));
			if (id !== 0) {
				return /** @type {Expression} */ (
					/** @type {unknown} */ (tree.field(0, field, id))
				);
			}
		}
		return /** @type {Record<string, Expression>} */ (node)[key];
	}

	/**
	 * The children in a list field of a node to evaluate: their ids when the
	 * node is a lazy object of the tree, so they get no object, else the children.
	 * @param {object | number} node the node, or its id
	 * @param {number} field the list's `Field`
	 * @param {string} key the list's ESTree property
	 * @returns {(Expression | SpreadElement)[]} the children, or their ids standing for them
	 */
	_childrenOf(node, field, key) {
		const tree = this._tree;
		if (tree !== undefined) {
			const id =
				typeof node === "number"
					? node
					: tree.nodeOf(/** @type {Node} */ (node));
			if (id !== 0) {
				const count = tree.fieldCount(field, id);
				/** @type {(Expression | SpreadElement)[]} */
				const children = [];
				for (let i = 0; i < count; i++) {
					children.push(
						/** @type {Expression} */ (
							/** @type {unknown} */ (tree.field(i, field, id))
						)
					);
				}
				return children;
			}
		}
		return /** @type {Record<string, (Expression | SpreadElement)[]>} */ (
			/** @type {unknown} */ (node)
		)[key];
	}

	/**
	 * Whether a child, or the id `_childOf` stands for it with, is a spread.
	 * @param {Expression | SpreadElement | number} node the child
	 * @returns {boolean} true for a spread element
	 */
	_isSpread(node) {
		return typeof node === "number"
			? /** @type {SyntaxTree} */ (this._tree).type(node) ===
					NodeType.SpreadElement
			: node.type === "SpreadElement";
	}

	/**
	 * @param {object | number} node a node, or its id in the tree
	 * @returns {Range} its range
	 */
	_rangeOf(node) {
		return typeof node === "number"
			? /** @type {SyntaxTree} */ (this._tree).range(node)
			: /** @type {{ range: Range }} */ (node).range;
	}

	/**
	 * @param {object | number} node an operator's node, or its id in the tree
	 * @returns {string} its operator
	 */
	_operatorOf(node) {
		return typeof node === "number"
			? /** @type {string} */ (
					/** @type {SyntaxTree} */ (this._tree).textOf(Part.operator, node)
				)
			: /** @type {{ operator: string }} */ (node).operator;
	}

	/**
	 * The parser's own `evaluate` of a call of the tree, by id: as for its
	 * object, a call of a static member or of a name asks the hooks for it.
	 * @param {number} id the call
	 * @returns {BasicEvaluatedExpression | null | undefined} the evaluation
	 */
	_evaluateCallNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const callee = tree.field(0, Field.callee, id);
		const calleeType = tree.type(callee);
		if (calleeType === NodeType.MemberExpression) {
			const property = tree.field(0, Field.property, callee);
			const computed = tree.flag(Flag.computed, callee);
			if (
				tree.type(property) !==
				(computed ? NodeType.Literal : NodeType.Identifier)
			) {
				return;
			}
			const param = this.evaluateExpression(
				/** @type {EXPECTED_ANY} */ (tree.field(0, Field.object, callee))
			);
			const hook = this.hooks.evaluateCallExpressionMember.get(
				computed ? `${tree.value(property)}` : tree.name(property)
			);
			if (hook !== undefined) {
				return hook.call(/** @type {EXPECTED_ANY} */ (id), param);
			}
		} else if (calleeType === NodeType.Identifier) {
			return this._callHooksForName1(
				this.hooks.evaluateCallExpression,
				tree.name(callee),
				id
			);
		}
	}

	/**
	 * `evaluateExpression` for a node of the tree, by id: its `evaluate` hook
	 * gets the id, which a tap without `path` reads as the node's object.
	 * @param {number} id the expression
	 * @returns {BasicEvaluatedExpression} the evaluation
	 */
	_evaluateNode(id) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		try {
			const hook = this.hooks.evaluate.get(NODE_TYPE_NAMES[tree.type(id)]);
			if (hook !== undefined) {
				const result = hook.call(/** @type {EXPECTED_ANY} */ (id));
				if (result !== undefined && result !== null) {
					result.setNode(tree, id);
					return result;
				}
			}
		} catch (err) {
			// eslint-disable-next-line no-console
			console.warn(err);
			// ignore error
		}
		return new BasicEvaluatedExpression().setNode(tree, id);
	}

	/**
	 * Returns parsed string.
	 * @param {Expression} expression expression
	 * @returns {string} parsed string
	 */
	parseString(expression) {
		switch (expression.type) {
			case "BinaryExpression":
				if (expression.operator === "+") {
					return (
						this.parseString(/** @type {Expression} */ (expression.left)) +
						this.parseString(expression.right)
					);
				}
				break;
			case "Literal":
				return String(expression.value);
		}
		throw new Error(
			`${expression.type} is not supported as parameter for require`
		);
	}

	/** @typedef {{ range?: Range, value: string, code: boolean, conditional: false | CalculatedStringResult[] }} CalculatedStringResult */

	/**
	 * Parses calculated string.
	 * @param {Expression} expression expression
	 * @returns {CalculatedStringResult} result
	 */
	parseCalculatedString(expression) {
		switch (expression.type) {
			case "BinaryExpression":
				if (expression.operator === "+") {
					const left = this.parseCalculatedString(
						/** @type {Expression} */
						(expression.left)
					);
					const right = this.parseCalculatedString(expression.right);
					if (left.code) {
						return {
							range: left.range,
							value: left.value,
							code: true,
							conditional: false
						};
					} else if (right.code) {
						return {
							range: [
								/** @type {Range} */
								(left.range)[0],
								right.range
									? right.range[1]
									: /** @type {Range} */ (left.range)[1]
							],
							value: left.value + right.value,
							code: true,
							conditional: false
						};
					}
					return {
						range: [
							/** @type {Range} */
							(left.range)[0],
							/** @type {Range} */
							(right.range)[1]
						],
						value: left.value + right.value,
						code: false,
						conditional: false
					};
				}
				break;
			case "ConditionalExpression": {
				const consequent = this.parseCalculatedString(expression.consequent);
				const alternate = this.parseCalculatedString(expression.alternate);
				/** @type {CalculatedStringResult[]} */
				const items = [];
				if (consequent.conditional) {
					items.push(...consequent.conditional);
				} else if (!consequent.code) {
					items.push(consequent);
				} else {
					break;
				}
				if (alternate.conditional) {
					items.push(...alternate.conditional);
				} else if (!alternate.code) {
					items.push(alternate);
				} else {
					break;
				}
				return {
					range: undefined,
					value: "",
					code: true,
					conditional: items
				};
			}
			case "Literal":
				return {
					range: expression.range,
					value: String(expression.value),
					code: false,
					conditional: false
				};
		}
		return {
			range: undefined,
			value: "",
			code: true,
			conditional: false
		};
	}

	/**
	 * Parses the provided source and updates the parser state.
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		const outerView = this._pathView;
		const outerProgram = this._pathProgram;
		const outerTree = this._tree;
		const outerPureTreeContext = this._pureTreeContext;
		const outerDestructuring = this.destructuringAssignmentProperties;
		const outerDestructuringNodes = this._destructuringNodes;
		this._pathView = undefined;
		try {
			return this._parseAndWalk(source, state);
		} finally {
			// the view held this parse's nodes, which it lets go even when a tap
			// throws; a tap made it, so it is read as the field may now hold
			const view = /** @type {EstreeView | undefined} */ (this._pathView);
			if (view !== undefined) {
				view.reset();
				this._sparePathView = view;
			}
			this._pathView = outerView;
			this._pathProgram = outerProgram;
			this._tree = outerTree;
			this._pureTreeContext = outerPureTreeContext;
			this.destructuringAssignmentProperties = outerDestructuring;
			this._destructuringNodes = outerDestructuringNodes;
		}
	}

	/**
	 * `parse` without letting go of the path's view, which `parse` does.
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	_parseAndWalk(source, state) {
		if (source === null) {
			throw new Error("source must not be null");
		}

		if (Buffer.isBuffer(source)) {
			source = source.toString("utf8");
			// Keep `state.source` as a string so downstream walkers can read
			// the original text without re-decoding the Buffer on every use.
			state.source = source;
		}

		/** @type {Program} */
		let ast;
		/** @type {Comment[]} */
		let comments;

		/** @type {SyntaxTree | undefined} */
		let tree;
		// the program's node in the tree walk, which hooks get in place of `ast`
		let root = 0;
		if (typeof source === "object") {
			ast = /** @type {Program} */ (source);
			comments = source.comments;
		} else if (this._walkTree && typeof this.options.parse !== "function") {
			let program;
			({ program, comments, tree } = JavascriptParser._parseTree(
				source,
				this.sourceType,
				this.options.importPhases === true
			));
			root = program;
			ast = /** @type {EXPECTED_ANY} */ (program);
		} else {
			({ ast, comments } = JavascriptParser._parse(
				source,
				{
					sourceType: this.sourceType,
					// line/column locations are derived from node offsets via
					// getLocation — parsers never need to track them
					locations: false,
					ranges: true,
					comments: true,
					importPhases: this.options.importPhases === true
				},
				this.options.parse
			));
		}

		const oldScope = this.scope;
		const oldState = this.state;
		const oldComments = this.comments;
		const oldSemicolons = this.semicolons;
		const oldStatementPath = this._statementPath;
		const oldPrevStatement = this._prevStatement;
		const oldStrictInModuleOutput = this._strictInModuleOutput;
		const oldSource = this._source;
		const oldLineStarts = this._lineStarts;
		const oldHasParserRecord = this._hasParserRecord;
		this._tree = tree;
		this._pureTreeContext = undefined;
		if (tree !== undefined && !this._idHooks) this._takeIdHooks();
		// WHY: the parser's record of each scope is only the truth for a tree it
		// just built. A loader's AST, and whatever `module.parser.javascript.parse`
		// returns, may have been edited after it was read — or built by something
		// else entirely — so both are collected from instead of trusted.
		// lazy objects carry no record, so the walk collects it as for any AST
		this._hasParserRecord =
			tree === undefined &&
			typeof source !== "object" &&
			typeof this.options.parse !== "function";
		this._pathProgram = tree === undefined ? ast : undefined;
		// a preparsed AST carries no text, but the build passes the module
		// source in the state — offsets still map for it
		this._source =
			typeof source === "string"
				? source
				: typeof state.source === "string"
					? state.source
					: undefined;
		this._lineStarts = undefined;
		this.scope = {
			topLevelScope: true,
			inTry: false,
			inShorthand: false,
			inTaggedTemplateTag: false,
			isStrict: false,
			isAsmJs: false,
			terminated: undefined,
			definitions: new StackedMap()
		};
		this.state = /** @type {JavascriptParserState} */ (state);
		this.comments = comments;
		this.semicolons = undefined;
		// evaluating a defined, untagged identifier can only fall through when
		// every `evaluate.for("Identifier")` tap is the parser's own — plugins
		// tapping or intercepting it disable the callee/rename fast paths
		const identifierEvalHook = this.hooks.evaluate.get("Identifier");
		this._evalIdentOwnTaps =
			identifierEvalHook !== undefined &&
			identifierEvalHook.interceptors.length === 0 &&
			identifierEvalHook.taps.every((tap) => tap.name === CLASS_NAME);
		this._statementPath = [];
		this._prevStatement = undefined;
		// The output is emitted as strict-mode ESM, but this module was parsed as
		// a loose script — acorn skipped the strict early errors that will break
		// the bundle at runtime. Enables the strict-mode diagnostics below.
		this._strictInModuleOutput =
			this.options.strictModeViolations !== false &&
			state.compilation !== undefined &&
			state.compilation.runtimeTemplate.isModule();
		if (this.hooks.program.call(ast, comments) === undefined) {
			if (tree !== undefined) this._destructuringNodes = new Map();
			else this.destructuringAssignmentProperties = new WeakMap();
			if (root !== 0) this._detectModeNode(root);
			else this.detectMode(ast.body);
			// a strict program (ESM source, `"use strict"`) keeps its behavior in
			// strict output — drop the flag so the walk pays no per-node checks
			if (this._strictInModuleOutput && this.scope.isStrict) {
				this._strictInModuleOutput = false;
			}
			if (root !== 0) {
				this._modulePreWalkDeclarationsNode(root);
			} else {
				this._modulePreWalkDeclarations(
					moduleDeclarationsOf(ast, this._hasParserRecord)
				);
			}
			this._prevStatement = undefined;
			this._preWalkScope(root !== 0 ? root : ast);
			this._prevStatement = undefined;
			if (root !== 0) this._blockPreWalkScopeNode(root, Field.body);
			else this._blockPreWalkScope(ast, ast.body);
			this._prevStatement = undefined;
			if (root !== 0) {
				this._walkStatementsNode(root, Field.body);
			} else {
				this.walkStatements(ast.body);
			}
			this.destructuringAssignmentProperties = undefined;
			this._destructuringNodes = undefined;
		}
		this.hooks.finish.call(ast, comments);
		this._releaseMemberExpression();
		if (tree !== undefined) tree.release();
		this.scope = oldScope;
		this.state = oldState;
		this.comments = oldComments;
		this.semicolons = oldSemicolons;
		this._statementPath = oldStatementPath;
		this._prevStatement = oldPrevStatement;
		this._strictInModuleOutput = oldStrictInModuleOutput;
		// release — these retain the whole source string and its line table
		this._source = oldSource;
		this._lineStarts = oldLineStarts;
		this._hasParserRecord = oldHasParserRecord;
		return state;
	}

	/**
	 * Lets the hooks the id walk calls take node ids: each tap without `path`,
	 * now and from now on, gets the nodes' objects instead. Done once, on the
	 * first parse into the tree, so a parser that never walks one pays nothing.
	 * @returns {void}
	 */
	_takeIdHooks() {
		this._idHooks = true;
		for (const name of /** @type {(keyof PathHooks)[]} */ (
			Object.keys(PATH_HOOK_NODES)
		)) {
			const nodes = /** @type {number} */ (PATH_HOOK_NODES[name]);
			const hookOrMap = /** @type {PathHook | HookMap<PathHook>} */ (
				this.hooks[name]
			);
			const hooks =
				hookOrMap instanceof HookMap
					? /** @type {{ _map: Map<string, PathHook> }} */ (
							/** @type {unknown} */ (hookOrMap)
						)._map.values()
					: [hookOrMap];
			for (const hook of hooks) {
				let changed = false;
				for (const tap of hook.taps) {
					// a path tap reads ids, as do the parser's own `ids` taps
					if (
						/** @type {{ path?: boolean, ids?: boolean }} */ (tap).path ===
							true ||
						/** @type {{ ids?: boolean }} */ (tap).ids === true
					) {
						continue;
					}
					tap.fn = objectTapOf(
						/** @type {(...args: EXPECTED_ANY[]) => EXPECTED_ANY} */ (tap.fn),
						nodes,
						this
					);
					changed = true;
				}
				if (changed) {
					/** @type {{ _resetCompilation: () => void }} */ (
						/** @type {unknown} */ (hook)
					)._resetCompilation();
				}
			}
		}
	}

	/**
	 * The view `{ path: true }` taps read the parse's nodes through, made on the
	 * first of them; in it a directive another parser's AST leaves unmarked
	 * reads as `getDirective` recovers it.
	 * @returns {EstreeView} the view
	 */
	_pathViewOf() {
		let view = this._pathView;
		if (view !== undefined) return view;
		const program = this._pathProgram;
		// outside a parse, as for a plugin calling a hook itself: a view of its own
		if (program === undefined) return new EstreeView();
		view = this._sparePathView || new EstreeView();
		this._sparePathView = undefined;
		if (!this._hasParserRecord) {
			for (const statement of program.body) {
				const directive = this.getDirective(statement);
				if (directive === undefined) break;
				if (/** @type {Directive} */ (statement).directive === undefined) {
					view.markDirective(statement, directive);
				}
			}
		}
		this._pathView = view;
		return view;
	}

	/**
	 * Returns evaluation result.
	 * @param {string} source source code
	 * @returns {BasicEvaluatedExpression} evaluation result
	 */
	evaluate(source) {
		const importPhases = this.options.importPhases === true;
		const compilation = this.state && this.state.compilation;
		/** @type {Map<string, Program> | undefined} */
		let cache;
		// custom parse functions are not necessarily pure, do not cache for them
		if (compilation !== undefined && typeof this.options.parse !== "function") {
			cache = evaluateAstCaches.get(compilation);
			if (cache === undefined) {
				cache = new Map();
				evaluateAstCaches.set(compilation, cache);
			}
		}
		const cacheKey =
			cache === undefined
				? undefined
				: `${this.sourceType}|${importPhases}|${source}`;
		let ast =
			cacheKey === undefined
				? undefined
				: /** @type {Map<string, Program>} */ (cache).get(cacheKey);
		if (ast === undefined) {
			({ ast } = JavascriptParser._parse(
				`(${source})`,
				{
					sourceType: this.sourceType,
					// ranges alone take the lazy path, which serves `range` from a
					// getter and tracks no locations — as the module parse does
					ranges: true,
					importPhases
				},
				this.options.parse
			));
			if (cacheKey !== undefined) {
				const map = /** @type {Map<string, Program>} */ (cache);
				if (map.size >= EVALUATE_AST_CACHE_LIMIT) map.clear();
				map.set(cacheKey, ast);
			}
		}
		if (ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement") {
			throw new Error("evaluate: Source is not a expression");
		}
		return this.evaluateExpression(ast.body[0].expression);
	}

	/**
	 * `isPure` for a node of the tree that may run something, by id: the tree
	 * is read in place, so a nested query needs no view of its own.
	 * @param {number} id the node
	 * @param {number} commentsStartPos source position from which annotation comments are checked
	 * @returns {boolean} true, when the expression is pure
	 */
	_isPureNode(id, commentsStartPos) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		if (this._pureTreeContext === undefined) {
			this._pureTreeContext = this._pureContext(tree);
		}
		const outerCommentsStartPos = this._pureCommentsStartPos;
		this._pureCommentsStartPos = commentsStartPos;
		try {
			return !getSideEffects().hasSideEffects(tree, id, this._pureTreeContext);
		} finally {
			this._pureCommentsStartPos = outerCommentsStartPos;
		}
	}

	/**
	 * Checks whether this javascript parser is pure.
	 * @param {Expression | Declaration | PrivateIdentifier | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration | number | null | undefined} expr an expression, an id in the tree walk
	 * @param {number} commentsStartPos source position from which annotation comments are checked
	 * @returns {boolean} true, when the expression is pure
	 */
	isPure(expr, commentsStartPos) {
		if (!expr) return true;
		if (typeof expr === "number") {
			const type =
				NODE_TYPE_NAMES[/** @type {SyntaxTree} */ (this._tree).type(expr)];
			const { INERT_TYPES } = getSideEffects();
			if (INERT_TYPES.has(type) || type === "Identifier") {
				const result = this.hooks.isPure
					.for(type)
					.call(/** @type {EXPECTED_ANY} */ (expr), commentsStartPos);
				return typeof result === "boolean" ? result : true;
			}
			return this._isPureNode(expr, commentsStartPos);
		}
		const { INERT_TYPES, hasSideEffects } = getSideEffects();
		// What holds nothing that may run, or is a name, needs no tree.
		if (INERT_TYPES.has(expr.type) || expr.type === "Identifier") {
			const result = this.hooks.isPure
				.for(expr.type)
				.call(expr, commentsStartPos);
			return typeof result === "boolean" ? result : true;
		}
		const tree = this._tree;
		if (tree !== undefined) {
			const id = tree.nodeOf(/** @type {Node} */ (expr));
			if (id !== 0) return this._isPureNode(id, commentsStartPos);
		}
		// A hook may ask again while a query reads the parser's own view.
		const nested = this._pureViewBusy;
		if (this._pureView === undefined) {
			this._pureView = new EstreeView();
			this._pureViewContext = this._pureContext(this._pureView);
		}
		const view = nested ? new EstreeView() : this._pureView;
		const outerCommentsStartPos = this._pureCommentsStartPos;
		this._pureViewBusy = true;
		this._pureCommentsStartPos = commentsStartPos;
		try {
			return !hasSideEffects(
				view,
				view.add(/** @type {Node} */ (expr)),
				nested
					? this._pureContext(view)
					: /** @type {SideEffectsContext} */ (this._pureViewContext)
			);
		} finally {
			this._pureCommentsStartPos = outerCommentsStartPos;
			if (!nested) {
				this._pureViewBusy = false;
				view.reset();
			}
		}
	}

	/**
	 * The `side-effects` context of an `isPure` query: its hooks answer first,
	 * the evaluator judges what the rules leave to it, and names run nothing.
	 * @param {EstreeView | SyntaxTree} view the query's view, or the tree it reads in place
	 * @returns {SideEffectsContext} the context
	 */
	_pureContext(view) {
		return {
			readHasSideEffects: RETURN_FALSE,
			readsGlobalMember: RETURN_FALSE,
			nameKind: RETURN_UNDEFINED,
			pureConversions: true,
			isPureCall: (node) =>
				this._isPureAnnotated(view.start(node), this._pureCommentsStartPos),
			decides: (node) => {
				if (!(view instanceof EstreeView)) return this._decidesPureNode(node);
				const object = view.object(node);
				const result = this.hooks.isPure
					.for(object.type)
					.call(
						/** @type {Expression} */ (object),
						Math.min(this._pureCommentsStartPos, view.start(node))
					);
				if (typeof result === "boolean") return !result;
				if (isLeftToEvaluator(object, view.type(node))) {
					return this.evaluateExpression(
						/** @type {Expression} */ (object)
					).couldHaveSideEffects();
				}
				return isDerivedWithConstructor(object) || undefined;
			}
		};
	}

	/**
	 * The `decides` of an `isPure` query reading the tree in place: a node gets
	 * an object only for an `isPure` hook of its type, or for a class.
	 * @param {number} node the node the rules leave undecided
	 * @returns {boolean | undefined} whether it may have side effects, undefined to leave it to the rules
	 */
	_decidesPureNode(node) {
		const tree = /** @type {SyntaxTree} */ (this._tree);
		const type = tree.type(node);
		const hook = this.hooks.isPure.get(NODE_TYPE_NAMES[type]);
		if (hook !== undefined) {
			const result = hook.call(
				/** @type {EXPECTED_ANY} */ (node),
				Math.min(this._pureCommentsStartPos, tree.start(node))
			);
			if (typeof result === "boolean") return !result;
		}
		if (
			type === NodeType.UnaryExpression || type === NodeType.BinaryExpression
				? isLeftToEvaluatorOperator(type, this._operatorOf(node))
				: isLeftToEvaluator(undefined, type)
		) {
			return this.evaluateExpression(
				/** @type {EXPECTED_ANY} */ (node)
			).couldHaveSideEffects();
		}
		if (
			type === NodeType.ClassDeclaration ||
			type === NodeType.ClassExpression
		) {
			return (
				isDerivedWithConstructor(/** @type {Node} */ (tree.estree(node))) ||
				undefined
			);
		}
	}

	/**
	 * @param {number} start where a call, `new` or tagged template starts
	 * @param {number} commentsStartPos where its annotation comments may start
	 * @returns {boolean} whether a `#__PURE__` block comment sits right before it, past `commentsStartPos`
	 */
	_isPureAnnotated(start, commentsStartPos) {
		// `/*#__PURE__*/` is 13 characters long.
		if (start - commentsStartPos <= 12) return false;
		const source = this._source;
		const comments = this.getComments([commentsStartPos, start]);
		for (let i = comments.length - 1; i >= 0; i--) {
			const comment = comments[i];
			const [commentStart, commentEnd] = /** @type {Range} */ (comment.range);
			// Only spaces and opening parentheses may stand between it and the call.
			if (
				source !== undefined &&
				!/^[\s(]*$/.test(source.slice(commentEnd, start))
			) {
				return false;
			}
			if (
				comment.type === "Block" &&
				CompilerHintNotationRegExp.Pure.test(comment.value)
			) {
				return true;
			}
			start = commentStart;
		}
		return false;
	}

	/**
	 * The node an id a `{ path: true }` tap got stands for, as the parser's
	 * methods take it: the id itself in the tree walk, else the node's object.
	 * @param {JavascriptNodeReader} path the path the tap got
	 * @param {number} node the node's id in it
	 * @returns {EXPECTED_ANY} the node for `walkExpression`, `walkStatement`, `evaluateExpression` and `getLocation`
	 */
	nodeOfPath(path, node) {
		return /** @type {unknown} */ (path) === this._tree
			? node
			: path.object(node);
	}

	/**
	 * Returns the location of a node or comment, computed from its offsets so
	 * ASTs from parsers without location support work too. Falls back to the
	 * node's own `loc` only when no source text is available (preparsed ASTs).
	 * Offsets can only be mapped while parsing — callbacks deferred past the
	 * `parse()` call must take the location upfront.
	 * @param {{ start?: number, end?: number, range?: Range, loc?: SourceLocation | null } | number} node node or comment, or a node's id in the tree walk
	 * @returns {DependencyLocation} location of the node
	 */
	getLocation(node) {
		const source = this._source;
		if (typeof node === "number") {
			const tree = /** @type {SyntaxTree} */ (this._tree);
			const lineStarts =
				this._lineStarts ||
				(this._lineStarts = buildLineStarts(/** @type {string} */ (source)));
			return {
				start: positionAt(lineStarts, tree.start(node)),
				end: positionAt(lineStarts, tree.end(node))
			};
		}
		if (source !== undefined) {
			const start =
				typeof node.start === "number"
					? node.start
					: node.range
						? node.range[0]
						: undefined;
			if (start !== undefined) {
				const end =
					typeof node.end === "number"
						? node.end
						: node.range
							? node.range[1]
							: start;
				const lineStarts =
					this._lineStarts || (this._lineStarts = buildLineStarts(source));
				return {
					start: positionAt(lineStarts, start),
					end: positionAt(lineStarts, end)
				};
			}
		}
		const loc = node.loc;
		if (!loc) {
			return /** @type {DependencyLocation} */ (
				/** @type {DependencyLocation | null | undefined} */ (loc)
			);
		}
		// a plain copy: a foreign parser's location class must not reach the cache
		return {
			start: { line: loc.start.line, column: loc.start.column },
			end: { line: loc.end.line, column: loc.end.column }
		};
	}

	/**
	 * Returns comments in the range.
	 * @param {Range} range range
	 * @returns {Comment[]} comments in the range
	 */
	getComments(range) {
		return getCommentsInRange(
			/** @type {(Comment & { range: [number, number] })[]} */ (this.comments),
			range
		);
	}

	/**
	 * Where the comments written for `statement` begin: the run of comments
	 * before it that whitespace alone separates from it and from each other.
	 * @param {StatementPathItem | number} statement the statement they belong to, an id in the tree walk
	 * @returns {number} the offset the run starts at, or the statement's own
	 */
	getAttachedCommentsStart(statement) {
		let position =
			typeof statement === "number"
				? /** @type {SyntaxTree} */ (this._tree).start(statement)
				: /** @type {Range} */ (statement.range)[0];
		// what precedes `export function f() {}` is written for the export, and
		// the export keyword is the token the run would otherwise stop at
		const ids = this._statementPath;
		const outerItem =
			ids !== undefined && ids.length > 1 ? ids[ids.length - 2] : undefined;
		const tree = this._tree;
		if (outerItem !== undefined && tree !== undefined) {
			// the path holds ids and lazy objects alike, so both are read as ids
			const outer =
				typeof outerItem === "number"
					? outerItem
					: tree.nodeOf(/** @type {Node} */ (outerItem));
			const node =
				typeof statement === "number"
					? statement
					: tree.nodeOf(/** @type {Node} */ (statement));
			if (outer !== 0 && node !== 0) {
				const type = tree.type(outer);
				if (
					(type === NodeType.ExportNamedDeclaration ||
						type === NodeType.ExportDefaultDeclaration) &&
					tree.field(0, Field.declaration, outer) === node
				) {
					position = tree.start(outer);
				}
				return this._attachedCommentsStartFrom(position);
			}
		}
		const path = this.statementPath;
		if (path !== undefined && path.length > 1) {
			const outer = path[path.length - 2];
			if (
				(outer.type === "ExportNamedDeclaration" ||
					outer.type === "ExportDefaultDeclaration") &&
				outer.declaration === statement
			) {
				position = /** @type {Range} */ (outer.range)[0];
			}
		}
		return this._attachedCommentsStartFrom(position);
	}

	/**
	 * @param {number} position where the statement, or the export holding it, starts
	 * @returns {number} the offset the run of comments before it starts at, or `position`
	 */
	_attachedCommentsStartFrom(position) {
		const comments = this.comments;
		if (comments === undefined) return position;
		const source = this._source;
		for (
			let index = binarySearchBounds.le(comments, position, compareCommentEnd);
			index >= 0;
			index--
		) {
			const range = /** @type {Range} */ (comments[index].range);
			if (range[1] > position) continue;
			// with no source to read, nothing can be ruled out, so the run is
			// taken to reach as far as the comments themselves do
			if (
				source !== undefined &&
				!onlyWhitespaceBetween(source, range[1], position)
			) {
				break;
			}
			position = range[0];
		}
		return position;
	}

	/**
	 * Reports whether `identifier` may occur as a word in the source text of
	 * `range`. A conservative pre-filter for expensive AST scans: `false` means
	 * it certainly does not occur, while a match inside a comment or a string
	 * yields `true`. Also `true` when no source text is available (preparsed
	 * AST), so callers must stay correct without the filter.
	 * @param {Range} range range to search
	 * @param {string} identifier identifier to look for
	 * @returns {boolean} false when the identifier certainly does not occur
	 */
	sourceMayContainIdentifier(range, identifier) {
		const source = this._source;
		if (source === undefined) return true;
		const end = range[1];
		const length = identifier.length;
		for (
			let index = source.indexOf(identifier, range[0]);
			index !== -1 && index + length <= end;
			index = source.indexOf(identifier, index + length)
		) {
			if (
				(index === 0 || !isIdentifierChar(source.charCodeAt(index - 1))) &&
				(index + length === source.length ||
					!isIdentifierChar(source.charCodeAt(index + length)))
			) {
				return true;
			}
		}
		return false;
	}

	/**
	 * First significant char code at or after `pos`, skipping whitespace,
	 * comments and grouping `)` (a parenthesized node's range excludes its
	 * wrapping parens, so a `,`/`;` separator can sit behind them), or -1 at
	 * end of source.
	 * @param {string} source source text
	 * @param {number} pos start offset
	 * @returns {number} char code of the next token, or -1
	 */
	_nextTokenCharCode(source, pos) {
		const len = source.length;
		for (let i = pos; i < len; i++) {
			const c = source.charCodeAt(i);
			// whitespace and line terminators acorn skips between tokens
			if (
				c === 32 ||
				c === 9 ||
				c === 10 ||
				c === 13 ||
				c === 11 ||
				c === 12 ||
				c === 41 /* ) */ ||
				c === 0xa0 ||
				c === 0xfeff ||
				c === 0x2028 ||
				c === 0x2029
			) {
				continue;
			}
			if (c === 47 /* / */) {
				const n = source.charCodeAt(i + 1);
				if (n === 47 /* / */) {
					i += 2;
					while (i < len) {
						const cc = source.charCodeAt(i);
						if (cc === 10 || cc === 13 || cc === 0x2028 || cc === 0x2029) break;
						i++;
					}
					continue;
				}
				if (n === 42 /* * */) {
					i += 2;
					while (
						i < len &&
						!(source.charCodeAt(i) === 42 && source.charCodeAt(i + 1) === 47)
					) {
						i++;
					}
					i++;
					continue;
				}
			}
			return c;
		}
		return -1;
	}

	/**
	 * Whether a statement ending at `pos` relies on ASI (no real separator).
	 * Derived from the source text unless overridden by set/unsetAsiPosition.
	 * A statement terminated by a real `;` or continued by a `,` (a sequence
	 * element) is not an ASI position; anything else (newline, `}`, eof) is.
	 * @param {number} pos statement end offset
	 * @returns {boolean} true when ASI inserts a semicolon at this position
	 */
	_isAsiPosition(pos) {
		if (this.semicolons !== undefined) {
			const override = this.semicolons.get(pos);
			if (override !== undefined) return override;
		}
		const source = this._source;
		if (source === undefined) return true;
		// a real semicolon is the statement's last char (exclusive end at pos)
		if (source.charCodeAt(pos - 1) === 59 /* ; */) return false;
		const next = this._nextTokenCharCode(source, pos);
		return next !== 44 /* , */ && next !== 59; /* ; */
	}

	/**
	 * How many statements the walk is in, as `statementPath.length` counts them
	 * without making their objects: `1` at a top-level statement.
	 * @returns {number} the depth, `0` outside a walk
	 */
	get statementDepth() {
		const path = this._statementPath;
		return path === undefined ? 0 : path.length;
	}

	/**
	 * The statements the walk is in, innermost last, each as its object.
	 * @returns {StatementPath | undefined} the statements
	 */
	get statementPath() {
		const path = this._statementPath;
		const tree = this._tree;
		if (path !== undefined && tree !== undefined) {
			for (let i = 0; i < path.length; i++) {
				const item = path[i];
				if (typeof item === "number") {
					path[i] = /** @type {StatementPathItem} */ (tree.estree(item));
				}
			}
		}
		return /** @type {StatementPath | undefined} */ (path);
	}

	/**
	 * @param {StatementPath | undefined} value the statements
	 */
	set statementPath(value) {
		this._statementPath = value;
	}

	/**
	 * The statement walked last before the current one, as its object.
	 * @returns {StatementPathItem | undefined} the statement
	 */
	get prevStatement() {
		const statement = this._prevStatement;
		if (typeof statement !== "number") return statement;
		const object = /** @type {StatementPathItem} */ (
			/** @type {SyntaxTree} */ (this._tree).estree(statement)
		);
		this._prevStatement = object;
		return object;
	}

	/**
	 * @param {StatementPathItem | undefined} value the statement
	 */
	set prevStatement(value) {
		this._prevStatement = value;
	}

	/**
	 * Checks whether this javascript parser is asi position.
	 * @param {number} pos source code position
	 * @returns {boolean} true when a semicolon has been inserted before this position, false if not
	 */
	isAsiPosition(pos) {
		const path =
			/** @type {(StatementPathItem | number)[]} */
			(this._statementPath);
		const currentStatement = path[path.length - 1];
		if (currentStatement === undefined) throw new Error("Not in statement");
		const range = this._statementRangeOf(currentStatement);
		const prevStatement = this._prevStatement;

		return (
			// Either asking directly for the end position of the current statement
			(range[1] === pos && this._isAsiPosition(pos)) ||
			// Or asking for the start position of the current statement,
			// here we have to check multiple things
			(range[0] === pos &&
				// is there a previous statement which might be relevant?
				prevStatement !== undefined &&
				// is the end position of the previous statement an ASI position?
				this._isAsiPosition(this._statementRangeOf(prevStatement)[1]))
		);
	}

	/**
	 * @param {StatementPathItem | number} statement a statement of the path, an id in the tree walk
	 * @returns {Range} where it starts and ends
	 */
	_statementRangeOf(statement) {
		return typeof statement === "number"
			? /** @type {SyntaxTree} */ (this._tree).range(statement)
			: /** @type {Range} */ (statement.range);
	}

	/**
	 * Updates asi position using the provided po.
	 * @param {number} pos source code position
	 * @returns {void}
	 */
	setAsiPosition(pos) {
		(this.semicolons || (this.semicolons = new Map())).set(pos, true);
	}

	/**
	 * Unset asi position.
	 * @param {number} pos source code position
	 * @returns {void}
	 */
	unsetAsiPosition(pos) {
		(this.semicolons || (this.semicolons = new Map())).set(pos, false);
	}

	/**
	 * Checks whether this javascript parser is statement level expression.
	 * @param {Expression | number} expr expression, an id in the tree walk
	 * @returns {boolean} true, when the expression is a statement level expression
	 */
	isStatementLevelExpression(expr) {
		const path =
			/** @type {(StatementPathItem | number)[]} */
			(this._statementPath);
		const current = path[path.length - 1];
		if (typeof current === "number") {
			const tree = /** @type {SyntaxTree} */ (this._tree);
			const node = typeof expr === "number" ? expr : tree.nodeOf(expr);
			// an object the tree did not make is compared as one, below
			if (node !== 0) {
				return (
					node === current ||
					(tree.type(current) === NodeType.ExpressionStatement &&
						tree.field(0, Field.expression, current) === node)
				);
			}
		}
		const currentStatement =
			/** @type {StatementPath} */
			(this.statementPath)[
				/** @type {StatementPath} */
				(this.statementPath).length - 1
			];
		return (
			expr === currentStatement ||
			(currentStatement.type === "ExpressionStatement" &&
				currentStatement.expression === expr)
		);
	}

	/**
	 * Returns tag data, typed by the tag it was stored under.
	 * @template {TagData} [T=TagData]
	 * @param {string} name name
	 * @param {Tag<T> | symbol} tag tag info
	 * @returns {T | undefined} tag data
	 */
	getTagData(name, tag) {
		const info = this.scope.definitions.get(name);
		if (JavascriptParser.isVariableInfo(info)) {
			let tagInfo = info.tagInfo;
			while (tagInfo !== undefined) {
				if (tagInfo.tag === tag) {
					return /** @type {T | undefined} */ (tagInfo.data);
				}
				tagInfo = tagInfo.next;
			}
		}
	}

	/**
	 * Processes the provided name.
	 * @template {TagData} [T=TagData]
	 * @param {string} name name
	 * @param {Tag<T> | symbol} tag tag info
	 * @param {T=} data data
	 * @param {VariableInfoFlagsType=} flags flags
	 */
	tagVariable(name, tag, data, flags = VariableInfoFlags.Tagged) {
		const oldInfo = this.scope.definitions.get(name);
		/** @type {VariableInfo} */
		let newInfo;
		if (oldInfo === undefined) {
			newInfo = new VariableInfo(this.scope, name, flags, {
				tag,
				data,
				next: undefined
			});
		} else if (JavascriptParser.isVariableInfo(oldInfo)) {
			newInfo = new VariableInfo(
				oldInfo.declaredScope,
				oldInfo.name,
				/** @type {VariableInfoFlagsType} */ (oldInfo.flags | flags),
				{
					tag,
					data,
					next: oldInfo.tagInfo
				}
			);
		} else {
			newInfo = new VariableInfo(oldInfo, name, flags, {
				tag,
				data,
				next: undefined
			});
		}
		this.scope.definitions.set(name, newInfo);
		this._memberExpression = undefined;
	}

	/**
	 * Processes the provided name.
	 * @param {string} name variable name
	 */
	defineVariable(name) {
		const oldInfo = this.scope.definitions.get(name);
		// Don't redefine variable in same scope to keep existing tags
		if (
			JavascriptParser.isVariableInfo(oldInfo) &&
			oldInfo.declaredScope === this.scope
		) {
			return;
		}
		this.scope.definitions.set(name, this.scope);
		this._memberExpression = undefined;
	}

	/**
	 * Processes the provided name.
	 * @param {string} name variable name
	 */
	undefineVariable(name) {
		this.scope.definitions.delete(name);
		this._memberExpression = undefined;
	}

	/**
	 * Checks whether this javascript parser is variable defined.
	 * @param {string} name variable name
	 * @returns {boolean} true, when variable is defined
	 */
	isVariableDefined(name) {
		const info = this.scope.definitions.get(name);
		if (info === undefined) return false;
		if (JavascriptParser.isVariableInfo(info)) {
			return !info.isFree();
		}
		return true;
	}

	/**
	 * Whether evaluating an identifier of this name can only fall through:
	 * the exact negative of the identifier evaluator's `getInfo` — defined in
	 * some scope and neither free nor tagged nor carrying tag info.
	 * @param {string} name variable name
	 * @returns {boolean} true when the identifier evaluates to nothing
	 */
	_isDefinedPlainVariable(name) {
		const info = this.scope.definitions.get(name);
		if (info === undefined) return false;
		if (JavascriptParser.isVariableInfo(info)) {
			return !(info.isFree() || info.isTagged() || info.tagInfo !== undefined);
		}
		return true;
	}

	/**
	 * Gets variable info.
	 * @param {string} name variable name
	 * @returns {ExportedVariableInfo} info for this variable
	 */
	getVariableInfo(name) {
		const value = this.scope.definitions.get(name);
		if (value === undefined) {
			return name;
		}
		return value;
	}

	/**
	 * Updates variable using the provided name.
	 * @param {string} name variable name
	 * @param {ExportedVariableInfo} variableInfo new info for this variable
	 * @returns {void}
	 */
	setVariable(name, variableInfo) {
		this._memberExpression = undefined;
		if (typeof variableInfo === "string") {
			if (variableInfo === name) {
				this.scope.definitions.delete(name);
			} else {
				this.scope.definitions.set(
					name,
					new VariableInfo(
						this.scope,
						variableInfo,
						VariableInfoFlags.Free,
						undefined
					)
				);
			}
		} else {
			this.scope.definitions.set(name, variableInfo);
		}
	}

	/**
	 * Evaluated variable.
	 * @param {TagInfo} tagInfo tag info
	 * @returns {VariableInfo} variable info
	 */
	evaluatedVariable(tagInfo) {
		return new VariableInfo(
			this.scope,
			undefined,
			VariableInfoFlags.Evaluated,
			tagInfo
		);
	}

	/**
	 * Parses comment options.
	 * @param {Range} range range of the comment
	 * @returns {{ options: MagicCommentOptions | null, errors: (Error & { comment: Comment })[] | null }} result
	 */
	parseCommentOptions(range) {
		return parseCommentOptionsInRange(
			/** @type {(Comment & { range: [number, number], value: string })[]} */ (
				this.comments
			),
			range,
			this.magicCommentContext
		);
	}

	/**
	 * Finds the root object of a member expression chain without allocating the
	 * member arrays. The traversal/break logic must stay in sync with
	 * `extractMemberExpressionChain`; it lets `getMemberExpressionInfo` reject
	 * unrecognized roots (~77% of calls) before paying for the arrays.
	 * @param {Expression | Super} expression a member expression
	 * @returns {Expression | Super} the root object of the chain
	 */
	getMemberExpressionRoot(expression) {
		/** @type {Node} */
		let expr = expression;
		while (expr.type === "MemberExpression") {
			if (expr.computed) {
				const prop = expr.property;
				if (
					prop.type !== "Literal" &&
					!(
						prop.type === "TemplateLiteral" &&
						prop.expressions.length === 0 &&
						typeof prop.quasis[0].value.cooked === "string"
					)
				) {
					break;
				}
			} else if (expr.property.type !== "Identifier") {
				break;
			}
			expr = expr.object;
		}
		return /** @type {Expression | Super} */ (expr);
	}

	/**
	 * Extract member expression chain.
	 * @param {Expression | Super} expression a member expression
	 * @returns {{ members: Members, object: Expression | Super, membersOptionals: MembersOptionals, memberRanges: MemberRanges }} member names (reverse order) and remaining object
	 */
	extractMemberExpressionChain(expression) {
		/** @type {Node} */
		let expr = expression;
		/** @type {Members} */
		const members = [];
		/** @type {MembersOptionals} */
		const membersOptionals = [];
		/** @type {MemberRanges} */
		const memberRanges = [];
		while (expr.type === "MemberExpression") {
			if (expr.computed) {
				const prop = expr.property;
				if (prop.type === "Literal") {
					members.push(`${prop.value}`); // the literal
				} else if (
					prop.type === "TemplateLiteral" &&
					prop.expressions.length === 0 &&
					typeof prop.quasis[0].value.cooked === "string"
				) {
					// `[`url`]` is statically a string just like `["url"]`
					members.push(prop.quasis[0].value.cooked);
				} else {
					break;
				}
				memberRanges.push(/** @type {Range} */ (expr.object.range)); // the range of the expression fragment before the property
			} else {
				if (expr.property.type !== "Identifier") break;
				members.push(expr.property.name); // the identifier
				memberRanges.push(/** @type {Range} */ (expr.object.range)); // the range of the expression fragment before the identifier
			}
			membersOptionals.push(expr.optional);
			expr = expr.object;
		}

		return {
			members,
			membersOptionals,
			memberRanges,
			object: expr
		};
	}

	/**
	 * Gets free info from variable.
	 * @param {string} varName variable name
	 * @returns {{ name: string, info: VariableInfo | string } | undefined} name of the free variable and variable info for that
	 */
	getFreeInfoFromVariable(varName) {
		const info = this.getVariableInfo(varName);
		/** @type {string} */
		let name;
		if (JavascriptParser.isVariableInfo(info) && info.name) {
			if (!info.isFree()) return;
			name = info.name;
		} else if (typeof info !== "string") {
			return;
		} else {
			name = info;
		}
		return { info, name };
	}

	/**
	 * Gets name info from variable.
	 * @param {string} varName variable name
	 * @returns {{ name: string, info: VariableInfo | string } | undefined} name of the free variable and variable info for that
	 */
	getNameInfoFromVariable(varName) {
		const info = this.getVariableInfo(varName);
		/** @type {string} */
		let name;
		if (JavascriptParser.isVariableInfo(info) && info.name) {
			if (!info.isFree() && !info.isTagged()) return;
			name = info.name;
		} else if (typeof info !== "string") {
			return;
		} else {
			name = info;
		}
		return { info, name };
	}

	/** @typedef {{ type: "call", call: CallExpression, calleeName: string, rootInfo: string | VariableInfo, getCalleeMembers: () => CalleeMembers, name: string, getMembers: () => Members, getMembersOptionals: () => MembersOptionals, getMemberRanges: () => MemberRanges }} CallExpressionInfo */
	/** @typedef {{ type: "expression", rootInfo: string | VariableInfo, name: string, getMembers: () => Members, getMembersOptionals: () => MembersOptionals, getMemberRanges: () => MemberRanges }} ExpressionExpressionInfo */

	/**
	 * Resolves a member expression into the `_member*` slots, once per node and
	 * scope. Returns 0 when rejected, 1 for an `expression`, 2 for a `call`.
	 * @param {Expression | Super} expression a member expression
	 * @param {number} allowedTypes which types may be returned, presented in bit mask
	 * @returns {0 | 1 | 2} the kind resolved
	 */
	_resolveMemberExpression(expression, allowedTypes) {
		const tree = this._tree;
		if (tree !== undefined) {
			const id =
				typeof expression === "number"
					? expression
					: tree.nodeOf(/** @type {Node} */ (expression));
			if (id !== 0) return this._resolveMemberExpressionNode(id, allowedTypes);
		}
		if (
			expression === this._memberExpression &&
			this._memberScope === this.scope
		) {
			const type = this._memberType;
			if (type !== 0) {
				// the root kind is a fact of the node; the mask only says whether to report it
				const bit =
					type === 2
						? ALLOWED_MEMBER_TYPES_CALL_EXPRESSION
						: ALLOWED_MEMBER_TYPES_EXPRESSION;
				return (allowedTypes & bit) === 0 ? 0 : type;
			}
			if ((allowedTypes & ~this._memberMask) === 0) return 0;
		}
		this._memberExpression = expression;
		this._memberNode = 0;
		this._memberScope = this.scope;
		this._memberMask = allowedTypes;
		this._memberType = 0;
		this._memberInfo = undefined;
		// Resolve the root first (no allocation); most calls reject here and so
		// never build the member arrays
		const object = this.getMemberExpressionRoot(expression);
		switch (object.type) {
			case "CallExpression": {
				if ((allowedTypes & ALLOWED_MEMBER_TYPES_CALL_EXPRESSION) === 0) {
					return 0;
				}
				const calleeExpr = object.callee;
				const callee =
					calleeExpr.type === "MemberExpression"
						? this.getMemberExpressionRoot(calleeExpr)
						: calleeExpr;
				const rootName = getRootName(callee);
				if (!rootName) return this._rejectMemberExpression();
				const resolvedRoot = this._resolveMemberRoot(rootName);
				if (resolvedRoot === undefined) return this._rejectMemberExpression();
				/** @type {CalleeMembers} */
				let rootMembers = EMPTY_ARRAY;
				if (calleeExpr.type === "MemberExpression") {
					this._extractMembers(calleeExpr);
					rootMembers = this._members;
				}
				this._extractMembers(expression);
				const calleeName = objectAndMembersToName(resolvedRoot, rootMembers);
				this._memberType = 2;
				this._memberCall = object;
				this._memberCalleeName = calleeName;
				this._memberCalleeMembers = rootMembers;
				this._memberName = objectAndMembersToName(
					`${calleeName}()`,
					this._members
				);
				return 2;
			}
			case "Identifier":
			case "MetaProperty":
			case "ThisExpression": {
				if ((allowedTypes & ALLOWED_MEMBER_TYPES_EXPRESSION) === 0) return 0;
				const rootName = getRootName(object);
				if (!rootName) return this._rejectMemberExpression();
				const resolvedRoot = this._resolveMemberRoot(rootName);
				if (resolvedRoot === undefined) return this._rejectMemberExpression();
				this._extractMembers(expression);
				this._memberType = 1;
				this._memberName = objectAndMembersToName(resolvedRoot, this._members);
				return 1;
			}
		}
		return this._rejectMemberExpression();
	}

	/**
	 * Records that the node resolves to nothing under any mask.
	 * @returns {0} rejected
	 */
	_rejectMemberExpression() {
		this._memberMask = ALLOWED_MEMBER_TYPES_ALL;
		return 0;
	}

	/**
	 * `getNameInfoFromVariable` for the resolver: stores the info in
	 * `_memberRootInfo` and returns the name, or undefined when rejected.
	 * @param {string} rootName name of the root variable
	 * @returns {string | undefined} the resolved root name
	 */
	_resolveMemberRoot(rootName) {
		const info = this.getVariableInfo(rootName);
		if (JavascriptParser.isVariableInfo(info) && info.name) {
			if (!info.isFree() && !info.isTagged()) return;
			this._memberRootInfo = info;
			return info.name;
		}
		if (typeof info !== "string") return;
		this._memberRootInfo = info;
		return info;
	}

	/**
	 * Fills `_members` and `_membersOptionals` for the chain, in source order.
	 * @param {Expression | Super} expression a member expression
	 * @returns {void}
	 */
	_extractMembers(expression) {
		/** @type {Node} */
		let expr = expression;
		/** @type {Members} */
		const members = [];
		/** @type {MembersOptionals} */
		const membersOptionals = [];
		while (expr.type === "MemberExpression") {
			if (expr.computed) {
				const prop = expr.property;
				if (prop.type === "Literal") {
					members.push(`${prop.value}`);
				} else if (
					prop.type === "TemplateLiteral" &&
					prop.expressions.length === 0 &&
					typeof prop.quasis[0].value.cooked === "string"
				) {
					members.push(prop.quasis[0].value.cooked);
				} else {
					break;
				}
			} else {
				if (expr.property.type !== "Identifier") break;
				members.push(expr.property.name);
			}
			membersOptionals.push(expr.optional);
			expr = expr.object;
		}
		if (members.length > 1) {
			members.reverse();
			membersOptionals.reverse();
		}
		this._members = members;
		this._membersOptionals = membersOptionals;
	}

	/**
	 * Drops the resolved member expression, so no AST outlives its parse.
	 * @returns {void}
	 */
	_releaseMemberExpression() {
		this._memberExpression = undefined;
		this._memberNode = 0;
		this._memberScope = undefined;
		this._memberType = 0;
		this._memberRootInfo = undefined;
		this._members = EMPTY_ARRAY;
		this._membersOptionals = EMPTY_MEMBERS_OPTIONALS;
		this._memberCall = undefined;
		this._memberCalleeMembers = EMPTY_ARRAY;
		this._memberInfo = undefined;
	}

	/**
	 * Gets member expression info.
	 * @param {Expression | Super} expression a member expression
	 * @param {number} allowedTypes which types should be returned, presented in bit mask
	 * @returns {CallExpressionInfo | ExpressionExpressionInfo | undefined} expression info
	 */
	getMemberExpressionInfo(expression, allowedTypes) {
		const type = this._resolveMemberExpression(expression, allowedTypes);
		if (type === 0) return;
		const cached = this._memberInfo;
		if (cached !== undefined) return cached;
		const members = this._members;
		const membersOptionals = this._membersOptionals;
		/** @type {MemberRanges | undefined} */
		let memberRanges;
		const getMembers = () => members;
		const getMembersOptionals = () => membersOptionals;
		const tree = this._tree;
		const getMemberRanges = () =>
			memberRanges ||
			(memberRanges =
				typeof expression === "number"
					? memberRangesOfNode(
							/** @type {SyntaxTree} */ (tree),
							expression,
							members.length
						)
					: memberRangesOf(expression, members.length));
		const rootInfo = /** @type {string | VariableInfo} */ (
			this._memberRootInfo
		);
		/** @type {CallExpressionInfo | ExpressionExpressionInfo} */
		let info;
		if (type === 2) {
			const calleeMembers = this._memberCalleeMembers;
			const call = this._memberCall;
			info = {
				type: "call",
				call: /** @type {CallExpression} */ (
					typeof call === "number"
						? /** @type {SyntaxTree} */ (tree).estree(call)
						: call
				),
				calleeName: this._memberCalleeName,
				rootInfo,
				getCalleeMembers: () => calleeMembers,
				name: this._memberName,
				getMembers,
				getMembersOptionals,
				getMemberRanges
			};
		} else {
			info = {
				type: "expression",
				name: this._memberName,
				rootInfo,
				getMembers,
				getMembersOptionals,
				getMemberRanges
			};
		}
		this._memberInfo = info;
		return info;
	}

	/**
	 * Gets name for expression.
	 * @param {Expression} expression an expression
	 * @returns {{ name: string, rootInfo: ExportedVariableInfo, getMembers: () => Members } | undefined} name info
	 */
	getNameForExpression(expression) {
		return this.getMemberExpressionInfo(
			expression,
			ALLOWED_MEMBER_TYPES_EXPRESSION
		);
	}

	/**
	 * Whether a definition is a variable rather than a free name or a scope.
	 * @param {ExportedVariableInfo | undefined} value a scope definition
	 * @returns {value is VariableInfo} true when the value is a variable
	 */
	static isVariableInfo(value) {
		return value instanceof VariableInfo;
	}

	/**
	 * Get module parse function.
	 * @param {Compilation} compilation compilation
	 * @param {Module} module module
	 * @returns {ParseFunction | undefined} parser
	 */
	static _getModuleParseFunction(compilation, module) {
		// Get from module if available
		if (module.is("normal") && module.parser instanceof JavascriptParser) {
			return module.parser.options.parse;
		}

		// Fallback to the global javascript parse function
		if (typeof compilation.options.module.parser.javascript !== "undefined") {
			return compilation.options.module.parser.javascript.parse;
		}
	}

	/**
	 * Parses into the syntax tree, the program as its node.
	 * @param {string} code source code
	 * @param {"module" | "script" | "auto"} type what to read it as
	 * @param {boolean} importPhases whether `import defer` and `import source` parse
	 * @returns {{ program: number, comments: Comment[], tree: SyntaxTree }} the program's node, its comments and the tree, which the caller releases
	 */
	static _parseTree(code, type, importPhases) {
		return parseInGoal(type, (sourceType) => {
			/** @type {CollectedComment[]} */
			const comments = [];
			const program = parseProgram(code, 0, {
				sourceType,
				allowReturnOutsideFunction: sourceType === "script",
				comments,
				importPhases
			});
			const tree = /** @type {SyntaxTree} */ (takeParsedTree());
			// no node's object yet, but `estree` serves lazy ones from now on
			tree.lazyEstree(0);
			return {
				program,
				comments: /** @type {Comment[]} */ (comments),
				tree
			};
		});
	}

	/**
	 * Returns parse result.
	 * @param {string} code source code
	 * @param {InternalParseOptions} options parsing options
	 * @param {ParseFunction=} customParse custom function to parse
	 * @returns {ParseResult} parse result
	 */
	static _parse(code, options, customParse) {
		const type = options ? options.sourceType : "module";
		if (typeof customParse !== "function") {
			/**
			 * @param {"module" | "script" | "auto"} sourceType what to read it as
			 * @returns {ParseResult} the program and its comments
			 */
			const parseAs = (sourceType) => {
				/** @type {CollectedComment[]} */
				const comments = [];
				const ast = parseProgram(code, 0, {
					sourceType,
					allowReturnOutsideFunction: sourceType === "script",
					comments: options.comments ? comments : undefined,
					importPhases: options.importPhases === true,
					estree: true
				});
				return { ast, comments: /** @type {Comment[]} */ (comments) };
			};
			return parseInGoal(type, parseAs);
		}
		// a user parse function may retain the options object, so each call has
		// its own, and `auto` is read as a module and then as a script
		/** @type {ParseOptions} */
		const parserOptions = {
			...defaultParserOptions,
			allowReturnOutsideFunction: type === "script",
			...options,
			sourceType: type === "auto" ? "module" : type
		};
		/** @type {ParseResult} */
		let result;
		try {
			result = customParse(code, parserOptions);
		} catch (error) {
			if (type !== "auto") throw error;
			parserOptions.sourceType = "script";
			parserOptions.allowReturnOutsideFunction = true;
			try {
				result = customParse(code, parserOptions);
			} catch (_err) {
				// the module parse's error is the one reported
				throw error;
			}
		}
		return result;
	}
}

JavascriptParser.ALLOWED_MEMBER_TYPES_ALL = ALLOWED_MEMBER_TYPES_ALL;
JavascriptParser.ALLOWED_MEMBER_TYPES_CALL_EXPRESSION =
	ALLOWED_MEMBER_TYPES_CALL_EXPRESSION;
JavascriptParser.ALLOWED_MEMBER_TYPES_EXPRESSION =
	ALLOWED_MEMBER_TYPES_EXPRESSION;
JavascriptParser.VariableInfo = VariableInfo;
JavascriptParser.VariableInfoFlags = VariableInfoFlags;
JavascriptParser.getImportAttributes = getImportAttributes;

module.exports = JavascriptParser;
