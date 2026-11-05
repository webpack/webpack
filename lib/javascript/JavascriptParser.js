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
	A,
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
	SyntaxTree,
	WebpackParser,
	buildLineStarts,
	declaresIntoBlock,
	hasOctalEscape,
	isIdentifierChar,
	lazyNodeOf,
	overflowFrom,
	parseProgram,
	positionAt,
	takeParsedTree,
	toEstreeObject,
	usePathTree
} = require("./syntax-parser");

/** @import { BuiltJavascriptModule } from "./JavascriptModule" */
/** @import { CollectedComment, EcmaVersion, EstreeSource, JavascriptNodeReader, JavascriptPath, ParserOptions, ParserPlugin } from "./syntax-parser" */

/**
 * A `program` tap reading the program through the path, as CSS and HTML
 * visitors read theirs: `path.type(program)`, `path.field(i, Field.body, program)`.
 * @typedef {object} ProgramPathTap
 * @property {(options: { name: string, path: true, stage?: number, before?: string }, fn: (path: JavascriptPath, program: number, comments: Comment[]) => boolean | void) => void} tap registers it
 * @property {(program: number, comments: Comment[]) => boolean | void} call fires every tap, one with `path` with the path first, any other with the program's ESTree object
 */
/**
 * A `statement` tap reading the statement through the path; it fires only
 * while the program is walked by id (the internal `_walkPath` switch).
 * @typedef {object} StatementPathTap
 * @property {(options: { name: string, path: true, stage?: number, before?: string }, fn: (path: JavascriptNodeReader, statement: number) => boolean | void) => void} tap registers it
 * @property {(statement: number) => boolean | void} call fires every tap, one with `path` with the path first, any other with the statement's ESTree object
 */
/**
 * A hook taking taps that read its nodes through the path: the id walk calls
 * it with node ids, a `{ path: true }` tap gets the path before them and any
 * other tap the nodes' ESTree objects.
 * @template {HookArgument[]} T the arguments, nodes as ids
 * @template R the result
 * @typedef {object} PathTaps
 * @property {(options: { name: string, path: true, stage?: number, before?: string }, fn: (path: JavascriptNodeReader, ...args: T) => R) => void} tap registers a tap reading the path
 * @property {(...args: T) => R} call fires every tap with node ids
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
/** @typedef {Statement | ModuleDeclaration | Expression | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration} PrevStatement */
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
 * @param {Node} node a node `isPure` reads
 * @param {number} type its `NodeType`
 * @returns {boolean} whether the evaluator judges it: an operator that may convert its operands, or a form the rules don't
 */
const isLeftToEvaluator = (node, type) => {
	switch (type) {
		case NodeType.UnaryExpression: {
			const { operator } = /** @type {UnaryExpression} */ (node);
			return operator !== "typeof" && operator !== "void" && operator !== "!";
		}
		case NodeType.BinaryExpression: {
			const { operator } = /** @type {BinaryExpression} */ (node);
			return operator !== "===" && operator !== "!==";
		}
		default:
			return !isRuledPurityType(type);
	}
};

/**
 * @param {number} type a `NodeType`
 * @returns {boolean} whether the purity rules judge a node of it
 */
const isRuledPurityType = (type) => {
	if (ruledPurityNodeTypes === undefined) {
		ruledPurityNodeTypes = new Uint8Array(256);
		for (const name of RULED_PURITY_TYPES) {
			ruledPurityNodeTypes[NodeType[name]] = 1;
		}
	}
	return ruledPurityNodeTypes[type] === 1;
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

/**
 * `isLeftToEvaluator` for a node read by id.
 * @param {JavascriptNodeReader} reader what the node is read through
 * @param {number} node a node `isPure` reads
 * @param {number} type its `NodeType`
 * @returns {boolean} whether the evaluator judges it
 */
const isLeftToEvaluatorPath = (reader, node, type) => {
	switch (type) {
		case NodeType.UnaryExpression: {
			const operator = reader.textOf(Part.operator, node);
			return operator !== "typeof" && operator !== "void" && operator !== "!";
		}
		case NodeType.BinaryExpression: {
			const operator = reader.textOf(Part.operator, node);
			return operator !== "===" && operator !== "!==";
		}
		default:
			return !isRuledPurityType(type);
	}
};

/**
 * `isDerivedWithConstructor` for a node read by id.
 * @param {JavascriptNodeReader} reader what the node is read through
 * @param {number} node a node `isPure` reads
 * @param {number} type its `NodeType`
 * @returns {boolean} whether it is a class with a superclass and its own constructor
 */
const isDerivedWithConstructorPath = (reader, node, type) => {
	if (
		(type !== NodeType.ClassDeclaration && type !== NodeType.ClassExpression) ||
		reader.field(0, Field.superClass, node) === 0
	) {
		return false;
	}
	const body = reader.field(0, Field.body, node);
	for (
		let index = 0, count = reader.fieldCount(Field.body, body);
		index < count;
		index++
	) {
		const member = reader.field(index, Field.body, body);
		if (
			reader.type(member) === NodeType.MethodDefinition &&
			reader.textOf(Part.kind, member) === "constructor"
		) {
			return true;
		}
	}
	return false;
};

// Syntax: https://developer.mozilla.org/en/SpiderMonkey/Parser_API
let parser = WebpackParser;

/** @typedef {Record<string, string> & { _isLegacyAssert?: boolean }} ImportAttributes */

// Conceptually pairs with ./syntax's LEGACY_ASSERT_ATTRIBUTES marker, but is
// pinned here by its public `JavascriptParser.getImportAttributes` typing.
/**
 * Gets import attributes.
 * @param {ImportDeclaration | ExportNamedDeclaration | ExportAllDeclaration | ImportExpression} node node with assertions
 * @returns {ImportAttributes | undefined} import attributes
 */
const getImportAttributes = (node) => {
	if (node.type === "ImportExpression") {
		if (
			node.options &&
			node.options.type === "ObjectExpression" &&
			node.options.properties[0] &&
			node.options.properties[0].type === "Property" &&
			node.options.properties[0].key.type === "Identifier" &&
			(node.options.properties[0].key.name === "with" ||
				node.options.properties[0].key.name === "assert") &&
			node.options.properties[0].value.type === "ObjectExpression" &&
			node.options.properties[0].value.properties.length > 0
		) {
			const properties =
				/** @type {Property[]} */
				(node.options.properties[0].value.properties);
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
			const key =
				node.options.properties[0].key.type === "Identifier"
					? node.options.properties[0].key.name
					: /** @type {Literal} */ (node.options.properties[0].key).value;

			if (key === "assert") {
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
 * @property {boolean=} lazyNodes internal: serve `range` lazily and skip the parser's location/range tracking
 * @property {Comment[]=} lazyComments internal: collect comments here without slicing their text eagerly
 * @property {boolean=} importPhases enable parsing of the import phase proposals (import defer / import source)
 * @property {boolean=} moduleFallback internal: for `auto`, let the parser downgrade module->script in place instead of re-parsing
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
 * `memberRangesOf` for a member expression read through the path.
 * @param {JavascriptNodeReader} reader what the chain is read through
 * @param {number} node a member expression
 * @param {number} count how many members the chain has
 * @returns {MemberRanges} the ranges
 */
const memberRangesOfNode = (reader, node, count) => {
	/** @type {MemberRanges} */
	const ranges = [];
	for (let i = 0; i < count; i++) {
		node = reader.field(0, Field.object, node);
		ranges.push([reader.start(node), reader.end(node)]);
	}
	if (count > 1) ranges.reverse();
	return ranges;
};

/**
 * `getRootName` of a meta property read through the path: `new.target`,
 * `import.meta`.
 * @param {JavascriptNodeReader} path what the node is read through
 * @param {number} node the meta property
 * @returns {string} its name
 */
const metaPropertyName = (path, node) =>
	`${path.name(path.field(0, Field.meta, node))}.${path.name(
		path.field(0, Field.property, node)
	)}`;

/**
 * The range of a node read through the path.
 * @param {JavascriptNodeReader} path what the node is read through
 * @param {number} node the node
 * @returns {Range} its range
 */
const rangeOfNode = (path, node) => [path.start(node), path.end(node)];

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
 * @param {Range} range the range the value is at
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
 * @param {JavascriptNodeReader} path what the expression is read through
 * @param {number} node the binary expression
 * @param {(leftOperand: T, rightOperand: T) => boolean | number | bigint | string} operandHandler the handler for the operation (e.g. (a, b) => a + b)
 * @returns {BasicEvaluatedExpression | undefined} the evaluated expression
 */
const handleConstOperation = (parser, path, node, operandHandler) => {
	const left = parser.evaluateExpression(path.field(0, Field.left, node));
	if (!left.isCompileTimeValue()) return;

	const right = parser.evaluateExpression(path.field(0, Field.right, node));
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
		rangeOfNode(path, node),
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
 * @param {JavascriptNodeReader} path what the expression is read through
 * @param {number} node the binary expression
 * @param {boolean} eql true for "===" and false for "!=="
 * @returns {BasicEvaluatedExpression | undefined} the evaluated expression
 */
const handleStrictEqualityComparison = (parser, path, node, eql) => {
	const left = parser.evaluateExpression(path.field(0, Field.left, node));
	const right = parser.evaluateExpression(path.field(0, Field.right, node));

	const leftConst = left.isCompileTimeValue();
	const rightConst = right.isCompileTimeValue();

	if (leftConst && rightConst) {
		return new BasicEvaluatedExpression()
			.setRange(rangeOfNode(path, node))
			.setBoolean(
				eql === (left.asCompileTimeValue() === right.asCompileTimeValue())
			)
			.setSideEffects(
				left.couldHaveSideEffects() || right.couldHaveSideEffects()
			);
	}

	if (left.isArray() && right.isArray()) {
		return new BasicEvaluatedExpression()
			.setRange(rangeOfNode(path, node))
			.setBoolean(!eql)
			.setSideEffects(
				left.couldHaveSideEffects() || right.couldHaveSideEffects()
			);
	}
	if (left.isTemplateString() && right.isTemplateString()) {
		return handleTemplateStringCompare(
			left,
			right,
			rangeOfNode(path, node),
			eql
		);
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
			.setRange(rangeOfNode(path, node))
			.setBoolean(!eql)
			.setSideEffects(
				left.couldHaveSideEffects() || right.couldHaveSideEffects()
			);
	}
};

/**
 * Helper function to handle BinaryExpressions using abstract equality comparisons (e.g. "==" and "!=").
 * @param {JavascriptParser} parser the parser evaluating the expression
 * @param {JavascriptNodeReader} path what the expression is read through
 * @param {number} node the binary expression
 * @param {boolean} eql true for "==" and false for "!="
 * @returns {BasicEvaluatedExpression | undefined} the evaluated expression
 */
const handleAbstractEqualityComparison = (parser, path, node, eql) => {
	const left = parser.evaluateExpression(path.field(0, Field.left, node));
	const right = parser.evaluateExpression(path.field(0, Field.right, node));

	const leftConst = left.isCompileTimeValue();
	const rightConst = right.isCompileTimeValue();

	if (leftConst && rightConst) {
		return new BasicEvaluatedExpression()
			.setRange(rangeOfNode(path, node))
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
			.setRange(rangeOfNode(path, node))
			.setBoolean(!eql)
			.setSideEffects(
				left.couldHaveSideEffects() || right.couldHaveSideEffects()
			);
	}
	if (left.isTemplateString() && right.isTemplateString()) {
		return handleTemplateStringCompare(
			left,
			right,
			rangeOfNode(path, node),
			eql
		);
	}
};

/**
 * Evaluates a UnaryExpression if and only if it is a basic const operator (e.g. +a, -a, ~a).
 * @template T
 * @param {JavascriptParser} parser the parser evaluating the expression
 * @param {JavascriptNodeReader} path what the expression is read through
 * @param {number} node the unary expression
 * @param {(operand: T) => boolean | number | bigint | string} operandHandler handler for the operand
 * @returns {BasicEvaluatedExpression | undefined} evaluated expression
 */
const handleUnaryConstOperation = (parser, path, node, operandHandler) => {
	const argument = parser.evaluateExpression(
		path.field(0, Field.argument, node)
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
		rangeOfNode(path, node),
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

// reused by _parse for every non-custom parse — all fields are reset per parse
/** @type {ParseOptions} */
const REUSED_PARSER_OPTIONS = { ...defaultParserOptions };

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

/** @type {string[] | undefined} */
let nodeTypeNames;

/**
 * The ESTree `type` of a `NodeType`, as the `evaluate` hooks are keyed.
 * @param {number} type a `NodeType`
 * @returns {string} its name
 */
const nodeTypeName = (type) => {
	if (nodeTypeNames === undefined) {
		nodeTypeNames = [];
		for (const name of Object.keys(NodeType)) {
			nodeTypeNames[/** @type {Record<string, number>} */ (NodeType)[name]] =
				name;
		}
	}
	return nodeTypeNames[type];
};

/**
 * `declaresIntoBlock` for a statement read by id.
 * @param {number} id the statement
 * @returns {boolean} whether it declares into the block scope holding it
 */
const declaresIntoBlockPath = (id) => {
	switch (A.type(id)) {
		case NodeType.VariableDeclaration:
		case NodeType.FunctionDeclaration:
		case NodeType.ClassDeclaration:
		case NodeType.ExportNamedDeclaration:
		case NodeType.ExportDefaultDeclaration:
			return true;
		case NodeType.ExpressionStatement: {
			const expression = A.field(0, Field.expression, id);
			return (
				A.type(expression) === NodeType.AssignmentExpression &&
				A.type(A.field(0, Field.left, expression)) === NodeType.ObjectPattern
			);
		}
	}
	return false;
};

/**
 * `collectBlockDeclarations` for a list read by id.
 * @param {number} owner the node holding the list
 * @param {number} field the `Field` holding the list
 * @returns {BlockDeclarations} the indices of the statements that declare
 */
const collectBlockDeclarationsPath = (owner, field) => {
	let mask = 0;
	/** @type {number[] | undefined} */
	let overflow;
	const count = A.fieldCount(field, owner);
	for (let index = 0; index < count; index++) {
		if (!declaresIntoBlockPath(A.field(index, field, owner))) continue;
		if (overflow !== undefined) overflow.push(index);
		else if (index <= MAX_MASKED_INDEX) mask |= 1 << index;
		else overflow = overflowFrom(mask, index);
	}
	return overflow === undefined ? mask : overflow;
};

/**
 * `collectHoistedDeclarations` for a list read by id.
 * @param {number} owner the node holding the list
 * @param {number} field the `Field` holding the list
 * @param {HoistedDeclarations} hoisted the list so far
 * @returns {HoistedDeclarations} the list holding what they declare
 */
const collectHoistedDeclarationsPath = (owner, field, hoisted) => {
	const count = A.fieldCount(field, owner);
	for (let index = 0; index < count; index++) {
		hoisted = collectHoistedDeclarationPath(
			A.field(index, field, owner),
			hoisted
		);
	}
	return hoisted;
};

/**
 * `collectHoistedDeclaration` for a statement read by id: only a declaration
 * it finds gets its ESTree object.
 * @param {number} id the statement, or `0` for none
 * @param {HoistedDeclarations} hoisted the list so far
 * @returns {HoistedDeclarations} the list holding what it declares
 */
const collectHoistedDeclarationPath = (id, hoisted) => {
	switch (A.type(id)) {
		case NodeType.VariableDeclaration:
			if (A.textOf(Part.kind, id) === "var") {
				hoisted = addHoistedDeclaration(
					hoisted,
					/** @type {Statement} */ (toEstreeObject(id))
				);
			}
			break;
		case NodeType.FunctionDeclaration:
		case NodeType.ClassDeclaration:
			hoisted = addHoistedDeclaration(
				hoisted,
				/** @type {Statement} */ (toEstreeObject(id))
			);
			break;
		case NodeType.BlockStatement:
			hoisted = collectHoistedDeclarationsPath(id, Field.body, hoisted);
			break;
		case NodeType.IfStatement:
			hoisted = collectHoistedDeclarationPath(
				A.field(0, Field.consequent, id),
				hoisted
			);
			hoisted = collectHoistedDeclarationPath(
				A.field(0, Field.alternate, id),
				hoisted
			);
			break;
		case NodeType.ForStatement: {
			const init = A.field(0, Field.init, id);
			if (A.type(init) === NodeType.VariableDeclaration) {
				hoisted = collectHoistedDeclarationPath(init, hoisted);
			}
			hoisted = collectHoistedDeclarationPath(
				A.field(0, Field.body, id),
				hoisted
			);
			break;
		}
		case NodeType.ForInStatement:
		case NodeType.ForOfStatement: {
			const left = A.field(0, Field.left, id);
			if (A.type(left) === NodeType.VariableDeclaration) {
				hoisted = collectHoistedDeclarationPath(left, hoisted);
			}
			hoisted = collectHoistedDeclarationPath(
				A.field(0, Field.body, id),
				hoisted
			);
			break;
		}
		case NodeType.WhileStatement:
		case NodeType.DoWhileStatement:
		case NodeType.LabeledStatement:
		case NodeType.WithStatement:
			hoisted = collectHoistedDeclarationPath(
				A.field(0, Field.body, id),
				hoisted
			);
			break;
		case NodeType.TryStatement: {
			hoisted = collectHoistedDeclarationPath(
				A.field(0, Field.block, id),
				hoisted
			);
			const handler = A.field(0, Field.handler, id);
			if (handler !== 0) {
				hoisted = collectHoistedDeclarationPath(
					A.field(0, Field.body, handler),
					hoisted
				);
			}
			hoisted = collectHoistedDeclarationPath(
				A.field(0, Field.finalizer, id),
				hoisted
			);
			break;
		}
		case NodeType.SwitchStatement: {
			const count = A.fieldCount(Field.cases, id);
			for (let index = 0; index < count; index++) {
				hoisted = collectHoistedDeclarationsPath(
					A.field(index, Field.cases, id),
					Field.consequent,
					hoisted
				);
			}
			break;
		}
	}
	return hoisted;
};

/** @typedef {Node | MaybeNamedClassDeclaration | MaybeNamedFunctionDeclaration | number | string | boolean | null | undefined | void | string[] | boolean[] | Range[] | Comment[] | BasicEvaluatedExpression | GuardCollection} HookArgument */
/** @typedef {(...args: HookArgument[]) => HookArgument} HookFunction */

/**
 * What `{ path: true }` taps and the parser's id-reading methods read nodes
 * through: the path `A`, or `objectView` while a hook passes ESTree objects.
 * @type {JavascriptNodeReader}
 */
let pathReader = A;

/**
 * The view ESTree objects passed to a hook are read through, emptied after
 * each parse.
 * @type {EstreeView | undefined}
 */
let objectView;

/**
 * The ESTree object of a node the current reader holds.
 * @param {number} node the node
 * @returns {Node} its object
 */
const objectOfNode = (node) =>
	pathReader === A
		? /** @type {Node} */ (toEstreeObject(node))
		: /** @type {EstreeView} */ (objectView).object(node);

/**
 * The node argument a hook passes: its ESTree object, made from an id the id
 * walk passed.
 * @param {HookArgument} value the argument
 * @returns {HookArgument} the argument, as an object when it was an id
 */
const asEstreeArgument = (value) =>
	typeof value === "number" ? objectOfNode(value) : value;

/**
 * A node argument for a `{ path: true }` tap called with ESTree objects: its
 * id in `objectView`, `0` for none.
 * @param {EstreeView} view the view
 * @param {HookArgument} value the argument
 * @returns {HookArgument} its id
 */
const asViewNode = (view, value) =>
	typeof value === "object" && value !== null
		? view.add(/** @type {Node} */ (value))
		: value === null || value === undefined
			? 0
			: value;

/** @type {Map<number, import("tapable").HookInterceptor<HookArgument[], HookArgument>>} */
const pathInterceptors = new Map();

/**
 * The interceptor letting a hook take `{ path: true }` taps once the id walk
 * fires it with ids: such a tap gets the path before them, any other tap the
 * nodes' ESTree objects; a call from the ESTree walk skips the path taps.
 * @param {number} nodes a bit for each argument that is a node
 * @returns {import("tapable").HookInterceptor<HookArgument[], HookArgument>} the interceptor
 */
const pathInterceptorFor = (nodes) => {
	let interceptor = pathInterceptors.get(nodes);
	if (interceptor !== undefined) return interceptor;
	interceptor = {
		register: (tap) => {
			if (/** @type {{ path?: boolean }} */ (tap).path === true) {
				const fn =
					/** @type {(path: JavascriptNodeReader, ...args: HookArgument[]) => HookArgument} */ (
						tap.fn
					);
				return {
					...tap,
					fn: (
						/** @type {HookArgument} */ a,
						/** @type {HookArgument} */ b,
						/** @type {HookArgument} */ c,
						/** @type {HookArgument} */ d,
						/** @type {HookArgument} */ e
					) => {
						if (typeof a === "number") return fn(pathReader, a, b, c, d, e);
						// the ESTree walk passes objects: the tap reads them as nodes of a view
						if (objectView === undefined) objectView = new EstreeView();
						const view = objectView;
						const outer = pathReader;
						pathReader = view;
						try {
							return fn(
								view,
								asViewNode(view, a),
								(nodes & 2) !== 0 ? asViewNode(view, b) : b,
								(nodes & 4) !== 0 ? asViewNode(view, c) : c,
								d,
								e
							);
						} finally {
							pathReader = outer;
						}
					}
				};
			}
			const fn = /** @type {HookFunction} */ (tap.fn);
			return {
				...tap,
				fn: (
					/** @type {HookArgument} */ a,
					/** @type {HookArgument} */ b,
					/** @type {HookArgument} */ c,
					/** @type {HookArgument} */ d,
					/** @type {HookArgument} */ e
				) =>
					fn(
						(nodes & 1) !== 0 ? asEstreeArgument(a) : a,
						(nodes & 2) !== 0 ? asEstreeArgument(b) : b,
						(nodes & 4) !== 0 ? asEstreeArgument(c) : c,
						d,
						e
					)
			};
		}
	};
	pathInterceptors.set(nodes, interceptor);
	return interceptor;
};

/**
 * Whether a hook's interceptors are at most the parser's own path interceptor.
 * @template T
 * @template R
 * @param {import("tapable").Hook<T, R>} hook the hook
 * @returns {boolean} true when nothing else intercepts it
 */
const ownInterceptorsOnly = (hook) => {
	const interceptors = hook.interceptors;
	if (interceptors.length === 0) return true;
	if (interceptors.length !== 1) return false;
	// a hook keeps a copy of each interceptor, sharing its `register`
	const register = interceptors[0].register;
	for (const own of pathInterceptors.values()) {
		if (own.register === register) return true;
	}
	return false;
};

/** @typedef {import("tapable").HookInterceptor<HookArgument[], HookArgument>} PathInterceptor */
/** @typedef {import("tapable").HookInterceptor<HookArgument[], HookArgument, { path?: boolean }>} PathOptionInterceptor */
/** @typedef {{ intercept(interceptor: PathInterceptor): void } | { intercept(interceptor: PathOptionInterceptor): void }} PathHook */

/**
 * Lets a hook take `{ path: true }` taps.
 * @param {PathHook} hook the hook
 * @param {number} nodes a bit for each argument that is a node
 * @returns {void}
 */
const wrapPathTaps = (hook, nodes) => {
	hook.intercept(
		/** @type {PathInterceptor & PathOptionInterceptor} */
		(pathInterceptorFor(nodes))
	);
};

/**
 * Lets every hook of a hook map, made already or later, take `{ path: true }`
 * taps.
 * @template {PathHook} H
 * @param {HookMap<H>} hookMap the hook map
 * @param {number} nodes a bit for each argument that is a node
 * @returns {void}
 */
const wrapPathTapsOfMap = (hookMap, nodes) => {
	const interceptor =
		/** @type {PathInterceptor & PathOptionInterceptor} */
		(pathInterceptorFor(nodes));
	const made = /** @type {HookMap<H> & { _map: Map<string, H> }} */ (hookMap)
		._map;
	for (const hook of made.values()) hook.intercept(interceptor);
	hookMap.intercept({
		factory: (key, hook) => {
			hook.intercept(interceptor);
			return hook;
		}
	});
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
 * What hoists to the scope the node opens: the parser's own record, or a walk
 * of the body for an AST some other parser built.
 * @param {Program | BlockStatement} node the node owning the scope
 * @param {boolean} trusted whether the parser's own record may be read
 * @returns {HoistedDeclarations} the declarations, in source order
 */
const hoistedDeclarationsOf = (node, trusted) => {
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
 * `holdsStatement` for a list read by id: two statements of one list never
 * share their offsets, so the statement is found by them.
 * @param {number} owner the node holding the list in its `body`
 * @param {Statement | ModuleDeclaration | MaybeNamedFunctionDeclaration} statement the statement to find
 * @returns {boolean} whether the list holds it directly
 */
const holdsStatementPath = (owner, statement) => {
	const [start, end] = /** @type {Range} */ (statement.range);
	let low = 0;
	let high = A.fieldCount(Field.body, owner) - 1;
	while (low <= high) {
		const middle = (low + high) >>> 1;
		const candidate = A.field(middle, Field.body, owner);
		const candidateStart = A.start(candidate);
		if (candidateStart === start && A.end(candidate) === end) return true;
		if (candidateStart < start) low = middle + 1;
		else high = middle - 1;
	}
	// the last statement starting before it is the one that could hold it
	const holder = high >= 0 ? A.field(high, Field.body, owner) : 0;
	const type = A.type(holder);
	if (
		type !== NodeType.ExportNamedDeclaration &&
		type !== NodeType.ExportDefaultDeclaration
	) {
		return false;
	}
	const declaration = A.field(0, Field.declaration, holder);
	return A.start(declaration) === start && A.end(declaration) === end;
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
				/** @type {StatementPathTap & SyncBailHook<[Statement | ModuleDeclaration | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration], boolean | void, { path?: boolean }>} */ (
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
				/** @type {ProgramPathTap & SyncBailHook<[Program, Comment[]], boolean | void, { path?: boolean }>} */ (
					new SyncBailHook(["ast", "comments"])
				),
			/**
			 * @since 5.99.0
			 */
			terminate:
				/** @type {PathTaps<[number], boolean | void> & SyncBailHook<[ThrowStatement | ReturnStatement], boolean | void>} */ (
					new SyncBailHook(["statement"])
				),
			/** @type {SyncBailHook<[Program, Comment[]], boolean | void>} */
			finish: new SyncBailHook(["ast", "comments"]),
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
		// the id walk keeps a statement's node id here, made an object when read
		/** @type {(StatementPathItem | number)[] | undefined} */
		this._statementPath = undefined;
		/** @type {PrevStatement | number | undefined} */
		this._prevStatement = undefined;
		/** @type {boolean} */
		this._hasParserRecord = false;
		// The program's ESTree object, which a `program` tap without `path` gets.
		/** @type {Program | undefined} */
		this._programAst = undefined;
		// How many `program` taps read the path, for which a parse writes the tree.
		this._programPathTaps = 0;
		// WHY: internal and off by default while the walk moves to node ids: it
		// parses into the tree and walks the program by id, falling back to the
		// ESTree walk for each node the id walk does not read yet.
		/** @type {boolean} */
		this._walkPath = false;
		// Whether the hooks the id walk fires by id wrap their taps yet: done on
		// the first parse with the switch on, so no other build pays for it.
		/** @type {boolean} */
		this._pathTapsWrapped = false;
		this.hooks.program.intercept({
			register: (tap) => {
				if (/** @type {{ path?: boolean }} */ (tap).path === true) {
					this._programPathTaps++;
					const fn =
						/** @type {(path: JavascriptPath, program: number, comments: Comment[]) => boolean | void} */ (
							tap.fn
						);
					return {
						...tap,
						fn: (
							/** @type {number} */ program,
							/** @type {Comment[]} */ comments
						) => fn(A, program, comments)
					};
				}
				const fn =
					/** @type {(ast: Program, comments: Comment[]) => boolean | void} */ (
						tap.fn
					);
				return {
					...tap,
					fn: (
						/** @type {number} */ program,
						/** @type {Comment[]} */ comments
					) => fn(/** @type {Program} */ (this._programAst), comments)
				};
			}
		});
		// the statements of the scope last hoisted into, which its block pass reads
		// next: the list, or in the id walk the node holding it in its `body`
		/** @type {(Statement | ModuleDeclaration)[] | number | undefined} */
		this._scopeStatements = undefined;
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
		this._pureViewBusy = false;
		// Where the innermost `isPure` query's annotation comments may start.
		this._pureCommentsStartPos = 0;
		/** @type {SideEffectsContext | undefined} */
		this._purePathContext = undefined;
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
		/** @type {CallExpression | undefined} */
		this._memberCall = undefined;
		/** @type {string} */
		this._memberCalleeName = "";
		/** @type {CalleeMembers} */
		this._memberCalleeMembers = EMPTY_ARRAY;
		/** @type {CallExpressionInfo | ExpressionExpressionInfo | undefined} */
		this._memberInfo = undefined;
		// True while only the parser's own taps sit on evaluate.for("Identifier");
		// recomputed per parse, gates the defined-identifier fast paths.
		this._evalIdentOwnTaps = false;
		// the same for `evaluate.for("MemberExpression")`, which the id walk reads
		this._evalMemberOwnTaps = false;
		// and for `evaluate.for("CallExpression")`
		this._evalCallOwnTaps = false;
		this.magicCommentContext = createMagicCommentContext();
		// Reused for enterPatterns on every scope entry to avoid per-scope closures.
		/** @type {OnIdentString} */
		this._defineVariable = (ident) => this.defineVariable(ident);
		// The expression an identifier evaluator is running for, read by the
		// shared `_evaluateDefinedIdentifier` instead of a closure per evaluation
		/** @type {number | undefined} */
		this._evaluatingExpression = undefined;
		/** @type {(name?: string) => BasicEvaluatedExpression | null | undefined} */
		this._evaluateDefinedIdentifier = (name) => {
			const hook = this.hooks.evaluateDefinedIdentifier.get(
				/** @type {string} */ (name)
			);
			if (hook !== undefined) {
				return hook.call(/** @type {number} */ (this._evaluatingExpression));
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
		this.hooks.evaluate
			.for("Literal")
			.tap({ name: CLASS_NAME, path: true }, (path, node) => {
				const value = path.value(node);
				switch (typeof value) {
					case "number":
						return new BasicEvaluatedExpression().setNumber(value);
					case "bigint":
						return new BasicEvaluatedExpression().setBigInt(value);
					case "string":
						return new BasicEvaluatedExpression().setString(value);
					case "boolean":
						return new BasicEvaluatedExpression().setBoolean(value);
				}
				if (value === null) return new BasicEvaluatedExpression().setNull();
				if (value instanceof RegExp) {
					return new BasicEvaluatedExpression().setRegExp(value);
				}
			});
		this.hooks.evaluate
			.for("NewExpression")
			.tap({ name: CLASS_NAME, path: true }, (path, node) => {
				const callee = path.field(0, Field.callee, node);
				if (path.type(callee) !== NodeType.Identifier) return;
				const calleeName = path.name(callee);
				const count = path.fieldCount(Field.arguments, node);
				if (calleeName !== "RegExp") {
					return this._callHooksForName1(
						this.hooks.evaluateNewExpression,
						calleeName,
						node
					);
				} else if (count > 2 || this.getVariableInfo("RegExp") !== "RegExp") {
					return;
				}

				/** @type {undefined | string} */
				let regExp;
				const arg1 = count > 0 ? path.field(0, Field.arguments, node) : 0;

				if (arg1 !== 0) {
					if (path.type(arg1) === NodeType.SpreadElement) return;

					const evaluatedRegExp = this.evaluateExpression(arg1);

					if (!evaluatedRegExp) return;

					regExp = evaluatedRegExp.asString();

					if (!regExp) return;
				} else {
					return (
						new BasicEvaluatedExpression()
							// eslint-disable-next-line prefer-regex-literals
							.setRegExp(new RegExp(""))
					);
				}

				/** @type {undefined | string} */
				let flags;
				const arg2 = count > 1 ? path.field(1, Field.arguments, node) : 0;

				if (arg2 !== 0) {
					if (path.type(arg2) === NodeType.SpreadElement) return;

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

				return new BasicEvaluatedExpression().setRegExp(
					flags ? new RegExp(regExp, flags) : new RegExp(regExp)
				);
			});
		this.hooks.evaluate
			.for("LogicalExpression")
			.tap({ name: CLASS_NAME, path: true }, (path, node) => {
				const operator = path.textOf(Part.operator, node);
				const left = this.evaluateExpression(path.field(0, Field.left, node));
				let returnRight = false;
				/** @type {boolean | undefined} */
				let allowedRight;
				if (operator === "&&") {
					const leftAsBool = left.asBool();
					if (leftAsBool === false) {
						return left.setRange(rangeOfNode(path, node));
					}
					returnRight = leftAsBool === true;
					allowedRight = false;
				} else if (operator === "||") {
					const leftAsBool = left.asBool();
					if (leftAsBool === true) {
						return left.setRange(rangeOfNode(path, node));
					}
					returnRight = leftAsBool === false;
					allowedRight = true;
				} else if (operator === "??") {
					const leftAsNullish = left.asNullish();
					if (leftAsNullish === false) {
						return left.setRange(rangeOfNode(path, node));
					}
					if (leftAsNullish !== true) return;
					returnRight = true;
				} else {
					return;
				}
				const right = this.evaluateExpression(path.field(0, Field.right, node));
				if (returnRight) {
					if (left.couldHaveSideEffects()) right.setSideEffects();
					return right.setRange(rangeOfNode(path, node));
				}

				const asBool = right.asBool();

				if (allowedRight === true && asBool === true) {
					return new BasicEvaluatedExpression().setTruthy();
				} else if (allowedRight === false && asBool === false) {
					return new BasicEvaluatedExpression().setFalsy();
				}
			});

		this.hooks.evaluate
			.for("BinaryExpression")
			.tap({ name: CLASS_NAME, path: true }, (path, node) => {
				const operator = path.textOf(Part.operator, node);

				if (operator === "+") {
					const left = this.evaluateExpression(path.field(0, Field.left, node));
					const right = this.evaluateExpression(
						path.field(0, Field.right, node)
					);
					const res = new BasicEvaluatedExpression();
					if (left.isString()) {
						if (right.isString()) {
							res.setString(
								/** @type {string} */ (left.string) +
									/** @type {string} */ (right.string)
							);
						} else if (right.isNumber()) {
							res.setString(/** @type {string} */ (left.string) + right.number);
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
							res.setString(left.number + /** @type {string} */ (right.string));
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
							res.setWrapped(left.prefix, right, left.wrappedInnerExpressions);
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
					return res;
				} else if (operator === "-") {
					return handleConstOperation(this, path, node, SUBTRACT);
				} else if (operator === "*") {
					return handleConstOperation(this, path, node, MULTIPLY);
				} else if (operator === "/") {
					return handleConstOperation(this, path, node, DIVIDE);
				} else if (operator === "**") {
					return handleConstOperation(this, path, node, POWER);
				} else if (operator === "===") {
					return handleStrictEqualityComparison(this, path, node, true);
				} else if (operator === "==") {
					return handleAbstractEqualityComparison(this, path, node, true);
				} else if (operator === "!==") {
					return handleStrictEqualityComparison(this, path, node, false);
				} else if (operator === "!=") {
					return handleAbstractEqualityComparison(this, path, node, false);
				} else if (operator === "&") {
					return handleConstOperation(this, path, node, BITWISE_AND);
				} else if (operator === "|") {
					return handleConstOperation(this, path, node, BITWISE_OR);
				} else if (operator === "^") {
					return handleConstOperation(this, path, node, BITWISE_XOR);
				} else if (operator === ">>>") {
					return handleConstOperation(this, path, node, UNSIGNED_SHIFT_RIGHT);
				} else if (operator === ">>") {
					return handleConstOperation(this, path, node, SHIFT_RIGHT);
				} else if (operator === "<<") {
					return handleConstOperation(this, path, node, SHIFT_LEFT);
				} else if (operator === "<") {
					return handleConstOperation(this, path, node, LESS_THAN);
				} else if (operator === ">") {
					return handleConstOperation(this, path, node, GREATER_THAN);
				} else if (operator === "<=") {
					return handleConstOperation(this, path, node, LESS_THAN_OR_EQUAL);
				} else if (operator === ">=") {
					return handleConstOperation(this, path, node, GREATER_THAN_OR_EQUAL);
				} else if (operator === "in") {
					// `x in y` always evaluates to a boolean, so it is never nullish
					const left = this.evaluateExpression(path.field(0, Field.left, node));
					const right = this.evaluateExpression(
						path.field(0, Field.right, node)
					);
					return new BasicEvaluatedExpression()
						.setNullish(false)
						.setSideEffects(
							left.couldHaveSideEffects() || right.couldHaveSideEffects()
						);
				}
			});
		this.hooks.evaluate
			.for("UnaryExpression")
			.tap({ name: CLASS_NAME, path: true }, (path, node) => {
				const operator = path.textOf(Part.operator, node);
				const argument = path.field(0, Field.argument, node);

				if (operator === "typeof") {
					switch (path.type(argument)) {
						case NodeType.Identifier: {
							const res = this._callHooksForName1(
								this.hooks.evaluateTypeof,
								path.name(argument),
								node
							);
							if (res !== undefined) return res;
							break;
						}
						case NodeType.MetaProperty: {
							const res = this._callHooksForName1(
								this.hooks.evaluateTypeof,
								metaPropertyName(path, argument),
								node
							);
							if (res !== undefined) return res;
							break;
						}
						case NodeType.MemberExpression: {
							const res = this._callHooksForNodeExpression(
								this.hooks.evaluateTypeof,
								path,
								argument,
								node
							);
							if (res !== undefined) return res;
							break;
						}
						case NodeType.ChainExpression: {
							const res = this._callHooksForNodeExpression(
								this.hooks.evaluateTypeof,
								path,
								path.field(0, Field.expression, argument),
								node
							);
							if (res !== undefined) return res;
							break;
						}
						case NodeType.FunctionExpression: {
							return new BasicEvaluatedExpression().setString("function");
						}
					}
					const arg = this.evaluateExpression(argument);
					if (arg.isUnknown()) return;
					if (arg.isString()) {
						return new BasicEvaluatedExpression().setString("string");
					}
					if (arg.isWrapped()) {
						return new BasicEvaluatedExpression()
							.setString("string")
							.setSideEffects();
					}
					if (arg.isUndefined()) {
						return new BasicEvaluatedExpression().setString("undefined");
					}
					if (arg.isNumber()) {
						return new BasicEvaluatedExpression().setString("number");
					}
					if (arg.isBigInt()) {
						return new BasicEvaluatedExpression().setString("bigint");
					}
					if (arg.isBoolean()) {
						return new BasicEvaluatedExpression().setString("boolean");
					}
					if (arg.isConstArray() || arg.isRegExp() || arg.isNull()) {
						return new BasicEvaluatedExpression().setString("object");
					}
					if (arg.isArray()) {
						return new BasicEvaluatedExpression()
							.setString("object")
							.setSideEffects(arg.couldHaveSideEffects());
					}
				} else if (operator === "!") {
					const evaluated = this.evaluateExpression(argument);
					const bool = evaluated.asBool();
					if (typeof bool !== "boolean") return;
					return new BasicEvaluatedExpression()
						.setBoolean(!bool)
						.setSideEffects(evaluated.couldHaveSideEffects());
				} else if (operator === "~") {
					return handleUnaryConstOperation(this, path, node, BITWISE_NOT);
				} else if (operator === "+") {
					return handleUnaryConstOperation(this, path, node, TO_NUMBER);
				} else if (operator === "-") {
					return handleUnaryConstOperation(this, path, node, NEGATE);
				}
			});
		this.hooks.evaluateTypeof
			.for("undefined")
			.tap({ name: CLASS_NAME, path: true }, () =>
				new BasicEvaluatedExpression().setString("undefined")
			);
		this.hooks.evaluate
			.for("Identifier")
			.tap({ name: CLASS_NAME, path: true }, (path, node) => {
				if (path.name(node) === "undefined") {
					return new BasicEvaluatedExpression().setUndefined();
				}
			});
		/**
		 * Tap evaluate with variable info.
		 * @param {"Identifier" | "ThisExpression" | "MemberExpression"} exprType expression type name
		 * @param {(path: JavascriptNodeReader, node: number) => GetInfoResult | undefined} getInfo get info
		 * @returns {void}
		 */
		const tapEvaluateWithVariableInfo = (exprType, getInfo) => {
			let cachedNode = 0;
			/** @type {JavascriptNodeReader | undefined} */
			let cachedPath;
			/** @type {GetInfoResult | undefined} */
			let cachedInfo;
			this.hooks.evaluate
				.for(exprType)
				.tap({ name: CLASS_NAME, path: true }, (path, node) => {
					const info = getInfo(path, node);
					// Cache the result (even when undefined) so the stage-100 tap below
					// reuses it instead of recomputing getInfo — getMemberExpressionInfo
					// is expensive and previously ran twice for every rejected member.
					cachedNode = node;
					cachedPath = path;
					cachedInfo = info;
					if (info !== undefined) {
						// saved around the call: a hook may evaluate another identifier
						const outer = this._evaluatingExpression;
						this._evaluatingExpression = node;
						const result = this.callHooksForInfoWithFallback(
							this.hooks.evaluateIdentifier,
							info.name,
							RETURN_UNDEFINED,
							this._evaluateDefinedIdentifier,
							node
						);
						this._evaluatingExpression = outer;
						return result;
					}
				});
			this.hooks.evaluate
				.for(exprType)
				.tap({ name: CLASS_NAME, stage: 100, path: true }, (path, node) => {
					const info =
						cachedNode === node && cachedPath === path
							? cachedInfo
							: getInfo(path, node);
					if (info !== undefined) {
						return new BasicEvaluatedExpression().setIdentifier(
							info.name,
							info.rootInfo,
							info.getMembers,
							info.getMembersOptionals,
							info.getMemberRanges
						);
					}
				});
			this.hooks.finish.tap(CLASS_NAME, () => {
				// Cleanup for GC
				cachedPath = cachedInfo = undefined;
				cachedNode = 0;
			});
		};
		tapEvaluateWithVariableInfo("Identifier", (path, node) => {
			const info = this.getVariableInfo(path.name(node));
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
		tapEvaluateWithVariableInfo("ThisExpression", () => {
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
		this.hooks.evaluate
			.for("MetaProperty")
			.tap({ name: CLASS_NAME, path: true }, (path, node) =>
				this._callHooksForName1(
					this.hooks.evaluateIdentifier,
					metaPropertyName(path, node),
					node
				)
			);
		tapEvaluateWithVariableInfo("MemberExpression", (path, node) =>
			this.getMemberExpressionInfo(
				/** @type {MemberExpression} */ (objectOfNode(node)),
				ALLOWED_MEMBER_TYPES_EXPRESSION
			)
		);

		this.hooks.evaluate
			.for("CallExpression")
			.tap({ name: CLASS_NAME, path: true }, (path, node) => {
				const callee = path.field(0, Field.callee, node);
				const calleeType = path.type(callee);
				if (calleeType === NodeType.MemberExpression) {
					const property = path.field(0, Field.property, callee);
					const propertyType = path.type(property);
					if (
						propertyType ===
						(path.flag(Flag.computed, callee)
							? NodeType.Literal
							: NodeType.Identifier)
					) {
						// type Super also possible here
						const param = this.evaluateExpression(
							path.field(0, Field.object, callee)
						);
						const name =
							propertyType === NodeType.Literal
								? `${path.value(property)}`
								: path.name(property);
						const hook = this.hooks.evaluateCallExpressionMember.get(name);
						if (hook !== undefined) return hook.call(node, param);
					}
				} else if (calleeType === NodeType.Identifier) {
					return this._callHooksForName1(
						this.hooks.evaluateCallExpression,
						path.name(callee),
						node
					);
				}
			});
		this.hooks.evaluateCallExpressionMember
			.for("indexOf")
			.tap({ name: CLASS_NAME, path: true }, (path, node, param) => {
				if (!param.isString()) return;
				const count = path.fieldCount(Field.arguments, node);
				if (count === 0) return;
				const arg1 = path.field(0, Field.arguments, node);
				const arg2 = count > 1 ? path.field(1, Field.arguments, node) : 0;
				if (path.type(arg1) === NodeType.SpreadElement) return;
				const arg1Eval = this.evaluateExpression(arg1);
				if (!arg1Eval.isString()) return;
				const arg1Value = /** @type {string} */ (arg1Eval.string);
				/** @type {number} */
				let result;
				if (arg2 !== 0) {
					if (path.type(arg2) === NodeType.SpreadElement) return;
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
					.setSideEffects(param.couldHaveSideEffects());
			});
		this.hooks.evaluateCallExpressionMember
			.for("replace")
			.tap({ name: CLASS_NAME, path: true }, (path, node, param) => {
				if (!param.isString()) return;
				if (path.fieldCount(Field.arguments, node) !== 2) return;
				if (
					path.type(path.field(0, Field.arguments, node)) ===
					NodeType.SpreadElement
				) {
					return;
				}
				if (
					path.type(path.field(1, Field.arguments, node)) ===
					NodeType.SpreadElement
				) {
					return;
				}
				const arg1 = this.evaluateExpression(
					path.field(0, Field.arguments, node)
				);
				const arg2 = this.evaluateExpression(
					path.field(1, Field.arguments, node)
				);
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
					.setSideEffects(param.couldHaveSideEffects());
			});
		for (const fn of ["substr", "substring", "slice"]) {
			this.hooks.evaluateCallExpressionMember
				.for(fn)
				.tap({ name: CLASS_NAME, path: true }, (path, node, param) => {
					if (!param.isString()) return;
					/** @type {BasicEvaluatedExpression} */
					let arg1;
					/** @type {string} */
					let result;
					const str = /** @type {string} */ (param.string);
					switch (path.fieldCount(Field.arguments, node)) {
						case 1:
							if (
								path.type(path.field(0, Field.arguments, node)) ===
								NodeType.SpreadElement
							) {
								return;
							}
							arg1 = this.evaluateExpression(
								path.field(0, Field.arguments, node)
							);
							if (!arg1.isNumber()) return;
							result = str[
								/** @type {"substr" | "substring" | "slice"} */ (fn)
							](/** @type {number} */ (arg1.number));
							break;
						case 2: {
							if (
								path.type(path.field(0, Field.arguments, node)) ===
								NodeType.SpreadElement
							) {
								return;
							}
							if (
								path.type(path.field(1, Field.arguments, node)) ===
								NodeType.SpreadElement
							) {
								return;
							}
							arg1 = this.evaluateExpression(
								path.field(0, Field.arguments, node)
							);
							const arg2 = this.evaluateExpression(
								path.field(1, Field.arguments, node)
							);
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
						.setSideEffects(param.couldHaveSideEffects());
				});
		}

		/**
		 * Gets simplified template result.
		 * @param {"cooked" | "raw"} kind kind of values to get
		 * @param {JavascriptNodeReader} path what the template is read through
		 * @param {number} template the template literal
		 * @returns {{ quasis: BasicEvaluatedExpression[], parts: BasicEvaluatedExpression[] }} Simplified template
		 */
		const getSimplifiedTemplateResult = (kind, path, template) => {
			/** @type {BasicEvaluatedExpression[]} */
			const quasis = [];
			/** @type {BasicEvaluatedExpression[]} */
			const parts = [];

			for (
				let i = 0, count = path.fieldCount(Field.quasis, template);
				i < count;
				i++
			) {
				const quasiNode = path.field(i, Field.quasis, template);
				const quasi = /** @type {{ cooked: string, raw: string }} */ (
					path.value(quasiNode)
				)[kind];

				if (i > 0) {
					const prevExpr = parts[parts.length - 1];
					const expr = this.evaluateExpression(
						path.field(i - 1, Field.expressions, template)
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
							path.end(quasiNode)
						]);
						// We unset the expression as it doesn't match to a single expression
						prevExpr.setExpression(undefined);
						continue;
					}
					parts.push(expr);
				}

				const part = this._evaluatedAt(
					new BasicEvaluatedExpression()
						.setString(quasi)
						.setRange(rangeOfNode(path, quasiNode)),
					path,
					quasiNode
				);
				quasis.push(part);
				parts.push(part);
			}
			return {
				quasis,
				parts
			};
		};

		this.hooks.evaluate
			.for("TemplateLiteral")
			.tap({ name: CLASS_NAME, path: true }, (path, node) => {
				const { quasis, parts } = getSimplifiedTemplateResult(
					"cooked",
					path,
					node
				);
				if (parts.length === 1) {
					return parts[0].setRange(rangeOfNode(path, node));
				}
				return new BasicEvaluatedExpression().setTemplateString(
					quasis,
					parts,
					"cooked"
				);
			});
		this.hooks.evaluate
			.for("TaggedTemplateExpression")
			.tap({ name: CLASS_NAME, path: true }, (path, node) => {
				const tag = this.evaluateExpression(path.field(0, Field.tag, node));

				if (tag.isIdentifier() && tag.identifier === "String.raw") {
					const { quasis, parts } = getSimplifiedTemplateResult(
						"raw",
						path,
						path.field(0, Field.quasi, node)
					);
					return new BasicEvaluatedExpression().setTemplateString(
						quasis,
						parts,
						"raw"
					);
				}
			});

		this.hooks.evaluateCallExpressionMember
			.for("concat")
			.tap({ name: CLASS_NAME, path: true }, (path, node, param) => {
				if (!param.isString() && !param.isWrapped()) return;
				/** @type {undefined | BasicEvaluatedExpression} */
				let stringSuffix;
				let hasUnknownParams = false;
				/** @type {BasicEvaluatedExpression[]} */
				const innerExpressions = [];
				for (let i = path.fieldCount(Field.arguments, node) - 1; i >= 0; i--) {
					const arg = path.field(i, Field.arguments, node);
					if (path.type(arg) === NodeType.SpreadElement) return;
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
					return new BasicEvaluatedExpression().setWrapped(
						prefix,
						stringSuffix,
						inner
					);
				} else if (param.isWrapped()) {
					const postfix = stringSuffix || param.postfix;
					const inner = param.wrappedInnerExpressions
						? [...param.wrappedInnerExpressions, ...innerExpressions.reverse()]
						: innerExpressions.reverse();
					return new BasicEvaluatedExpression().setWrapped(
						param.prefix,
						postfix,
						inner
					);
				}
				const newString =
					/** @type {string} */ (param.string) +
					(stringSuffix ? stringSuffix.string : "");
				return new BasicEvaluatedExpression()
					.setString(newString)
					.setSideEffects(
						(stringSuffix && stringSuffix.couldHaveSideEffects()) ||
							param.couldHaveSideEffects()
					);
			});
		this.hooks.evaluateCallExpressionMember
			.for("split")
			.tap({ name: CLASS_NAME, path: true }, (path, node, param) => {
				if (!param.isString()) return;
				if (path.fieldCount(Field.arguments, node) !== 1) return;
				if (
					path.type(path.field(0, Field.arguments, node)) ===
					NodeType.SpreadElement
				) {
					return;
				}
				/** @type {string[]} */
				let result;
				const arg = this.evaluateExpression(
					path.field(0, Field.arguments, node)
				);
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
					.setSideEffects(param.couldHaveSideEffects());
			});
		this.hooks.evaluate
			.for("ConditionalExpression")
			.tap({ name: CLASS_NAME, path: true }, (path, node) => {
				const condition = this.evaluateExpression(
					path.field(0, Field.test, node)
				);
				const conditionValue = condition.asBool();
				/** @type {BasicEvaluatedExpression} */
				let res;
				if (conditionValue === undefined) {
					const consequent = this.evaluateExpression(
						path.field(0, Field.consequent, node)
					);
					const alternate = this.evaluateExpression(
						path.field(0, Field.alternate, node)
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
						path.field(
							0,
							conditionValue ? Field.consequent : Field.alternate,
							node
						)
					);
					if (condition.couldHaveSideEffects()) res.setSideEffects();
				}
				res.setRange(rangeOfNode(path, node));
				return res;
			});
		this.hooks.evaluate
			.for("ArrayExpression")
			.tap({ name: CLASS_NAME, path: true }, (path, node) => {
				/** @type {BasicEvaluatedExpression[]} */
				const items = [];
				for (
					let index = 0, count = path.fieldCount(Field.elements, node);
					index < count;
					index++
				) {
					const element = path.field(index, Field.elements, node);
					// a hole or a spread has no single value
					if (element === 0 || path.type(element) === NodeType.SpreadElement) {
						return;
					}
					items.push(this.evaluateExpression(element));
				}
				return new BasicEvaluatedExpression().setItems(items);
			});
		this.hooks.evaluate
			.for("ChainExpression")
			.tap({ name: CLASS_NAME, path: true }, (path, node) => {
				/** @type {number[]} */
				const optionalExpressionsStack = [];
				const expression = path.field(0, Field.expression, node);
				let next = expression;
				for (;;) {
					const type = path.type(next);
					/** @type {number} */
					let field;
					if (type === NodeType.MemberExpression) field = Field.object;
					else if (type === NodeType.CallExpression) field = Field.callee;
					else break;
					const inner = path.field(0, field, next);
					// SuperNode can not be optional
					if (path.flag(Flag.optional, next)) {
						optionalExpressionsStack.push(inner);
					}
					next = inner;
				}

				while (optionalExpressionsStack.length > 0) {
					const evaluated = this.evaluateExpression(
						/** @type {number} */ (optionalExpressionsStack.pop())
					);

					if (evaluated.asNullish()) {
						return evaluated.setRange(rangeOfNode(path, node));
					}
				}
				return this.evaluateExpression(expression);
			});
		this.hooks.evaluate
			.for("SequenceExpression")
			.tap({ name: CLASS_NAME, path: true }, (path, node) => {
				let commentsStartPos = path.start(node);
				const count = path.fieldCount(Field.expressions, node);
				for (let i = 0; i < count - 1; i++) {
					const item = path.field(i, Field.expressions, node);
					if (!this.isPure(item, commentsStartPos)) return;
					commentsStartPos = path.end(item);
				}
				const evaluated = this.evaluateExpression(
					path.field(count - 1, Field.expressions, node)
				);
				if (!evaluated.isCompileTimeValue()) return;
				return evaluated.setRange(rangeOfNode(path, node));
			});
	}

	/**
	 * Destructuring assignment properties for.
	 * @param {Expression} node node
	 * @returns {DestructuringAssignmentProperties | undefined} destructured identifiers
	 */
	destructuringAssignmentPropertiesFor(node) {
		if (!this.destructuringAssignmentProperties) return;
		return this.destructuringAssignmentProperties.get(node);
	}

	/**
	 * Gets rename identifier.
	 * @param {Expression | SpreadElement} expr expression
	 * @returns {string | VariableInfo | undefined} identifier
	 */
	getRenameIdentifier(expr) {
		if (
			expr.type === "Identifier" &&
			this._evalIdentOwnTaps &&
			expr.name !== "undefined" &&
			this._isDefinedPlainVariable(expr.name)
		) {
			// the evaluation could only fall through — never an identifier result
			return;
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
	 * Declare what the scope the node opens hoists, before anything reads a
	 * name in it.
	 * @param {Program | BlockStatement} node the node owning the scope
	 */
	_preWalkScope(node) {
		this._scopeStatements = node.body;
		// BACKWARD-COMPAT START
		if (this._needsFullPreWalk || this.hooks.preStatement.taps.length !== 0) {
			if (node.type === "Program") this.preWalkStatements(node.body);
			else this.preWalkStatement(node);
			return;
		}
		// BACKWARD-COMPAT END
		this._preWalkHoistedDeclarations(
			hoistedDeclarationsOf(node, this._hasParserRecord)
		);
	}

	/**
	 * Declare what hoists to the scope being entered, from what the parser
	 * recorded while reading it. `prevStatement` is not available here.
	 * @param {HoistedDeclarations} hoisted what the scope declares
	 */
	_preWalkHoistedDeclarations(hoisted) {
		for (let index = 0, len = hoisted.length; index < len; index++) {
			// WHY: the statements between two declarations are not read here, so
			// the one before this declaration is unknown rather than the previous
			// declaration. A tap needing it taps `preStatement`, which walks.
			this._prevStatement = undefined;
			this.preWalkStatement(hoisted[index]);
		}
	}

	/**
	 * Whether a function declaration stays in its block rather than hoisting to
	 * the scope last pre-walked, which only sloppy-mode Annex B lets it do.
	 * @param {FunctionDeclaration | MaybeNamedFunctionDeclaration} statement function declaration
	 * @returns {boolean} whether its block, not the scope, binds it
	 */
	_isBlockScopedFunction(statement) {
		const statements = this._scopeStatements;
		// WHY: strictness is read here, not in the parser: `javascript/auto`
		// reads a script as a strict module first.
		return (
			statements !== undefined &&
			(this.scope.isStrict ||
				statement.generator === true ||
				statement.async === true) &&
			!(typeof statements === "number"
				? holdsStatementPath(statements, statement)
				: holdsStatement(statements, statement))
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
			recorded = collectBlockDeclarations(statements);
			if (recorded === 0) return;
		}
		this._blockPreWalkDeclarations(statements, recorded);
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
	 * `walkStatements` over a list of statements read by id: once one ends the
	 * scope (`return`, `throw`), the rest but function declarations may be
	 * skipped through `unusedStatement`.
	 * @param {number} owner the node holding the list
	 * @param {number} field the `Field` holding the list
	 * @returns {void}
	 */
	_walkStatementsPath(owner, field) {
		const count = A.fieldCount(field, owner);
		let onlyFunctionDeclaration = false;

		for (let index = 0; index < count; index++) {
			const id = A.field(index, field, owner);

			if (
				onlyFunctionDeclaration &&
				A.type(id) !== NodeType.FunctionDeclaration &&
				this.hooks.unusedStatement.call(
					/** @type {Statement} */ (toEstreeObject(id))
				)
			) {
				continue;
			}

			this._walkStatementPath(id);

			if (this.scope.terminated) {
				onlyFunctionDeclaration = true;
			}
		}
	}

	/**
	 * `walkStatement` for a statement read by id: its `statement` hook gets the
	 * id, which a `{ path: true }` tap reads through the path.
	 * @param {number} id the statement
	 * @returns {void}
	 */
	_walkStatementPath(id) {
		const path = /** @type {(StatementPathItem | number)[]} */ (
			this._statementPath
		);
		path.push(id);
		const { statement: statementHook } = this.hooks;
		if (
			statementHook.taps.length === 0 ||
			statementHook.call(id) === undefined
		) {
			this._walkStatementTypePath(id);
		}
		this._prevStatement = path.pop();
	}

	/**
	 * `walkNestedStatement` for a statement read by id.
	 * @param {number} id the nested statement
	 * @returns {void}
	 */
	_walkNestedStatementPath(id) {
		this._prevStatement = undefined;
		this._walkStatementPath(id);
	}

	/**
	 * `_walkStatementType` for a statement read by id: a statement holding
	 * statements walks them by id, any other is walked as its ESTree object,
	 * made only for the statements that need it.
	 * @param {number} id the statement
	 * @returns {void}
	 */
	_walkStatementTypePath(id) {
		switch (A.type(id)) {
			case NodeType.ExpressionStatement:
				this._walkExpressionPath(A.field(0, Field.expression, id));
				break;
			case NodeType.VariableDeclaration:
				this._walkVariableDeclarationPath(id);
				break;
			case NodeType.ReturnStatement:
			case NodeType.ThrowStatement:
				this._walkTerminatingStatementPath(id);
				break;
			case NodeType.IfStatement:
				this._walkIfStatementPath(id);
				break;
			case NodeType.BlockStatement:
				this._walkBlockStatementPath(
					id,
					/** @type {BlockStatement} */ (toEstreeObject(id))
				);
				break;
			case NodeType.FunctionDeclaration:
				this._walkFunctionDeclarationPath(
					id,
					/** @type {FunctionDeclaration} */ (toEstreeObject(id))
				);
				break;
			case NodeType.ForStatement:
				this._walkForStatementPath(
					id,
					/** @type {ForStatement} */ (toEstreeObject(id))
				);
				break;
			case NodeType.TryStatement:
				this._walkTryStatementPath(
					id,
					/** @type {TryStatement} */ (toEstreeObject(id))
				);
				break;
			case NodeType.SwitchStatement:
				this._walkSwitchStatementPath(
					id,
					/** @type {SwitchStatement} */ (toEstreeObject(id))
				);
				break;
			case NodeType.WhileStatement: {
				const oldScope = this._enterBlockScope();
				this._walkExpressionPath(A.field(0, Field.test, id));
				this._walkNestedStatementPath(A.field(0, Field.body, id));
				this._exitBlockScope(oldScope, false);
				break;
			}
			case NodeType.ForInStatement:
			case NodeType.ForOfStatement:
				this._walkForInOfStatementPath(
					id,
					/** @type {ForInStatement | ForOfStatement} */ (toEstreeObject(id))
				);
				break;
			case NodeType.DoWhileStatement: {
				const oldScope = this._enterBlockScope();
				this._walkNestedStatementPath(A.field(0, Field.body, id));
				this._walkExpressionPath(A.field(0, Field.test, id));
				this._exitBlockScope(oldScope, false);
				break;
			}
			case NodeType.ExportNamedDeclaration: {
				const declaration = A.field(0, Field.declaration, id);
				if (declaration !== 0) this._walkStatementPath(declaration);
				break;
			}
			case NodeType.ExportDefaultDeclaration:
				this._walkExportDefaultDeclarationPath(
					id,
					/** @type {ExportDefaultDeclaration} */ (toEstreeObject(id))
				);
				break;
			case NodeType.LabeledStatement:
				this._walkLabeledStatementPath(
					id,
					/** @type {LabeledStatement} */ (toEstreeObject(id))
				);
				break;
			case NodeType.WithStatement:
				this._walkWithStatementPath(
					id,
					/** @type {WithStatement} */ (toEstreeObject(id))
				);
				break;
			default:
				this._walkStatementType(
					/** @type {Statement | ModuleDeclaration} */ (toEstreeObject(id))
				);
		}
	}

	/**
	 * `walkBlockStatement` for a block read by id.
	 * @param {number} id the block
	 * @param {BlockStatement} statement its ESTree object
	 * @returns {void}
	 */
	_walkBlockStatementPath(id, statement) {
		const oldScope = this._enterBlockScope();
		const prev = this._prevStatement;
		this._blockPreWalkScopePath(id, Field.body);
		this._prevStatement = prev;
		this._walkStatementsPath(id, Field.body);
		this._exitBlockScope(oldScope, true);
	}

	/**
	 * `walkIfStatement` for an `if` read by id.
	 * @param {number} id the `if`
	 * @returns {void}
	 */
	_walkIfStatementPath(id) {
		const consequent = A.field(0, Field.consequent, id);
		const alternate = A.field(0, Field.alternate, id);
		const result = this.hooks.statementIf.call(id);
		if (result === undefined) {
			const guard = this.hooks.collectGuards.call(A.field(0, Field.test, id));
			this._walkExpressionPath(A.field(0, Field.test, id));
			if (guard && guard.consequent) {
				this.walkGuardedBranch(guard.consequent, () =>
					this._walkNestedStatementPath(consequent)
				);
			} else {
				this._walkNestedStatementPath(consequent);
			}

			const consequentTerminated = this.scope.terminated;
			this.scope.terminated = undefined;

			if (alternate !== 0) {
				if (guard && guard.alternate) {
					this.walkGuardedBranch(guard.alternate, () =>
						this._walkNestedStatementPath(alternate)
					);
				} else {
					this._walkNestedStatementPath(alternate);
				}
			}

			const alternateTerminated = this.scope.terminated;

			this.scope.terminated =
				consequentTerminated && alternateTerminated
					? alternateTerminated
					: undefined;
		} else if (result) {
			this._walkNestedStatementPath(consequent);
		} else if (alternate !== 0) {
			this._walkNestedStatementPath(alternate);
		}
	}

	/**
	 * `walkLabeledStatement` for a labeled statement read by id.
	 * @param {number} id the labeled statement
	 * @param {LabeledStatement} statement its ESTree object
	 * @returns {void}
	 */
	_walkLabeledStatementPath(id, statement) {
		const hook = this.hooks.label.get(statement.label.name);
		if (hook !== undefined && hook.call(statement) === true) return;
		const oldScope = this._enterBlockScope();
		this._walkNestedStatementPath(A.field(0, Field.body, id));
		this._exitBlockScope(oldScope, false);
	}

	/**
	 * `walkWithStatement` for a `with` read by id.
	 * @param {number} id the `with`
	 * @param {WithStatement} statement its ESTree object
	 * @returns {void}
	 */
	_walkWithStatementPath(id, statement) {
		if (this._strictInModuleOutput) {
			this._reportStrictModeViolation(
				"`with` statements are not allowed",
				statement
			);
		}
		const oldScope = this._enterBlockScope();
		this._walkExpressionPath(A.field(0, Field.object, id));
		this._walkNestedStatementPath(A.field(0, Field.body, id));
		this._exitBlockScope(oldScope, false);
	}

	/**
	 * `walkTryStatement` for a `try` read by id.
	 * @param {number} id the `try`
	 * @param {TryStatement} statement its ESTree object
	 * @returns {void}
	 */
	_walkTryStatementPath(id, statement) {
		const block = A.field(0, Field.block, id);
		if (this.scope.inTry) {
			this._walkStatementPath(block);
		} else {
			this.scope.inTry = true;
			this._walkStatementPath(block);
			this.scope.inTry = false;
		}

		const tryTerminated = this.scope.terminated;
		this.scope.terminated = undefined;

		const handler = statement.handler;
		if (handler) {
			const oldScope = this._enterBlockScope();
			if (handler.param !== null) {
				this.enterPattern(handler.param, (ident, identifier) => {
					if (this._strictInModuleOutput) {
						this._checkStrictModeBinding(ident, identifier);
					}
					this.defineVariable(ident);
				});
				this.walkPattern(handler.param);
			}
			const prev = this._prevStatement;
			this.blockPreWalkStatement(handler.body);
			this._prevStatement = prev;
			this._walkStatementPath(
				A.field(0, Field.body, A.field(0, Field.handler, id))
			);
			this._exitBlockScope(oldScope, true);
		}

		const handlerTerminated = this.scope.terminated;
		this.scope.terminated = undefined;

		const finalizer = A.field(0, Field.finalizer, id);
		if (finalizer !== 0) this._walkStatementPath(finalizer);

		const finalizerTerminated = this.scope.terminated;
		this.scope.terminated = undefined;

		if (finalizerTerminated) {
			this.scope.terminated = finalizerTerminated;
		} else if (tryTerminated && (handler ? handlerTerminated : true)) {
			this.scope.terminated = handlerTerminated || tryTerminated;
		}
	}

	/**
	 * `walkSwitchStatement` for a `switch` read by id.
	 * @param {number} id the `switch`
	 * @param {SwitchStatement} statement its ESTree object
	 * @returns {void}
	 */
	_walkSwitchStatementPath(id, statement) {
		this._walkExpressionPath(A.field(0, Field.discriminant, id));
		const oldScope = this._enterBlockScope();
		const switchCases = statement.cases;
		const len = switchCases.length;

		// pre-walk every case first: a `const` declared in a later case is already
		// in scope for an earlier case that reads it (and fails at runtime)
		for (let index = 0; index < len; index++) {
			const switchCase = switchCases[index];
			if (switchCase.consequent.length > 0) {
				const prev = this._prevStatement;
				this._blockPreWalkScopePath(
					A.field(index, Field.cases, id),
					Field.consequent
				);
				this._prevStatement = prev;
			}
		}

		for (let index = 0; index < len; index++) {
			const switchCase = switchCases[index];
			const caseId = A.field(index, Field.cases, id);
			this._walkExpressionPath(A.field(0, Field.test, caseId));
			if (switchCase.consequent.length > 0) {
				this._walkStatementsPath(caseId, Field.consequent);
				this.scope.terminated = undefined;
			}
		}

		this._exitBlockScope(oldScope, false);
	}

	/**
	 * `walkForStatement` for a `for` read by id.
	 * @param {number} id the `for`
	 * @param {ForStatement} statement its ESTree object
	 * @returns {void}
	 */
	_walkForStatementPath(id, statement) {
		const oldScope = this._enterBlockScope();
		const init = statement.init;
		if (init) {
			if (init.type === "VariableDeclaration") {
				this.blockPreWalkVariableDeclaration(init);
				this._prevStatement = undefined;
				this._walkStatementPath(A.field(0, Field.init, id));
			} else {
				this._walkExpressionPath(A.field(0, Field.init, id));
			}
		}
		this._walkExpressionPath(A.field(0, Field.test, id));
		this._walkExpressionPath(A.field(0, Field.update, id));
		this._walkLoopBodyPath(id);
		this._exitBlockScope(oldScope, false);
	}

	/**
	 * `walkForInStatement` and `walkForOfStatement` for a loop read by id.
	 * @param {number} id the loop
	 * @param {ForInStatement | ForOfStatement} statement its ESTree object
	 * @returns {void}
	 */
	_walkForInOfStatementPath(id, statement) {
		if (
			statement.type === "ForOfStatement" &&
			statement.await &&
			this.scope.topLevelScope === true
		) {
			this.hooks.topLevelAwait.call(statement);
		}
		const oldScope = this._enterBlockScope();
		const left = statement.left;
		if (left.type === "VariableDeclaration") {
			this.blockPreWalkVariableDeclaration(left);
			this.walkVariableDeclaration(left);
		} else if (!this._walkWriteTarget(left, statement)) {
			this.walkPattern(left);
		}
		this._walkExpressionPath(A.field(0, Field.right, id));
		this._walkLoopBodyPath(id);
		this._exitBlockScope(oldScope, false);
	}

	/**
	 * Walks a loop's body by id; a block body shares the loop's scope.
	 * @param {number} id the loop
	 * @returns {void}
	 */
	_walkLoopBodyPath(id) {
		const body = A.field(0, Field.body, id);
		if (A.type(body) === NodeType.BlockStatement) {
			const prev = this._prevStatement;
			this._blockPreWalkScopePath(body, Field.body);
			this._prevStatement = prev;
			this._walkStatementsPath(body, Field.body);
		} else {
			this._walkNestedStatementPath(body);
		}
	}

	/**
	 * `walkFunctionDeclaration` for a function declaration read by id.
	 * @param {number} id the function declaration
	 * @param {FunctionDeclaration} statement its ESTree object
	 * @returns {void}
	 */
	_walkFunctionDeclarationPath(id, statement) {
		const wasTopLevel = this.scope.topLevelScope;
		this.scope.topLevelScope = false;
		if (this._strictInModuleOutput) {
			this._checkStrictModeParams(statement.params);
		}
		const params = this._paramsPath(id);
		const oldScope = this._enterFunctionScope(true, params);
		this._walkParamsPath(params);
		const bodyId = A.field(0, Field.body, id);
		this._detectModePath(bodyId);
		const prev = this._prevStatement;
		this._preWalkScopePath(bodyId);
		this._prevStatement = prev;
		this._walkStatementPath(bodyId);
		this.scope = oldScope;
		this.scope.topLevelScope = wasTopLevel;
	}

	/**
	 * `walkExportDefaultDeclaration` for an `export default` read by id.
	 * @param {number} id the `export default`
	 * @param {ExportDefaultDeclaration} statement its ESTree object
	 * @returns {void}
	 */
	_walkExportDefaultDeclarationPath(id, statement) {
		this.hooks.export.call(statement);
		const declaration = statement.declaration;
		const isDeclaration =
			declaration.type === "FunctionDeclaration" ||
			declaration.type === "ClassDeclaration";
		if (isDeclaration && declaration.id) {
			if (
				!this.hooks.exportDeclaration.call(
					statement,
					/** @type {FunctionDeclaration | ClassDeclaration} */ (declaration)
				)
			) {
				this._walkStatementPath(A.field(0, Field.declaration, id));
			}
			return;
		}
		if (isDeclaration) {
			this._walkStatementPath(A.field(0, Field.declaration, id));
		} else {
			this._walkExpressionPath(A.field(0, Field.declaration, id));
		}
		this.hooks.exportExpression.call(statement, declaration);
	}

	/**
	 * `_preWalkScope` for a scope read by id: what hoists to it is collected
	 * from the tree.
	 * @param {number} id the node owning the scope
	 * @returns {void}
	 */
	_preWalkScopePath(id) {
		this._scopeStatements = id;
		// BACKWARD-COMPAT START
		if (this._needsFullPreWalk || this.hooks.preStatement.taps.length !== 0) {
			const node = /** @type {Program | BlockStatement} */ (toEstreeObject(id));
			if (node.type === "Program") this.preWalkStatements(node.body);
			else this.preWalkStatement(node);
			return;
		}
		// BACKWARD-COMPAT END
		this._preWalkHoistedDeclarations(
			collectHoistedDeclarationsPath(id, Field.body, EMPTY_HOISTED_DECLARATIONS)
		);
	}

	/**
	 * `_blockPreWalkScope` for a list read by id: which of its statements
	 * declare is read from the tree.
	 * @param {number} owner the node holding the list
	 * @param {number} field the `Field` holding the list
	 * @returns {void}
	 */
	_blockPreWalkScopePath(owner, field) {
		// BACKWARD-COMPAT START
		if (
			this._needsFullBlockPreWalk ||
			this.hooks.blockPreStatement.taps.length !== 0
		) {
			const count = A.fieldCount(field, owner);
			/** @type {(Statement | ModuleDeclaration)[]} */
			const statements = [];
			for (let index = 0; index < count; index++) {
				statements.push(
					/** @type {Statement} */ (
						toEstreeObject(A.field(index, field, owner))
					)
				);
			}
			this.blockPreWalkStatements(statements);
			return;
		}
		// BACKWARD-COMPAT END
		const declarations = collectBlockDeclarationsPath(owner, field);
		if (typeof declarations === "number") {
			for (let bits = declarations; bits !== 0; bits &= bits - 1) {
				this._blockPreWalkAtPath(owner, field, 31 - Math.clz32(bits & -bits));
			}
			return;
		}
		for (let index = 0, len = declarations.length; index < len; index++) {
			this._blockPreWalkAtPath(owner, field, declarations[index]);
		}
	}

	/**
	 * `_blockPreWalkAt` for a list read by id.
	 * @param {number} owner the node holding the list
	 * @param {number} field the `Field` holding the list
	 * @param {number} index which statement declares
	 * @returns {void}
	 */
	_blockPreWalkAtPath(owner, field, index) {
		// the first statement of the list has nothing before it, and leaves
		// whatever the caller set standing, as walking the whole list did
		if (index !== 0) this._prevStatement = A.field(index - 1, field, owner);
		this.blockPreWalkStatement(
			/** @type {Statement} */ (toEstreeObject(A.field(index, field, owner)))
		);
	}

	/**
	 * `detectMode` for a body read by id.
	 * @param {number} owner the node holding the statements in its `body`
	 * @returns {void}
	 */
	_detectModePath(owner) {
		// only a body webpack parsed has its directives marked in the tree
		if (!this._hasParserRecord) {
			this.detectMode(
				/** @type {BlockStatement} */ (toEstreeObject(owner)).body
			);
			return;
		}
		const count = A.fieldCount(Field.body, owner);
		const first = A.field(0, Field.body, owner);
		if (count === 0 || A.type(first) !== NodeType.ExpressionStatement) return;
		const expression = A.field(0, Field.expression, first);
		if (A.type(expression) !== NodeType.Literal) return;
		if (A.value(expression) === "use asm") this.scope.isAsmJs = true;
		for (let index = 0; index < count; index++) {
			const directive = A.textOf(
				Part.directive,
				A.field(index, Field.body, owner)
			);
			if (directive === null) break;
			if (directive === "use strict") {
				this.scope.isStrict = true;
				break;
			}
		}
	}

	/**
	 * A function's parameters read by id, as `_enterFunctionScope` takes them:
	 * a plain identifier by its name, a pattern as its ESTree object.
	 * @param {number} fn the function
	 * @returns {(Pattern | string)[]} its parameters
	 */
	_paramsPath(fn) {
		const count = A.fieldCount(Field.params, fn);
		/** @type {(Pattern | string)[]} */
		const params = [];
		for (let index = 0; index < count; index++) {
			const param = A.field(index, Field.params, fn);
			params.push(
				A.type(param) === NodeType.Identifier
					? A.name(param)
					: /** @type {Pattern} */ (toEstreeObject(param))
			);
		}
		return params;
	}

	/**
	 * Walks the patterns among a function's parameters; a plain identifier
	 * walks nothing.
	 * @param {(Pattern | string)[]} params as `_paramsPath` reads them
	 * @returns {void}
	 */
	_walkParamsPath(params) {
		for (let index = 0, len = params.length; index < len; index++) {
			const param = params[index];
			if (typeof param !== "string") this.walkPattern(param);
		}
	}

	/**
	 * `walkExpression` for an expression read by id: one holding expressions
	 * walks them by id, any other is walked as its ESTree object.
	 * @param {number} id the expression, or `0` for none
	 * @returns {void}
	 */
	_walkExpressionPath(id) {
		switch (A.type(id)) {
			case NodeType.Identifier:
				this._callHooksForInfoId(
					this.hooks.expression,
					this.getVariableInfo(A.name(id)),
					id
				);
				break;
			case NodeType.ThisExpression:
				this._callHooksForInfoId(
					this.hooks.expression,
					this.getVariableInfo("this"),
					id
				);
				break;
			case NodeType.MemberExpression:
				this._walkMemberExpressionPath(id);
				break;
			case NodeType.Literal:
				if (this._strictInModuleOutput) {
					this._checkStrictModeLiteral(
						/** @type {Literal} */ (toEstreeObject(id))
					);
				}
				break;
			case NodeType.CallExpression:
				this._walkCallExpressionPath(id);
				break;
			case NodeType.AssignmentExpression:
				this._walkAssignmentExpressionPath(id);
				break;
			case NodeType.UnaryExpression:
				this._walkUnaryExpressionPath(id);
				break;
			case NodeType.BinaryExpression:
				if (
					this.hooks.binaryExpression.call(
						/** @type {BinaryExpression} */ (toEstreeObject(id))
					) === undefined
				) {
					this._walkExpressionPath(A.field(0, Field.left, id));
					this._walkExpressionPath(A.field(0, Field.right, id));
				}
				break;
			case NodeType.LogicalExpression: {
				const result = this.hooks.expressionLogicalOperator.call(
					/** @type {LogicalExpression} */ (toEstreeObject(id))
				);
				if (result === undefined) {
					this._walkExpressionPath(A.field(0, Field.left, id));
				}
				if (result === undefined || result) {
					this._walkExpressionPath(A.field(0, Field.right, id));
				}
				break;
			}
			case NodeType.ArrowFunctionExpression:
				this._walkFunctionExpressionPath(id);
				break;
			case NodeType.ConditionalExpression:
				this._walkConditionalExpressionPath(
					id,
					/** @type {ConditionalExpression} */ (toEstreeObject(id))
				);
				break;
			case NodeType.ArrayExpression:
				this._walkExpressionsPath(id, Field.elements);
				break;
			case NodeType.ObjectExpression:
				this._walkObjectExpressionPath(id);
				break;
			case NodeType.FunctionExpression:
				this._walkFunctionExpressionPath(id);
				break;
			case NodeType.TemplateLiteral:
				this._walkExpressionsPath(id, Field.expressions);
				break;
			case NodeType.SpreadElement:
			case NodeType.YieldExpression:
				this._walkExpressionPath(A.field(0, Field.argument, id));
				break;
			case NodeType.SequenceExpression:
				this._walkSequenceExpressionPath(id);
				break;
			case NodeType.AwaitExpression:
				if (this.scope.topLevelScope === true) {
					this.hooks.topLevelAwait.call(
						/** @type {AwaitExpression} */ (toEstreeObject(id))
					);
				}
				this._walkExpressionPath(A.field(0, Field.argument, id));
				break;
			case NodeType.TaggedTemplateExpression:
				this.scope.inTaggedTemplateTag = true;
				this._walkExpressionPath(A.field(0, Field.tag, id));
				this.scope.inTaggedTemplateTag = false;
				this._walkExpressionsPath(
					A.field(0, Field.quasi, id),
					Field.expressions
				);
				break;
			case 0:
				break;
			default:
				this.walkExpression(/** @type {Expression} */ (toEstreeObject(id)));
		}
	}

	/**
	 * Whether a function read by id takes plain identifiers only, as
	 * `isSimpleFunction` asks of its ESTree object.
	 * @param {number} fn the function
	 * @returns {boolean} true when all params are plain identifiers
	 */
	_isSimpleFunctionPath(fn) {
		const count = A.fieldCount(Field.params, fn);
		for (let index = 0; index < count; index++) {
			if (A.type(A.field(index, Field.params, fn)) !== NodeType.Identifier) {
				return false;
			}
		}
		return true;
	}

	/**
	 * Whether an `evaluateIdentifier` hook applies to a variable, by one of its
	 * tags or by its name.
	 * @param {ExportedVariableInfo} info the variable's info
	 * @returns {boolean} true when evaluating it may run a hook
	 */
	_hasEvaluateIdentifierHook(info) {
		const hookMap = this.hooks.evaluateIdentifier;
		if (typeof info === "string") return hookMap.get(info) !== undefined;
		const variableInfo = /** @type {VariableInfo} */ (info);
		for (
			let tagInfo = variableInfo.tagInfo;
			tagInfo !== undefined;
			tagInfo = tagInfo.next
		) {
			if (hookMap.get(tagInfo.tag) !== undefined) return true;
		}
		return hookMap.get(/** @type {string} */ (variableInfo.name)) !== undefined;
	}

	/**
	 * `walkCallExpression` for a call read by id: the callee is resolved from
	 * the tree where the parser's own evaluation would only name it, and an
	 * ESTree object is fetched only for a hook about to run.
	 * @param {number} id the call
	 * @returns {void}
	 */
	_walkCallExpressionPath(id) {
		const callee = A.field(0, Field.callee, id);
		const calleeType = A.type(callee);
		if (calleeType === NodeType.MemberExpression) {
			const object = A.field(0, Field.object, callee);
			const objectType = A.type(object);
			if (
				(objectType === NodeType.FunctionExpression ||
					objectType === NodeType.ArrowFunctionExpression) &&
				!A.flag(Flag.computed, callee) &&
				A.fieldCount(Field.arguments, id) > 0 &&
				this._isSimpleFunctionPath(object)
			) {
				const name = A.name(A.field(0, Field.property, callee));
				if (name === "call" || name === "bind") {
					// (function(…) { }.call/bind(?, …))
					const expression = /** @type {CallExpression} */ (toEstreeObject(id));
					this._walkIIFE(
						/** @type {FunctionExpression | ArrowFunctionExpression} */
						(/** @type {MemberExpression} */ (expression.callee).object),
						expression.arguments.slice(1),
						expression.arguments[0],
						id
					);
					return;
				}
			}
		} else if (
			(calleeType === NodeType.FunctionExpression ||
				calleeType === NodeType.ArrowFunctionExpression) &&
			this._isSimpleFunctionPath(callee)
		) {
			// (function(…) { }(…))
			const expression = /** @type {CallExpression} */ (toEstreeObject(id));
			this._walkIIFE(
				/** @type {FunctionExpression | ArrowFunctionExpression} */
				(expression.callee),
				expression.arguments,
				null,
				id
			);
			return;
		}
		if (calleeType === NodeType.MemberExpression) {
			if (A.type(this._memberRootPath(callee)) === NodeType.CallExpression) {
				const expression = /** @type {CallExpression} */ (toEstreeObject(id));
				const exprInfo = this.getMemberExpressionInfo(
					/** @type {MemberExpression} */ (expression.callee),
					ALLOWED_MEMBER_TYPES_CALL_EXPRESSION
				);
				if (
					exprInfo &&
					exprInfo.type === "call" &&
					this.callHooksForInfo(
						this.hooks.callMemberChainOfCallMemberChain,
						exprInfo.rootInfo,
						expression,
						exprInfo.getCalleeMembers(),
						exprInfo.call,
						exprInfo.getMembers(),
						exprInfo.getMemberRanges()
					) === true
				) {
					return;
				}
			}
			const object = A.field(0, Field.object, callee);
			const property = A.field(0, Field.property, callee);
			if (
				A.type(object) === NodeType.ImportExpression &&
				A.type(property) === NodeType.Identifier &&
				A.name(property) === "then"
			) {
				const expression = /** @type {CallExpression} */ (toEstreeObject(id));
				if (
					this.hooks.importCall.call(
						/** @type {ImportExpression} */
						(/** @type {MemberExpression} */ (expression.callee).object),
						expression
					) === true
				) {
					return;
				}
			}
		}
		/** @type {ExportedVariableInfo | undefined} */
		let identifier;
		/** @type {ExportedVariableInfo | undefined} */
		let rootInfo;
		// an identifier callee has none: hooks get fresh empty arrays, as it did
		/** @type {Members | undefined} */
		let members;
		/** @type {MembersOptionals | undefined} */
		let membersOptionals;
		/** @type {MemberRanges | undefined} */
		let memberRanges;
		// whether the callee's evaluation, as the parser's own taps make it, is known
		let resolved = false;
		if (calleeType === NodeType.Identifier && this._evalIdentOwnTaps) {
			const name = A.name(callee);
			const info = this.getVariableInfo(name);
			if (
				typeof info === "string" ||
				(JavascriptParser.isVariableInfo(info) &&
					(info.isFree() || info.isTagged()))
			) {
				if (!this._hasEvaluateIdentifierHook(info)) {
					identifier = rootInfo = info;
					resolved = true;
				}
			} else if (name !== "undefined" && this._isDefinedPlainVariable(name)) {
				// a defined, untagged callee can only evaluate to the fallthrough
				// result, so no call hooks apply
				resolved = true;
			}
		} else if (
			calleeType === NodeType.MemberExpression &&
			this._evalMemberOwnTaps &&
			A.type(A.field(0, Field.object, callee)) !== NodeType.MetaProperty
		) {
			const type = this._resolveMemberExpressionPath(callee);
			if (type !== 1) {
				resolved = true;
			} else if (
				this.hooks.evaluateIdentifier.get(this._memberName) === undefined
			) {
				identifier = this._memberName;
				rootInfo = this._memberRootInfo;
				members = this._members;
				membersOptionals = this._membersOptionals;
				resolved = true;
			}
		}
		if (!resolved) {
			const evaluated = this.evaluateExpression(
				/** @type {Expression} */ (toEstreeObject(callee))
			);
			if (evaluated.isIdentifier()) {
				identifier = evaluated.identifier;
				rootInfo = evaluated.rootInfo;
				members = /** @type {() => Members} */ (evaluated.getMembers)();
				membersOptionals = evaluated.getMembersOptionals
					? evaluated.getMembersOptionals()
					: members.map(RETURN_FALSE);
				memberRanges = evaluated.getMemberRanges
					? evaluated.getMemberRanges()
					: [];
			}
		}
		if (identifier !== undefined) {
			const info = /** @type {string | VariableInfo} */ (rootInfo);
			if (this._hasHooksForInfo(this.hooks.callMemberChain, info)) {
				const expression = /** @type {CallExpression} */ (toEstreeObject(id));
				if (
					this.callHooksForInfo(
						this.hooks.callMemberChain,
						info,
						expression,
						members === undefined ? [] : members,
						membersOptionals === undefined ? [] : membersOptionals,
						memberRanges !== undefined
							? memberRanges
							: members === undefined
								? []
								: memberRangesOf(
										/** @type {MemberExpression} */ (expression.callee),
										members.length
									)
					) === true
				) {
					return;
				}
			}
			if (this._callHooksForInfoId(this.hooks.call, identifier, id) === true) {
				return;
			}
		}
		if (calleeType === NodeType.MemberExpression) {
			// because of call context we need to walk the call context as expression
			this._walkExpressionPath(A.field(0, Field.object, callee));
			if (A.flag(Flag.computed, callee)) {
				this._walkExpressionPath(A.field(0, Field.property, callee));
			}
		} else {
			this._walkExpressionPath(callee);
		}
		this._walkExpressionsPath(id, Field.arguments);
	}

	/**
	 * `getMemberExpressionRoot` for a chain read by id.
	 * @param {number} id a member expression
	 * @returns {number} the root object of the chain
	 */
	_memberRootPath(id) {
		let expression = id;
		while (A.type(expression) === NodeType.MemberExpression) {
			const property = A.field(0, Field.property, expression);
			const type = A.type(property);
			if (A.flag(Flag.computed, expression)) {
				if (
					type !== NodeType.Literal &&
					!(
						type === NodeType.TemplateLiteral &&
						A.fieldCount(Field.expressions, property) === 0 &&
						typeof (
							/** @type {{ cooked: string | null }} */
							(A.value(A.field(0, Field.quasis, property))).cooked
						) === "string"
					)
				) {
					break;
				}
			} else if (type !== NodeType.Identifier) {
				break;
			}
			expression = A.field(0, Field.object, expression);
		}
		return expression;
	}

	/**
	 * `_resolveMemberExpression` for a chain read by id, rooted in a variable,
	 * `this` or a meta property: it fills the same `_member*` slots, reading no
	 * ESTree object.
	 * @param {number} id a member expression
	 * @returns {0 | 1 | 2} 0 when rejected, 1 for an `expression`, 2 for a chain rooted in a call, left to `_resolveMemberExpression`
	 */
	_resolveMemberExpressionPath(id) {
		// the slots are overwritten, so the cached node no longer matches them
		this._memberExpression = undefined;
		const root = this._memberRootPath(id);
		/** @type {string} */
		let rootName;
		switch (A.type(root)) {
			case NodeType.CallExpression:
				return 2;
			case NodeType.Identifier:
				rootName = A.name(root);
				break;
			case NodeType.ThisExpression:
				rootName = "this";
				break;
			case NodeType.MetaProperty:
				rootName = `${A.name(A.field(0, Field.meta, root))}.${A.name(
					A.field(0, Field.property, root)
				)}`;
				break;
			default:
				return 0;
		}
		const resolvedRoot = this._resolveMemberRoot(rootName);
		if (resolvedRoot === undefined) return 0;
		/** @type {Members} */
		const members = [];
		/** @type {MembersOptionals} */
		const membersOptionals = [];
		for (let node = id; node !== root; node = A.field(0, Field.object, node)) {
			const property = A.field(0, Field.property, node);
			switch (A.type(property)) {
				case NodeType.Identifier:
					members.push(A.name(property));
					break;
				case NodeType.Literal:
					// a regular expression and a bigint hold the values ESTree does
					members.push(`${A.value(property)}`);
					break;
				default:
					members.push(
						/** @type {{ cooked: string }} */
						(A.value(A.field(0, Field.quasis, property))).cooked
					);
			}
			membersOptionals.push(A.flag(Flag.optional, node));
		}
		if (members.length > 1) {
			members.reverse();
			membersOptionals.reverse();
		}
		this._members = members;
		this._membersOptionals = membersOptionals;
		this._memberName = objectAndMembersToName(resolvedRoot, members);
		return 1;
	}

	/**
	 * `walkMemberExpression` for a member expression read by id: the chain is
	 * resolved from the tree, and a node's ESTree object is fetched only for a
	 * hook about to run.
	 * @param {number} id the member expression
	 * @returns {void}
	 */
	_walkMemberExpressionPath(id) {
		const type = this._resolveMemberExpressionPath(id);
		if (type === 1) {
			// copied out first: a hook may resolve another chain and reuse the slots
			const name = this._memberName;
			const rootInfo = /** @type {string | VariableInfo} */ (
				this._memberRootInfo
			);
			const members = this._members;
			const membersOptionals = this._membersOptionals;
			if (this._callHooksForInfoId(this.hooks.expression, name, id) === true) {
				return;
			}
			if (this._hasHooksForInfo(this.hooks.expressionMemberChain, rootInfo)) {
				const expression = /** @type {MemberExpression} */ (toEstreeObject(id));
				if (
					this.callHooksForInfo(
						this.hooks.expressionMemberChain,
						rootInfo,
						expression,
						members,
						membersOptionals,
						memberRangesOf(expression, members.length)
					) === true
				) {
					return;
				}
			}
			this._walkMemberChainPath(
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
			this.walkMemberExpression(
				/** @type {MemberExpression} */ (toEstreeObject(id))
			);
			return;
		}
		this._walkExpressionPath(A.field(0, Field.object, id));
		if (A.flag(Flag.computed, id)) {
			this._walkExpressionPath(A.field(0, Field.property, id));
		}
	}

	/**
	 * `_walkMemberChain` for a chain read by id.
	 * @param {number} outer the whole chain, for the unhandled hook
	 * @param {number} id the chain from here inwards
	 * @param {string} name name of the chain from here inwards
	 * @param {string | VariableInfo} rootInfo root info
	 * @param {Members} members members of the whole chain, in source order
	 * @param {number} end how many of `members` are inside the chain from here
	 * @returns {void}
	 */
	_walkMemberChainPath(outer, id, name, rootInfo, members, end) {
		const object = A.field(0, Field.object, id);
		if (A.type(object) === NodeType.MemberExpression) {
			const property = members[end - 1];
			name = name.slice(0, -property.length - 1);
			if (
				this._callHooksForInfoId(this.hooks.expression, name, object) === true
			) {
				return;
			}
			this._walkMemberChainPath(
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
				/** @type {MemberExpression} */ (toEstreeObject(outer)),
				members
			)
		) {
			this._walkExpressionPath(object);
		}
		if (A.flag(Flag.computed, id)) {
			this._walkExpressionPath(A.field(0, Field.property, id));
		}
	}

	/**
	 * `walkExpressions` for a list of expressions read by id, skipping holes.
	 * @param {number} owner the node holding the list
	 * @param {number} field the `Field` holding the list
	 * @returns {void}
	 */
	_walkExpressionsPath(owner, field) {
		const count = A.fieldCount(field, owner);
		for (let index = 0; index < count; index++) {
			this._walkExpressionPath(A.field(index, field, owner));
		}
	}

	/**
	 * `walkObjectExpression` for an object read by id.
	 * @param {number} id the object
	 * @returns {void}
	 */
	_walkObjectExpressionPath(id) {
		const count = A.fieldCount(Field.properties, id);
		for (let index = 0; index < count; index++) {
			const property = A.field(index, Field.properties, id);
			if (A.type(property) === NodeType.SpreadElement) {
				this._walkExpressionPath(A.field(0, Field.argument, property));
				continue;
			}
			if (A.flag(Flag.computed, property)) {
				this._walkExpressionPath(A.field(0, Field.key, property));
			}
			const value = A.field(0, Field.value, property);
			if (
				A.flag(Flag.shorthand, property) &&
				A.type(value) === NodeType.Identifier
			) {
				this.scope.inShorthand = A.name(value);
				this._walkExpressionPath(value);
				this.scope.inShorthand = false;
			} else {
				this._walkExpressionPath(value);
			}
		}
	}

	/**
	 * `walkConditionalExpression` for a conditional read by id.
	 * @param {number} id the conditional
	 * @param {ConditionalExpression} expression its ESTree object
	 * @returns {void}
	 */
	_walkConditionalExpressionPath(id, expression) {
		const consequent = A.field(0, Field.consequent, id);
		const alternate = A.field(0, Field.alternate, id);
		const result = this.hooks.expressionConditionalOperator.call(expression);
		if (result === undefined) {
			const guard = this.hooks.collectGuards.call(expression.test);
			this._walkExpressionPath(A.field(0, Field.test, id));
			if (guard && guard.consequent) {
				this.walkGuardedBranch(guard.consequent, () =>
					this._walkExpressionPath(consequent)
				);
			} else {
				this._walkExpressionPath(consequent);
			}
			if (guard && guard.alternate) {
				this.walkGuardedBranch(guard.alternate, () =>
					this._walkExpressionPath(alternate)
				);
			} else {
				this._walkExpressionPath(alternate);
			}
		} else {
			this._walkExpressionPath(result ? consequent : alternate);
		}
	}

	/**
	 * `walkSequenceExpression` for a sequence read by id: one making up its
	 * statement walks each expression as a statement of its own.
	 * @param {number} id the sequence
	 * @returns {void}
	 */
	_walkSequenceExpressionPath(id) {
		const statementPath =
			/** @type {(StatementPathItem | number)[]} */
			(this._statementPath);
		const current = statementPath[statementPath.length - 1];
		const currentId =
			typeof current === "number"
				? current
				: lazyNodeOf(/** @type {import("estree").Node} */ (current));
		if (
			currentId !== id &&
			(A.type(currentId) !== NodeType.ExpressionStatement ||
				A.field(0, Field.expression, currentId) !== id)
		) {
			this._walkExpressionsPath(id, Field.expressions);
			return;
		}
		const old = /** @type {StatementPathItem | number} */ (statementPath.pop());
		const prev = this._prevStatement;
		const count = A.fieldCount(Field.expressions, id);
		for (let index = 0; index < count; index++) {
			const expressionId = A.field(index, Field.expressions, id);
			statementPath.push(expressionId);
			this._walkExpressionPath(expressionId);
			this._prevStatement = statementPath.pop();
		}
		this._prevStatement = prev;
		statementPath.push(old);
	}

	/**
	 * `walkFunctionExpression` and `walkArrowFunctionExpression` for a function
	 * read by id: its ESTree object is fetched only for the strict-mode checks.
	 * @param {number} id the function
	 * @returns {void}
	 */
	_walkFunctionExpressionPath(id) {
		const wasTopLevel = this.scope.topLevelScope;
		const arrow = A.type(id) === NodeType.ArrowFunctionExpression;
		this.scope.topLevelScope = arrow && wasTopLevel ? "arrow" : false;
		const params = this._paramsPath(id);
		const name = arrow ? 0 : A.field(0, Field.id, id);
		if (this._strictInModuleOutput) {
			const expression =
				/** @type {FunctionExpression | ArrowFunctionExpression} */ (
					toEstreeObject(id)
				);
			this._checkStrictModeParams(expression.params);
			if (expression.type === "FunctionExpression" && expression.id) {
				this._checkStrictModeBinding(expression.id.name, expression.id);
			}
		}
		const oldScope = this._enterFunctionScope(
			!arrow,
			name === 0 ? params : [...params, A.name(name)]
		);
		this._walkParamsPath(params);
		const body = A.field(0, Field.body, id);
		if (A.type(body) === NodeType.BlockStatement) {
			this._detectModePath(body);
			const prev = this._prevStatement;
			this._preWalkScopePath(body);
			this._prevStatement = prev;
			this._walkStatementPath(body);
		} else {
			this._walkExpressionPath(body);
		}
		this.scope = oldScope;
		this.scope.topLevelScope = wasTopLevel;
	}

	/**
	 * Whether every `evaluate` tap for a node type is the parser's own, or
	 * there is none.
	 * @param {string} type the ESTree type
	 * @returns {boolean} true when only the parser evaluates it
	 */
	_evaluatesOwnOnly(type) {
		const hook = this.hooks.evaluate.get(type);
		return (
			hook === undefined ||
			(ownInterceptorsOnly(hook) &&
				hook.taps.every((tap) => tap.name === CLASS_NAME))
		);
	}

	/**
	 * `getRenameIdentifier` for an expression read by id: an identifier or a
	 * member chain is resolved from the tree, and an expression the parser's
	 * own evaluators never name is answered without evaluating it.
	 * @param {number} id the expression
	 * @returns {string | VariableInfo | undefined} the identifier it renames
	 */
	_getRenameIdentifierPath(id) {
		const type = A.type(id);
		switch (type) {
			case NodeType.Identifier: {
				if (!this._evalIdentOwnTaps) break;
				const name = A.name(id);
				const info = this.getVariableInfo(name);
				if (
					typeof info === "string" ||
					(JavascriptParser.isVariableInfo(info) &&
						(info.isFree() || info.isTagged()))
				) {
					if (!this._hasEvaluateIdentifierHook(info)) return info;
				} else if (name !== "undefined" && this._isDefinedPlainVariable(name)) {
					return;
				}
				break;
			}
			case NodeType.MemberExpression: {
				if (
					!this._evalMemberOwnTaps ||
					A.type(A.field(0, Field.object, id)) === NodeType.MetaProperty
				) {
					break;
				}
				if (this._resolveMemberExpressionPath(id) !== 1) return;
				const name = this._memberName;
				if (this.hooks.evaluateIdentifier.get(name) === undefined) return name;
				break;
			}
			case NodeType.CallExpression:
				if (
					this._evalCallOwnTaps &&
					!this._callMayEvaluateToIdentifierPath(id)
				) {
					return;
				}
				break;
			case NodeType.Literal:
			case NodeType.ArrayExpression:
			case NodeType.BinaryExpression:
			case NodeType.NewExpression:
			case NodeType.TemplateLiteral:
			case NodeType.UnaryExpression:
				// the parser evaluates these to values, never to an identifier
				if (this._evaluatesOwnOnly(nodeTypeName(type))) return;
				break;
			default:
				if (this.hooks.evaluate.get(nodeTypeName(type)) === undefined) return;
		}
		const result = this.evaluateExpression(
			/** @type {Expression} */ (toEstreeObject(id))
		);
		if (result.isIdentifier()) return result.identifier;
	}

	/**
	 * `evaluateExpression` for a node read through the path: its `evaluate`
	 * hook gets the node, which a tap not reading the path gets as an object.
	 * @param {number} node the expression
	 * @returns {BasicEvaluatedExpression} evaluation result
	 */
	_evaluateNode(node) {
		const reader = pathReader;
		if (reader === A) {
			const result = this._evaluatePath(node);
			if (result !== undefined) return result;
		}
		try {
			const hook = this.hooks.evaluate.get(nodeTypeName(reader.type(node)));
			if (hook !== undefined) {
				const result = hook.call(node);
				if (result !== undefined && result !== null) {
					return this._evaluatedAt(result, reader, node);
				}
			}
		} catch (err) {
			// eslint-disable-next-line no-console
			console.warn(err);
			// ignore error
		}
		return this._evaluatedAt(new BasicEvaluatedExpression(), reader, node);
	}

	/**
	 * Attaches the expression evaluated to a result, by its node while the id
	 * walk's tree holds it, by its object for a view emptied after the parse.
	 * @param {BasicEvaluatedExpression} result the result
	 * @param {JavascriptNodeReader} reader what the node is read through
	 * @param {number} node the expression
	 * @returns {BasicEvaluatedExpression} the result
	 */
	_evaluatedAt(result, reader, node) {
		return reader === A
			? result.setNode(A, node)
			: result.setExpression(
					/** @type {EstreeView} */ (
						/** @type {EstreeView | JavascriptNodeReader} */ (reader)
					).object(node)
				);
	}

	/**
	 * `evaluateExpression` for a node of the program walked by id, where the
	 * parser's own evaluation would read a chain of its children: a member
	 * chain or a call is read from the tree instead.
	 * @param {number} id the expression
	 * @returns {BasicEvaluatedExpression | undefined} the result, or undefined to fire its hook
	 */
	_evaluatePath(id) {
		switch (A.type(id)) {
			case NodeType.MemberExpression: {
				if (
					!this._evalMemberOwnTaps ||
					A.type(A.field(0, Field.object, id)) === NodeType.MetaProperty
				) {
					return;
				}
				if (this._resolveMemberExpressionPath(id) !== 1) {
					return new BasicEvaluatedExpression().setNode(A, id);
				}
				const name = this._memberName;
				if (this.hooks.evaluateIdentifier.get(name) !== undefined) return;
				const members = this._members;
				const membersOptionals = this._membersOptionals;
				return new BasicEvaluatedExpression()
					.setIdentifier(
						name,
						/** @type {string | VariableInfo} */ (this._memberRootInfo),
						() => members,
						() => membersOptionals,
						() => memberRangesOfNode(A, id, members.length)
					)
					.setNode(A, id);
			}
			case NodeType.CallExpression:
				if (this._evalCallOwnTaps && !this._callMayEvaluatePath(id)) {
					return new BasicEvaluatedExpression().setNode(A, id);
				}
		}
	}

	/**
	 * Whether the parser's own evaluation of a call read by id may give a
	 * result: only a hook it hands the call to can, by the callee's variable
	 * or by the property of a member callee.
	 * @param {number} id the call
	 * @returns {boolean} true when evaluating it may give a result
	 */
	_callMayEvaluatePath(id) {
		const callee = A.field(0, Field.callee, id);
		switch (A.type(callee)) {
			case NodeType.Identifier:
				return this._hasEvaluateCallHook(this.getVariableInfo(A.name(callee)));
			case NodeType.MemberExpression: {
				const property = A.field(0, Field.property, callee);
				const type = A.type(property);
				if (A.flag(Flag.computed, callee)) {
					return (
						type === NodeType.Literal &&
						this.hooks.evaluateCallExpressionMember.get(
							`${A.value(property)}`
						) !== undefined
					);
				}
				return (
					type === NodeType.Identifier &&
					this.hooks.evaluateCallExpressionMember.get(A.name(property)) !==
						undefined
				);
			}
		}
		return false;
	}

	/**
	 * Whether an `evaluateCallExpression` hook applies to a callee's variable,
	 * by one of its tags or by its name, as `_callHooksForInfo1` finds it.
	 * @param {ExportedVariableInfo} info the callee's variable info
	 * @returns {boolean} true when evaluating the call may run a hook
	 */
	_hasEvaluateCallHook(info) {
		const hookMap = this.hooks.evaluateCallExpression;
		if (typeof info === "string") return hookMap.get(info) !== undefined;
		if (!JavascriptParser.isVariableInfo(info)) return false;
		for (
			let tagInfo = info.tagInfo;
			tagInfo !== undefined;
			tagInfo = tagInfo.next
		) {
			if (hookMap.get(tagInfo.tag) !== undefined) return true;
		}
		return (
			(info.isFree() || info.isTagged()) &&
			hookMap.get(/** @type {string} */ (info.name)) !== undefined
		);
	}

	/**
	 * Whether the parser's own evaluation of a call read by id may name an
	 * identifier: only a hook it hands the call to can, one keyed by the
	 * callee's variable, or by the property of a member callee that is not
	 * one of the parser's own string and array methods.
	 * @param {number} id the call
	 * @returns {boolean} true when evaluating it may give an identifier
	 */
	_callMayEvaluateToIdentifierPath(id) {
		const callee = A.field(0, Field.callee, id);
		switch (A.type(callee)) {
			case NodeType.Identifier:
				return this._hasEvaluateCallHook(this.getVariableInfo(A.name(callee)));
			case NodeType.MemberExpression: {
				const property = A.field(0, Field.property, callee);
				const type = A.type(property);
				/** @type {string} */
				let name;
				// a private name looks a hook up by its name too, which at worst
				// evaluates the call as the ESTree walk would
				if (A.flag(Flag.computed, callee)) {
					if (type !== NodeType.Literal) return false;
					name = `${A.value(property)}`;
				} else {
					name = A.name(property);
				}
				const hook = this.hooks.evaluateCallExpressionMember.get(name);
				return (
					hook !== undefined &&
					(!ownInterceptorsOnly(hook) ||
						hook.taps.some((tap) => tap.name !== CLASS_NAME))
				);
			}
		}
		return false;
	}

	/**
	 * `walkAssignmentExpression` for an assignment read by id, to a variable
	 * or a member chain; any other target is walked as its ESTree object.
	 * @param {number} id the assignment
	 * @returns {void}
	 */
	_walkAssignmentExpressionPath(id) {
		const left = A.field(0, Field.left, id);
		const right = A.field(0, Field.right, id);
		const leftType = A.type(left);
		if (leftType === NodeType.Identifier) {
			const leftName = A.name(left);
			if (this._strictInModuleOutput) {
				this._checkStrictModeAssignTarget(
					leftName,
					/** @type {AssignmentExpression} */ (toEstreeObject(id))
				);
			}
			const renameIdentifier = this._getRenameIdentifierPath(right);
			if (
				renameIdentifier &&
				this._callHooksForInfoId(this.hooks.canRename, renameIdentifier, right)
			) {
				// renaming "a = b;"
				if (
					!this._callHooksForInfoId(this.hooks.rename, renameIdentifier, right)
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
			this._walkExpressionPath(right);
			if (
				!this._callHooksForInfoId(
					this.hooks.pattern,
					this.getVariableInfo(leftName),
					left
				) &&
				!this._callHooksForInfoId(
					this.hooks.assign,
					this.getVariableInfo(leftName),
					id
				)
			) {
				this._walkExpressionPath(left);
			}
			return;
		}
		if (leftType === NodeType.MemberExpression) {
			if (
				this._resolveMemberExpressionPath(left) === 1 &&
				this._hasHooksForInfo(
					this.hooks.assignMemberChain,
					/** @type {string | VariableInfo} */ (this._memberRootInfo)
				) &&
				this.callHooksForInfo(
					this.hooks.assignMemberChain,
					/** @type {string | VariableInfo} */ (this._memberRootInfo),
					/** @type {AssignmentExpression} */ (toEstreeObject(id)),
					this._members
				)
			) {
				return;
			}
			this._walkExpressionPath(right);
			this._walkExpressionPath(left);
			return;
		}
		this.walkAssignmentExpression(
			/** @type {AssignmentExpression} */ (toEstreeObject(id))
		);
	}

	/**
	 * `callHooksForExpression` for an expression read through the path: by id
	 * while the program is walked by id, by its object otherwise.
	 * @template {{ call(...args: HookArgument[]): HookArgument }} H
	 * @param {HookMap<H>} hookMap hooks that should be called
	 * @param {JavascriptNodeReader} path what the nodes are read through
	 * @param {number} expression the expression naming what the hooks are for
	 * @param {number} node the node the hooks get
	 * @returns {ReturnType<H["call"]> | undefined} result of hook
	 */
	_callHooksForNodeExpression(hookMap, path, expression, node) {
		if (path === A) {
			return this._callHooksForExpressionPath(hookMap, expression, node);
		}
		return this.callHooksForExpression(
			hookMap,
			/** @type {Expression} */ (objectOfNode(expression)),
			node
		);
	}

	/**
	 * `callHooksForExpression` for an expression read by id, naming a
	 * variable or a member chain; the hooks get the ESTree object of `node`.
	 * @template {{ call(...args: HookArgument[]): HookArgument }} H
	 * @param {HookMap<H>} hookMap hooks that should be called
	 * @param {number} expression the expression naming what the hooks are for
	 * @param {number} node the node the hooks get
	 * @returns {ReturnType<H["call"]> | undefined} result of hook
	 */
	_callHooksForExpressionPath(hookMap, expression, node) {
		if (this._resolveMemberExpressionPath(expression) !== 1) return;
		return this._callHooksForInfoId(
			hookMap,
			this._members.length === 0
				? /** @type {string | VariableInfo} */ (this._memberRootInfo)
				: this._memberName,
			node
		);
	}

	/**
	 * `walkUnaryExpression` for a unary expression read by id.
	 * @param {number} id the unary expression
	 * @returns {void}
	 */
	_walkUnaryExpressionPath(id) {
		const argument = A.field(0, Field.argument, id);
		const operator = A.textOf(Part.operator, id);
		if (operator === "typeof") {
			if (
				this._callHooksForExpressionPath(this.hooks.typeof, argument, id) ===
				true
			) {
				return;
			}
			if (
				A.type(argument) === NodeType.ChainExpression &&
				this._callHooksForExpressionPath(
					this.hooks.typeof,
					A.field(0, Field.expression, argument),
					id
				) === true
			) {
				return;
			}
		} else if (
			this._strictInModuleOutput &&
			operator === "delete" &&
			A.type(argument) === NodeType.Identifier
		) {
			this._reportStrictModeViolation(
				`Deleting the unqualified identifier "${A.name(
					argument
				)}" is not allowed`,
				/** @type {UnaryExpression} */ (toEstreeObject(id))
			);
		}
		this._walkExpressionPath(argument);
	}

	/**
	 * `walkVariableDeclaration` for a declaration read by id: each declarator's
	 * value is walked by id.
	 * @param {number} id the declaration
	 * @returns {void}
	 */
	_walkVariableDeclarationPath(id) {
		for (
			let index = 0, len = A.fieldCount(Field.declarations, id);
			index < len;
			index++
		) {
			const declarator = A.field(index, Field.declarations, id);
			const pattern = A.field(0, Field.id, declarator);
			const init = A.field(0, Field.init, declarator);
			const renameIdentifier =
				init !== 0 && this._getRenameIdentifierPath(init);
			if (renameIdentifier && A.type(pattern) === NodeType.Identifier) {
				const hook = this.hooks.canRename.get(renameIdentifier);
				if (hook !== undefined && hook.call(init)) {
					const renameHook = this.hooks.rename.get(renameIdentifier);
					if (renameHook === undefined || !renameHook.call(init)) {
						this.setVariable(A.name(pattern), renameIdentifier);
					}
					continue;
				}
			}
			if (!this.hooks.declarator.call(declarator, id)) {
				if (A.type(pattern) !== NodeType.Identifier) {
					this.walkPattern(/** @type {Pattern} */ (toEstreeObject(pattern)));
				}
				this._walkExpressionPath(init);
			}
		}
	}

	/**
	 * `walkTerminatingStatement` for a `return` or `throw` read by id.
	 * @param {number} id the statement
	 * @returns {void}
	 */
	_walkTerminatingStatementPath(id) {
		this._walkExpressionPath(A.field(0, Field.argument, id));
		if (this.scope.topLevelScope === true) return;
		if (this.hooks.terminate.call(id)) {
			this.scope.terminated =
				A.type(id) === NodeType.ReturnStatement
					? SCOPE_INFO_TERMINATED_RETURN
					: SCOPE_INFO_TERMINATED_THROW;
		}
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
	 * Processes the provided statement.
	 * @param {Statement | ModuleDeclaration | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration} statement statement
	 */
	walkStatement(statement) {
		/** @type {StatementPath} */
		(this._statementPath).push(statement);
		const { statement: statementHook } = this.hooks;
		if (
			statementHook.taps.length !== 0 &&
			statementHook.call(statement) !== undefined
		) {
			this._prevStatement =
				/** @type {StatementPath} */
				(this._statementPath).pop();
			return;
		}
		this._walkStatementType(statement);
		this._prevStatement =
			/** @type {StatementPath} */
			(this._statementPath).pop();
	}

	/**
	 * `walkStatement` past its `statement` hook, shared with the id walk.
	 * @param {Statement | ModuleDeclaration | MaybeNamedClassDeclaration | MaybeNamedFunctionDeclaration} statement statement
	 * @returns {void}
	 */
	_walkStatementType(statement) {
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
	 * @param {HookMap<PathTaps<[number], boolean | void> & SyncBailHook<[Identifier], boolean | void>>} hookMap map of hooks
	 */
	_preWalkVariableDeclaration(statement, hookMap) {
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
	 * Defines a declared variable unless a declaration hook handles it.
	 * @param {string} name variable name
	 * @param {Identifier} ident identifier node
	 * @param {HookMap<PathTaps<[number], boolean | void> & SyncBailHook<[Identifier], boolean | void>>} hookMap kind-specific declaration hooks
	 * @returns {void}
	 */
	_defineVariableForDeclaration(name, ident, hookMap) {
		let hook = hookMap.get(name);
		if (hook === undefined || !hook.call(ident)) {
			hook = this.hooks.varDeclaration.get(name);
			if (hook === undefined || !hook.call(ident)) {
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
						shorthand: this.scope.inShorthand
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
		const currentStatement = this._statementAt(
			/** @type {(StatementPathItem | number)[]} */ (this._statementPath)
				.length - 1
		);
		if (
			currentStatement === expression ||
			(currentStatement.type === "ExpressionStatement" &&
				currentStatement.expression === expression)
		) {
			const old =
				/** @type {StatementPathItem} */
				(/** @type {StatementPath} */ (this._statementPath).pop());
			const prev = this._prevStatement;
			for (const expr of expression.expressions) {
				/** @type {StatementPath} */
				(this._statementPath).push(expr);
				this.walkExpression(expr);
				this._prevStatement =
					/** @type {StatementPath} */
					(this._statementPath).pop();
			}
			this._prevStatement = prev;
			/** @type {StatementPath} */
			(this._statementPath).push(old);
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
	 * @param {number=} callId the call, read by id in the id walk, else `0`
	 */
	_walkIIFE(functionExpression, options, currentThis, callId = 0) {
		// in the id walk, `fn.call(this, …)` and `fn.bind(this, …)` pass `this` first
		const firstArgument = currentThis === null ? 0 : 1;
		/**
		 * Returns var info.
		 * @param {Expression | SpreadElement} argOrThis arg or this
		 * @param {number} index its index among the call's arguments
		 * @returns {string | VariableInfo | undefined} var info
		 */
		const getVarInfo = (argOrThis, index) => {
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
			if (callId === 0) this.walkExpression(argOrThis);
			else this._walkExpressionPath(A.field(index, Field.arguments, callId));
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
		const renameThis = currentThis ? getVarInfo(currentThis, 0) : null;
		const varInfoForArgs = options.map((argument, index) =>
			getVarInfo(argument, index + firstArgument)
		);
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
		// the function is the callee, or the object of a `.call` / `.bind` callee
		const bodyId =
			callId === 0
				? 0
				: A.field(
						0,
						Field.body,
						firstArgument === 0
							? A.field(0, Field.callee, callId)
							: A.field(0, Field.object, A.field(0, Field.callee, callId))
					);
		if (functionExpression.body.type === "BlockStatement") {
			if (callId === 0) this.detectMode(functionExpression.body.body);
			else this._detectModePath(bodyId);
			const prev = this._prevStatement;
			if (callId === 0) this._preWalkScope(functionExpression.body);
			else this._preWalkScopePath(bodyId);
			this._prevStatement = prev;
			if (callId === 0) this.walkStatement(functionExpression.body);
			else this._walkStatementPath(bodyId);
		} else if (callId === 0) {
			this.walkExpression(functionExpression.body);
		} else {
			this._walkExpressionPath(bodyId);
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
			const call = /** @type {CallExpression} */ (this._memberCall);
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
	 * @template {{ call(...args: HookArgument[]): HookArgument }} H
	 * @param {HookMap<H>} hookMap hooks the should be called
	 * @param {Expression | Super} expr expression
	 * @param {Parameters<H["call"]> | [number]} args args for the hook
	 * @returns {ReturnType<H["call"]> | undefined} result of hook
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
	 * @template {{ call(...args: HookArgument[]): HookArgument }} H
	 * @param {HookMap<H>} hookMap hooks the should be called
	 * @param {Expression | Super} expr expression info
	 * @param {((name: string, rootInfo: string | ScopeInfo | VariableInfo, getMembers: () => Members) => ReturnType<H["call"]>) | undefined} fallback callback when variable in not handled by hooks
	 * @param {((result?: string) => ReturnType<H["call"]> | undefined) | undefined} defined callback when variable is defined
	 * @param {Parameters<H["call"]> | [number]} args args for the hook
	 * @returns {ReturnType<H["call"]> | undefined} result of hook
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
	 * @template {{ call(...args: HookArgument[]): HookArgument }} H
	 * @param {HookMap<H>} hookMap hooks the should be called
	 * @param {string} name key in map
	 * @param {Parameters<H["call"]> | [number]} args args for the hook
	 * @returns {ReturnType<H["call"]> | undefined} result of hook
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
	 * @template {{ call(...args: HookArgument[]): HookArgument }} H
	 * @param {HookMap<H>} hookMap hooks that should be called
	 * @param {ExportedVariableInfo} info variable info
	 * @param {Parameters<H["call"]> | [number]} args args for the hook
	 * @returns {ReturnType<H["call"]> | undefined} result of hook
	 */
	callHooksForInfo(hookMap, info, ...args) {
		return this._callHooksForInfo(hookMap, info, undefined, undefined, args);
	}

	/**
	 * Call hooks for info with fallback.
	 * @template {{ call(...args: HookArgument[]): HookArgument }} H
	 * @param {HookMap<H>} hookMap hooks the should be called
	 * @param {ExportedVariableInfo} info variable info
	 * @param {((name: string) => ReturnType<H["call"]> | undefined) | undefined} fallback callback when variable in not handled by hooks
	 * @param {((result?: string) => ReturnType<H["call"]> | undefined) | undefined} defined callback when variable is defined
	 * @param {Parameters<H["call"]> | [number]} args args for the hook
	 * @returns {ReturnType<H["call"]> | undefined} result of hook
	 */
	callHooksForInfoWithFallback(hookMap, info, fallback, defined, ...args) {
		return this._callHooksForInfo(hookMap, info, fallback, defined, args);
	}

	/**
	 * Shared core for the callHooksFor* helpers. Takes `args` as an already
	 * collected array so the public wrappers each allocate it once instead of
	 * re-collecting it through several rest-parameter layers (hot per identifier).
	 * @template {{ call(...args: HookArgument[]): HookArgument }} H
	 * @param {HookMap<H>} hookMap hooks that should be called
	 * @param {ExportedVariableInfo} info variable info
	 * @param {((name: string) => ReturnType<H["call"]> | undefined) | undefined} fallback callback when variable is not handled by hooks
	 * @param {((result?: string) => ReturnType<H["call"]> | undefined) | undefined} defined callback when variable is defined
	 * @param {Parameters<H["call"]> | [number]} args args for the hook
	 * @returns {ReturnType<H["call"]> | undefined} result of hook
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
					if (result !== undefined) {
						return /** @type {ReturnType<H["call"]>} */ (result);
					}
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
			if (result !== undefined) {
				return /** @type {ReturnType<H["call"]>} */ (result);
			}
		}
		if (fallback !== undefined) {
			return fallback(name);
		}
	}

	/**
	 * Whether `_callHooksForInfo` would call any hook for this info, so a
	 * caller can skip building the arguments for a name nothing taps.
	 * @template {{ call(...args: HookArgument[]): HookArgument }} H
	 * @param {HookMap<H>} hookMap hooks that would be called
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
	 * @template {{ call(...args: HookArgument[]): HookArgument }} H
	 * @param {HookMap<H>} hookMap hooks the should be called
	 * @param {string} name key in map
	 * @param {((value: string) => ReturnType<H["call"]> | undefined) | undefined} fallback callback when variable in not handled by hooks
	 * @param {(() => ReturnType<H["call"]>) | undefined} defined callback when variable is defined
	 * @param {Parameters<H["call"]> | [number]} args args for the hook
	 * @returns {ReturnType<H["call"]> | undefined} result of hook
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
	 * @template {{ call(...args: HookArgument[]): HookArgument }} H
	 * @param {HookMap<H>} hookMap hooks that should be called
	 * @param {string} name key in map
	 * @param {Parameters<H["call"]>[0] | number} arg the single hook argument
	 * @returns {ReturnType<H["call"]> | undefined} result of hook
	 */
	_callHooksForName1(hookMap, name, arg) {
		return this._callHooksForInfo1(hookMap, this.getVariableInfo(name), arg);
	}

	/**
	 * Single-argument twin of `callHooksForInfo` (must stay in sync with
	 * `_callHooksForInfo`), for the hot dispatch sites that pass one argument
	 * and no fallback/defined callbacks.
	 * @template {{ call(...args: HookArgument[]): HookArgument }} H
	 * @param {HookMap<H>} hookMap hooks that should be called
	 * @param {ExportedVariableInfo} info variable info
	 * @param {Parameters<H["call"]>[0] | number} arg the single hook argument
	 * @returns {ReturnType<H["call"]> | undefined} result of hook
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
					/** @type {H | undefined} */
					(hookMap.get(tagInfo.tag));
				if (hook !== undefined) {
					this.currentTagData = tagInfo.data;
					const result = hook.call(arg);
					this.currentTagData = undefined;
					if (result !== undefined) {
						return /** @type {ReturnType<H["call"]>} */ (result);
					}
				}
				tagInfo = tagInfo.next;
			}
			if (!info.isFree() && !info.isTagged()) {
				return;
			}
			name = /** @type {string} */ (info.name);
		}
		const hook = hookMap.get(name);
		if (hook !== undefined) {
			const result = hook.call(arg);
			if (result !== undefined) {
				return /** @type {ReturnType<H["call"]>} */ (result);
			}
		}
	}

	/**
	 * `_callHooksForInfo1` for a node read by id (must stay in sync with it):
	 * its ESTree object is fetched only when a hook is about to run.
	 * @template {{ call(...args: HookArgument[]): HookArgument }} H
	 * @param {HookMap<H>} hookMap hooks that should be called
	 * @param {ExportedVariableInfo} info variable info
	 * @param {number} id the node the hooks get
	 * @returns {ReturnType<H["call"]> | undefined} result of hook
	 */
	_callHooksForInfoId(hookMap, info, id) {
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
					/** @type {H | undefined} */
					(hookMap.get(tagInfo.tag));
				if (hook !== undefined) {
					this.currentTagData = tagInfo.data;
					const result = hook.call(
						/** @type {Parameters<H["call"]>[0]} */ (toEstreeObject(id))
					);
					this.currentTagData = undefined;
					if (result !== undefined) {
						return /** @type {ReturnType<H["call"]>} */ (result);
					}
				}
				tagInfo = tagInfo.next;
			}
			if (!info.isFree() && !info.isTagged()) {
				return;
			}
			name = /** @type {string} */ (info.name);
		}
		const hook = hookMap.get(name);
		if (hook !== undefined) {
			const result = hook.call(
				/** @type {Parameters<H["call"]>[0]} */ (toEstreeObject(id))
			);
			if (result !== undefined) {
				return /** @type {ReturnType<H["call"]>} */ (result);
			}
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
	 * @param {Expression | SpreadElement | PrivateIdentifier | Super | number} expression expression node, or its id read through the path
	 * @returns {BasicEvaluatedExpression} evaluation result
	 */
	evaluateExpression(expression) {
		if (typeof expression === "number") return this._evaluateNode(expression);
		if (this._walkPath && pathReader === A) {
			const id = lazyNodeOf(expression);
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
		let program = 0;

		if (typeof source === "object") {
			ast = /** @type {Program} */ (source);
			comments = source.comments;
		} else if (
			// WHY: until the walker reads ids, a parse building the tree also builds
			// the ESTree objects the walker reads, which costs more than parsing
			// into objects alone; only a tap reading the path pays for it.
			(this._programPathTaps > 0 || this._walkPath) &&
			typeof this.options.parse !== "function" &&
			parser === WebpackParser
		) {
			const importPhases = this.options.importPhases === true;
			/** @type {CollectedComment[]} */
			let collected = [];
			program = parseInGoal(this.sourceType, (sourceType) => {
				collected = [];
				return parseProgram(source, 0, {
					sourceType,
					allowReturnOutsideFunction: sourceType === "script",
					comments: collected,
					importPhases
				});
			});
			tree = /** @type {SyntaxTree} */ (takeParsedTree());
			// the id walk builds an object only for a node something reads
			ast = /** @type {Program} */ (
				this._walkPath ? tree.lazyEstree(program) : tree.estree(program)
			);
			comments = /** @type {Comment[]} */ (collected);
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
		// as objects: an id belongs to the outer walk's tree
		const oldStatementPath = this.statementPath;
		const oldPrevStatement = this.prevStatement;
		const oldStrictInModuleOutput = this._strictInModuleOutput;
		const oldSource = this._source;
		const oldLineStarts = this._lineStarts;
		const oldHasParserRecord = this._hasParserRecord;
		// WHY: the parser's record of each scope is only the truth for a tree it
		// just built. A loader's AST, and whatever `module.parser.javascript.parse`
		// returns, may have been edited after it was read — or built by something
		// else entirely — so both are collected from instead of trusted.
		this._hasParserRecord =
			typeof source !== "object" && typeof this.options.parse !== "function";
		// a preparsed AST carries no text, but the build passes the module
		// source in the state — offsets still map for it
		this._source =
			typeof source === "string"
				? source
				: typeof state.source === "string"
					? state.source
					: undefined;
		this._lineStarts = undefined;
		if (tree === undefined && (this._programPathTaps > 0 || this._walkPath)) {
			tree = new SyntaxTree();
			program = tree.addEstree(/** @type {Program & EstreeSource} */ (ast));
			// WHY: another parser's AST may leave a directive unmarked, which
			// `getDirective` recovers from its literal; the tree reads the mark.
			const body = ast.body;
			for (let index = 0; index < body.length; index++) {
				const statement = body[index];
				const directive = this.getDirective(statement);
				if (directive === undefined) break;
				if (/** @type {Directive} */ (statement).directive === undefined) {
					tree.setPart(
						Part.directive,
						tree.field(index, Field.body, program),
						directive
					);
				}
			}
		}
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
			ownInterceptorsOnly(identifierEvalHook) &&
			identifierEvalHook.taps.every((tap) => tap.name === CLASS_NAME);
		if (this._walkPath) {
			const memberEvalHook = this.hooks.evaluate.get("MemberExpression");
			// ImportMetaPlugin evaluates only members whose object is `import.meta`
			this._evalMemberOwnTaps =
				memberEvalHook !== undefined &&
				ownInterceptorsOnly(memberEvalHook) &&
				memberEvalHook.taps.every(
					(tap) => tap.name === CLASS_NAME || tap.name === "ImportMetaPlugin"
				);
			this._evalCallOwnTaps = this._evaluatesOwnOnly("CallExpression");
		}
		this._statementPath = [];
		this._prevStatement = undefined;
		// WHY: a walk that throws would leave ids of a tree let go of for the
		// next parse to read, so the saved ones come back however it ends.
		try {
			// The output is emitted as strict-mode ESM, but this module was parsed as
			// a loose script — acorn skipped the strict early errors that will break
			// the bundle at runtime. Enables the strict-mode diagnostics below.
			this._strictInModuleOutput =
				this.options.strictModeViolations !== false &&
				state.compilation !== undefined &&
				state.compilation.runtimeTemplate.isModule();
			if (!this._pathTapsWrapped) {
				this._pathTapsWrapped = true;
				this._wrapPathHooks();
			}
			const oldProgramAst = this._programAst;
			this._programAst = ast;
			if (tree !== undefined) {
				usePathTree(tree, typeof this._source === "string" ? this._source : "");
			}
			const walk = this.hooks.program.call(program, comments) === undefined;
			this._programAst = oldProgramAst;
			// The id walk reads the tree until `finish`; otherwise it is let go now.
			const walkPath = this._walkPath && tree !== undefined;
			if (tree !== undefined && !walkPath) {
				usePathTree(null, "");
				tree.release();
			}
			if (walk) {
				this.destructuringAssignmentProperties = new WeakMap();
				this.detectMode(ast.body);
				// a strict program (ESM source, `"use strict"`) keeps its behavior in
				// strict output — drop the flag so the walk pays no per-node checks
				if (this._strictInModuleOutput && this.scope.isStrict) {
					this._strictInModuleOutput = false;
				}
				this._modulePreWalkDeclarations(
					moduleDeclarationsOf(ast, this._hasParserRecord)
				);
				this._prevStatement = undefined;
				if (walkPath) this._preWalkScopePath(program);
				else this._preWalkScope(ast);
				this._prevStatement = undefined;
				if (walkPath) this._blockPreWalkScopePath(program, Field.body);
				else this._blockPreWalkScope(ast, ast.body);
				this._prevStatement = undefined;
				if (walkPath) {
					this._walkStatementsPath(program, Field.body);
				} else {
					this.walkStatements(ast.body);
				}
				this.destructuringAssignmentProperties = undefined;
			}
			this.hooks.finish.call(ast, comments);
			if (walkPath) {
				usePathTree(null, "");
				/** @type {SyntaxTree} */ (tree).release();
			}
			this._releaseMemberExpression();
			this.scope = oldScope;
			this.state = oldState;
			this.comments = oldComments;
			this.semicolons = oldSemicolons;
		} finally {
			this._statementPath = oldStatementPath;
			this._prevStatement = oldPrevStatement;
			// ids a path tap read objects by die with its call
			if (objectView !== undefined && pathReader === A) objectView.reset();
		}
		this._strictInModuleOutput = oldStrictInModuleOutput;
		// release — these retain the whole source string and its line table
		this._source = oldSource;
		this._lineStarts = oldLineStarts;
		this._hasParserRecord = oldHasParserRecord;
		return state;
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
	 * Checks whether this javascript parser is pure.
	 * @param {Expression | Declaration | PrivateIdentifier | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration | number | null | undefined} expr an expression, or its node while the program is walked by id
	 * @param {number} commentsStartPos source position from which annotation comments are checked
	 * @returns {boolean} true, when the expression is pure
	 */
	isPure(expr, commentsStartPos) {
		if (typeof expr === "number") {
			return this._isPurePath(expr, commentsStartPos);
		}
		if (!expr) return true;
		const { INERT_TYPES, hasSideEffects } = getSideEffects();
		// What holds nothing that may run, or is a name, needs no tree.
		if (INERT_TYPES.has(expr.type) || expr.type === "Identifier") {
			const result = this.hooks.isPure
				.for(expr.type)
				.call(expr, commentsStartPos);
			return typeof result === "boolean" ? result : true;
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
	 * `isPure` for a node of the program walked by id: the rules read the tree
	 * through the path, and only what they leave to the evaluator gets an object.
	 * @param {number} id the node, or `0` for none
	 * @param {number} commentsStartPos source position from which annotation comments are checked
	 * @returns {boolean} true, when the node is pure
	 */
	_isPurePath(id, commentsStartPos) {
		if (id === 0) return true;
		const { INERT_TYPES, hasSideEffects } = getSideEffects();
		const reader = pathReader;
		const type = reader.type(id);
		const typeName = nodeTypeName(type);
		if (INERT_TYPES.has(typeName) || type === NodeType.Identifier) {
			const result = this.hooks.isPure.for(typeName).call(id, commentsStartPos);
			return typeof result === "boolean" ? result : true;
		}
		const outerCommentsStartPos = this._pureCommentsStartPos;
		this._pureCommentsStartPos = commentsStartPos;
		try {
			if (this._purePathContext === undefined) {
				this._purePathContext = this._purePathContextOf();
			}
			return !hasSideEffects(reader, id, this._purePathContext);
		} finally {
			this._pureCommentsStartPos = outerCommentsStartPos;
		}
	}

	/**
	 * The `side-effects` context of an `isPure` query read by id, as
	 * `_pureContext` makes one for a query over ESTree objects.
	 * @returns {SideEffectsContext} the context
	 */
	_purePathContextOf() {
		return {
			readHasSideEffects: RETURN_FALSE,
			readsGlobalMember: RETURN_FALSE,
			nameKind: RETURN_UNDEFINED,
			pureConversions: true,
			isPureCall: (node) =>
				this._isPureAnnotated(
					pathReader.start(node),
					this._pureCommentsStartPos
				),
			decides: (node) => {
				const reader = pathReader;
				const type = reader.type(node);
				const result = this.hooks.isPure
					.for(nodeTypeName(type))
					.call(node, Math.min(this._pureCommentsStartPos, reader.start(node)));
				if (typeof result === "boolean") return !result;
				if (isLeftToEvaluatorPath(reader, node, type)) {
					return this.evaluateExpression(
						/** @type {Expression} */ (objectOfNode(node))
					).couldHaveSideEffects();
				}
				return isDerivedWithConstructorPath(reader, node, type) || undefined;
			}
		};
	}

	/**
	 * The `side-effects` context of an `isPure` query: its hooks answer first,
	 * the evaluator judges what the rules leave to it, and names run nothing.
	 * @param {EstreeView} view the query's view
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
	 * Returns the location of a node or comment, computed from its offsets so
	 * ASTs from parsers without location support work too. Falls back to the
	 * node's own `loc` only when no source text is available (preparsed ASTs).
	 * Offsets can only be mapped while parsing — callbacks deferred past the
	 * `parse()` call must take the location upfront.
	 * @param {{ start?: number, end?: number, range?: Range, loc?: SourceLocation | null }} node node or comment
	 * @returns {DependencyLocation} location of the node
	 */
	getLocation(node) {
		const source = this._source;
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
	 * @param {StatementPathItem} statement the statement they belong to
	 * @returns {number} the offset the run starts at, or the statement's own
	 */
	getAttachedCommentsStart(statement) {
		let position = /** @type {Range} */ (statement.range)[0];
		// what precedes `export function f() {}` is written for the export, and
		// the export keyword is the token the run would otherwise stop at
		const path = this._statementPath;
		if (path !== undefined && path.length > 1) {
			const outer = this._statementAt(path.length - 2);
			if (
				(outer.type === "ExportNamedDeclaration" ||
					outer.type === "ExportDefaultDeclaration") &&
				outer.declaration === statement
			) {
				position = /** @type {Range} */ (outer.range)[0];
			}
		}
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
	 * Lets every hook the id walk fires take `{ path: true }` taps; the number
	 * beside each hook has a bit set for each of its arguments that is a node.
	 * @returns {void}
	 */
	_wrapPathHooks() {
		const hooks = this.hooks;
		wrapPathTapsOfMap(hooks.evaluateTypeof, 1);
		wrapPathTapsOfMap(hooks.evaluate, 1);
		wrapPathTapsOfMap(hooks.evaluateIdentifier, 1);
		wrapPathTapsOfMap(hooks.evaluateDefinedIdentifier, 1);
		wrapPathTapsOfMap(hooks.evaluateNewExpression, 1);
		wrapPathTapsOfMap(hooks.evaluateCallExpression, 1);
		wrapPathTapsOfMap(hooks.evaluateCallExpressionMember, 1);
		wrapPathTapsOfMap(hooks.isPure, 1);
		wrapPathTaps(hooks.preStatement, 1);
		wrapPathTapsOfMap(hooks.preStatementByType, 1);
		wrapPathTaps(hooks.blockPreStatement, 1);
		wrapPathTapsOfMap(hooks.blockPreStatementByType, 1);
		wrapPathTaps(hooks.statement, 1);
		wrapPathTaps(hooks.statementIf, 1);
		wrapPathTaps(hooks.collectGuards, 1);
		wrapPathTaps(hooks.classExtendsExpression, 3);
		wrapPathTaps(hooks.classBodyElement, 3);
		wrapPathTaps(hooks.classBodyValue, 7);
		wrapPathTapsOfMap(hooks.label, 1);
		wrapPathTaps(hooks.import, 1);
		wrapPathTaps(hooks.importSpecifier, 1);
		wrapPathTaps(hooks.export, 1);
		wrapPathTaps(hooks.exportImport, 1);
		wrapPathTaps(hooks.exportDeclaration, 3);
		wrapPathTaps(hooks.exportExpression, 3);
		wrapPathTaps(hooks.exportSpecifier, 1);
		wrapPathTaps(hooks.exportImportSpecifier, 1);
		wrapPathTaps(hooks.preDeclarator, 3);
		wrapPathTaps(hooks.declarator, 3);
		wrapPathTapsOfMap(hooks.varDeclaration, 1);
		wrapPathTapsOfMap(hooks.varDeclarationLet, 1);
		wrapPathTapsOfMap(hooks.varDeclarationConst, 1);
		wrapPathTapsOfMap(hooks.varDeclarationUsing, 1);
		wrapPathTapsOfMap(hooks.varDeclarationVar, 1);
		wrapPathTapsOfMap(hooks.pattern, 1);
		wrapPathTaps(hooks.collectDestructuringAssignmentProperties, 1);
		wrapPathTapsOfMap(hooks.canRename, 1);
		wrapPathTapsOfMap(hooks.rename, 1);
		wrapPathTapsOfMap(hooks.assign, 1);
		wrapPathTapsOfMap(hooks.write, 1);
		wrapPathTapsOfMap(hooks.writeMemberChain, 1);
		wrapPathTapsOfMap(hooks.assignMemberChain, 1);
		wrapPathTapsOfMap(hooks.typeof, 1);
		wrapPathTaps(hooks.importCall, 3);
		wrapPathTaps(hooks.topLevelAwait, 1);
		wrapPathTapsOfMap(hooks.call, 1);
		wrapPathTapsOfMap(hooks.callMemberChain, 1);
		wrapPathTapsOfMap(hooks.memberChainOfCallMemberChain, 5);
		wrapPathTapsOfMap(hooks.callMemberChainOfCallMemberChain, 5);
		wrapPathTaps(hooks.optionalChaining, 1);
		wrapPathTapsOfMap(hooks.new, 1);
		wrapPathTaps(hooks.binaryExpression, 1);
		wrapPathTapsOfMap(hooks.expression, 1);
		wrapPathTapsOfMap(hooks.expressionMemberChain, 1);
		wrapPathTapsOfMap(hooks.unhandledExpressionMemberChain, 1);
		wrapPathTaps(hooks.expressionConditionalOperator, 1);
		wrapPathTaps(hooks.expressionLogicalOperator, 1);
		wrapPathTaps(hooks.terminate, 1);
		wrapPathTaps(hooks.unusedStatement, 1);
	}

	/**
	 * The statements being walked, outermost first.
	 * @returns {StatementPath | undefined} the statements being walked
	 */
	get statementPath() {
		const path = this._statementPath;
		if (path !== undefined) {
			for (let index = 0, len = path.length; index < len; index++) {
				const item = path[index];
				if (typeof item === "number") {
					path[index] = /** @type {StatementPathItem} */ (toEstreeObject(item));
				}
			}
		}
		return /** @type {StatementPath | undefined} */ (path);
	}

	/**
	 * @param {StatementPath | undefined} value the statements being walked
	 */
	set statementPath(value) {
		this._statementPath = value;
	}

	/**
	 * The statement walked last before the current one.
	 * @returns {PrevStatement | undefined} the previous statement
	 */
	get prevStatement() {
		const prev = this._prevStatement;
		if (typeof prev === "number") {
			return (this._prevStatement = /** @type {PrevStatement} */ (
				toEstreeObject(prev)
			));
		}
		return prev;
	}

	/**
	 * @param {PrevStatement | undefined} value the previous statement
	 */
	set prevStatement(value) {
		this._prevStatement = value;
	}

	/**
	 * One of the statements being walked, as an object.
	 * @param {number} index its depth in `statementPath`
	 * @returns {StatementPathItem} the statement
	 */
	_statementAt(index) {
		const path = /** @type {(StatementPathItem | number)[]} */ (
			this._statementPath
		);
		const item = path[index];
		if (typeof item !== "number") return item;
		return (path[index] = /** @type {StatementPathItem} */ (
			toEstreeObject(item)
		));
	}

	/**
	 * Checks whether this javascript parser is asi position.
	 * @param {number} pos source code position
	 * @returns {boolean} true when a semicolon has been inserted before this position, false if not
	 */
	isAsiPosition(pos) {
		if (this._statementPath === undefined || this._statementPath.length === 0) {
			throw new Error("Not in statement");
		}
		const currentStatement = this._statementAt(this._statementPath.length - 1);
		const prevStatement = this.prevStatement;
		const range = /** @type {Range} */ (currentStatement.range);

		return (
			// Either asking directly for the end position of the current statement
			(range[1] === pos && this._isAsiPosition(pos)) ||
			// Or asking for the start position of the current statement,
			// here we have to check multiple things
			(range[0] === pos &&
				// is there a previous statement which might be relevant?
				prevStatement !== undefined &&
				// is the end position of the previous statement an ASI position?
				this._isAsiPosition(/** @type {Range} */ (prevStatement.range)[1]))
		);
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
	 * @param {Expression} expr expression
	 * @returns {boolean} true, when the expression is a statement level expression
	 */
	isStatementLevelExpression(expr) {
		const currentStatement = this._statementAt(
			/** @type {(StatementPathItem | number)[]} */ (this._statementPath)
				.length - 1
		);
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
		const getMemberRanges = () =>
			memberRanges ||
			(memberRanges = memberRangesOf(expression, members.length));
		const rootInfo = /** @type {string | VariableInfo} */ (
			this._memberRootInfo
		);
		/** @type {CallExpressionInfo | ExpressionExpressionInfo} */
		let info;
		if (type === 2) {
			const calleeMembers = this._memberCalleeMembers;
			info = {
				type: "call",
				call: /** @type {CallExpression} */ (this._memberCall),
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
	 * Whether nothing but the parser itself intercepts a hook: the id walk's
	 * own interceptor only rewraps taps, so a fast path may ignore it.
	 * @template T
	 * @template R
	 * @param {import("tapable").Hook<T, R>} hook the hook
	 * @returns {boolean} true when no one else intercepts the hook
	 */
	static ownInterceptorsOnly(hook) {
		return ownInterceptorsOnly(hook);
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
	 * Returns parse result.
	 * @param {string} code source code
	 * @param {InternalParseOptions} options parsing options
	 * @param {ParseFunction=} customParse custom function to parse
	 * @returns {ParseResult} parse result
	 */
	static _parse(code, options, customParse) {
		const type = options ? options.sourceType : "module";
		if (
			typeof customParse !== "function" &&
			parser === WebpackParser &&
			options.ranges === true &&
			options.locations !== true
		) {
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
		/** @type {ParseOptions} */
		let parserOptions;
		if (typeof customParse === "function") {
			// a user parse function may retain the options object — keep it fresh
			parserOptions = {
				...defaultParserOptions,
				allowReturnOutsideFunction: type === "script",
				...options,
				sourceType: type === "auto" ? "module" : type
			};
		} else {
			// reuse one options object across parses (parsing is synchronous) to
			// skip re-materializing it per module; acorn copies it via getOptions.
			// Every non-default key a caller may pass must be reset here.
			parserOptions = REUSED_PARSER_OPTIONS;
			parserOptions.importPhases = false;
			Object.assign(parserOptions, defaultParserOptions);
			parserOptions.allowReturnOutsideFunction = type === "script";
			if (options) Object.assign(parserOptions, options);
			parserOptions.sourceType = type === "auto" ? "module" : type;
			// let WebpackParser downgrade module->script in place on script-only
			// syntax so `auto` avoids a second full parse in the common case
			parserOptions.moduleFallback = type === "auto";
		}
		// `locations` are acorn's to track, so the lazy path serves the callers
		// that ask for ranges alone — which is every one inside webpack
		const wantLazyNodes =
			parserOptions.ranges === true && parserOptions.locations !== true;
		/**
		 * Returns parse result.
		 * @param {string} code source code
		 * @param {ParseOptions} options parsing options
		 * @returns {ParseResult} parse result
		 */
		const internalParse = (code, options) => {
			if (typeof customParse === "function") {
				return customParse(code, options);
			}

			/** @type {Comment[]} */
			const comments = [];

			// Ranges alone (the main parse path and the concatenation re-parse) are
			// served on demand; hoisted, since the auto-fallback re-enters here.
			options.lazyNodes = wantLazyNodes;
			if (wantLazyNodes) {
				// the lazy plugin replaces acorn's native tracking — disabling it
				// here lets WebpackParser skip its defensive options copy
				options.ranges = false;
			}

			if (options.comments) {
				if (wantLazyNodes) {
					// the parser plugin collects the comments itself, deferring the
					// text slice until some hook actually reads `value`
					options.lazyComments = comments;
				} else {
					/** @type {ParserOptions} */
					(options).onComment = comments;
				}
			}

			const ast = /** @type {Program} */ (parser.parse(code, options));

			return { ast, comments };
		};

		/** @type {Program | undefined} */
		let ast;
		/** @type {Comment[] | undefined} */
		let comments;
		let error;
		let threw = false;
		try {
			({ ast, comments } = internalParse(code, parserOptions));
		} catch (err) {
			error = err;
			threw = true;
		}

		if (threw && type === "auto") {
			parserOptions.sourceType = "script";
			parserOptions.allowReturnOutsideFunction = true;
			// the retry is already a full script parse — no in-place downgrade
			parserOptions.moduleFallback = false;

			try {
				({ ast, comments } = internalParse(code, parserOptions));
				threw = false;
			} catch (_err) {
				// we use the error from first parse try
				// so nothing to do here
			}
		}

		// release per-parse state retained on the (possibly reused) options
		// object — the comments array retains source text slices
		parserOptions.lazyComments = undefined;
		/** @type {ParserOptions} */
		(parserOptions).onComment = undefined;

		if (threw) {
			throw error;
		}

		return /** @type {ParseResult} */ ({ ast, comments });
	}

	/**
	 * Returns parser.
	 * @param {ParserPlugin[]} plugins parser plugin
	 * @returns {typeof JavascriptParser} parser
	 */
	static extend(...plugins) {
		parser = parser.extend(...plugins);
		return JavascriptParser;
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
