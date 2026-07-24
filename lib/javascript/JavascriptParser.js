/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { HookMap, SyncBailHook } = require("tapable");
const NormalModule = require("../NormalModule");
const Parser = require("../Parser");
const WebpackError = require("../WebpackError");
const StackedMap = require("../util/StackedMap");
const {
	CompilerHintNotationRegExp,
	createMagicCommentContext,
	getCommentsInRange,
	parseCommentOptionsInRange
} = require("../util/magicComment");
const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");
const {
	LEGACY_ASSERT_ATTRIBUTES,
	SoaAst,
	WebpackParser,
	buildLineStarts,
	hasOctalEscape,
	positionAt
} = require("./syntax");

// Phase D id-based walk: facade→store/id symbol keys and the numeric NodeType
// ids the walk dispatches on. Reading these once keeps the hot switch on
// module-level integer constants (V8 builds a jump table).
const SOA_KEY_STORE = SoaAst.KEY_STORE;
const SOA_KEY_ID = SoaAst.KEY_ID;
const SOA_KEY_MEMO = SoaAst.KEY_MEMO;
const SOA_TYPE = SoaAst.TYPE;
const SOA_FLAG_COMPUTED = SoaAst.FLAG_COMPUTED;
const SOA_FLAG_SHORTHAND = SoaAst.FLAG_SHORTHAND;
const T_EXPRESSION_STATEMENT = SOA_TYPE.ExpressionStatement;
const T_BLOCK_STATEMENT = SOA_TYPE.BlockStatement;
const T_RETURN_STATEMENT = SOA_TYPE.ReturnStatement;
const T_THROW_STATEMENT = SOA_TYPE.ThrowStatement;
const T_IF_STATEMENT = SOA_TYPE.IfStatement;
const T_WHILE_STATEMENT = SOA_TYPE.WhileStatement;
const T_DO_WHILE_STATEMENT = SOA_TYPE.DoWhileStatement;
const T_EMPTY_STATEMENT = SOA_TYPE.EmptyStatement;
const T_DEBUGGER_STATEMENT = SOA_TYPE.DebuggerStatement;
const T_FUNCTION_DECLARATION = SOA_TYPE.FunctionDeclaration;
const T_FUNCTION_EXPRESSION = SOA_TYPE.FunctionExpression;
const T_ARROW_FUNCTION_EXPRESSION = SOA_TYPE.ArrowFunctionExpression;
const T_IDENTIFIER = SOA_TYPE.Identifier;
const T_LITERAL = SOA_TYPE.Literal;
const T_ARRAY_EXPRESSION = SOA_TYPE.ArrayExpression;
const T_SPREAD_ELEMENT = SOA_TYPE.SpreadElement;
const T_UPDATE_EXPRESSION = SOA_TYPE.UpdateExpression;
const T_AWAIT_EXPRESSION = SOA_TYPE.AwaitExpression;
const T_MEMBER_EXPRESSION = SOA_TYPE.MemberExpression;
const T_CALL_EXPRESSION = SOA_TYPE.CallExpression;
const T_NEW_EXPRESSION = SOA_TYPE.NewExpression;
const T_BINARY_EXPRESSION = SOA_TYPE.BinaryExpression;
const T_LOGICAL_EXPRESSION = SOA_TYPE.LogicalExpression;
const T_ASSIGNMENT_EXPRESSION = SOA_TYPE.AssignmentExpression;
const T_UNARY_EXPRESSION = SOA_TYPE.UnaryExpression;
const T_CONDITIONAL_EXPRESSION = SOA_TYPE.ConditionalExpression;
const T_OBJECT_EXPRESSION = SOA_TYPE.ObjectExpression;
const T_PROPERTY = SOA_TYPE.Property;
const T_SEQUENCE_EXPRESSION = SOA_TYPE.SequenceExpression;
const T_TEMPLATE_LITERAL = SOA_TYPE.TemplateLiteral;
const T_CHAIN_EXPRESSION = SOA_TYPE.ChainExpression;
const T_YIELD_EXPRESSION = SOA_TYPE.YieldExpression;
const T_VARIABLE_DECLARATION = SOA_TYPE.VariableDeclaration;
const T_THIS_EXPRESSION = SOA_TYPE.ThisExpression;
const T_FOR_STATEMENT = SOA_TYPE.ForStatement;
const T_FOR_IN_STATEMENT = SOA_TYPE.ForInStatement;
const T_FOR_OF_STATEMENT = SOA_TYPE.ForOfStatement;
const T_SWITCH_STATEMENT = SOA_TYPE.SwitchStatement;
const T_TRY_STATEMENT = SOA_TYPE.TryStatement;
const T_LABELED_STATEMENT = SOA_TYPE.LabeledStatement;
const T_WITH_STATEMENT = SOA_TYPE.WithStatement;
const T_BREAK_STATEMENT = SOA_TYPE.BreakStatement;
const T_CONTINUE_STATEMENT = SOA_TYPE.ContinueStatement;
const T_OBJECT_PATTERN = SOA_TYPE.ObjectPattern;
const T_IMPORT_EXPRESSION = SOA_TYPE.ImportExpression;
const T_CLASS_DECLARATION = SOA_TYPE.ClassDeclaration;
const T_IMPORT_DECLARATION = SOA_TYPE.ImportDeclaration;
const T_EXPORT_NAMED_DECLARATION = SOA_TYPE.ExportNamedDeclaration;
const T_EXPORT_DEFAULT_DECLARATION = SOA_TYPE.ExportDefaultDeclaration;
const T_EXPORT_ALL_DECLARATION = SOA_TYPE.ExportAllDeclaration;
// operator ids stored in the `aux` column
const SOA_OP_IN = /** @type {number} */ (SoaAst.OPERATOR_IDS.get("in"));
const SOA_OP_TYPEOF = /** @type {number} */ (SoaAst.OPERATOR_IDS.get("typeof"));
const SOA_OP_DELETE = /** @type {number} */ (SoaAst.OPERATOR_IDS.get("delete"));
const SOA_TYPE_NAMES = SoaAst.TYPE_NAMES;
const SOA_FLAG_AWAIT = SoaAst.FLAG_AWAIT;
// `VariableDeclaration.kind` ids stored in the `aux` column
const DECL_KIND_VAR = SoaAst.DECLARATION_KINDS.indexOf("var");
const DECL_KIND_CONST = SoaAst.DECLARATION_KINDS.indexOf("const");

/** @typedef {typeof import("acorn").Parser} AcornParser */
/** @typedef {import("acorn").Options} AcornOptions */
/** @typedef {import("acorn").ecmaVersion} EcmaVersion */
/** @typedef {import("estree").AssignmentExpression} AssignmentExpression */
/** @typedef {import("estree").BinaryExpression} BinaryExpression */
/** @typedef {import("estree").BlockStatement} BlockStatement */
/** @typedef {import("estree").SequenceExpression} SequenceExpression */
/** @typedef {import("estree").CallExpression} CallExpression */
/** @typedef {import("estree").StaticBlock} StaticBlock */
/** @typedef {import("estree").ClassDeclaration} ClassDeclaration */
/** @typedef {import("estree").ForStatement} ForStatement */
/** @typedef {import("estree").SwitchStatement} SwitchStatement */
/** @typedef {import("estree").ClassExpression} ClassExpression */
/** @typedef {import("estree").SourceLocation} SourceLocation */
/** @typedef {import("../Dependency").DependencyLocation} DependencyLocation */
/** @typedef {import("../Dependency").SourcePosition} SourcePosition */
/** @typedef {import("estree").Comment & { start: number, end: number, loc?: SourceLocation | null }} Comment */
/** @typedef {import("estree").ConditionalExpression} ConditionalExpression */
/** @typedef {import("estree").Declaration} Declaration */
/** @typedef {import("estree").PrivateIdentifier} PrivateIdentifier */
/** @typedef {import("estree").PropertyDefinition} PropertyDefinition */
/** @typedef {import("estree").Expression} Expression */
/** @typedef {import("estree").ImportAttribute} ImportAttribute */
/** @typedef {import("estree").ImportDeclaration} ImportDeclaration */
/** @typedef {import("estree").Identifier} Identifier */
/** @typedef {import("estree").VariableDeclaration} VariableDeclaration */
/** @typedef {import("estree").IfStatement} IfStatement */
/** @typedef {import("estree").LabeledStatement} LabeledStatement */
/** @typedef {import("estree").Literal} Literal */
/** @typedef {import("estree").LogicalExpression} LogicalExpression */
/** @typedef {import("estree").ChainExpression} ChainExpression */
/** @typedef {import("estree").MemberExpression} MemberExpression */
/** @typedef {import("estree").YieldExpression} YieldExpression */
/** @typedef {import("estree").MetaProperty} MetaProperty */
/** @typedef {import("estree").Property} Property */
/** @typedef {import("estree").AssignmentPattern} AssignmentPattern */
/** @typedef {import("estree").Pattern} Pattern */
/** @typedef {import("estree").UpdateExpression} UpdateExpression */
/** @typedef {import("estree").ObjectExpression} ObjectExpression */
/** @typedef {import("estree").UnaryExpression} UnaryExpression */
/** @typedef {import("estree").ArrayExpression} ArrayExpression */
/** @typedef {import("estree").ArrayPattern} ArrayPattern */
/** @typedef {import("estree").AwaitExpression} AwaitExpression */
/** @typedef {import("estree").ThisExpression} ThisExpression */
/** @typedef {import("estree").RestElement} RestElement */
/** @typedef {import("estree").ObjectPattern} ObjectPattern */
/** @typedef {import("estree").SwitchCase} SwitchCase */
/** @typedef {import("estree").CatchClause} CatchClause */
/** @typedef {import("estree").VariableDeclarator} VariableDeclarator */
/** @typedef {import("estree").ForInStatement} ForInStatement */
/** @typedef {import("estree").ForOfStatement} ForOfStatement */
/** @typedef {import("estree").ReturnStatement} ReturnStatement */
/** @typedef {import("estree").WithStatement} WithStatement */
/** @typedef {import("estree").ThrowStatement} ThrowStatement */
/** @typedef {import("estree").MethodDefinition} MethodDefinition */
/** @typedef {import("estree").NewExpression} NewExpression */
/** @typedef {import("estree").SpreadElement} SpreadElement */
/** @typedef {import("estree").FunctionExpression} FunctionExpression */
/** @typedef {import("estree").WhileStatement} WhileStatement */
/** @typedef {import("estree").ArrowFunctionExpression} ArrowFunctionExpression */
/** @typedef {import("estree").ExpressionStatement} ExpressionStatement */
/** @typedef {import("estree").ExportAllDeclaration} ExportAllDeclaration */
/** @typedef {import("estree").ExportNamedDeclaration} ExportNamedDeclaration */
/** @typedef {import("estree").FunctionDeclaration} FunctionDeclaration */
/** @typedef {import("estree").DoWhileStatement} DoWhileStatement */
/** @typedef {import("estree").TryStatement} TryStatement */
/** @typedef {import("estree").Node} Node */
/** @typedef {import("estree").Program} Program */
/** @typedef {import("estree").Directive} Directive */
/** @typedef {import("estree").Statement} Statement */
/** @typedef {import("estree").ExportDefaultDeclaration} ExportDefaultDeclaration */
/** @typedef {import("estree").Super} Super */
/** @typedef {import("estree").TaggedTemplateExpression} TaggedTemplateExpression */
/** @typedef {import("estree").TemplateLiteral} TemplateLiteral */
/** @typedef {import("estree").ModuleDeclaration} ModuleDeclaration */
/** @typedef {import("estree").MaybeNamedFunctionDeclaration} MaybeNamedFunctionDeclaration */
/** @typedef {import("estree").MaybeNamedClassDeclaration} MaybeNamedClassDeclaration */
/**
 * Defines the shared type used by this module.
 * @template T
 * @typedef {import("tapable").AsArray<T>} AsArray<T>
 */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */

/** @typedef {import("../dependencies/LocalModule")} LocalModule */
/** @typedef {import("../dependencies/HarmonyExportImportedSpecifierDependency").HarmonyStarExportsList} HarmonyStarExportsList */

/**
 * Defines the known javascript parser state type used by this module.
 * @typedef {object} KnownJavascriptParserState
 * @property {Set<string>=} harmonyNamedExports
 * @property {HarmonyStarExportsList=} harmonyStarExports
 * @property {number=} lastHarmonyImportOrder
 * @property {LocalModule[]=} localModules
 */

/** @typedef {ParserState & KnownJavascriptParserState} JavascriptParserState */

/** @typedef {import("../Compilation")} Compilation */
/** @typedef {import("../Module")} Module */

/** @typedef {{ name: string | VariableInfo, rootInfo: string | VariableInfo, getMembers: () => Members, getMembersOptionals: () => MembersOptionals, getMemberRanges: () => MemberRanges }} GetInfoResult */
/** @typedef {{ consequent?: EXPECTED_OBJECT, alternate?: EXPECTED_OBJECT }} GuardCollection per-branch guard frames pushed onto the parser state guard stack */
/** @typedef {Statement | ModuleDeclaration | Expression | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration} StatementPathItem */
/** @typedef {(ident: string) => void} OnIdentString */
/** @typedef {(ident: string, identifier: Identifier) => void} OnIdent */
/** @typedef {StatementPathItem[]} StatementPath */

/** @typedef {Set<DestructuringAssignmentProperty>} DestructuringAssignmentProperties */

// TODO remove cast when @types/estree has been updated to import phases
/** @typedef {import("estree").ImportExpression & { phase?: "defer" | "source" }} ImportExpression */

/** @type {string[]} */
const EMPTY_ARRAY = [];

/**
 * Getter that reverses `arr` in place on first access and caches it. Lighter
 * than `memoize(() => arr.reverse())` (one closure instead of two) and called
 * per member expression on hot parse paths.
 * @template T
 * @param {T[]} arr array reversed lazily on first access
 * @returns {() => T[]} getter returning the reversed array
 */
const lazyReverse = (arr) => {
	let reversed = false;
	return () => {
		if (!reversed) {
			arr.reverse();
			reversed = true;
		}
		return arr;
	};
};

const ALLOWED_MEMBER_TYPES_CALL_EXPRESSION = 0b01;
const ALLOWED_MEMBER_TYPES_EXPRESSION = 0b10;
const ALLOWED_MEMBER_TYPES_ALL = 0b11;

// Shared `() => false` so the members-optionals fallback in walkCallExpression
// doesn't allocate a fresh closure per identifier-rooted call.
const RETURN_FALSE = () => false;

// Shared `() => []` for the member-less identifier/this evaluation results,
// replacing three fresh closures per evaluated free variable.
const RETURN_EMPTY_ARRAY = () => [];

// Syntax: https://developer.mozilla.org/en/SpiderMonkey/Parser_API
let parser = /** @type {AcornParser} */ (WebpackParser);

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

	if (/** @type {EXPECTED_ANY} */ (node.attributes)[LEGACY_ASSERT_ATTRIBUTES]) {
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
 * @property {boolean=} lazyNodes internal: serve `range` lazily and skip acorn's location/range tracking
 * @property {Comment[]=} lazyComments internal: collect comments here without slicing their text eagerly
 * @property {boolean=} importPhases enable parsing of the import phase proposals (import defer / import source)
 * @property {boolean=} moduleFallback internal: for `auto`, let the parser downgrade module->script in place instead of re-parsing
 * @property {boolean=} estree emit plain estree object nodes instead of the default SoA column store — own-key traversals (eslint-scope) need them
 * @property {boolean=} transientAst internal: the store dies with the caller's walk, so skip the column snug after parse
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

/** @typedef {symbol} Tag */

/** @typedef {import("../dependencies/HarmonyImportDependencyParserPlugin").HarmonySettings} HarmonySettings */
/** @typedef {import("../dependencies/ImportParserPlugin").ImportSettings} ImportSettings */
/** @typedef {import("../dependencies/CommonJsImportsParserPlugin").CommonJsImportSettings} CommonJsImportSettings */
/** @typedef {import("../CompatibilityPlugin").CompatibilitySettings} CompatibilitySettings */
/** @typedef {import("../optimize/InnerGraph").TopLevelSymbol} TopLevelSymbol */

/** @typedef {HarmonySettings | ImportSettings | CommonJsImportSettings | TopLevelSymbol | CompatibilitySettings} KnownTagData */
/** @typedef {KnownTagData | Record<string, EXPECTED_ANY>} TagData */

/**
 * Defines the tag info type used by this module.
 * @typedef {object} TagInfo
 * @property {Tag} tag
 * @property {TagData=} data
 * @property {TagInfo | undefined} next
 */

/** @typedef {string[]} CalleeMembers */
/** @typedef {string[]} Members */
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
 * @param {Members} membersReversed reversed list of members
 * @returns {string} member expression as a string
 * @example
 * ```js
 * const membersReversed = ["property1", "property2", "property3"]; // Members parsed from the AST
 * const name = objectAndMembersToName("myObject", membersReversed);
 *
 * console.log(name); // "myObject.property1.property2.property3"
 * ```
 */
const objectAndMembersToName = (object, membersReversed) => {
	let name = object;
	for (let i = membersReversed.length - 1; i >= 0; i--) {
		name = `${name}.${membersReversed[i]}`;
	}
	return name;
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
	allowHashBang: true,
	// the column store is the default backend; own-key traversals
	// (eslint-scope) opt back into plain object nodes with `estree: true`
	estree: false,
	// direct callers may retain the AST, so their columns still get snugged
	transientAst: false
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

const CLASS_NAME = "JavascriptParser";

// Evaluation-inert candidates for `_soaCannotRename`: types whose
// `evaluate` result provably can never be an identifier. `ownTaps: true`
// types carry parser taps that only build computed values; the rest have
// no own tap, so any tap at all disqualifies them. Indirection-dispatching
// types (New/Call → evaluateNewExpression/evaluateCallExpressionMember,
// Sequence/Chain/Logical forward sub-evaluations) stay out.
const SOA_EVAL_INERT_CANDIDATES = [
	{ type: SOA_TYPE.Literal, name: "Literal", ownTaps: true },
	{ type: SOA_TYPE.UnaryExpression, name: "UnaryExpression", ownTaps: true },
	{ type: SOA_TYPE.BinaryExpression, name: "BinaryExpression", ownTaps: true },
	{ type: SOA_TYPE.TemplateLiteral, name: "TemplateLiteral", ownTaps: true },
	{ type: SOA_TYPE.ArrayExpression, name: "ArrayExpression", ownTaps: true },
	{ type: SOA_TYPE.ObjectExpression, name: "ObjectExpression", ownTaps: false },
	{
		type: SOA_TYPE.FunctionExpression,
		name: "FunctionExpression",
		ownTaps: false
	},
	{
		type: SOA_TYPE.ArrowFunctionExpression,
		name: "ArrowFunctionExpression",
		ownTaps: false
	},
	{
		type: SOA_TYPE.UpdateExpression,
		name: "UpdateExpression",
		ownTaps: false
	},
	{ type: SOA_TYPE.AwaitExpression, name: "AwaitExpression", ownTaps: false },
	{ type: SOA_TYPE.YieldExpression, name: "YieldExpression", ownTaps: false }
];

class JavascriptParser extends Parser {
	/**
	 * Creates an instance of JavascriptParser.
	 * @param {"module" | "script" | "auto"=} sourceType default source type
	 * @param {{ parse?: ParseFunction, typescript?: boolean, importPhases?: boolean, strictModeViolations?: "error" | "warn" | false }=} options parser options
	 */
	constructor(sourceType = "auto", options = {}) {
		super();
		this.hooks = Object.freeze({
			/** @type {HookMap<SyncBailHook<[UnaryExpression], BasicEvaluatedExpression | null | undefined>>} */
			evaluateTypeof: new HookMap(() => new SyncBailHook(["expression"])),
			/** @type {HookMap<SyncBailHook<[Expression | SpreadElement | PrivateIdentifier | Super], BasicEvaluatedExpression | null | undefined>>} */
			evaluate: new HookMap(() => new SyncBailHook(["expression"])),
			/** @type {HookMap<SyncBailHook<[Identifier | ThisExpression | MemberExpression | MetaProperty], BasicEvaluatedExpression | null | undefined>>} */
			evaluateIdentifier: new HookMap(() => new SyncBailHook(["expression"])),
			/** @type {HookMap<SyncBailHook<[Identifier | ThisExpression | MemberExpression], BasicEvaluatedExpression | null | undefined>>} */
			evaluateDefinedIdentifier: new HookMap(
				() => new SyncBailHook(["expression"])
			),
			/** @type {HookMap<SyncBailHook<[NewExpression], BasicEvaluatedExpression | null | undefined>>} */
			evaluateNewExpression: new HookMap(
				() => new SyncBailHook(["expression"])
			),
			/** @type {HookMap<SyncBailHook<[CallExpression], BasicEvaluatedExpression | null | undefined>>} */
			evaluateCallExpression: new HookMap(
				() => new SyncBailHook(["expression"])
			),
			/** @type {HookMap<SyncBailHook<[CallExpression, BasicEvaluatedExpression], BasicEvaluatedExpression | null | undefined>>} */
			evaluateCallExpressionMember: new HookMap(
				() => new SyncBailHook(["expression", "param"])
			),
			/** @type {HookMap<SyncBailHook<[Expression | Declaration | PrivateIdentifier | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration, number], boolean | void>>} */
			isPure: new HookMap(
				() => new SyncBailHook(["expression", "commentsStartPosition"])
			),
			/** @type {SyncBailHook<[Statement | ModuleDeclaration | MaybeNamedClassDeclaration | MaybeNamedFunctionDeclaration], boolean | void>} */
			preStatement: new SyncBailHook(["statement"]),
			/** @type {HookMap<SyncBailHook<[Statement | ModuleDeclaration | MaybeNamedClassDeclaration | MaybeNamedFunctionDeclaration], boolean | void>>} */
			preStatementByType: new HookMap(() => new SyncBailHook(["statement"])),

			/** @type {SyncBailHook<[Statement | ModuleDeclaration | MaybeNamedClassDeclaration | MaybeNamedFunctionDeclaration], boolean | void>} */
			blockPreStatement: new SyncBailHook(["declaration"]),
			/** @type {HookMap<SyncBailHook<[Statement | ModuleDeclaration | MaybeNamedClassDeclaration | MaybeNamedFunctionDeclaration], boolean | void>>} */
			blockPreStatementByType: new HookMap(
				() => new SyncBailHook(["declaration"])
			),
			/** @type {SyncBailHook<[Statement | ModuleDeclaration | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration], boolean | void>} */
			statement: new SyncBailHook(["statement"]),
			/** @type {SyncBailHook<[IfStatement], boolean | void>} */
			statementIf: new SyncBailHook(["statement"]),
			/** @type {SyncBailHook<[Expression], GuardCollection | void>} */
			collectGuards: new SyncBailHook(["expression"]),
			/** @type {SyncBailHook<[Expression, ClassExpression | ClassDeclaration | MaybeNamedClassDeclaration], boolean | void>} */
			classExtendsExpression: new SyncBailHook([
				"expression",
				"classDefinition"
			]),
			/** @type {SyncBailHook<[MethodDefinition | PropertyDefinition | StaticBlock, ClassExpression | ClassDeclaration | MaybeNamedClassDeclaration], boolean | void>} */
			classBodyElement: new SyncBailHook(["element", "classDefinition"]),
			/** @type {SyncBailHook<[Expression, MethodDefinition | PropertyDefinition, ClassExpression | ClassDeclaration | MaybeNamedClassDeclaration], boolean | void>} */
			classBodyValue: new SyncBailHook([
				"expression",
				"element",
				"classDefinition"
			]),
			/** @type {HookMap<SyncBailHook<[LabeledStatement], boolean | void>>} */
			label: new HookMap(() => new SyncBailHook(["statement"])),
			/** @type {SyncBailHook<[ImportDeclaration, ImportSource], boolean | void>} */
			import: new SyncBailHook(["statement", "source"]),
			/** @type {SyncBailHook<[ImportDeclaration, ImportSource, string | null, string], boolean | void>} */
			importSpecifier: new SyncBailHook([
				"statement",
				"source",
				"exportName",
				"identifierName"
			]),
			/** @type {SyncBailHook<[ExportDefaultDeclaration | ExportNamedDeclaration], boolean | void>} */
			export: new SyncBailHook(["statement"]),
			/** @type {SyncBailHook<[ExportNamedDeclaration | ExportAllDeclaration, ImportSource], boolean | void>} */
			exportImport: new SyncBailHook(["statement", "source"]),
			/** @type {SyncBailHook<[ExportDefaultDeclaration | ExportNamedDeclaration | ExportAllDeclaration, Declaration], boolean | void>} */
			exportDeclaration: new SyncBailHook(["statement", "declaration"]),
			/** @type {SyncBailHook<[ExportDefaultDeclaration, MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration | Expression], boolean | void>} */
			exportExpression: new SyncBailHook(["statement", "node"]),
			/** @type {SyncBailHook<[ExportDefaultDeclaration | ExportNamedDeclaration | ExportAllDeclaration, string, string, number | undefined], boolean | void>} */
			exportSpecifier: new SyncBailHook([
				"statement",
				"identifierName",
				"exportName",
				"index"
			]),
			/** @type {SyncBailHook<[ExportNamedDeclaration | ExportAllDeclaration, ImportSource, string | null, string | null, number | undefined], boolean | void>} */
			exportImportSpecifier: new SyncBailHook([
				"statement",
				"source",
				"identifierName",
				"exportName",
				"index"
			]),
			/** @type {SyncBailHook<[VariableDeclarator, VariableDeclaration], boolean | void>} */
			preDeclarator: new SyncBailHook(["declarator", "statement"]),
			/** @type {SyncBailHook<[VariableDeclarator, Statement], boolean | void>} */
			declarator: new SyncBailHook(["declarator", "statement"]),
			/** @type {HookMap<SyncBailHook<[Identifier], boolean | void>>} */
			varDeclaration: new HookMap(() => new SyncBailHook(["declaration"])),
			/** @type {HookMap<SyncBailHook<[Identifier], boolean | void>>} */
			varDeclarationLet: new HookMap(() => new SyncBailHook(["declaration"])),
			/** @type {HookMap<SyncBailHook<[Identifier], boolean | void>>} */
			varDeclarationConst: new HookMap(() => new SyncBailHook(["declaration"])),
			/** @type {HookMap<SyncBailHook<[Identifier], boolean | void>>} */
			varDeclarationUsing: new HookMap(() => new SyncBailHook(["declaration"])),
			/** @type {HookMap<SyncBailHook<[Identifier], boolean | void>>} */
			varDeclarationVar: new HookMap(() => new SyncBailHook(["declaration"])),
			/** @type {HookMap<SyncBailHook<[Identifier], boolean | void>>} */
			pattern: new HookMap(() => new SyncBailHook(["pattern"])),
			/** @type {SyncBailHook<[Expression], boolean | void>} */
			collectDestructuringAssignmentProperties: new SyncBailHook([
				"expression"
			]),
			/** @type {HookMap<SyncBailHook<[Expression], boolean | void>>} */
			canRename: new HookMap(() => new SyncBailHook(["initExpression"])),
			/** @type {HookMap<SyncBailHook<[Expression], boolean | void>>} */
			rename: new HookMap(() => new SyncBailHook(["initExpression"])),
			/** @type {HookMap<SyncBailHook<[AssignmentExpression], boolean | void>>} */
			assign: new HookMap(() => new SyncBailHook(["expression"])),
			/** @type {HookMap<SyncBailHook<[AssignmentExpression, Members], boolean | void>>} */
			assignMemberChain: new HookMap(
				() => new SyncBailHook(["expression", "members"])
			),
			/** @type {HookMap<SyncBailHook<[Expression], boolean | void>>} */
			typeof: new HookMap(() => new SyncBailHook(["expression"])),
			/** @type {SyncBailHook<[ImportExpression, CallExpression?], boolean | void>} */
			importCall: new SyncBailHook(["expression", "importThen"]),
			/** @type {SyncBailHook<[Expression | ForOfStatement], boolean | void>} */
			topLevelAwait: new SyncBailHook(["expression"]),
			/** @type {HookMap<SyncBailHook<[CallExpression], boolean | void>>} */
			call: new HookMap(() => new SyncBailHook(["expression"])),
			/** Something like "a.b()" */
			/** @type {HookMap<SyncBailHook<[CallExpression, Members, MembersOptionals, MemberRanges], boolean | void>>} */
			callMemberChain: new HookMap(
				() =>
					new SyncBailHook([
						"expression",
						"members",
						"membersOptionals",
						"memberRanges"
					])
			),
			/** Something like "a.b().c.d" */
			/** @type {HookMap<SyncBailHook<[Expression, CalleeMembers, CallExpression, Members, MemberRanges], boolean | void>>} */
			memberChainOfCallMemberChain: new HookMap(
				() =>
					new SyncBailHook([
						"expression",
						"calleeMembers",
						"callExpression",
						"members",
						"memberRanges"
					])
			),
			/** Something like "a.b().c.d()"" */
			/** @type {HookMap<SyncBailHook<[CallExpression, CalleeMembers, CallExpression, Members, MemberRanges], boolean | void>>} */
			callMemberChainOfCallMemberChain: new HookMap(
				() =>
					new SyncBailHook([
						"expression",
						"calleeMembers",
						"innerCallExpression",
						"members",
						"memberRanges"
					])
			),
			/** @type {SyncBailHook<[ChainExpression], boolean | void>} */
			optionalChaining: new SyncBailHook(["optionalChaining"]),
			/** @type {HookMap<SyncBailHook<[NewExpression], boolean | void>>} */
			new: new HookMap(() => new SyncBailHook(["expression"])),
			/** @type {SyncBailHook<[BinaryExpression], boolean | void>} */
			binaryExpression: new SyncBailHook(["binaryExpression"]),
			/** @type {HookMap<SyncBailHook<[Expression], boolean | void>>} */
			expression: new HookMap(() => new SyncBailHook(["expression"])),
			/** @type {HookMap<SyncBailHook<[MemberExpression, Members, MembersOptionals, MemberRanges], boolean | void>>} */
			expressionMemberChain: new HookMap(
				() =>
					new SyncBailHook([
						"expression",
						"members",
						"membersOptionals",
						"memberRanges"
					])
			),
			/** @type {HookMap<SyncBailHook<[MemberExpression, Members], boolean | void>>} */
			unhandledExpressionMemberChain: new HookMap(
				() => new SyncBailHook(["expression", "members"])
			),
			/** @type {SyncBailHook<[ConditionalExpression], boolean | void>} */
			expressionConditionalOperator: new SyncBailHook(["expression"]),
			/** @type {SyncBailHook<[LogicalExpression], boolean | void>} */
			expressionLogicalOperator: new SyncBailHook(["expression"]),
			/** @type {SyncBailHook<[Program, Comment[]], boolean | void>} */
			program: new SyncBailHook(["ast", "comments"]),
			/** @type {SyncBailHook<[ThrowStatement | ReturnStatement], boolean | void>} */
			terminate: new SyncBailHook(["statement"]),
			/** @type {SyncBailHook<[Program, Comment[]], boolean | void>} */
			finish: new SyncBailHook(["ast", "comments"]),
			/** @type {SyncBailHook<[Statement], boolean | void>} */
			unusedStatement: new SyncBailHook(["statement"])
		});
		this.sourceType = sourceType;
		this.options = options;

		/** @type {ScopeInfo} */
		this.scope = /** @type {EXPECTED_ANY} */ (undefined);
		/** @type {JavascriptParserState} */
		this.state = /** @type {EXPECTED_ANY} */ (undefined);
		/** @type {Comment[] | undefined} */
		this.comments = undefined;
		// ASI overrides keyed by statement-end offset: true forces an ASI
		// position, false forces a real semicolon. Absent offsets are derived
		// from the source text. Allocated lazily by set/unsetAsiPosition.
		/** @type {Map<number, boolean> | undefined} */
		this.semicolons = undefined;
		// the raw path may hold pending column ids for statements no hook has
		// observed yet; the `statementPath` accessor materializes them in place
		/** @type {(StatementPathItem | number)[] | undefined} */
		this._statementPath = undefined;
		/** @type {Statement | ModuleDeclaration | Expression | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration | number | undefined} */
		this._prevStatement = undefined;
		/** @type {SoaAst | undefined} */
		this._soaStore = undefined;
		/** @type {WeakMap<Expression, DestructuringAssignmentProperties> | undefined} */
		this.destructuringAssignmentProperties = undefined;
		/** @type {TagData | undefined} */
		this.currentTagData = undefined;
		// True while parsing a loose module whose code is emitted as strict ESM.
		this._strictInModuleOutput = false;
		// Source text of the current parse, for offset → line/column mapping.
		/** @type {string | undefined} */
		this._source = undefined;
		// Offset of each line's first character, built on first getLocation use.
		/** @type {number[] | undefined} */
		this._lineStarts = undefined;
		// True while only the parser's own taps sit on evaluate.for("Identifier");
		// recomputed per parse, gates the defined-identifier fast paths.
		this._evalIdentOwnTaps = false;
		// Same gate for evaluate.for("MemberExpression"); tolerates the known
		// never-identifier ImportMetaPlugin tap.
		this._evalMemberOwnTaps = false;
		// Same gate for Call/New/Logical/Conditional evaluations, whose own
		// taps forward sub-evaluations or build value results (§_soaCannotRename).
		this._evalCallOwnTaps = false;
		this._evalNewOwnTaps = false;
		this._evalLogicalOwnTaps = false;
		this._evalConditionalOwnTaps = false;
		// 1 per node type whose evaluation can never yield an identifier;
		// recomputed per parse from the tap state.
		this._soaEvalInertTypes = new Uint8Array(SOA_TYPE_NAMES.length);
		// True while the harmony `in` tap is alone on hooks.binaryExpression,
		// so non-`in` binaries provably bail the hook.
		this._soaBinaryInOnlyTaps = false;
		this.magicCommentContext = createMagicCommentContext();
		// Reused for enterPatterns on every scope entry to avoid per-scope closures.
		/** @type {OnIdentString} */
		this._defineVariable = (ident) => this.defineVariable(ident);
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

	/**
	 * The statement path from the program down to the current statement.
	 * Pending column ids (statements no hook has observed) materialize in
	 * place on access — `nodeAt` is identity-stable, so entries always
	 * compare equal to the nodes hooks receive.
	 * @returns {StatementPath | undefined} statement path
	 */
	get statementPath() {
		const path = this._statementPath;
		if (path !== undefined) {
			for (let i = 0; i < path.length; i++) {
				if (typeof path[i] === "number") {
					path[i] =
						/** @type {StatementPathItem} */
						(
							/** @type {SoaAst} */ (this._soaStore).nodeAt(
								/** @type {number} */ (path[i])
							)
						);
				}
			}
		}
		return /** @type {StatementPath | undefined} */ (path);
	}

	set statementPath(value) {
		this._statementPath = value;
	}

	/**
	 * The previously walked sibling statement (a pending column id
	 * materializes on access).
	 * @returns {Statement | ModuleDeclaration | Expression | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration | undefined} previous statement
	 */
	get prevStatement() {
		const prev = this._prevStatement;
		if (typeof prev === "number") {
			const node = /** @type {Statement} */ (
				/** @type {EXPECTED_ANY} */ (
					/** @type {SoaAst} */ (this._soaStore).nodeAt(prev)
				)
			);
			this._prevStatement = node;
			return node;
		}
		return prev;
	}

	set prevStatement(value) {
		this._prevStatement = value;
	}

	/**
	 * Statement path tail with a pending id entry materialized in place (the
	 * sequence/ASI checks compare it by identity).
	 * @returns {StatementPathItem | undefined} current statement
	 */
	_statementPathTail() {
		const path = /** @type {(StatementPathItem | number)[]} */ (
			this._statementPath
		);
		const last = path.length - 1;
		const entry = path[last];
		return typeof entry === "number"
			? (path[last] =
					/** @type {StatementPathItem} */
					(
						/** @type {EXPECTED_ANY} */ (
							/** @type {SoaAst} */ (this._soaStore).nodeAt(entry)
						)
					))
			: entry;
	}

	_initializeEvaluating() {
		this.hooks.evaluate.for("Literal").tap(CLASS_NAME, (_expr) => {
			const expr = /** @type {Literal} */ (_expr);

			switch (typeof expr.value) {
				case "number":
					return new BasicEvaluatedExpression()
						.setNumber(expr.value)
						.setRange(/** @type {Range} */ (expr.range));
				case "bigint":
					return new BasicEvaluatedExpression()
						.setBigInt(expr.value)
						.setRange(/** @type {Range} */ (expr.range));
				case "string":
					return new BasicEvaluatedExpression()
						.setString(expr.value)
						.setRange(/** @type {Range} */ (expr.range));
				case "boolean":
					return new BasicEvaluatedExpression()
						.setBoolean(expr.value)
						.setRange(/** @type {Range} */ (expr.range));
			}
			if (expr.value === null) {
				return new BasicEvaluatedExpression()
					.setNull()
					.setRange(/** @type {Range} */ (expr.range));
			}
			if (expr.value instanceof RegExp) {
				return new BasicEvaluatedExpression()
					.setRegExp(expr.value)
					.setRange(/** @type {Range} */ (expr.range));
			}
		});
		this.hooks.evaluate.for("NewExpression").tap(CLASS_NAME, (_expr) => {
			const expr = /** @type {NewExpression} */ (_expr);
			const callee = expr.callee;
			if (callee.type !== "Identifier") return;
			if (callee.name !== "RegExp") {
				return this.callHooksForName(
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
		});
		this.hooks.evaluate.for("LogicalExpression").tap(CLASS_NAME, (_expr) => {
			const expr = /** @type {LogicalExpression} */ (_expr);

			const left = this.evaluateExpression(expr.left);
			let returnRight = false;
			/** @type {boolean | undefined} */
			let allowedRight;
			if (expr.operator === "&&") {
				const leftAsBool = left.asBool();
				if (leftAsBool === false) {
					return left.setRange(/** @type {Range} */ (expr.range));
				}
				returnRight = leftAsBool === true;
				allowedRight = false;
			} else if (expr.operator === "||") {
				const leftAsBool = left.asBool();
				if (leftAsBool === true) {
					return left.setRange(/** @type {Range} */ (expr.range));
				}
				returnRight = leftAsBool === false;
				allowedRight = true;
			} else if (expr.operator === "??") {
				const leftAsNullish = left.asNullish();
				if (leftAsNullish === false) {
					return left.setRange(/** @type {Range} */ (expr.range));
				}
				if (leftAsNullish !== true) return;
				returnRight = true;
			} else {
				return;
			}
			const right = this.evaluateExpression(expr.right);
			if (returnRight) {
				if (left.couldHaveSideEffects()) right.setSideEffects();
				return right.setRange(/** @type {Range} */ (expr.range));
			}

			const asBool = right.asBool();

			if (allowedRight === true && asBool === true) {
				return new BasicEvaluatedExpression()
					.setRange(/** @type {Range} */ (expr.range))
					.setTruthy();
			} else if (allowedRight === false && asBool === false) {
				return new BasicEvaluatedExpression()
					.setRange(/** @type {Range} */ (expr.range))
					.setFalsy();
			}
		});

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
		 * @param {BinaryExpression | UnaryExpression} expr the expression being evaluated
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
		const valueAsExpression = (value, expr, sideEffects) => {
			switch (typeof value) {
				case "boolean":
					return new BasicEvaluatedExpression()
						.setBoolean(value)
						.setSideEffects(sideEffects)
						.setRange(/** @type {Range} */ (expr.range));
				case "number":
					return new BasicEvaluatedExpression()
						.setNumber(value)
						.setSideEffects(sideEffects)
						.setRange(/** @type {Range} */ (expr.range));
				case "bigint":
					return new BasicEvaluatedExpression()
						.setBigInt(value)
						.setSideEffects(sideEffects)
						.setRange(/** @type {Range} */ (expr.range));
				case "string":
					return new BasicEvaluatedExpression()
						.setString(value)
						.setSideEffects(sideEffects)
						.setRange(/** @type {Range} */ (expr.range));
			}
		};

		this.hooks.evaluate.for("BinaryExpression").tap(CLASS_NAME, (_expr) => {
			const expr = /** @type {BinaryExpression} */ (_expr);

			/**
			 * Evaluates a binary expression if and only if it is a const operation (e.g. 1 + 2, "a" + "b", etc.).
			 * @template T
			 * @param {(leftOperand: T, rightOperand: T) => boolean | number | bigint | string} operandHandler the handler for the operation (e.g. (a, b) => a + b)
			 * @returns {BasicEvaluatedExpression | undefined} the evaluated expression
			 */
			const handleConstOperation = (operandHandler) => {
				const left = this.evaluateExpression(expr.left);
				if (!left.isCompileTimeValue()) return;

				const right = this.evaluateExpression(expr.right);
				if (!right.isCompileTimeValue()) return;

				const result = operandHandler(
					/** @type {T} */ (left.asCompileTimeValue()),
					/** @type {T} */ (right.asCompileTimeValue())
				);
				return valueAsExpression(
					result,
					expr,
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
			 * @param {BasicEvaluatedExpression} res res
			 * @param {boolean} eql true for "===" and false for "!=="
			 * @returns {BasicEvaluatedExpression | undefined} result
			 */
			const handleTemplateStringCompare = (left, right, res, eql) => {
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
					return res
						.setBoolean(!eql)
						.setSideEffects(
							left.couldHaveSideEffects() || right.couldHaveSideEffects()
						);
				}
			};

			/**
			 * Helper function to handle BinaryExpressions using strict equality comparisons (e.g. "===" and "!==").
			 * @param {boolean} eql true for "===" and false for "!=="
			 * @returns {BasicEvaluatedExpression | undefined} the evaluated expression
			 */
			const handleStrictEqualityComparison = (eql) => {
				const left = this.evaluateExpression(expr.left);
				const right = this.evaluateExpression(expr.right);
				const res = new BasicEvaluatedExpression();
				res.setRange(/** @type {Range} */ (expr.range));

				const leftConst = left.isCompileTimeValue();
				const rightConst = right.isCompileTimeValue();

				if (leftConst && rightConst) {
					return res
						.setBoolean(
							eql === (left.asCompileTimeValue() === right.asCompileTimeValue())
						)
						.setSideEffects(
							left.couldHaveSideEffects() || right.couldHaveSideEffects()
						);
				}

				if (left.isArray() && right.isArray()) {
					return res
						.setBoolean(!eql)
						.setSideEffects(
							left.couldHaveSideEffects() || right.couldHaveSideEffects()
						);
				}
				if (left.isTemplateString() && right.isTemplateString()) {
					return handleTemplateStringCompare(left, right, res, eql);
				}

				const leftPrimitive = left.isPrimitiveType();
				const rightPrimitive = right.isPrimitiveType();

				if (
					// Primitive !== Object or
					// compile-time object types are never equal to something at runtime
					(leftPrimitive === false && (leftConst || rightPrimitive === true)) ||
					(rightPrimitive === false &&
						(rightConst || leftPrimitive === true)) ||
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
					return res
						.setBoolean(!eql)
						.setSideEffects(
							left.couldHaveSideEffects() || right.couldHaveSideEffects()
						);
				}
			};

			/**
			 * Helper function to handle BinaryExpressions using abstract equality comparisons (e.g. "==" and "!=").
			 * @param {boolean} eql true for "==" and false for "!="
			 * @returns {BasicEvaluatedExpression | undefined} the evaluated expression
			 */
			const handleAbstractEqualityComparison = (eql) => {
				const left = this.evaluateExpression(expr.left);
				const right = this.evaluateExpression(expr.right);
				const res = new BasicEvaluatedExpression();
				res.setRange(/** @type {Range} */ (expr.range));

				const leftConst = left.isCompileTimeValue();
				const rightConst = right.isCompileTimeValue();

				if (leftConst && rightConst) {
					return res
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
					return res
						.setBoolean(!eql)
						.setSideEffects(
							left.couldHaveSideEffects() || right.couldHaveSideEffects()
						);
				}
				if (left.isTemplateString() && right.isTemplateString()) {
					return handleTemplateStringCompare(left, right, res, eql);
				}
			};

			if (expr.operator === "+") {
				const left = this.evaluateExpression(expr.left);
				const right = this.evaluateExpression(expr.right);
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
						res.setWrapped(left, right.postfix, right.wrappedInnerExpressions);
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
				res.setRange(/** @type {Range} */ (expr.range));
				return res;
			} else if (expr.operator === "-") {
				return handleConstOperation((l, r) => l - r);
			} else if (expr.operator === "*") {
				return handleConstOperation((l, r) => l * r);
			} else if (expr.operator === "/") {
				return handleConstOperation((l, r) => l / r);
			} else if (expr.operator === "**") {
				return handleConstOperation((l, r) => l ** r);
			} else if (expr.operator === "===") {
				return handleStrictEqualityComparison(true);
			} else if (expr.operator === "==") {
				return handleAbstractEqualityComparison(true);
			} else if (expr.operator === "!==") {
				return handleStrictEqualityComparison(false);
			} else if (expr.operator === "!=") {
				return handleAbstractEqualityComparison(false);
			} else if (expr.operator === "&") {
				return handleConstOperation((l, r) => l & r);
			} else if (expr.operator === "|") {
				return handleConstOperation((l, r) => l | r);
			} else if (expr.operator === "^") {
				return handleConstOperation((l, r) => l ^ r);
			} else if (expr.operator === ">>>") {
				return handleConstOperation((l, r) => l >>> r);
			} else if (expr.operator === ">>") {
				return handleConstOperation((l, r) => l >> r);
			} else if (expr.operator === "<<") {
				return handleConstOperation((l, r) => l << r);
			} else if (expr.operator === "<") {
				return handleConstOperation((l, r) => l < r);
			} else if (expr.operator === ">") {
				return handleConstOperation((l, r) => l > r);
			} else if (expr.operator === "<=") {
				return handleConstOperation((l, r) => l <= r);
			} else if (expr.operator === ">=") {
				return handleConstOperation((l, r) => l >= r);
			} else if (expr.operator === "in") {
				// `x in y` always evaluates to a boolean, so it is never nullish
				const left = this.evaluateExpression(expr.left);
				const right = this.evaluateExpression(expr.right);
				return new BasicEvaluatedExpression()
					.setNullish(false)
					.setSideEffects(
						left.couldHaveSideEffects() || right.couldHaveSideEffects()
					)
					.setRange(/** @type {Range} */ (expr.range));
			}
		});
		this.hooks.evaluate.for("UnaryExpression").tap(CLASS_NAME, (_expr) => {
			const expr = /** @type {UnaryExpression} */ (_expr);

			/**
			 * Evaluates a UnaryExpression if and only if it is a basic const operator (e.g. +a, -a, ~a).
			 * @template T
			 * @param {(operand: T) => boolean | number | bigint | string} operandHandler handler for the operand
			 * @returns {BasicEvaluatedExpression | undefined} evaluated expression
			 */
			const handleConstOperation = (operandHandler) => {
				const argument = this.evaluateExpression(expr.argument);
				if (!argument.isCompileTimeValue()) return;
				const result = operandHandler(
					/** @type {T} */ (argument.asCompileTimeValue())
				);
				return valueAsExpression(result, expr, argument.couldHaveSideEffects());
			};

			if (expr.operator === "typeof") {
				switch (expr.argument.type) {
					case "Identifier": {
						const res = this.callHooksForName(
							this.hooks.evaluateTypeof,
							expr.argument.name,
							expr
						);
						if (res !== undefined) return res;
						break;
					}
					case "MetaProperty": {
						const res = this.callHooksForName(
							this.hooks.evaluateTypeof,
							/** @type {string} */
							(getRootName(expr.argument)),
							expr
						);
						if (res !== undefined) return res;
						break;
					}
					case "MemberExpression": {
						const res = this.callHooksForExpression(
							this.hooks.evaluateTypeof,
							expr.argument,
							expr
						);
						if (res !== undefined) return res;
						break;
					}
					case "ChainExpression": {
						const res = this.callHooksForExpression(
							this.hooks.evaluateTypeof,
							expr.argument.expression,
							expr
						);
						if (res !== undefined) return res;
						break;
					}
					case "FunctionExpression": {
						return new BasicEvaluatedExpression()
							.setString("function")
							.setRange(/** @type {Range} */ (expr.range));
					}
				}
				const arg = this.evaluateExpression(expr.argument);
				if (arg.isUnknown()) return;
				if (arg.isString()) {
					return new BasicEvaluatedExpression()
						.setString("string")
						.setRange(/** @type {Range} */ (expr.range));
				}
				if (arg.isWrapped()) {
					return new BasicEvaluatedExpression()
						.setString("string")
						.setSideEffects()
						.setRange(/** @type {Range} */ (expr.range));
				}
				if (arg.isUndefined()) {
					return new BasicEvaluatedExpression()
						.setString("undefined")
						.setRange(/** @type {Range} */ (expr.range));
				}
				if (arg.isNumber()) {
					return new BasicEvaluatedExpression()
						.setString("number")
						.setRange(/** @type {Range} */ (expr.range));
				}
				if (arg.isBigInt()) {
					return new BasicEvaluatedExpression()
						.setString("bigint")
						.setRange(/** @type {Range} */ (expr.range));
				}
				if (arg.isBoolean()) {
					return new BasicEvaluatedExpression()
						.setString("boolean")
						.setRange(/** @type {Range} */ (expr.range));
				}
				if (arg.isConstArray() || arg.isRegExp() || arg.isNull()) {
					return new BasicEvaluatedExpression()
						.setString("object")
						.setRange(/** @type {Range} */ (expr.range));
				}
				if (arg.isArray()) {
					return new BasicEvaluatedExpression()
						.setString("object")
						.setSideEffects(arg.couldHaveSideEffects())
						.setRange(/** @type {Range} */ (expr.range));
				}
			} else if (expr.operator === "!") {
				const argument = this.evaluateExpression(expr.argument);
				const bool = argument.asBool();
				if (typeof bool !== "boolean") return;
				return new BasicEvaluatedExpression()
					.setBoolean(!bool)
					.setSideEffects(argument.couldHaveSideEffects())
					.setRange(/** @type {Range} */ (expr.range));
			} else if (expr.operator === "~") {
				return handleConstOperation((v) => ~v);
			} else if (expr.operator === "+") {
				// eslint-disable-next-line no-implicit-coercion
				return handleConstOperation((v) => +v);
			} else if (expr.operator === "-") {
				return handleConstOperation((v) => -v);
			}
		});
		this.hooks.evaluateTypeof
			.for("undefined")
			.tap(CLASS_NAME, (expr) =>
				new BasicEvaluatedExpression()
					.setString("undefined")
					.setRange(/** @type {Range} */ (expr.range))
			);
		this.hooks.evaluate.for("Identifier").tap(CLASS_NAME, (expr) => {
			if (/** @type {Identifier} */ (expr).name === "undefined") {
				return new BasicEvaluatedExpression()
					.setUndefined()
					.setRange(/** @type {Range} */ (expr.range));
			}
		});
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
			this.hooks.evaluate.for(exprType).tap(CLASS_NAME, (expr) => {
				const expression =
					/** @type {Identifier | ThisExpression | MemberExpression} */ (expr);

				const info = getInfo(expression);
				// Cache the result (even when undefined) so the stage-100 tap below
				// reuses it instead of recomputing getInfo — getMemberExpressionInfo
				// is expensive and previously ran twice for every rejected member.
				cachedExpression = expression;
				cachedInfo = info;
				if (info !== undefined) {
					return this.callHooksForInfoWithFallback(
						this.hooks.evaluateIdentifier,
						info.name,
						(_name) => undefined,
						(name) => {
							const hook = this.hooks.evaluateDefinedIdentifier.get(name);
							if (hook !== undefined) {
								return hook.call(expression);
							}
						},
						expression
					);
				}
			});
			this.hooks.evaluate
				.for(exprType)
				.tap({ name: CLASS_NAME, stage: 100 }, (expr) => {
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
							.setRange(/** @type {Range} */ (expression.range));
					}
				});
			this.hooks.finish.tap(CLASS_NAME, () => {
				// Cleanup for GC
				cachedExpression = cachedInfo = undefined;
			});
		};
		tapEvaluateWithVariableInfo("Identifier", (expr) => {
			const info = this.getVariableInfo(/** @type {Identifier} */ (expr).name);
			if (
				typeof info === "string" ||
				(info instanceof VariableInfo &&
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
				(info instanceof VariableInfo && (info.isFree() || info.isTagged()))
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

			return this.callHooksForName(
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

		this.hooks.evaluate.for("CallExpression").tap(CLASS_NAME, (expression) => {
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
				return this.callHooksForName(
					this.hooks.evaluateCallExpression,
					expr.callee.name,
					expr
				);
			}
		});
		this.hooks.evaluateCallExpressionMember
			.for("indexOf")
			.tap(CLASS_NAME, (expr, param) => {
				if (!param.isString()) return;
				if (expr.arguments.length === 0) return;
				const [arg1, arg2] = expr.arguments;
				if (arg1.type === "SpreadElement") return;
				const arg1Eval = this.evaluateExpression(arg1);
				if (!arg1Eval.isString()) return;
				const arg1Value = /** @type {string} */ (arg1Eval.string);
				/** @type {number} */
				let result;
				if (arg2) {
					if (arg2.type === "SpreadElement") return;
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
					.setRange(/** @type {Range} */ (expr.range));
			});
		this.hooks.evaluateCallExpressionMember
			.for("replace")
			.tap(CLASS_NAME, (expr, param) => {
				if (!param.isString()) return;
				if (expr.arguments.length !== 2) return;
				if (expr.arguments[0].type === "SpreadElement") return;
				if (expr.arguments[1].type === "SpreadElement") return;
				const arg1 = this.evaluateExpression(expr.arguments[0]);
				const arg2 = this.evaluateExpression(expr.arguments[1]);
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
					.setRange(/** @type {Range} */ (expr.range));
			});
		for (const fn of ["substr", "substring", "slice"]) {
			this.hooks.evaluateCallExpressionMember
				.for(fn)
				.tap(CLASS_NAME, (expr, param) => {
					if (!param.isString()) return;
					/** @type {BasicEvaluatedExpression} */
					let arg1;
					/** @type {string} */
					let result;
					const str = /** @type {string} */ (param.string);
					switch (expr.arguments.length) {
						case 1:
							if (expr.arguments[0].type === "SpreadElement") return;
							arg1 = this.evaluateExpression(expr.arguments[0]);
							if (!arg1.isNumber()) return;
							result = str[
								/** @type {"substr" | "substring" | "slice"} */ (fn)
							](/** @type {number} */ (arg1.number));
							break;
						case 2: {
							if (expr.arguments[0].type === "SpreadElement") return;
							if (expr.arguments[1].type === "SpreadElement") return;
							arg1 = this.evaluateExpression(expr.arguments[0]);
							const arg2 = this.evaluateExpression(expr.arguments[1]);
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
						.setRange(/** @type {Range} */ (expr.range));
				});
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

		this.hooks.evaluate.for("TemplateLiteral").tap(CLASS_NAME, (_node) => {
			const node = /** @type {TemplateLiteral} */ (_node);

			const { quasis, parts } = getSimplifiedTemplateResult("cooked", node);
			if (parts.length === 1) {
				return parts[0].setRange(/** @type {Range} */ (node.range));
			}
			return new BasicEvaluatedExpression()
				.setTemplateString(quasis, parts, "cooked")
				.setRange(/** @type {Range} */ (node.range));
		});
		this.hooks.evaluate
			.for("TaggedTemplateExpression")
			.tap(CLASS_NAME, (_node) => {
				const node = /** @type {TaggedTemplateExpression} */ (_node);
				const tag = this.evaluateExpression(node.tag);

				if (tag.isIdentifier() && tag.identifier === "String.raw") {
					const { quasis, parts } = getSimplifiedTemplateResult(
						"raw",
						node.quasi
					);
					return new BasicEvaluatedExpression()
						.setTemplateString(quasis, parts, "raw")
						.setRange(/** @type {Range} */ (node.range));
				}
			});

		this.hooks.evaluateCallExpressionMember
			.for("concat")
			.tap(CLASS_NAME, (expr, param) => {
				if (!param.isString() && !param.isWrapped()) return;
				/** @type {undefined | BasicEvaluatedExpression} */
				let stringSuffix;
				let hasUnknownParams = false;
				/** @type {BasicEvaluatedExpression[]} */
				const innerExpressions = [];
				for (let i = expr.arguments.length - 1; i >= 0; i--) {
					const arg = expr.arguments[i];
					if (arg.type === "SpreadElement") return;
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
						.setRange(/** @type {Range} */ (expr.range));
				} else if (param.isWrapped()) {
					const postfix = stringSuffix || param.postfix;
					const inner = param.wrappedInnerExpressions
						? [...param.wrappedInnerExpressions, ...innerExpressions.reverse()]
						: innerExpressions.reverse();
					return new BasicEvaluatedExpression()
						.setWrapped(param.prefix, postfix, inner)
						.setRange(/** @type {Range} */ (expr.range));
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
					.setRange(/** @type {Range} */ (expr.range));
			});
		this.hooks.evaluateCallExpressionMember
			.for("split")
			.tap(CLASS_NAME, (expr, param) => {
				if (!param.isString()) return;
				if (expr.arguments.length !== 1) return;
				if (expr.arguments[0].type === "SpreadElement") return;
				/** @type {string[]} */
				let result;
				const arg = this.evaluateExpression(expr.arguments[0]);
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
					.setRange(/** @type {Range} */ (expr.range));
			});
		this.hooks.evaluate
			.for("ConditionalExpression")
			.tap(CLASS_NAME, (_expr) => {
				const expr = /** @type {ConditionalExpression} */ (_expr);

				const condition = this.evaluateExpression(expr.test);
				const conditionValue = condition.asBool();
				/** @type {BasicEvaluatedExpression} */
				let res;
				if (conditionValue === undefined) {
					const consequent = this.evaluateExpression(expr.consequent);
					const alternate = this.evaluateExpression(expr.alternate);
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
						conditionValue ? expr.consequent : expr.alternate
					);
					if (condition.couldHaveSideEffects()) res.setSideEffects();
				}
				res.setRange(/** @type {Range} */ (expr.range));
				return res;
			});
		this.hooks.evaluate.for("ArrayExpression").tap(CLASS_NAME, (_expr) => {
			const expr = /** @type {ArrayExpression} */ (_expr);

			const items = expr.elements.map(
				(element) =>
					element !== null &&
					element.type !== "SpreadElement" &&
					this.evaluateExpression(element)
			);
			if (!items.every(Boolean)) return;
			return new BasicEvaluatedExpression()
				.setItems(/** @type {BasicEvaluatedExpression[]} */ (items))
				.setRange(/** @type {Range} */ (expr.range));
		});
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
		this.hooks.evaluate.for("SequenceExpression").tap(CLASS_NAME, (_expr) => {
			const expr = /** @type {SequenceExpression} */ (_expr);
			if (!expr.range) return;
			let commentsStartPos = /** @type {Range} */ (expr.range)[0];
			for (let i = 0; i < expr.expressions.length - 1; i++) {
				const item = expr.expressions[i];
				if (!item.range) return;
				if (!this.isPure(item, commentsStartPos)) return;
				commentsStartPos = /** @type {Range} */ (item.range)[1];
			}
			const last = expr.expressions[expr.expressions.length - 1];
			const evaluated = this.evaluateExpression(last);
			if (!evaluated.isCompileTimeValue()) return;
			return evaluated.setRange(/** @type {Range} */ (expr.range));
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
	 * Module pre walking iterates the scope for import entries
	 * @param {(Statement | ModuleDeclaration)[]} statements statements
	 */
	modulePreWalkStatements(statements) {
		for (let index = 0, len = statements.length; index < len; index++) {
			const statement = statements[index];
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
	 * Pre walking iterates the scope for variable declarations
	 * @param {(Statement | ModuleDeclaration)[]} statements statements
	 */
	preWalkStatements(statements) {
		for (let index = 0, len = statements.length; index < len; index++) {
			const statement = statements[index];
			this.preWalkStatement(statement);
		}
	}

	/**
	 * Block pre walking iterates the scope for block variable declarations
	 * @param {(Statement | ModuleDeclaration)[]} statements statements
	 */
	blockPreWalkStatements(statements) {
		for (let index = 0, len = statements.length; index < len; index++) {
			const statement = statements[index];
			this.blockPreWalkStatement(statement);
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
		// an SoA facade re-enters the id pre-walk (same path/hook bookkeeping)
		const id = /** @type {EXPECTED_ANY} */ (statement)[SOA_KEY_ID];
		if (id !== undefined) {
			const store = /** @type {EXPECTED_ANY} */ (statement)[SOA_KEY_STORE];
			// an all-foreign top level (pure import/export modules) defeats the
			// store discovery in parse(), so the accessors adopt the store here
			if (this._soaStore === undefined) this._soaStore = store;
			// the object-held facade becomes the registered one, so nodeAt
			// keeps serving this exact object inside the id walk
			if (store.facades[id] === undefined) store.facades[id] = statement;
			this._preWalkStatementId(store, id);
			return;
		}
		/** @type {StatementPath} */
		(this._statementPath).push(statement);
		const { preStatement, preStatementByType } = this.hooks;
		// skip the broadcast entirely when nothing taps it; type-keyed taps
		// only run for their statement type
		let bail =
			preStatement.taps.length !== 0 ? preStatement.call(statement) : undefined;
		if (!bail) {
			const typed = preStatementByType.get(statement.type);
			if (typed !== undefined) bail = typed.call(statement);
		}
		if (bail) {
			this._prevStatement =
				/** @type {StatementPath} */
				(this._statementPath).pop();
			return;
		}
		this._dispatchPreWalkStatement(statement);
		this._prevStatement =
			/** @type {StatementPath} */
			(this._statementPath).pop();
	}

	/**
	 * Type-keyed pre-walk handler for a statement (callers own the hook
	 * broadcast and `statementPath`). Shared by the object walker and the
	 * id-walk fallback (Phase D).
	 * @param {Statement | ModuleDeclaration | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration} statement statement
	 */
	_dispatchPreWalkStatement(statement) {
		// cases ordered by measured statement frequency; the commonest statements
		// (expressions, returns) intentionally match nothing here
		switch (statement.type) {
			case "VariableDeclaration":
				this.preWalkVariableDeclaration(statement);
				break;
			case "IfStatement":
				this.preWalkIfStatement(statement);
				break;
			case "BlockStatement":
				this.preWalkBlockStatement(statement);
				break;
			case "FunctionDeclaration":
				this.preWalkFunctionDeclaration(statement);
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
	}

	/**
	 * Block pre walk statement.
	 * @param {Statement | ModuleDeclaration | MaybeNamedClassDeclaration | MaybeNamedFunctionDeclaration} statement statement
	 */
	blockPreWalkStatement(statement) {
		// an SoA facade re-enters the id block-pre-walk
		const id = /** @type {EXPECTED_ANY} */ (statement)[SOA_KEY_ID];
		if (id !== undefined) {
			const store = /** @type {EXPECTED_ANY} */ (statement)[SOA_KEY_STORE];
			// an all-foreign top level (pure import/export modules) defeats the
			// store discovery in parse(), so the accessors adopt the store here
			if (this._soaStore === undefined) this._soaStore = store;
			// the object-held facade becomes the registered one, so nodeAt
			// keeps serving this exact object inside the id walk
			if (store.facades[id] === undefined) store.facades[id] = statement;
			this._blockPreWalkStatementId(store, id);
			return;
		}
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
		this._dispatchBlockPreWalkStatement(statement);
		this._prevStatement =
			/** @type {StatementPath} */
			(this._statementPath).pop();
	}

	/**
	 * Type-keyed block-pre-walk handler for a statement (callers own the hook
	 * broadcast and `statementPath`). Shared by the object walker and the
	 * id-walk fallback (Phase D).
	 * @param {Statement | ModuleDeclaration | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration} statement statement
	 */
	_dispatchBlockPreWalkStatement(statement) {
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
			case "ExportNamedDeclaration":
				this.blockPreWalkExportNamedDeclaration(statement);
				break;
			case "ExportDefaultDeclaration":
				this.blockPreWalkExportDefaultDeclaration(statement);
		}
	}

	// ----- Phase D: id-based pre-walk passes. Same shape as the walk core: the
	// statement facade is still materialized for `statementPath`/hook parity,
	// but descent, declarator scanning and binding names run on the columns, so
	// child lists, declarators and identifiers materialize only when a hook
	// actually needs them. -----

	/**
	 * Id-based twin of `modulePreWalkStatements`: adopted import/export rows
	 * materialize into their acorn-built statements for the object handlers.
	 * @param {SoaAst} store column store
	 * @param {number} ownerId node owning the statement list
	 */
	_modulePreWalkStatementsId(store, ownerId) {
		const len = store.flat[store.listStarts[ownerId]];
		// a pinned (memoized) Program routes through the object walkers at the
		// parse() entry, so a zero-length span here is an empty program
		if (len === 0) return;
		const flat = store.flat;
		const start = store.listStarts[ownerId] + 1;
		for (let i = 0; i < len; i++) {
			const id = flat[start + i];
			/** @type {(StatementPathItem | number)[]} */
			(this._statementPath).push(id);
			switch (store.types[id]) {
				case T_IMPORT_DECLARATION:
					this.modulePreWalkImportDeclaration(
						/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
					);
					break;
				case T_EXPORT_ALL_DECLARATION:
					this.modulePreWalkExportAllDeclaration(
						/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
					);
					break;
				case T_EXPORT_NAMED_DECLARATION:
					this.modulePreWalkExportNamedDeclaration(
						/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
					);
					break;
			}
			this._prevStatement =
				/** @type {(StatementPathItem | number)[]} */
				(this._statementPath).pop();
		}
	}

	/**
	 * Id-based twin of `preWalkStatements` for a column-owned statement list.
	 * @param {SoaAst} store column store
	 * @param {number} ownerId node owning the statement list
	 */
	_preWalkStatementsId(store, ownerId) {
		const len = store.flat[store.listStarts[ownerId]];
		if (len === 0) {
			// empty or foreign-pinned list — the object walker owns it
			const body = /** @type {EXPECTED_ANY} */ (store.nodeAt(ownerId)).body;
			if (body.length !== 0) this.preWalkStatements(body);
			return;
		}
		const flat = store.flat;
		const start = store.listStarts[ownerId] + 1;
		for (let i = 0; i < len; i++) {
			this._preWalkStatementId(store, flat[start + i]);
		}
	}

	/**
	 * Id-based twin of `preWalkStatement`.
	 * @param {SoaAst} store column store
	 * @param {number} id statement node id
	 */
	_preWalkStatementId(store, id) {
		// the path entry stays a pending id until a hook observes the path
		// (`nodeAt` is identity-stable, so late materialization is invisible)
		/** @type {(StatementPathItem | number)[]} */
		(this._statementPath).push(id);
		const { preStatement, preStatementByType } = this.hooks;
		let bail;
		if (preStatement.taps.length !== 0) {
			bail = preStatement.call(
				/** @type {Statement} */ (
					/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
				)
			);
		}
		if (!bail) {
			const typed = preStatementByType.get(SOA_TYPE_NAMES[store.types[id]]);
			if (typed !== undefined) {
				bail = typed.call(
					/** @type {Statement} */ (
						/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
					)
				);
			}
		}
		if (!bail) {
			switch (store.types[id]) {
				case T_VARIABLE_DECLARATION:
					if (store.aux[id] === DECL_KIND_VAR) {
						this._preWalkVariableDeclarationId(
							store,
							id,
							this.hooks.varDeclarationVar
						);
					}
					break;
				case T_IF_STATEMENT: {
					this._preWalkStatementId(store, store.kid1[id]);
					const alternateId = store.kid2[id];
					if (alternateId !== 0) this._preWalkStatementId(store, alternateId);
					break;
				}
				case T_BLOCK_STATEMENT:
					this._preWalkStatementsId(store, id);
					break;
				case T_FUNCTION_DECLARATION: {
					// ref 0 ⇔ absent (`export default function () {}`)
					const identId = store.kid0[id];
					if (identId !== 0) {
						this.defineVariable(this._soaIdentName(store, identId));
					}
					break;
				}
				case T_FOR_STATEMENT: {
					// only a declaration init pre-walks (a foreign init is a
					// `using` head, a plain-object statement otherwise)
					const initId = store.kid0[id];
					if (initId === 0) {
						const init = /** @type {EXPECTED_ANY} */ (store.nodeAt(id)).init;
						if (init && init.type === "VariableDeclaration") {
							this.preWalkStatement(init);
						}
					} else if (store.types[initId] === T_VARIABLE_DECLARATION) {
						this._preWalkStatementId(store, initId);
					}
					this._preWalkStatementId(store, store.aux[id]);
					break;
				}
				case T_TRY_STATEMENT: {
					this._preWalkStatementId(store, store.kid0[id]);
					// catch/finalizer ref 0 ⇔ absent; the catch body is the
					// clause's kid1 (`preWalkCatchClause` skips param/hooks)
					const handlerId = store.kid1[id];
					if (handlerId !== 0) {
						this._preWalkStatementId(store, store.kid1[handlerId]);
					}
					const finalizerId = store.kid2[id];
					if (finalizerId !== 0) this._preWalkStatementId(store, finalizerId);
					break;
				}
				case T_SWITCH_STATEMENT:
					this._preWalkSwitchCasesId(store, id);
					break;
				case T_WHILE_STATEMENT:
				case T_WITH_STATEMENT:
					this._preWalkStatementId(store, store.kid1[id]);
					break;
				case T_FOR_IN_STATEMENT:
				case T_FOR_OF_STATEMENT:
					this._preWalkForInOfStatementId(store, id);
					break;
				case T_DO_WHILE_STATEMENT:
				case T_LABELED_STATEMENT:
					this._preWalkStatementId(store, store.kid0[id]);
					break;
				// every other column type — including the adopted class/import/
				// export rows — pre-walks nothing (matching the object dispatch)
			}
		}
		this._prevStatement =
			/** @type {StatementPath} */
			(this._statementPath).pop();
	}

	/**
	 * Id-based twin of `preWalkForInStatement`/`preWalkForOfStatement`.
	 * @param {SoaAst} store column store
	 * @param {number} id for-in/for-of node id
	 */
	_preWalkForInOfStatementId(store, id) {
		if (
			store.types[id] === T_FOR_OF_STATEMENT &&
			(store.flags[id] & SOA_FLAG_AWAIT) !== 0 &&
			this.scope.topLevelScope === true
		) {
			this.hooks.topLevelAwait.call(
				/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
			);
		}
		// an owned expression/pattern left never pre-walks; a declaration
		// left (owned or foreign) hoists its `var` names
		const leftId = store.kid0[id];
		if (leftId === 0) {
			this.preWalkVariableDeclaration(
				/** @type {EXPECTED_ANY} */ (store.nodeAt(id)).left
			);
		} else if (
			store.types[leftId] === T_VARIABLE_DECLARATION &&
			store.aux[leftId] === DECL_KIND_VAR
		) {
			this._preWalkVariableDeclarationId(
				store,
				leftId,
				this.hooks.varDeclarationVar
			);
		}
		this._preWalkStatementId(store, store.kid2[id]);
	}

	/**
	 * Id-based twin of `preWalkSwitchCases`.
	 * @param {SoaAst} store column store
	 * @param {number} id switch node id
	 */
	_preWalkSwitchCasesId(store, id) {
		const len = store.flat[store.listStarts[id]];
		if (len === 0) {
			// empty or foreign-pinned case list
			this.preWalkSwitchCases(
				/** @type {EXPECTED_ANY} */ (store.nodeAt(id)).cases
			);
			return;
		}
		const flat = store.flat;
		const start = store.listStarts[id] + 1;
		for (let i = 0; i < len; i++) {
			const caseId = flat[start + i];
			// a registered case may carry a mutated consequent — facade path
			if (store.facades[caseId] === undefined) {
				const cLen = store.flat[store.listStarts[caseId]];
				const cStart = store.listStarts[caseId] + 1;
				for (let j = 0; j < cLen; j++) {
					this._preWalkStatementId(store, flat[cStart + j]);
				}
				continue;
			}
			this.preWalkStatements(
				/** @type {EXPECTED_ANY} */ (store.nodeAt(caseId)).consequent
			);
		}
	}

	/**
	 * Id-based twin of `blockPreWalkStatements` for a column-owned list.
	 * @param {SoaAst} store column store
	 * @param {number} ownerId node owning the statement list
	 */
	_blockPreWalkStatementsId(store, ownerId) {
		const len = store.flat[store.listStarts[ownerId]];
		if (len === 0) {
			// empty or foreign-pinned list — the object walker owns it
			const body = /** @type {EXPECTED_ANY} */ (store.nodeAt(ownerId)).body;
			if (body.length !== 0) this.blockPreWalkStatements(body);
			return;
		}
		const flat = store.flat;
		const start = store.listStarts[ownerId] + 1;
		for (let i = 0; i < len; i++) {
			this._blockPreWalkStatementId(store, flat[start + i]);
		}
	}

	/**
	 * Id-based twin of `blockPreWalkStatement`. Only variable declarations and
	 * destructuring expression statements have column-typed block-pre-walk work
	 * (class/export declarations are always acorn-built).
	 * @param {SoaAst} store column store
	 * @param {number} id statement node id
	 */
	_blockPreWalkStatementId(store, id) {
		/** @type {(StatementPathItem | number)[]} */
		(this._statementPath).push(id);
		const { blockPreStatement, blockPreStatementByType } = this.hooks;
		let bail;
		if (blockPreStatement.taps.length !== 0) {
			bail = blockPreStatement.call(
				/** @type {Statement} */ (
					/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
				)
			);
		}
		if (!bail) {
			const typed = blockPreStatementByType.get(
				SOA_TYPE_NAMES[store.types[id]]
			);
			if (typed !== undefined) {
				bail = typed.call(
					/** @type {Statement} */ (
						/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
					)
				);
			}
		}
		if (!bail) {
			switch (store.types[id]) {
				case T_VARIABLE_DECLARATION: {
					const kind = store.aux[id];
					if (kind !== DECL_KIND_VAR) {
						// `using`/`await using` declarations are acorn-built (foreign),
						// so an owned declaration is only ever var/let/const
						this._preWalkVariableDeclarationId(
							store,
							id,
							kind === DECL_KIND_CONST
								? this.hooks.varDeclarationConst
								: this.hooks.varDeclarationLet
						);
					}
					break;
				}
				case T_EXPRESSION_STATEMENT: {
					const exprId = store.kid0[id];
					if (exprId === 0) {
						// foreign expression (e.g. a tagged template) — object path
						this.blockPreWalkExpressionStatement(
							/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
						);
					} else if (store.types[exprId] === T_ASSIGNMENT_EXPRESSION) {
						this._preWalkAssignmentExpressionId(store, exprId);
					}
					break;
				}
				// adopted rows materialize into their acorn-built statements
				case T_CLASS_DECLARATION:
					this.blockPreWalkClassDeclaration(
						/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
					);
					break;
				case T_EXPORT_NAMED_DECLARATION:
					this.blockPreWalkExportNamedDeclaration(
						/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
					);
					break;
				case T_EXPORT_DEFAULT_DECLARATION:
					this.blockPreWalkExportDefaultDeclaration(
						/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
					);
					break;
			}
		}
		this._prevStatement =
			/** @type {(StatementPathItem | number)[]} */
			(this._statementPath).pop();
	}

	/**
	 * Id-based twin of `preWalkAssignmentExpression`: destructuring collection
	 * only applies to an `ObjectPattern` left (`enterDestructuringAssignment`
	 * no-ops otherwise), so plain assignments never materialize.
	 * @param {SoaAst} store column store
	 * @param {number} id assignment node id
	 */
	_preWalkAssignmentExpressionId(store, id) {
		// assignment targets are all column types, so the left is never foreign
		if (store.types[store.kid0[id]] === T_OBJECT_PATTERN) {
			this.preWalkAssignmentExpression(
				/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
			);
		}
	}

	/**
	 * Id-based twin of `_preWalkVariableDeclaration`: a plain identifier
	 * declarator resolves its binding name from the columns and materializes
	 * nothing unless a name-keyed hook taps it; patterns and hook-observed
	 * declarators fall back to the object path per declarator.
	 * @param {SoaAst} store column store
	 * @param {number} id declaration node id
	 * @param {HookMap<SyncBailHook<[Identifier], boolean | void>>} hookMap map of hooks
	 */
	_preWalkVariableDeclarationId(store, id, hookMap) {
		// statement-position declarations always seal their declarators into
		// the columns (see `_walkVariableDeclarationId`)
		const len = store.flat[store.listStarts[id]];
		const flat = store.flat;
		const start = store.listStarts[id] + 1;
		const preDeclaratorTapped = this.hooks.preDeclarator.taps.length !== 0;
		for (let i = 0; i < len; i++) {
			const did = flat[start + i];
			const patId = store.kid0[did];
			if (preDeclaratorTapped || store.types[patId] !== T_IDENTIFIER) {
				this._preWalkDeclarator(
					/** @type {EXPECTED_ANY} */ (store.nodeAt(did)),
					/** @type {EXPECTED_ANY} */ (store.nodeAt(id)),
					hookMap
				);
				continue;
			}
			// plain identifier binding: the destructuring enter is a no-op and
			// the name-keyed hooks decide whether the facade exists at all
			const name = this._soaIdentName(store, patId);
			const info = this.getVariableInfo(name);
			if (
				this._hasHooksForInfo(this.hooks.pattern, info) &&
				this._callHooksForInfo(this.hooks.pattern, info, undefined, undefined, [
					/** @type {Identifier} */ (
						/** @type {EXPECTED_ANY} */ (store.nodeAt(patId))
					)
				])
			) {
				continue;
			}
			this._defineVariableForDeclarationId(store, patId, name, hookMap);
		}
	}

	/**
	 * Id-based twin of `_defineVariableForDeclaration`: the identifier facade
	 * is materialized only when a name-keyed declaration hook actually fires.
	 * @param {SoaAst} store column store
	 * @param {number} patId identifier node id
	 * @param {string} name variable name
	 * @param {HookMap<SyncBailHook<[Identifier], boolean | void>>} hookMap kind-specific declaration hooks
	 */
	_defineVariableForDeclarationId(store, patId, name, hookMap) {
		let hook = hookMap.get(name);
		if (
			hook !== undefined &&
			hook.call(
				/** @type {Identifier} */ (
					/** @type {EXPECTED_ANY} */ (store.nodeAt(patId))
				)
			)
		) {
			return;
		}
		hook = this.hooks.varDeclaration.get(name);
		if (
			hook !== undefined &&
			hook.call(
				/** @type {Identifier} */ (
					/** @type {EXPECTED_ANY} */ (store.nodeAt(patId))
				)
			)
		) {
			return;
		}
		this.defineVariable(name);
	}

	/**
	 * Processes the provided statement.
	 * @param {Statement | ModuleDeclaration | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration} statement statement
	 */
	walkStatement(statement) {
		// an SoA facade re-enters the id walk (same path/hook bookkeeping)
		const id = /** @type {EXPECTED_ANY} */ (statement)[SOA_KEY_ID];
		if (id !== undefined) {
			const store = /** @type {EXPECTED_ANY} */ (statement)[SOA_KEY_STORE];
			// an all-foreign top level (pure import/export modules) defeats the
			// store discovery in parse(), so the accessors adopt the store here
			if (this._soaStore === undefined) this._soaStore = store;
			// the object-held facade becomes the registered one, so nodeAt
			// keeps serving this exact object inside the id walk
			if (store.facades[id] === undefined) store.facades[id] = statement;
			this._walkStatementId(store, id);
			return;
		}
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
		this._dispatchWalkStatement(statement);
		this._prevStatement =
			/** @type {StatementPath} */
			(this._statementPath).pop();
	}

	/**
	 * Runs the type-keyed walk handler for a statement (no hook broadcast or
	 * `statementPath` bookkeeping — the callers own that). Shared by the object
	 * walker and the id-walk fallback (Phase D).
	 * @param {Statement | ModuleDeclaration | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration} statement statement
	 */
	_dispatchWalkStatement(statement) {
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

	// ----- Phase D: id-based walk core. The walk pass dispatches on the numeric
	// column type and recurses on statement child ids, materializing facades
	// only where a hook, `statementPath` or an expression escape needs one.
	// Statement types without an id-native handler delegate to the object
	// walker (`_dispatchWalkStatement`); expression children stay on the object
	// walker for now (converted in a later cluster). A list with no column span
	// was pinned on its facade by a foreign (acorn-built) element, so it falls
	// back to the object list walker. -----

	/**
	 * Walk pass over the top-level statement array. The root Program is an
	 * acorn-built object, so the walk is driven from its body entries: SoA
	 * facades id-walk, foreign (acorn-built) statements fall back to the object
	 * walker.
	 * @param {SoaAst} store column store
	 * @param {(Statement | ModuleDeclaration)[]} statements top-level statements
	 */
	_walkStatementsIdList(store, statements) {
		// a top-level statement never terminates the scope (`topLevelScope` short-
		// circuits `walkTerminatingStatement`), so the `unusedStatement`/terminated
		// bookkeeping of `walkStatements` is dead here — a plain iteration suffices
		for (let index = 0, len = statements.length; index < len; index++) {
			const statement = statements[index];
			const id = /** @type {EXPECTED_ANY} */ (statement)[SOA_KEY_ID];
			if (id === undefined) {
				this.walkStatement(statement);
			} else {
				// already registered by the pre-walk seams (identity)
				this._walkStatementId(store, id);
			}
		}
	}

	/**
	 * Id-based twin of `walkStatements` (the walk pass).
	 * @param {SoaAst} store column store
	 * @param {number} ownerId node owning the statement list
	 */
	_walkStatementsId(store, ownerId) {
		const len = store.flat[store.listStarts[ownerId]];
		if (len === 0) {
			const body = /** @type {EXPECTED_ANY} */ (store.nodeAt(ownerId)).body;
			if (body.length !== 0) this.walkStatements(body);
			return;
		}
		const flat = store.flat;
		const start = store.listStarts[ownerId] + 1;
		const types = store.types;
		let onlyFunctionDeclaration = false;
		for (let i = 0; i < len; i++) {
			const id = flat[start + i];
			if (
				onlyFunctionDeclaration &&
				types[id] !== T_FUNCTION_DECLARATION &&
				this.hooks.unusedStatement.taps.length !== 0 &&
				this.hooks.unusedStatement.call(
					/** @type {Statement} */ (store.nodeAt(id))
				)
			) {
				continue;
			}
			this._walkStatementId(store, id);
			if (this.scope.terminated) {
				onlyFunctionDeclaration = true;
			}
		}
	}

	/**
	 * Id-based twin of `walkStatement`.
	 * @param {SoaAst} store column store
	 * @param {number} id statement node id
	 */
	_walkStatementId(store, id) {
		// the path entry stays a pending id until a hook observes the path
		/** @type {(StatementPathItem | number)[]} */
		(this._statementPath).push(id);
		const { statement: statementHook } = this.hooks;
		if (
			statementHook.taps.length !== 0 &&
			statementHook.call(
				/** @type {Statement} */ (
					/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
				)
			) !== undefined
		) {
			this._prevStatement =
				/** @type {(StatementPathItem | number)[]} */
				(this._statementPath).pop();
			return;
		}
		switch (store.types[id]) {
			case T_EXPRESSION_STATEMENT:
				this._walkExprChildId(store, id, store.kid0[id], "expression");
				break;
			case T_BLOCK_STATEMENT:
				this._walkBlockStatementId(store, id);
				break;
			case T_RETURN_STATEMENT:
			case T_THROW_STATEMENT:
				this._walkTerminatingStatementId(store, id);
				break;
			case T_IF_STATEMENT:
				this._walkIfStatementId(store, id);
				break;
			case T_WHILE_STATEMENT:
				this._walkWhileStatementId(store, id);
				break;
			case T_DO_WHILE_STATEMENT:
				this._walkDoWhileStatementId(store, id);
				break;
			case T_FUNCTION_DECLARATION:
				this._walkFunctionId(store, id, false);
				break;
			case T_VARIABLE_DECLARATION:
				this._walkVariableDeclarationId(store, id);
				break;
			case T_FOR_STATEMENT:
				this._walkForStatementId(store, id);
				break;
			case T_FOR_IN_STATEMENT:
			case T_FOR_OF_STATEMENT:
				this._walkForInOfStatementId(store, id);
				break;
			case T_SWITCH_STATEMENT:
				this._walkSwitchStatementId(store, id);
				break;
			case T_TRY_STATEMENT:
				this._walkTryStatementId(store, id);
				break;
			case T_LABELED_STATEMENT:
				this._walkLabeledStatementId(store, id);
				break;
			case T_WITH_STATEMENT:
				this._walkWithStatementId(store, id);
				break;
			// adopted rows materialize into their acorn-built statements
			case T_CLASS_DECLARATION:
				this.walkClassDeclaration(
					/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
				);
				break;
			case T_EXPORT_NAMED_DECLARATION:
				this.walkExportNamedDeclaration(
					/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
				);
				break;
			case T_EXPORT_DEFAULT_DECLARATION:
				this.walkExportDefaultDeclaration(
					/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
				);
				break;
			// break/continue have no walk handler (labels carry no dependencies);
			// import/export-all walk nothing; every other column statement type
			// has a case above
			case T_EMPTY_STATEMENT:
			case T_DEBUGGER_STATEMENT:
			case T_BREAK_STATEMENT:
			case T_CONTINUE_STATEMENT:
			case T_IMPORT_DECLARATION:
			case T_EXPORT_ALL_DECLARATION:
				break;
		}
		this._prevStatement =
			/** @type {(StatementPathItem | number)[]} */
			(this._statementPath).pop();
	}

	/**
	 * Id-based twin of `walkNestedStatement`.
	 * @param {SoaAst} store column store
	 * @param {number} id statement node id
	 */
	_walkNestedStatementId(store, id) {
		this._prevStatement = undefined;
		this._walkStatementId(store, id);
	}

	/**
	 * Id-based twin of `walkBlockStatement`.
	 * @param {SoaAst} store column store
	 * @param {number} id block node id
	 */
	_walkBlockStatementId(store, id) {
		this.inBlockScope(() => {
			const prev = this._prevStatement;
			this._blockPreWalkStatementsId(store, id);
			this._prevStatement = prev;
			this._walkStatementsId(store, id);
		}, true);
	}

	/**
	 * Id-based twin of `walkTerminatingStatement` (return/throw).
	 * @param {SoaAst} store column store
	 * @param {number} id statement node id
	 */
	_walkTerminatingStatementId(store, id) {
		this._walkExprChildId(store, id, store.kid0[id], "argument");
		// Skip top level scope to handle `export` and `module.exports` after terminate
		if (this.scope.topLevelScope === true) return;
		if (
			this.hooks.terminate.taps.length !== 0 &&
			this.hooks.terminate.call(
				/** @type {ReturnStatement | ThrowStatement} */ (
					/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
				)
			)
		) {
			this.scope.terminated =
				store.types[id] === T_RETURN_STATEMENT
					? SCOPE_INFO_TERMINATED_RETURN
					: SCOPE_INFO_TERMINATED_THROW;
		}
	}

	/**
	 * Id-based twin of `walkIfStatement`.
	 * @param {SoaAst} store column store
	 * @param {number} id if node id
	 */
	_walkIfStatementId(store, id) {
		const { statementIf, collectGuards } = this.hooks;
		const result =
			statementIf.taps.length !== 0
				? statementIf.call(
						/** @type {EXPECTED_ANY} */ (
							/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
						)
					)
				: undefined;
		const consequentId = store.kid1[id];
		const alternateId = store.kid2[id];
		if (result === undefined) {
			const guard =
				collectGuards.taps.length !== 0
					? collectGuards.call(
							/** @type {EXPECTED_ANY} */ (store.nodeAt(id)).test
						)
					: undefined;
			this._walkExprChildId(store, id, store.kid0[id], "test");
			this.walkGuardedBranch(guard ? guard.consequent : undefined, () =>
				this._walkNestedStatementId(store, consequentId)
			);

			const consequentTerminated = this.scope.terminated;
			this.scope.terminated = undefined;

			if (alternateId !== 0) {
				this.walkGuardedBranch(guard ? guard.alternate : undefined, () =>
					this._walkNestedStatementId(store, alternateId)
				);
			}

			const alternateTerminated = this.scope.terminated;

			this.scope.terminated =
				consequentTerminated && alternateTerminated
					? alternateTerminated
					: undefined;
		} else if (result) {
			this._walkNestedStatementId(store, consequentId);
		} else if (alternateId !== 0) {
			this._walkNestedStatementId(store, alternateId);
		}
	}

	/**
	 * Id-based twin of `walkWhileStatement`.
	 * @param {SoaAst} store column store
	 * @param {number} id while node id
	 */
	_walkWhileStatementId(store, id) {
		this.inBlockScope(() => {
			this._walkExprChildId(store, id, store.kid0[id], "test");
			this._walkNestedStatementId(store, store.kid1[id]);
		});
	}

	/**
	 * Id-based twin of `walkDoWhileStatement`.
	 * @param {SoaAst} store column store
	 * @param {number} id do-while node id
	 */
	_walkDoWhileStatementId(store, id) {
		this.inBlockScope(() => {
			this._walkNestedStatementId(store, store.kid0[id]);
			this._walkExprChildId(store, id, store.kid1[id], "test");
		});
	}

	/**
	 * Loop-body descent shared by for/for-in/for-of: a block body reuses the
	 * loop's scope (no extra `inBlockScope`), matching the object walkers.
	 * @param {SoaAst} store column store
	 * @param {number} bodyId loop body node id
	 */
	_walkLoopBodyId(store, bodyId) {
		if (store.types[bodyId] === T_BLOCK_STATEMENT) {
			const prev = this._prevStatement;
			this._blockPreWalkStatementsId(store, bodyId);
			this._prevStatement = prev;
			this._walkStatementsId(store, bodyId);
		} else {
			this._walkNestedStatementId(store, bodyId);
		}
	}

	/**
	 * Id-based twin of `walkForStatement` (`init`/`test`/`update` in kid0..2,
	 * the body overflowed into `aux`).
	 * @param {SoaAst} store column store
	 * @param {number} id for node id
	 */
	_walkForStatementId(store, id) {
		this.inBlockScope(() => {
			const initId = store.kid0[id];
			if (initId !== 0) {
				if (store.types[initId] === T_VARIABLE_DECLARATION) {
					// owned head declarations are var/let/const (`using` heads
					// stay foreign) — block-pre-walk, then the statement walk
					const kind = store.aux[initId];
					if (kind !== DECL_KIND_VAR) {
						this._preWalkVariableDeclarationId(
							store,
							initId,
							kind === DECL_KIND_CONST
								? this.hooks.varDeclarationConst
								: this.hooks.varDeclarationLet
						);
					}
					this._prevStatement = undefined;
					this._walkStatementId(store, initId);
				} else {
					this._walkExpressionId(store, initId);
				}
			} else {
				const init = /** @type {EXPECTED_ANY} */ (store.nodeAt(id)).init;
				if (init) {
					if (init.type === "VariableDeclaration") {
						this.blockPreWalkVariableDeclaration(init);
						this._prevStatement = undefined;
						this.walkStatement(init);
					} else {
						this.walkExpression(init);
					}
				}
			}
			this._walkExprChildId(store, id, store.kid1[id], "test");
			this._walkExprChildId(store, id, store.kid2[id], "update");
			this._walkLoopBodyId(store, store.aux[id]);
		});
	}

	/**
	 * Id-based twin of `walkForInStatement`/`walkForOfStatement` (left/right/
	 * body in kid0..2). The top-level-await pre-walk already ran object-side.
	 * @param {SoaAst} store column store
	 * @param {number} id for-in/for-of node id
	 */
	_walkForInOfStatementId(store, id) {
		this.inBlockScope(() => {
			// a declaration left (a foreign one is a `using` head) walks as a
			// declaration; an owned pattern left walks on the facade (a plain
			// identifier left walks nothing)
			const leftId = store.kid0[id];
			if (leftId === 0) {
				const left = /** @type {EXPECTED_ANY} */ (store.nodeAt(id)).left;
				this.blockPreWalkVariableDeclaration(left);
				this.walkVariableDeclaration(left);
			} else if (store.types[leftId] === T_VARIABLE_DECLARATION) {
				const kind = store.aux[leftId];
				if (kind !== DECL_KIND_VAR) {
					this._preWalkVariableDeclarationId(
						store,
						leftId,
						kind === DECL_KIND_CONST
							? this.hooks.varDeclarationConst
							: this.hooks.varDeclarationLet
					);
				}
				this._walkVariableDeclarationId(store, leftId);
			} else if (store.types[leftId] !== T_IDENTIFIER) {
				this.walkPattern(/** @type {EXPECTED_ANY} */ (store.nodeAt(id)).left);
			}
			this._walkExprChildId(store, id, store.kid1[id], "right");
			this._walkLoopBodyId(store, store.kid2[id]);
		});
	}

	/**
	 * Id-based twin of `walkSwitchStatement`/`walkSwitchCases` (discriminant in
	 * kid0, the cases in the owner's list; each case holds its test in kid0 and
	 * its consequent in its own list). A foreign-pinned case list falls back to
	 * the object walker.
	 * @param {SoaAst} store column store
	 * @param {number} id switch node id
	 */
	_walkSwitchStatementId(store, id) {
		this._walkExprChildId(store, id, store.kid0[id], "discriminant");
		const len = store.flat[store.listStarts[id]];
		if (len === 0) {
			// empty or foreign-pinned case list — the object walker owns both
			this.walkSwitchCases(
				/** @type {EXPECTED_ANY} */ (store.nodeAt(id)).cases
			);
			return;
		}
		this.inBlockScope(() => {
			const flat = store.flat;
			const start = store.listStarts[id] + 1;
			// pre walk every consequent before walking any (invalid code may
			// reference a later case's binding — see `walkSwitchCases`); a
			// registered case may carry mutated children — facade path
			for (let i = 0; i < len; i++) {
				const caseId = flat[start + i];
				if (store.facades[caseId] === undefined) {
					if (store.flat[store.listStarts[caseId]] !== 0) {
						const prev = this._prevStatement;
						this._blockPreWalkStatementsId(store, caseId);
						this._prevStatement = prev;
					}
					continue;
				}
				const consequent =
					/** @type {EXPECTED_ANY} */
					(store.nodeAt(caseId)).consequent;
				if (consequent.length > 0) {
					const prev = this._prevStatement;
					this.blockPreWalkStatements(consequent);
					this._prevStatement = prev;
				}
			}
			for (let i = 0; i < len; i++) {
				const caseId = flat[start + i];
				if (store.facades[caseId] === undefined) {
					this._walkExprChildId(store, caseId, store.kid0[caseId], "test");
					if (store.flat[store.listStarts[caseId]] !== 0) {
						this._walkStatementsId(store, caseId);
						this.scope.terminated = undefined;
					}
					continue;
				}
				const c = /** @type {EXPECTED_ANY} */ (store.nodeAt(caseId));
				if (c.test) this.walkExpression(c.test);
				const consequent = c.consequent;
				if (consequent.length > 0) {
					this.walkStatements(consequent);
					this.scope.terminated = undefined;
				}
			}
		});
	}

	/**
	 * Id-based twin of `walkTryStatement` (block/handler/finalizer in kid0..2,
	 * mirroring its terminated-state merge).
	 * @param {SoaAst} store column store
	 * @param {number} id try node id
	 */
	_walkTryStatementId(store, id) {
		const blockId = store.kid0[id];
		if (this.scope.inTry) {
			this._walkStatementId(store, blockId);
		} else {
			this.scope.inTry = true;
			this._walkStatementId(store, blockId);
			this.scope.inTry = false;
		}

		const tryTerminated = this.scope.terminated;
		this.scope.terminated = undefined;

		// catch/finalizer are always column-owned when present (never foreign),
		// so ref 0 always means absent here
		const handlerId = store.kid1[id];
		const hasHandler = handlerId !== 0;
		if (hasHandler) this._walkCatchClauseId(store, handlerId);

		const handlerTerminated = this.scope.terminated;
		this.scope.terminated = undefined;

		const finalizerId = store.kid2[id];
		if (finalizerId !== 0) this._walkStatementId(store, finalizerId);

		const finalizerTerminated = this.scope.terminated;
		this.scope.terminated = undefined;

		if (finalizerTerminated) {
			this.scope.terminated = finalizerTerminated;
		} else if (tryTerminated && (hasHandler ? handlerTerminated : true)) {
			this.scope.terminated = handlerTerminated || tryTerminated;
		}
	}

	/**
	 * Id-based twin of `walkCatchClause` (param in kid0, body in kid1);
	 * patterns stay on the object walker.
	 * @param {SoaAst} store column store
	 * @param {number} id catch clause node id
	 */
	_walkCatchClauseId(store, id) {
		this.inBlockScope(() => {
			const param = /** @type {EXPECTED_ANY} */ (store.nodeAt(id)).param;
			// Error binding is optional in catch clause since ECMAScript 2019
			if (param !== null) {
				this.enterPattern(param, (ident) => {
					this.defineVariable(ident);
				});
				this.walkPattern(param);
			}
			const bodyId = store.kid1[id];
			const prev = this._prevStatement;
			this._blockPreWalkStatementId(store, bodyId);
			this._prevStatement = prev;
			this._walkStatementId(store, bodyId);
		}, true);
	}

	/**
	 * Id-based twin of `walkLabeledStatement` (body/label in kid0/kid1); the
	 * label hook is keyed by the column-derived label name.
	 * @param {SoaAst} store column store
	 * @param {number} id labeled statement node id
	 */
	_walkLabeledStatementId(store, id) {
		// the label identifier is always column-owned (copyNode never clones it)
		const hook = this.hooks.label.get(
			this._soaIdentName(store, store.kid1[id])
		);
		if (hook !== undefined) {
			const result = hook.call(
				/** @type {EXPECTED_ANY} */ (
					/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
				)
			);
			if (result === true) return;
		}
		this.inBlockScope(() => {
			this._walkNestedStatementId(store, store.kid0[id]);
		});
	}

	/**
	 * Id-based twin of `walkWithStatement` (object/body in kid0/kid1).
	 * @param {SoaAst} store column store
	 * @param {number} id with node id
	 */
	_walkWithStatementId(store, id) {
		if (this._strictInModuleOutput) {
			this._reportStrictModeViolation(
				"`with` statements are not allowed",
				/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
			);
		}
		this.inBlockScope(() => {
			this._walkExprChildId(store, id, store.kid0[id], "object");
			this._walkNestedStatementId(store, store.kid1[id]);
		});
	}

	/**
	 * Id-based twin of `walkVariableDeclaration`: each declarator's initializer
	 * descends id-native (the common host for calls/members), while binding
	 * patterns and the rename/`declarator`-hook analysis run on the facade.
	 * @param {SoaAst} store column store
	 * @param {number} id variable declaration node id
	 */
	_walkVariableDeclarationId(store, id) {
		// a statement-position declaration always seals its declarator list into
		// the columns (declarators are never foreign; for-heads are acorn-built
		// wholesale and never reach this handler)
		const len = store.flat[store.listStarts[id]];
		const flat = store.flat;
		const start = store.listStarts[id] + 1;
		const declaratorTapped = this.hooks.declarator.taps.length !== 0;
		const types = store.types;
		for (let i = 0; i < len; i++) {
			const did = flat[start + i];
			// an unregistered declarator holds no foreign/mutated children, and a
			// plain identifier binding walks no pattern — the facade then only
			// exists for the rename analysis, skipped when it provably cannot match
			if (
				!declaratorTapped &&
				store.facades[did] === undefined &&
				types[store.kid0[did]] === T_IDENTIFIER
			) {
				const initId = store.kid1[did];
				// kid1 of an unregistered declarator is 0 only for a missing init
				if (initId === 0) continue;
				if (this._soaCannotRename(store, initId)) {
					this._walkExpressionId(store, initId);
					continue;
				}
			}
			const declarator = /** @type {EXPECTED_ANY} */ (store.nodeAt(did));
			const renameIdentifier =
				declarator.init && this.getRenameIdentifier(declarator.init);
			if (renameIdentifier && declarator.id.type === "Identifier") {
				const hook = this.hooks.canRename.get(renameIdentifier);
				if (hook !== undefined && hook.call(declarator.init)) {
					// renaming with "var a = b;"
					const renameHook = this.hooks.rename.get(renameIdentifier);
					if (renameHook === undefined || !renameHook.call(declarator.init)) {
						this.setVariable(declarator.id.name, renameIdentifier);
					}
					continue;
				}
			}
			if (
				!declaratorTapped ||
				!this.hooks.declarator.call(
					declarator,
					/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
				)
			) {
				this.walkPattern(declarator.id);
				this._walkExprChildId(store, did, store.kid1[did], "init");
			}
		}
	}

	/**
	 * Id-based twin of `walkExpression`. Dispatches on the numeric column type;
	 * types without an id-native handler materialize the facade and hand off to
	 * the object walker. Only handlers with no unconditional broadcast hook are
	 * converted so far, so the facade is created only where an escape actually
	 * needs it.
	 * @param {SoaAst} store column store
	 * @param {number} id expression node id
	 */
	_walkExpressionId(store, id) {
		switch (store.types[id]) {
			case T_IDENTIFIER:
				this._walkIdentifierId(store, id);
				break;
			case T_LITERAL:
				if (this._strictInModuleOutput) {
					this._checkStrictModeLiteral(
						/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
					);
				}
				break;
			case T_ARRAY_EXPRESSION:
				this._walkArrayExpressionId(store, id);
				break;
			case T_SPREAD_ELEMENT:
				this._walkExprChildId(store, id, store.kid0[id], "argument");
				break;
			case T_UPDATE_EXPRESSION:
				this._walkUpdateExpressionId(store, id);
				break;
			case T_AWAIT_EXPRESSION:
				this._walkAwaitExpressionId(store, id);
				break;
			case T_FUNCTION_EXPRESSION:
				this._walkFunctionId(store, id, true);
				break;
			case T_ARROW_FUNCTION_EXPRESSION:
				this._walkArrowFunctionId(store, id);
				break;
			case T_MEMBER_EXPRESSION:
				this._walkMemberExpressionId(store, id);
				break;
			case T_CALL_EXPRESSION:
				this._walkCallExpressionId(store, id);
				break;
			case T_NEW_EXPRESSION:
				this._walkNewExpressionId(store, id);
				break;
			case T_BINARY_EXPRESSION:
				this._walkBinaryExpressionId(store, id);
				break;
			case T_LOGICAL_EXPRESSION:
				this._walkLogicalExpressionId(store, id);
				break;
			case T_ASSIGNMENT_EXPRESSION:
				this._walkAssignmentExpressionId(store, id);
				break;
			case T_UNARY_EXPRESSION:
				this._walkUnaryExpressionId(store, id);
				break;
			case T_CONDITIONAL_EXPRESSION:
				this._walkConditionalExpressionId(store, id);
				break;
			case T_OBJECT_EXPRESSION:
				this._walkObjectExpressionId(store, id);
				break;
			case T_SEQUENCE_EXPRESSION:
				this._walkSequenceExpressionId(store, id);
				break;
			case T_TEMPLATE_LITERAL:
				this._walkTemplateLiteralId(store, id);
				break;
			case T_CHAIN_EXPRESSION:
				this._walkChainExpressionId(store, id);
				break;
			case T_YIELD_EXPRESSION:
				this._walkExprChildId(store, id, store.kid0[id], "argument");
				break;
			default:
				// dispatch directly — `walkExpression` would re-enter this switch
				this._dispatchWalkExpression(
					/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
				);
		}
	}

	/**
	 * Identifier name derived from the columns (side value for escaped names,
	 * else the source slice) so a tap-less identifier never materializes.
	 * @param {SoaAst} store column store
	 * @param {number} id identifier node id
	 * @returns {string} identifier name
	 */
	_soaIdentName(store, id) {
		const sideName = store.values[id];
		// memoized into the side list: names are re-read by pre-walk hook
		// probes, walk resolution and facade construction
		return sideName === undefined
			? (store.values[id] = store.source.slice(
					store.starts[id],
					store.ends[id]
				))
			: sideName;
	}

	/**
	 * Id-based twin of `walkIdentifier`: resolves the variable by the
	 * column-derived name and materializes the facade only when a tap applies.
	 * @param {SoaAst} store column store
	 * @param {number} id identifier node id
	 */
	_walkIdentifierId(store, id) {
		const info = this.getVariableInfo(this._soaIdentName(store, id));
		if (this._hasHooksForInfo(this.hooks.expression, info)) {
			this._callHooksForInfo(
				this.hooks.expression,
				info,
				undefined,
				undefined,
				[
					/** @type {Identifier} */ (
						/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
					)
				]
			);
		}
	}

	/**
	 * Column-native `detectMode`: the first statement of an unregistered block
	 * resolves from the list columns (cooked literal values sit in `values`),
	 * so the body facade and its statement list never materialize. A registered
	 * block may carry mutated or foreign statements and keeps the facade list.
	 * @param {SoaAst} store column store
	 * @param {number} blockId block node id
	 */
	_detectModeId(store, blockId) {
		// a facade whose list was materialized (and possibly replaced) owns it;
		// mere registration (e.g. every Program) leaves the columns authoritative
		const facade = store.facades[blockId];
		if (
			facade === undefined ||
			/** @type {EXPECTED_ANY} */ (facade)[SOA_KEY_MEMO] === undefined
		) {
			const len = store.flat[store.listStarts[blockId]];
			// no span and no memo means the list is empty
			if (len === 0) return;
			// owned statement lists have no holes — the first ref is real
			const first = store.flat[store.listStarts[blockId] + 1];
			if (store.types[first] !== T_EXPRESSION_STATEMENT) return;
			const exprId = store.kid0[first];
			if (exprId !== 0) {
				if (store.types[exprId] === T_LITERAL) {
					const value = store.values[exprId];
					if (value === "use strict") this.scope.isStrict = true;
					else if (value === "use asm") this.scope.isAsmJs = true;
				}
				return;
			}
			// a pinned first statement holds a foreign expression — facade path
		}
		this.detectMode(/** @type {EXPECTED_ANY} */ (store.nodeAt(blockId)).body);
	}

	/**
	 * Column-native `enterIdentifier` for a binding: the facade materializes
	 * only when a name-keyed pattern hook actually matches the resolved info.
	 * @param {SoaAst} store column store
	 * @param {number} patId identifier node id
	 */
	_enterIdentifierId(store, patId) {
		const name = this._soaIdentName(store, patId);
		const info = this.getVariableInfo(name);
		if (
			this._hasHooksForInfo(this.hooks.pattern, info) &&
			this._callHooksForInfo(this.hooks.pattern, info, undefined, undefined, [
				/** @type {Identifier} */ (
					/** @type {EXPECTED_ANY} */ (store.nodeAt(patId))
				)
			])
		) {
			return;
		}
		this.defineVariable(name);
	}

	/**
	 * Column-native `inFunctionScope`: enters the scope defining plain
	 * identifier params (and the self-name) from the columns; pattern-shaped
	 * params materialize alone and run the object `enterPattern`/`walkPattern`
	 * pair, so the function and its identifier params stay id-native. Answers
	 * false — entering nothing — when the object path must serve the walk: a
	 * registered (possibly mutated) facade, or the strict-mode diagnostics
	 * pass, which reports on param facades.
	 * @param {SoaAst} store column store
	 * @param {number} id function node id
	 * @param {boolean} hasThis whether the scope binds `this`
	 * @param {number} selfNameId self-name identifier id (0 for none)
	 * @param {() => void} fn inner walk
	 * @returns {boolean} the scope was entered and `fn` ran
	 */
	_inFunctionScopeIds(store, id, hasThis, selfNameId, fn) {
		if (this._strictInModuleOutput || store.facades[id] !== undefined) {
			return false;
		}
		const types = store.types;
		const len = store.flat[store.listStarts[id]];
		const start = store.listStarts[id] + 1;
		const flat = store.flat;
		// a foreign param would pin the facade (caught above) — every ref is real
		let patternParams = 0;
		for (let i = 0; i < len; i++) {
			if (types[flat[start + i]] !== T_IDENTIFIER) patternParams++;
		}
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
		for (let i = 0; i < len; i++) {
			const pid = flat[start + i];
			if (types[pid] === T_IDENTIFIER) {
				this._enterIdentifierId(store, pid);
			} else {
				this.enterPattern(
					/** @type {EXPECTED_ANY} */ (store.nodeAt(pid)),
					this._defineVariable
				);
			}
		}
		if (selfNameId !== 0) {
			this._enterIdentifierId(store, selfNameId);
		}
		if (patternParams !== 0) {
			// defaults and computed keys walk after every binding is defined,
			// mirroring the object path's enter-all-then-walk order
			for (let i = 0; i < len; i++) {
				const pid = flat[start + i];
				if (types[pid] !== T_IDENTIFIER) {
					this.walkPattern(/** @type {EXPECTED_ANY} */ (store.nodeAt(pid)));
				}
			}
		}
		fn();
		this.scope = oldScope;
		return true;
	}

	/**
	 * Id-based twin of `walkFunctionDeclaration` / `walkFunctionExpression`;
	 * scope entry and the body walk run on the columns, pattern params and
	 * registered facades fall back to the object walker.
	 * @param {SoaAst} store column store
	 * @param {number} id function node id
	 * @param {boolean} isExpression whether this is a function expression (adds
	 * the self-name to the scope for recursion)
	 */
	_walkFunctionId(store, id, isExpression) {
		const wasTopLevel = this.scope.topLevelScope;
		this.scope.topLevelScope = false;
		const walkBody = () => {
			const bodyId = store.kid1[id];
			this._detectModeId(store, bodyId);
			const prev = this._prevStatement;
			this._preWalkStatementId(store, bodyId);
			this._prevStatement = prev;
			this._walkStatementId(store, bodyId);
		};
		if (
			!this._inFunctionScopeIds(
				store,
				id,
				true,
				isExpression ? store.kid0[id] : 0,
				walkBody
			)
		) {
			const facade = /** @type {EXPECTED_ANY} */ (store.nodeAt(id));
			const params = facade.params;
			const scopeParams =
				isExpression && facade.id ? [...params, facade.id] : params;
			if (this._strictInModuleOutput) {
				this._checkStrictModeParams(params);
			}
			this.inFunctionScope(true, scopeParams, () => {
				for (const param of params) {
					this.walkPattern(param);
				}
				walkBody();
			});
		}
		this.scope.topLevelScope = wasTopLevel;
	}

	/**
	 * Id-based twin of `walkArrowFunctionExpression` (concise or block body).
	 * @param {SoaAst} store column store
	 * @param {number} id arrow node id
	 */
	_walkArrowFunctionId(store, id) {
		const wasTopLevel = this.scope.topLevelScope;
		this.scope.topLevelScope = wasTopLevel ? "arrow" : false;
		const walkBody = () => {
			const bodyId = store.kid1[id];
			if (store.types[bodyId] === T_BLOCK_STATEMENT) {
				this._detectModeId(store, bodyId);
				const prev = this._prevStatement;
				this._preWalkStatementId(store, bodyId);
				this._prevStatement = prev;
				this._walkStatementId(store, bodyId);
			} else {
				this._walkExprChildId(store, id, bodyId, "body");
			}
		};
		if (!this._inFunctionScopeIds(store, id, false, 0, walkBody)) {
			const facade = /** @type {EXPECTED_ANY} */ (store.nodeAt(id));
			const params = facade.params;
			if (this._strictInModuleOutput) {
				this._checkStrictModeParams(params);
			}
			this.inFunctionScope(false, params, () => {
				for (const param of params) {
					this.walkPattern(param);
				}
				walkBody();
			});
		}
		this.scope.topLevelScope = wasTopLevel;
	}

	/**
	 * Walks an expression child held in a fixed column slot; a foreign child
	 * sits at ref 0 with the node memoized on the facade, so it falls back to
	 * the object walker (and `null`/absent children are skipped).
	 * @param {SoaAst} store column store
	 * @param {number} parentId owning node id
	 * @param {number} childId child node id (0 when foreign or absent)
	 * @param {string} prop child property name serving the foreign fallback
	 */
	_walkExprChildId(store, parentId, childId, prop) {
		if (childId !== 0) {
			this._walkExpressionId(store, childId);
			return;
		}
		// a foreign child is always pinned onto its owner's memoized facade, so
		// an owner without a facade proves the slot is absent
		const facade = /** @type {EXPECTED_ANY} */ (store.facades[parentId]);
		if (facade === undefined) return;
		const child = facade[prop];
		if (child) this.walkExpression(child);
	}

	/**
	 * Id-based twin of `walkArrayExpression` (holes are ref 0 and skipped).
	 * @param {SoaAst} store column store
	 * @param {number} id array node id
	 */
	_walkArrayExpressionId(store, id) {
		const len = store.flat[store.listStarts[id]];
		if (len === 0) {
			// a pinned list (foreign element) lives on the memoized facade — no
			// facade means the array is truly empty
			const facade = /** @type {EXPECTED_ANY} */ (store.facades[id]);
			if (facade === undefined) return;
			const elements = facade.elements;
			if (elements && elements.length !== 0) this.walkExpressions(elements);
			return;
		}
		const flat = store.flat;
		const start = store.listStarts[id] + 1;
		for (let i = 0; i < len; i++) {
			const cid = flat[start + i];
			if (cid !== 0) this._walkExpressionId(store, cid);
		}
	}

	/**
	 * Id-based twin of `walkUpdateExpression`.
	 * @param {SoaAst} store column store
	 * @param {number} id update node id
	 */
	_walkUpdateExpressionId(store, id) {
		if (this._strictInModuleOutput) {
			const facade = /** @type {EXPECTED_ANY} */ (store.nodeAt(id));
			if (facade.argument.type === "Identifier") {
				this._checkStrictModeAssignTarget(facade.argument.name, facade);
			}
		}
		this._walkExprChildId(store, id, store.kid0[id], "argument");
	}

	/**
	 * Id-based twin of `walkAwaitExpression`.
	 * @param {SoaAst} store column store
	 * @param {number} id await node id
	 */
	_walkAwaitExpressionId(store, id) {
		if (this.scope.topLevelScope === true) {
			this.hooks.topLevelAwait.call(
				/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
			);
		}
		this._walkExprChildId(store, id, store.kid0[id], "argument");
	}

	/**
	 * Walks an expression node reached as a derived (non-column) child of an
	 * id-walked parent — e.g. `exprInfo.call` or a member callee's object. It
	 * id-walks the child when it lives in the same store, else falls back to the
	 * object walker for a foreign (acorn-built) node.
	 * @param {SoaAst} store column store
	 * @param {EXPECTED_ANY} node child node (facade or foreign)
	 */
	_walkFacadeExprId(store, node) {
		if (node[SOA_KEY_STORE] === store) {
			this._walkExpressionId(store, node[SOA_KEY_ID]);
		} else {
			this.walkExpression(node);
		}
	}

	/**
	 * Id-based twin of `walkExpressions` for a column child list (arguments,
	 * object properties, sequence/template expressions). A list with no column
	 * span was pinned on its facade by a foreign element (or is empty), so it
	 * falls back to the object list walker; column holes sit at ref 0 and are
	 * skipped like `null` entries.
	 * @param {SoaAst} store column store
	 * @param {number} id node owning the list
	 * @param {string} prop facade list property serving the foreign fallback
	 */
	_walkExprListId(store, id, prop) {
		const len = store.flat[store.listStarts[id]];
		if (len === 0) {
			const list = /** @type {EXPECTED_ANY} */ (store.nodeAt(id))[prop];
			if (list && list.length !== 0) this.walkExpressions(list);
			return;
		}
		const flat = store.flat;
		const start = store.listStarts[id] + 1;
		for (let i = 0; i < len; i++) {
			const cid = flat[start + i];
			if (cid !== 0) this._walkExpressionId(store, cid);
		}
	}

	/**
	 * Column-native `getRenameIdentifier` pre-check: true when evaluating the
	 * node could only fall through (never an identifier result), so the rename
	 * analysis provably does not apply. Covers the two shapes the columns can
	 * prove — a defined, untagged plain identifier and an info-free member
	 * chain — while the own-taps gates keep plugin evaluations honest.
	 * @param {SoaAst} store column store
	 * @param {number} id rename-source candidate id
	 * @returns {boolean} evaluation can only fall through
	 */
	_soaCannotRename(store, id) {
		const type = store.types[id];
		if (type === T_IDENTIFIER) {
			if (!this._evalIdentOwnTaps) return false;
			const name = this._soaIdentName(store, id);
			return name !== "undefined" && this._isDefinedPlainVariable(name);
		}
		if (type === T_MEMBER_EXPRESSION) {
			return (
				this._evalMemberOwnTaps && this._soaMemberChainHasNoInfo(store, id)
			);
		}
		if (type === T_UNARY_EXPRESSION) {
			// typeof dispatches name-keyed evaluateTypeof taps — facade path
			return (
				store.aux[id] !== SOA_OP_TYPEOF && this._soaEvalInertTypes[type] === 1
			);
		}
		if (type === T_CALL_EXPRESSION) {
			// the own tap builds value results (string-method helpers); an
			// identifier can only come from a name-keyed dispatch on the callee
			if (!this._evalCallOwnTaps) return false;
			const calleeId = store.kid0[id];
			if (calleeId === 0) return false;
			const calleeType = store.types[calleeId];
			if (calleeType === T_IDENTIFIER) {
				const info = this.getVariableInfo(this._soaIdentName(store, calleeId));
				return !this._hasHooksForInfo(this.hooks.evaluateCallExpression, info);
			}
			if (calleeType === T_MEMBER_EXPRESSION) {
				const propId = store.kid1[calleeId];
				if (propId === 0) return false;
				const computed = (store.flags[calleeId] & SOA_FLAG_COMPUTED) !== 0;
				// a property shape the own tap does not stringify never dispatches
				if (store.types[propId] !== (computed ? T_LITERAL : T_IDENTIFIER)) {
					return true;
				}
				const prop = computed
					? `${store.values[propId]}`
					: this._soaIdentName(store, propId);
				const hook = this.hooks.evaluateCallExpressionMember.get(prop);
				return (
					hook === undefined ||
					(hook.interceptors.length === 0 &&
						hook.taps.every((tap) => tap.name === CLASS_NAME))
				);
			}
			// other callees fall through the own tap without dispatching
			return true;
		}
		if (type === T_NEW_EXPRESSION) {
			if (!this._evalNewOwnTaps) return false;
			const calleeId = store.kid0[id];
			if (calleeId === 0) return false;
			if (store.types[calleeId] !== T_IDENTIFIER) return true;
			const name = this._soaIdentName(store, calleeId);
			// the literal-`RegExp` arm only ever builds regexp values
			if (name === "RegExp") return true;
			return !this._hasHooksForInfo(
				this.hooks.evaluateNewExpression,
				this.getVariableInfo(name)
			);
		}
		if (type === T_LOGICAL_EXPRESSION) {
			// the result is an operand evaluation passed through verbatim or a
			// synthetic truthy/falsy value — inert when both operands are
			if (!this._evalLogicalOwnTaps) return false;
			const leftId = store.kid0[id];
			const rightId = store.kid1[id];
			return (
				leftId !== 0 &&
				rightId !== 0 &&
				this._soaCannotRename(store, leftId) &&
				this._soaCannotRename(store, rightId)
			);
		}
		if (type === T_CONDITIONAL_EXPRESSION) {
			// a determined test forwards the taken branch evaluation verbatim;
			// undetermined tests build an options result (never an identifier)
			if (!this._evalConditionalOwnTaps) return false;
			const consequentId = store.kid1[id];
			const alternateId = store.kid2[id];
			return (
				consequentId !== 0 &&
				alternateId !== 0 &&
				this._soaCannotRename(store, consequentId) &&
				this._soaCannotRename(store, alternateId)
			);
		}
		return this._soaEvalInertTypes[type] === 1;
	}

	/**
	 * Column twin of the `getMemberExpressionRoot` descent: the node id the
	 * descent stops at (possibly the member itself for dynamic chains), or 0
	 * when a link needs node data (foreign refs, static template members).
	 * @param {SoaAst} store column store
	 * @param {number} id member expression id
	 * @returns {number} root node id (0 routes to the facade path)
	 */
	_soaMemberRootId(store, id) {
		const types = store.types;
		let cur = id;
		while (types[cur] === T_MEMBER_EXPRESSION) {
			const propId = store.kid1[cur];
			if (propId === 0) return 0;
			if ((store.flags[cur] & SOA_FLAG_COMPUTED) !== 0) {
				const propType = types[propId];
				// a static template member continues the descent on node data
				if (propType === T_TEMPLATE_LITERAL) return 0;
				if (propType !== T_LITERAL) break;
			} else if (types[propId] !== T_IDENTIFIER) {
				break;
			}
			const objId = store.kid0[cur];
			if (objId === 0) return 0;
			cur = objId;
		}
		return cur;
	}

	/**
	 * Column-derived member-chain info for a free-string root: the dotted
	 * name exactly as `getMemberExpressionInfo` would build it plus the root
	 * info, or undefined when the shape needs the facade path (non-identifier
	 * or `this` roots, tagged/defined roots, template members, foreign refs).
	 * @param {SoaAst} store column store
	 * @param {number} id member expression id
	 * @returns {{ name: string, rootInfo: string } | undefined} chain info
	 */
	_soaDottedNameId(store, id) {
		const types = store.types;
		/** @type {string[]} */
		const members = [];
		let cur = id;
		while (types[cur] === T_MEMBER_EXPRESSION) {
			const propId = store.kid1[cur];
			if (propId === 0) return;
			if ((store.flags[cur] & SOA_FLAG_COMPUTED) !== 0) {
				if (types[propId] !== T_LITERAL) return;
				members.push(`${store.values[propId]}`);
			} else {
				if (types[propId] !== T_IDENTIFIER) return;
				members.push(this._soaIdentName(store, propId));
			}
			const objId = store.kid0[cur];
			if (objId === 0) return;
			cur = objId;
		}
		const rootType = types[cur];
		const rootName =
			rootType === T_IDENTIFIER
				? this._soaIdentName(store, cur)
				: rootType === T_THIS_EXPRESSION
					? "this"
					: undefined;
		if (rootName === undefined) return;
		const result = this.getNameInfoFromVariable(rootName);
		// only a plain free root keeps the hook dispatch name-keyed
		if (result === undefined || typeof result.info !== "string") return;
		let name = result.name;
		for (let i = members.length - 1; i >= 0; i--) {
			name = `${name}.${members[i]}`;
		}
		return { name, rootInfo: result.info };
	}

	/**
	 * True when an info-full member callee provably fires no call hook: the
	 * chain resolves to a free-string dotted name with no `evaluateIdentifier`
	 * tap (the evaluation is then exactly the structural identifier), no
	 * `callMemberChain` tap for the root and no `call` tap for the full name.
	 * @param {SoaAst} store column store
	 * @param {number} id member callee id
	 * @returns {boolean} the whole callee hook cascade is a no-op
	 */
	_soaCallChainHasNoTaps(store, id) {
		const chain = this._soaDottedNameId(store, id);
		return (
			chain !== undefined &&
			this.hooks.evaluateIdentifier.get(chain.name) === undefined &&
			this.hooks.callMemberChain.get(chain.rootInfo) === undefined &&
			this.hooks.call.get(chain.name) === undefined
		);
	}

	/**
	 * True when an info-full member assignment target provably fires no
	 * `assignMemberChain` hook for its column-derived root info. Foreign or
	 * template links keep the facade path; non-name roots (dynamic members,
	 * call-rooted chains) never resolve expression info at all.
	 * @param {SoaAst} store column store
	 * @param {number} id member target id
	 * @returns {boolean} the assignMemberChain dispatch is a no-op
	 */
	_soaAssignChainHasNoTaps(store, id) {
		const rootId = this._soaMemberRootId(store, id);
		if (rootId === 0) return false;
		const rootType = store.types[rootId];
		if (rootType !== T_IDENTIFIER && rootType !== T_THIS_EXPRESSION) {
			return true;
		}
		const result = this.getNameInfoFromVariable(
			rootType === T_IDENTIFIER ? this._soaIdentName(store, rootId) : "this"
		);
		return (
			result === undefined ||
			!this._hasHooksForInfo(this.hooks.assignMemberChain, result.info)
		);
	}

	/**
	 * True when an info-full member expression provably fires no expression
	 * hook: a free-string root with no `expression` tap on the full dotted
	 * name or any dot-boundary prefix (a superset of the names the prefix
	 * walk can dispatch, including the bare root) and no member-chain taps
	 * for the root info.
	 * @param {SoaAst} store column store
	 * @param {number} id member expression id
	 * @returns {boolean} the whole expression hook cascade is a no-op
	 */
	_soaExprChainHasNoTaps(store, id) {
		const chain = this._soaDottedNameId(store, id);
		if (
			chain === undefined ||
			this.hooks.expressionMemberChain.get(chain.rootInfo) !== undefined ||
			this.hooks.unhandledExpressionMemberChain.get(chain.rootInfo) !==
				undefined
		) {
			return false;
		}
		/** @type {string | undefined} */
		let name = chain.name;
		while (name !== undefined) {
			if (this.hooks.expression.get(name) !== undefined) return false;
			const dot = name.lastIndexOf(".");
			name = dot === -1 ? undefined : name.slice(0, dot);
		}
		return true;
	}

	/**
	 * Column-native twin of the `getMemberExpressionRoot` descent: true when
	 * `getMemberExpressionInfo` on this chain is guaranteed `undefined` (no
	 * name-keyed hook can match), so the walk can descend without
	 * materializing the chain. Foreign links and shapes that need node data
	 * (template-literal members, call/meta/this-resolvable roots) answer
	 * false and take the facade path.
	 * @param {SoaAst} store column store
	 * @param {number} id member expression node id
	 * @returns {boolean} the chain resolves to no expression info
	 */
	_soaMemberChainHasNoInfo(store, id) {
		const types = store.types;
		let cur = id;
		for (;;) {
			// an owned non-computed property is always an identifier (private
			// identifiers are acorn-built, so they sit at ref 0)
			const propId = store.kid1[cur];
			if (propId === 0) return false;
			if ((store.flags[cur] & SOA_FLAG_COMPUTED) !== 0) {
				const propType = types[propId];
				// a static template member needs the cooked value — facade path
				if (propType === T_TEMPLATE_LITERAL) return false;
				// a dynamic member name roots the chain at this node — never info
				if (propType !== T_LITERAL) return true;
			}
			const objId = store.kid0[cur];
			if (objId === 0) return false;
			if (types[objId] !== T_MEMBER_EXPRESSION) {
				const rootType = types[objId];
				if (rootType === T_CALL_EXPRESSION) return false;
				if (rootType === T_IDENTIFIER) {
					return (
						this.getNameInfoFromVariable(this._soaIdentName(store, objId)) ===
						undefined
					);
				}
				if (rootType === T_THIS_EXPRESSION) {
					return this.getNameInfoFromVariable("this") === undefined;
				}
				// any other owned root type never produces expression info
				return true;
			}
			cur = objId;
		}
	}

	/**
	 * Id-based twin of `walkMemberExpression`. Member-chain info (name-keyed
	 * `HookMap` resolution, `getMemberExpressionInfo`) is computed from the
	 * materialized facade; a chain the column probe proves hook-free descends
	 * straight from the columns.
	 * @param {SoaAst} store column store
	 * @param {number} id member node id
	 */
	_walkMemberExpressionId(store, id) {
		if (
			this._soaMemberChainHasNoInfo(store, id) ||
			this._soaExprChainHasNoTaps(store, id)
		) {
			// no name-keyed hook can match — descend without materializing
			this._walkExprChildId(store, id, store.kid0[id], "object");
			if ((store.flags[id] & SOA_FLAG_COMPUTED) !== 0) {
				this._walkExprChildId(store, id, store.kid1[id], "property");
			}
			return;
		}
		const expression = /** @type {EXPECTED_ANY} */ (store.nodeAt(id));
		const exprInfo = this.getMemberExpressionInfo(
			expression,
			ALLOWED_MEMBER_TYPES_ALL
		);
		if (exprInfo) {
			switch (exprInfo.type) {
				case "expression": {
					const result1 = this.callHooksForInfo(
						this.hooks.expression,
						exprInfo.name,
						expression
					);
					if (result1 === true) return;
					const members = exprInfo.getMembers();
					if (
						this._hasHooksForInfo(
							this.hooks.expressionMemberChain,
							exprInfo.rootInfo
						)
					) {
						const result2 = this.callHooksForInfo(
							this.hooks.expressionMemberChain,
							exprInfo.rootInfo,
							expression,
							members,
							exprInfo.getMembersOptionals(),
							exprInfo.getMemberRanges()
						);
						if (result2 === true) return;
					}
					this.walkMemberExpressionWithExpressionName(
						expression,
						exprInfo.name,
						exprInfo.rootInfo,
						[...members],
						() =>
							this.callHooksForInfo(
								this.hooks.unhandledExpressionMemberChain,
								exprInfo.rootInfo,
								expression,
								members
							)
					);
					return;
				}
				case "call": {
					if (
						this._hasHooksForInfo(
							this.hooks.memberChainOfCallMemberChain,
							exprInfo.rootInfo
						)
					) {
						const result = this.callHooksForInfo(
							this.hooks.memberChainOfCallMemberChain,
							exprInfo.rootInfo,
							expression,
							exprInfo.getCalleeMembers(),
							exprInfo.call,
							exprInfo.getMembers(),
							exprInfo.getMemberRanges()
						);
						if (result === true) return;
					}
					this._walkFacadeExprId(store, exprInfo.call);
					return;
				}
			}
		}
		this._walkExprChildId(store, id, store.kid0[id], "object");
		if (expression.computed === true) {
			this._walkExprChildId(store, id, store.kid1[id], "property");
		}
	}

	/**
	 * Id-based twin of `walkCallExpression`. Callee/member analysis, IIFE
	 * detection and the callee evaluation run on the materialized facade; the
	 * argument list descends id-native from the columns.
	 * @param {SoaAst} store column store
	 * @param {number} id call node id
	 */
	_walkCallExpressionId(store, id) {
		const calleeId = store.kid0[id];
		if (
			calleeId !== 0 &&
			store.types[calleeId] === T_IDENTIFIER &&
			this._evalIdentOwnTaps
		) {
			const calleeName = this._soaIdentName(store, calleeId);
			if (
				calleeName !== "undefined" &&
				this._isDefinedPlainVariable(calleeName)
			) {
				// a defined, untagged callee applies no call hooks — walk callee
				// and arguments straight from the columns, never materializing
				this._walkExpressionId(store, calleeId);
				this._walkExprListId(store, id, "arguments");
				return;
			}
		}
		if (calleeId !== 0 && store.types[calleeId] === T_MEMBER_EXPRESSION) {
			const objId = store.kid0[calleeId];
			const objType = objId === 0 ? -1 : store.types[objId];
			if (
				// the probe cannot see IIFE `.call`/`.bind` semantics on a
				// function/arrow object nor the importCall hook on an import()
				// object — those roots keep the facade path
				objType !== T_FUNCTION_EXPRESSION &&
				objType !== T_ARROW_FUNCTION_EXPRESSION &&
				objType !== T_IMPORT_EXPRESSION &&
				objId !== 0 &&
				this._evalMemberOwnTaps &&
				(this._soaMemberChainHasNoInfo(store, calleeId) ||
					this._soaCallChainHasNoTaps(store, calleeId))
			) {
				// either no info exists (nothing name-keyed can match) or the
				// full hook cascade is provably untapped — walk the call context
				// (object, computed property) and arguments from the columns
				this._walkExprChildId(store, calleeId, objId, "object");
				if ((store.flags[calleeId] & SOA_FLAG_COMPUTED) !== 0) {
					this._walkExprChildId(
						store,
						calleeId,
						store.kid1[calleeId],
						"property"
					);
				}
				this._walkExprListId(store, id, "arguments");
				return;
			}
		}
		const expression = /** @type {EXPECTED_ANY} */ (store.nodeAt(id));
		if (
			expression.callee.type === "MemberExpression" &&
			isFunctionExpression(expression.callee.object.type) &&
			!expression.callee.computed &&
			(expression.callee.property.name === "call" ||
				expression.callee.property.name === "bind") &&
			expression.arguments.length > 0 &&
			isSimpleFunction(expression.callee.object)
		) {
			// (function(…) { }.call/bind(?, …))
			this._walkIIFE(
				expression.callee.object,
				expression.arguments.slice(1),
				expression.arguments[0]
			);
		} else if (
			isFunctionExpression(expression.callee.type) &&
			isSimpleFunction(expression.callee)
		) {
			// (function(…) { }(…))
			this._walkIIFE(expression.callee, expression.arguments, null);
		} else {
			if (expression.callee.type === "MemberExpression") {
				// callMemberChainOfCallMemberChain only applies to call-rooted
				// chains; a column-backed, unreplaced callee answers that from
				// the columns without materializing the chain
				const columnCalleeId =
					expression.callee[SOA_KEY_STORE] === store
						? this._soaMemberRootId(
								store,
								/** @type {number} */ (expression.callee[SOA_KEY_ID])
							)
						: 0;
				if (
					columnCalleeId !== 0
						? store.types[columnCalleeId] === T_CALL_EXPRESSION
						: this.getMemberExpressionRoot(expression.callee).type ===
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
			const callee = this.evaluateExpression(expression.callee);
			if (callee.isIdentifier()) {
				const members =
					/** @type {NonNullable<BasicEvaluatedExpression["getMembers"]>} */
					(callee.getMembers)();
				const result1 = this.callHooksForInfo(
					this.hooks.callMemberChain,
					/** @type {NonNullable<BasicEvaluatedExpression["rootInfo"]>} */
					(callee.rootInfo),
					expression,
					members,
					callee.getMembersOptionals
						? callee.getMembersOptionals()
						: members.map(RETURN_FALSE),
					callee.getMemberRanges ? callee.getMemberRanges() : []
				);
				if (result1 === true) return;
				const result2 = this.callHooksForInfo(
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
					this._walkFacadeExprId(store, expression.callee.object);
					if (expression.callee.computed === true) {
						this._walkFacadeExprId(store, expression.callee.property);
					}
				} else {
					this._walkExprChildId(store, id, store.kid0[id], "callee");
				}
			}
			if (expression.arguments) this._walkExprListId(store, id, "arguments");
		}
	}

	/**
	 * Id-based twin of `walkNewExpression`.
	 * @param {SoaAst} store column store
	 * @param {number} id new node id
	 */
	_walkNewExpressionId(store, id) {
		const calleeId = store.kid0[id];
		if (calleeId !== 0 && store.types[calleeId] === T_IDENTIFIER) {
			const calleeName = this._soaIdentName(store, calleeId);
			// a defined, untagged callee matches no name-keyed `new` hook —
			// `new LocalClass()` walks straight from the columns
			if (
				calleeName !== "undefined" &&
				this._isDefinedPlainVariable(calleeName)
			) {
				this._walkExpressionId(store, calleeId);
				this._walkExprListId(store, id, "arguments");
				return;
			}
		}
		const expression = /** @type {EXPECTED_ANY} */ (store.nodeAt(id));
		const result = this.callHooksForExpression(
			this.hooks.new,
			expression.callee,
			expression
		);
		if (result === true) return;
		this._walkExprChildId(store, id, store.kid0[id], "callee");
		if (expression.arguments) this._walkExprListId(store, id, "arguments");
	}

	/**
	 * Id-based twin of `walkBinaryExpression`.
	 * @param {SoaAst} store column store
	 * @param {number} id binary node id
	 */
	_walkBinaryExpressionId(store, id) {
		// with no taps (or only the harmony `in` tap and another operator in
		// the column) the hook provably bails — no facade needed
		if (
			store.facades[id] === undefined &&
			(this.hooks.binaryExpression.taps.length === 0 ||
				(this._soaBinaryInOnlyTaps && store.aux[id] !== SOA_OP_IN))
		) {
			this._walkExprChildId(store, id, store.kid0[id], "left");
			this._walkExprChildId(store, id, store.kid1[id], "right");
			return;
		}
		if (
			this.hooks.binaryExpression.call(
				/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
			) === undefined
		) {
			this._walkExprChildId(store, id, store.kid0[id], "left");
			this._walkExprChildId(store, id, store.kid1[id], "right");
		}
	}

	/**
	 * Id-based twin of `walkLogicalExpression`.
	 * @param {SoaAst} store column store
	 * @param {number} id logical node id
	 */
	_walkLogicalExpressionId(store, id) {
		// zero taps cannot short-circuit the walk, so an unregistered node
		// descends without materializing the hook argument
		if (
			store.facades[id] === undefined &&
			this.hooks.expressionLogicalOperator.taps.length === 0
		) {
			this._walkExprChildId(store, id, store.kid0[id], "left");
			this._walkExprChildId(store, id, store.kid1[id], "right");
			return;
		}
		const result = this.hooks.expressionLogicalOperator.call(
			/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
		);
		if (result === undefined) {
			this._walkExprChildId(store, id, store.kid0[id], "left");
			this._walkExprChildId(store, id, store.kid1[id], "right");
		} else if (result) {
			this._walkExprChildId(store, id, store.kid1[id], "right");
		}
	}

	/**
	 * Id-based twin of `walkConditionalExpression`.
	 * @param {SoaAst} store column store
	 * @param {number} id conditional node id
	 */
	_walkConditionalExpressionId(store, id) {
		// with no operator/guard taps both branches always walk — descend on
		// the columns without materializing the hook argument
		if (
			store.facades[id] === undefined &&
			this.hooks.expressionConditionalOperator.taps.length === 0 &&
			this.hooks.collectGuards.taps.length === 0
		) {
			this._walkExprChildId(store, id, store.kid0[id], "test");
			this._walkExprChildId(store, id, store.kid1[id], "consequent");
			this._walkExprChildId(store, id, store.kid2[id], "alternate");
			return;
		}
		const expression = /** @type {EXPECTED_ANY} */ (store.nodeAt(id));
		const result = this.hooks.expressionConditionalOperator.call(expression);
		if (result === undefined) {
			const guard = this.hooks.collectGuards.call(expression.test);
			this._walkExprChildId(store, id, store.kid0[id], "test");
			this.walkGuardedBranch(guard ? guard.consequent : undefined, () =>
				this._walkExprChildId(store, id, store.kid1[id], "consequent")
			);
			if (expression.alternate) {
				this.walkGuardedBranch(guard ? guard.alternate : undefined, () =>
					this._walkExprChildId(store, id, store.kid2[id], "alternate")
				);
			}
		} else if (result) {
			this._walkExprChildId(store, id, store.kid1[id], "consequent");
		} else if (expression.alternate) {
			this._walkExprChildId(store, id, store.kid2[id], "alternate");
		}
	}

	/**
	 * Id-based twin of `walkUnaryExpression`.
	 * @param {SoaAst} store column store
	 * @param {number} id unary node id
	 */
	_walkUnaryExpressionId(store, id) {
		const op = store.aux[id];
		// typeof dispatches name-keyed hooks and delete carries a strict-mode
		// diagnostic; every other operator walks its argument facade-free
		if (
			op !== SOA_OP_TYPEOF &&
			store.facades[id] === undefined &&
			!(this._strictInModuleOutput && op === SOA_OP_DELETE)
		) {
			this._walkExprChildId(store, id, store.kid0[id], "argument");
			return;
		}
		const expression = /** @type {EXPECTED_ANY} */ (store.nodeAt(id));
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
		this._walkExprChildId(store, id, store.kid0[id], "argument");
	}

	/**
	 * Id-based twin of `walkAssignmentExpression`. The left/right operands
	 * descend id-native; pattern targets stay on the object walker.
	 * @param {SoaAst} store column store
	 * @param {number} id assignment node id
	 */
	_walkAssignmentExpressionId(store, id) {
		const leftId = store.kid0[id];
		const rightId = store.kid1[id];
		// a registered facade may carry foreign or mutated operands — facade path
		if (store.facades[id] === undefined && leftId !== 0 && rightId !== 0) {
			const leftType = store.types[leftId];
			if (leftType === T_IDENTIFIER) {
				// the strict-mode diagnostics pass needs the facade for reporting
				if (
					!this._strictInModuleOutput &&
					this._soaCannotRename(store, rightId)
				) {
					const leftInfo = this.getVariableInfo(
						this._soaIdentName(store, leftId)
					);
					if (
						!this._hasHooksForInfo(this.hooks.pattern, leftInfo) &&
						!this._hasHooksForInfo(this.hooks.assign, leftInfo)
					) {
						// no rename, no pattern/assign hook — plain re-assignment
						this._walkExpressionId(store, rightId);
						this._walkExpressionId(store, leftId);
						return;
					}
				}
			} else if (
				leftType === T_MEMBER_EXPRESSION &&
				(this._soaMemberChainHasNoInfo(store, leftId) ||
					this._soaAssignChainHasNoTaps(store, leftId))
			) {
				// an info-free target cannot reach assignMemberChain, and an
				// info-full one with no matching tap fires nothing either
				this._walkExpressionId(store, rightId);
				this._walkExpressionId(store, leftId);
				return;
			}
		}
		const expression = /** @type {EXPECTED_ANY} */ (store.nodeAt(id));
		if (expression.left.type === "Identifier") {
			if (this._strictInModuleOutput) {
				this._checkStrictModeAssignTarget(expression.left.name, expression);
			}
			const renameIdentifier = this.getRenameIdentifier(expression.right);
			if (
				renameIdentifier &&
				this.callHooksForInfo(
					this.hooks.canRename,
					renameIdentifier,
					expression.right
				)
			) {
				// renaming "a = b;"
				if (
					!this.callHooksForInfo(
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
			this._walkExprChildId(store, id, store.kid1[id], "right");
			this.enterPattern(expression.left, (name, _decl) => {
				if (!this.callHooksForName(this.hooks.assign, name, expression)) {
					this._walkExprChildId(store, id, store.kid0[id], "left");
				}
			});
		} else if (expression.left.type.endsWith("Pattern")) {
			this._walkExprChildId(store, id, store.kid1[id], "right");
			this.enterPattern(expression.left, (name, _decl) => {
				if (!this.callHooksForName(this.hooks.assign, name, expression)) {
					this.defineVariable(name);
				}
			});
			this.walkPattern(expression.left);
		} else {
			// member-expression target (the only remaining real shape): try the
			// member-chain assign hook, then walk value and target id-native
			if (expression.left.type === "MemberExpression") {
				const exprName = this.getMemberExpressionInfo(
					expression.left,
					ALLOWED_MEMBER_TYPES_EXPRESSION
				);
				if (
					exprName &&
					this.callHooksForInfo(
						this.hooks.assignMemberChain,
						exprName.rootInfo,
						expression,
						exprName.getMembers()
					)
				) {
					return;
				}
			}
			this._walkExprChildId(store, id, store.kid1[id], "right");
			this._walkExprChildId(store, id, store.kid0[id], "left");
		}
	}

	/**
	 * Id-based twin of `walkSequenceExpression`.
	 * @param {SoaAst} store column store
	 * @param {number} id sequence node id
	 */
	_walkSequenceExpressionId(store, id) {
		const expression = /** @type {EXPECTED_ANY} */ (store.nodeAt(id));
		const path = /** @type {StatementPath} */ (this._statementPath);
		// materializes a pending tail id — the check compares by identity
		const currentStatement = /** @type {StatementPathItem} */ (
			this._statementPathTail()
		);
		if (
			currentStatement === expression ||
			(currentStatement.type === "ExpressionStatement" &&
				currentStatement.expression === expression)
		) {
			const old = /** @type {StatementPathItem} */ (path.pop());
			const prev = this._prevStatement;
			for (const expr of expression.expressions) {
				path.push(expr);
				this._walkFacadeExprId(store, expr);
				this._prevStatement = path.pop();
			}
			this._prevStatement = prev;
			path.push(old);
		} else {
			this._walkExprListId(store, id, "expressions");
		}
	}

	/**
	 * Id-based twin of `walkObjectExpression`.
	 * @param {SoaAst} store column store
	 * @param {number} id object node id
	 */
	_walkObjectExpressionId(store, id) {
		const len = store.flat[store.listStarts[id]];
		// object-literal properties are always column-backed (`Property` /
		// `SpreadElement` nodes), so a zero span is the empty object literal
		if (len === 0) return;
		const flat = store.flat;
		const start = store.listStarts[id] + 1;
		for (let i = 0; i < len; i++) {
			const pid = flat[start + i];
			if (store.types[pid] === T_PROPERTY) {
				this._walkPropertyId(store, pid);
			} else {
				// SpreadElement — id-native argument descent
				this._walkExpressionId(store, pid);
			}
		}
	}

	/**
	 * Id-based twin of `walkProperty` (non-spread). Property key/value are set
	 * through facade slots (born-unfinished node), so they are read from the
	 * facade and descend id-native.
	 * @param {SoaAst} store column store
	 * @param {number} id property node id
	 */
	_walkPropertyId(store, id) {
		// a registered facade may carry mutated children — facade path
		if (store.facades[id] === undefined) {
			const flags = store.flags[id];
			const valueId = store.kid1[id];
			if ((flags & SOA_FLAG_COMPUTED) !== 0) {
				this._walkExprChildId(store, id, store.kid0[id], "key");
			}
			if (
				(flags & SOA_FLAG_SHORTHAND) !== 0 &&
				valueId !== 0 &&
				store.types[valueId] === T_IDENTIFIER
			) {
				this.scope.inShorthand = this._soaIdentName(store, valueId);
				this._walkExpressionId(store, valueId);
				this.scope.inShorthand = false;
			} else {
				this._walkExprChildId(store, id, valueId, "value");
			}
			return;
		}
		const prop = /** @type {EXPECTED_ANY} */ (store.nodeAt(id));
		if (prop.computed) this._walkFacadeExprId(store, prop.key);
		if (prop.shorthand && prop.value && prop.value.type === "Identifier") {
			this.scope.inShorthand = prop.value.name;
			this._walkFacadeExprId(store, prop.value);
			this.scope.inShorthand = false;
		} else {
			this._walkFacadeExprId(store, prop.value);
		}
	}

	/**
	 * Id-based twin of `walkTemplateLiteral`: `expressions` are the odd entries
	 * of the interleaved `[q0, e0, q1, …]` column span.
	 * @param {SoaAst} store column store
	 * @param {number} id template literal node id
	 */
	_walkTemplateLiteralId(store, id) {
		const len = store.flat[store.listStarts[id]];
		if (len === 0) {
			const expressions = /** @type {EXPECTED_ANY} */ (store.nodeAt(id))
				.expressions;
			if (expressions && expressions.length !== 0) {
				this.walkExpressions(expressions);
			}
			return;
		}
		const flat = store.flat;
		const start = store.listStarts[id] + 1;
		for (let i = 1; i < len; i += 2) {
			const eid = flat[start + i];
			if (eid !== 0) this._walkExpressionId(store, eid);
		}
	}

	/**
	 * Id-based twin of `walkChainExpression`.
	 * @param {SoaAst} store column store
	 * @param {number} id chain node id
	 */
	_walkChainExpressionId(store, id) {
		const result = this.hooks.optionalChaining.call(
			/** @type {EXPECTED_ANY} */ (store.nodeAt(id))
		);
		if (result === undefined) {
			this._walkExprChildId(store, id, store.kid0[id], "expression");
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
	 * Pre walk block statement.
	 * @param {BlockStatement} statement block statement
	 */
	preWalkBlockStatement(statement) {
		this.preWalkStatements(statement.body);
	}

	/**
	 * Walk block statement.
	 * @param {BlockStatement | StaticBlock} statement block statement
	 */
	walkBlockStatement(statement) {
		this.inBlockScope(() => {
			const body = statement.body;
			const prev = this._prevStatement;
			this.blockPreWalkStatements(body);
			this._prevStatement = prev;
			this.walkStatements(body);
		}, true);
	}

	/**
	 * Walk expression statement.
	 * @param {ExpressionStatement} statement expression statement
	 */
	walkExpressionStatement(statement) {
		this.walkExpression(statement.expression);
	}

	/**
	 * Pre walk if statement.
	 * @param {IfStatement} statement if statement
	 */
	preWalkIfStatement(statement) {
		this.preWalkStatement(statement.consequent);
		if (statement.alternate) {
			this.preWalkStatement(statement.alternate);
		}
	}

	/**
	 * Walks a conditional branch with its guard frame (if any) pushed onto the
	 * parser-state guard stack for the duration of the branch body.
	 * @param {EXPECTED_OBJECT | undefined | null} frame guard frame, or falsy when the branch is unguarded
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
			this.walkGuardedBranch(guard ? guard.consequent : undefined, () =>
				this.walkNestedStatement(statement.consequent)
			);

			const consequentTerminated = this.scope.terminated;
			this.scope.terminated = undefined;

			if (statement.alternate) {
				const alternate = statement.alternate;
				this.walkGuardedBranch(guard ? guard.alternate : undefined, () =>
					this.walkNestedStatement(alternate)
				);
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
	 * Pre walk labeled statement.
	 * @param {LabeledStatement} statement with statement
	 */
	preWalkLabeledStatement(statement) {
		this.preWalkStatement(statement.body);
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
		this.inBlockScope(() => {
			this.walkNestedStatement(statement.body);
		});
	}

	/**
	 * Pre walk with statement.
	 * @param {WithStatement} statement with statement
	 */
	preWalkWithStatement(statement) {
		this.preWalkStatement(statement.body);
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
		this.inBlockScope(() => {
			this.walkExpression(statement.object);
			this.walkNestedStatement(statement.body);
		});
	}

	/**
	 * Pre walk switch statement.
	 * @param {SwitchStatement} statement switch statement
	 */
	preWalkSwitchStatement(statement) {
		this.preWalkSwitchCases(statement.cases);
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
	 * Pre walk try statement.
	 * @param {TryStatement} statement try statement
	 */
	preWalkTryStatement(statement) {
		this.preWalkStatement(statement.block);
		if (statement.handler) this.preWalkCatchClause(statement.handler);
		if (statement.finalizer) this.preWalkStatement(statement.finalizer);
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
	 * Pre walk while statement.
	 * @param {WhileStatement} statement while statement
	 */
	preWalkWhileStatement(statement) {
		this.preWalkStatement(statement.body);
	}

	/**
	 * Walk while statement.
	 * @param {WhileStatement} statement while statement
	 */
	walkWhileStatement(statement) {
		this.inBlockScope(() => {
			this.walkExpression(statement.test);
			this.walkNestedStatement(statement.body);
		});
	}

	/**
	 * Pre walk do while statement.
	 * @param {DoWhileStatement} statement do while statement
	 */
	preWalkDoWhileStatement(statement) {
		this.preWalkStatement(statement.body);
	}

	/**
	 * Walk do while statement.
	 * @param {DoWhileStatement} statement do while statement
	 */
	walkDoWhileStatement(statement) {
		this.inBlockScope(() => {
			this.walkNestedStatement(statement.body);
			this.walkExpression(statement.test);
		});
	}

	/**
	 * Pre walk for statement.
	 * @param {ForStatement} statement for statement
	 */
	preWalkForStatement(statement) {
		if (statement.init && statement.init.type === "VariableDeclaration") {
			this.preWalkStatement(statement.init);
		}
		this.preWalkStatement(statement.body);
	}

	/**
	 * Walk for statement.
	 * @param {ForStatement} statement for statement
	 */
	walkForStatement(statement) {
		this.inBlockScope(() => {
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
				this.blockPreWalkStatements(body.body);
				this._prevStatement = prev;
				this.walkStatements(body.body);
			} else {
				this.walkNestedStatement(body);
			}
		});
	}

	/**
	 * Pre walk for in statement.
	 * @param {ForInStatement} statement for statement
	 */
	preWalkForInStatement(statement) {
		if (statement.left.type === "VariableDeclaration") {
			this.preWalkVariableDeclaration(statement.left);
		}
		this.preWalkStatement(statement.body);
	}

	/**
	 * Walk for in statement.
	 * @param {ForInStatement} statement for statement
	 */
	walkForInStatement(statement) {
		this.inBlockScope(() => {
			if (statement.left.type === "VariableDeclaration") {
				this.blockPreWalkVariableDeclaration(statement.left);
				this.walkVariableDeclaration(statement.left);
			} else {
				this.walkPattern(statement.left);
			}

			this.walkExpression(statement.right);

			const body = statement.body;

			if (body.type === "BlockStatement") {
				// no need to add additional scope
				const prev = this._prevStatement;
				this.blockPreWalkStatements(body.body);
				this._prevStatement = prev;
				this.walkStatements(body.body);
			} else {
				this.walkNestedStatement(body);
			}
		});
	}

	/**
	 * Pre walk for of statement.
	 * @param {ForOfStatement} statement statement
	 */
	preWalkForOfStatement(statement) {
		if (statement.await && this.scope.topLevelScope === true) {
			this.hooks.topLevelAwait.call(statement);
		}
		if (statement.left.type === "VariableDeclaration") {
			this.preWalkVariableDeclaration(statement.left);
		}
		this.preWalkStatement(statement.body);
	}

	/**
	 * Walk for of statement.
	 * @param {ForOfStatement} statement for statement
	 */
	walkForOfStatement(statement) {
		this.inBlockScope(() => {
			if (statement.left.type === "VariableDeclaration") {
				this.blockPreWalkVariableDeclaration(statement.left);
				this.walkVariableDeclaration(statement.left);
			} else {
				this.walkPattern(statement.left);
			}

			this.walkExpression(statement.right);

			const body = statement.body;

			if (body.type === "BlockStatement") {
				// no need to add additional scope
				const prev = this._prevStatement;
				this.blockPreWalkStatements(body.body);
				this._prevStatement = prev;
				this.walkStatements(body.body);
			} else {
				this.walkNestedStatement(body);
			}
		});
	}

	/**
	 * Pre walk function declaration.
	 * @param {FunctionDeclaration | MaybeNamedFunctionDeclaration} statement function declaration
	 */
	preWalkFunctionDeclaration(statement) {
		if (statement.id) {
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
		this.inFunctionScope(true, statement.params, () => {
			for (const param of statement.params) {
				this.walkPattern(param);
			}

			this.detectMode(statement.body.body);

			const prev = this._prevStatement;

			this.preWalkStatement(statement.body);
			this._prevStatement = prev;
			this.walkStatement(statement.body);
		});
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
	 * @param {HookMap<SyncBailHook<[Identifier], boolean | void>>} hookMap map of hooks
	 */
	_preWalkVariableDeclaration(statement, hookMap) {
		for (const declarator of statement.declarations) {
			if (declarator.type !== "VariableDeclarator") continue;
			this._preWalkDeclarator(declarator, statement, hookMap);
		}
	}

	/**
	 * Pre walk one declarator (destructuring enter, the `preDeclarator` hook,
	 * then the binding definitions). Shared by the object walker and the
	 * id-based pre-walk's per-declarator fallback.
	 * @param {VariableDeclarator} declarator variable declarator
	 * @param {VariableDeclaration} statement owning declaration
	 * @param {HookMap<SyncBailHook<[Identifier], boolean | void>>} hookMap map of hooks
	 */
	_preWalkDeclarator(declarator, statement, hookMap) {
		this.preWalkVariableDeclarator(declarator);
		if (this.hooks.preDeclarator.call(declarator, statement)) return;
		const id = declarator.id;
		if (id.type === "Identifier") {
			// fast path: plain `const x =` skips the enterPattern dispatch
			if (!this.callHooksForName(this.hooks.pattern, id.name, id)) {
				this._defineVariableForDeclaration(id.name, id, hookMap);
			}
		} else {
			this.enterPattern(id, (name, ident) =>
				this._defineVariableForDeclaration(name, ident, hookMap)
			);
		}
	}

	/**
	 * Defines a declared variable unless a declaration hook handles it.
	 * @param {string} name variable name
	 * @param {Identifier} ident identifier node
	 * @param {HookMap<SyncBailHook<[Identifier], boolean | void>>} hookMap kind-specific declaration hooks
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
		for (const declarator of statement.declarations) {
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
	 * Pre walk switch cases.
	 * @param {SwitchCase[]} switchCases switch statement
	 */
	preWalkSwitchCases(switchCases) {
		for (let index = 0, len = switchCases.length; index < len; index++) {
			const switchCase = switchCases[index];
			this.preWalkStatements(switchCase.consequent);
		}
	}

	/**
	 * Processes the provided switch case.
	 * @param {SwitchCase[]} switchCases switch statement
	 */
	walkSwitchCases(switchCases) {
		this.inBlockScope(() => {
			const len = switchCases.length;

			// we need to pre walk all statements first since we can have invalid code
			// import A from "module";
			// switch(1) {
			//    case 1:
			//      console.log(A); // should fail at runtime
			//    case 2:
			//      const A = 1;
			// }
			for (let index = 0; index < len; index++) {
				const switchCase = switchCases[index];

				if (switchCase.consequent.length > 0) {
					const prev = this._prevStatement;
					this.blockPreWalkStatements(switchCase.consequent);
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
		});
	}

	/**
	 * Pre walk catch clause.
	 * @param {CatchClause} catchClause catch clause
	 */
	preWalkCatchClause(catchClause) {
		this.preWalkStatement(catchClause.body);
	}

	/**
	 * Processes the provided catch clause.
	 * @param {CatchClause} catchClause catch clause
	 */
	walkCatchClause(catchClause) {
		this.inBlockScope(() => {
			// Error binding is optional in catch clause since ECMAScript 2019
			if (catchClause.param !== null) {
				this.enterPattern(catchClause.param, (ident) => {
					this.defineVariable(ident);
				});
				this.walkPattern(catchClause.param);
			}
			const prev = this._prevStatement;
			this.blockPreWalkStatement(catchClause.body);
			this._prevStatement = prev;
			this.walkStatement(catchClause.body);
		}, true);
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
	 * Processes the provided expression. An SoA facade re-enters the id walk
	 * so an object-walker escape point never drags a whole subtree onto the
	 * object walker; the symbol miss is flat on plain nodes.
	 * @param {Expression | SpreadElement | PrivateIdentifier | Super} expression expression
	 */
	walkExpression(expression) {
		const id = /** @type {EXPECTED_ANY} */ (expression)[SOA_KEY_ID];
		if (id !== undefined) {
			const store = /** @type {EXPECTED_ANY} */ (expression)[SOA_KEY_STORE];
			// an all-foreign top level (pure import/export modules) defeats the
			// store discovery in parse(), so the accessors adopt the store here
			if (this._soaStore === undefined) this._soaStore = store;
			// the object-held facade becomes the registered one, so nodeAt
			// keeps serving this exact object inside the id walk
			if (store.facades[id] === undefined) store.facades[id] = expression;
			this._walkExpressionId(store, id);
			return;
		}
		this._dispatchWalkExpression(expression);
	}

	/**
	 * Runs the type-keyed walk handler for an expression (no id re-entry —
	 * `walkExpression` and the id walk's fallback own that).
	 * @param {Expression | SpreadElement | PrivateIdentifier | Super} expression expression
	 */
	_dispatchWalkExpression(expression) {
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
		const raw = /** @type {string | undefined} */ (expression.raw);
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
		}
		this.inFunctionScope(true, scopeParams, () => {
			for (const param of expression.params) {
				this.walkPattern(param);
			}

			this.detectMode(expression.body.body);

			const prev = this._prevStatement;

			this.preWalkStatement(expression.body);
			this._prevStatement = prev;
			this.walkStatement(expression.body);
		});
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
		this.inFunctionScope(false, expression.params, () => {
			for (const param of expression.params) {
				this.walkPattern(param);
			}
			if (expression.body.type === "BlockStatement") {
				this.detectMode(expression.body.body);
				const prev = this._prevStatement;
				this.preWalkStatement(expression.body);
				this._prevStatement = prev;
				this.walkStatement(expression.body);
			} else {
				this.walkExpression(expression.body);
			}
		});
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
		const currentStatement = /** @type {StatementPathItem} */ (
			this._statementPathTail()
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
		this.walkExpression(expression.argument);
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
	 */
	_reportStrictModeViolation(reason, node) {
		const diagnostic = new WebpackError(
			`${reason}. The output is an ES module, which runs in strict mode.`
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
				this.callHooksForInfo(
					this.hooks.canRename,
					renameIdentifier,
					expression.right
				)
			) {
				// renaming "a = b;"
				if (
					!this.callHooksForInfo(
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
			this.enterPattern(expression.left, (name, _decl) => {
				if (!this.callHooksForName(this.hooks.assign, name, expression)) {
					this.walkExpression(
						/** @type {MemberExpression} */
						(expression.left)
					);
				}
			});
		} else if (expression.left.type.endsWith("Pattern")) {
			this.walkExpression(expression.right);
			this.enterPattern(expression.left, (name, _decl) => {
				if (!this.callHooksForName(this.hooks.assign, name, expression)) {
					this.defineVariable(name);
				}
			});
			this.walkPattern(expression.left);
		} else if (expression.left.type === "MemberExpression") {
			const exprName = this.getMemberExpressionInfo(
				expression.left,
				ALLOWED_MEMBER_TYPES_EXPRESSION
			);
			if (
				exprName &&
				this.callHooksForInfo(
					this.hooks.assignMemberChain,
					exprName.rootInfo,
					expression,
					exprName.getMembers()
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
			this.walkGuardedBranch(guard ? guard.consequent : undefined, () =>
				this.walkExpression(expression.consequent)
			);

			if (expression.alternate) {
				const alternate = expression.alternate;
				this.walkGuardedBranch(guard ? guard.alternate : undefined, () =>
					this.walkExpression(alternate)
				);
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
				this.callHooksForInfo(
					this.hooks.canRename,
					renameIdentifier,
					/** @type {Expression} */
					(argOrThis)
				) &&
				!this.callHooksForInfo(
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

		this.inFunctionScope(true, scopeParams, () => {
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
				this.preWalkStatement(functionExpression.body);
				this._prevStatement = prev;
				this.walkStatement(functionExpression.body);
			} else {
				this.walkExpression(functionExpression.body);
			}
		});
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
				const members =
					/** @type {NonNullable<BasicEvaluatedExpression["getMembers"]>} */
					(callee.getMembers)();
				const result1 = this.callHooksForInfo(
					this.hooks.callMemberChain,
					/** @type {NonNullable<BasicEvaluatedExpression["rootInfo"]>} */
					(callee.rootInfo),
					expression,
					members,
					callee.getMembersOptionals
						? callee.getMembersOptionals()
						: members.map(RETURN_FALSE),
					callee.getMemberRanges ? callee.getMemberRanges() : []
				);
				if (result1 === true) return;
				const result2 = this.callHooksForInfo(
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
		const exprInfo = this.getMemberExpressionInfo(
			expression,
			ALLOWED_MEMBER_TYPES_ALL
		);
		if (exprInfo) {
			switch (exprInfo.type) {
				case "expression": {
					const result1 = this.callHooksForInfo(
						this.hooks.expression,
						exprInfo.name,
						expression
					);
					if (result1 === true) return;
					const members = exprInfo.getMembers();
					if (
						this._hasHooksForInfo(
							this.hooks.expressionMemberChain,
							exprInfo.rootInfo
						)
					) {
						const result2 = this.callHooksForInfo(
							this.hooks.expressionMemberChain,
							exprInfo.rootInfo,
							expression,
							members,
							exprInfo.getMembersOptionals(),
							exprInfo.getMemberRanges()
						);
						if (result2 === true) return;
					}
					this.walkMemberExpressionWithExpressionName(
						expression,
						exprInfo.name,
						exprInfo.rootInfo,
						[...members],
						() =>
							this.callHooksForInfo(
								this.hooks.unhandledExpressionMemberChain,
								exprInfo.rootInfo,
								expression,
								members
							)
					);
					return;
				}
				case "call": {
					if (
						this._hasHooksForInfo(
							this.hooks.memberChainOfCallMemberChain,
							exprInfo.rootInfo
						)
					) {
						const result = this.callHooksForInfo(
							this.hooks.memberChainOfCallMemberChain,
							exprInfo.rootInfo,
							expression,
							exprInfo.getCalleeMembers(),
							exprInfo.call,
							exprInfo.getMembers(),
							exprInfo.getMemberRanges()
						);
						if (result === true) return;
					}
					// Fast skip over the member chain as we already called memberChainOfCallMemberChain
					// and call computed property are literals anyway
					this.walkExpression(exprInfo.call);
					return;
				}
			}
		}
		this.walkExpression(expression.object);
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
			// optimize the case where expression.object is a MemberExpression too.
			// we can keep info here when calling walkMemberExpression directly
			// Read the property from `members` (already extracted by
			// extractMemberExpressionChain) since the AST node may be a
			// TemplateLiteral, which has neither .name nor .value.
			const property = members[members.length - 1];
			name = name.slice(0, -property.length - 1);
			members.pop();
			const result = this.callHooksForInfo(
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
		this.callHooksForName(this.hooks.expression, "this", expression);
	}

	/**
	 * Processes the provided expression.
	 * @param {Identifier} expression identifier
	 */
	walkIdentifier(expression) {
		// resolve the variable once and probe for taps before collecting hook
		// args — most identifiers have no tap, so the args array never exists
		const info = this.getVariableInfo(expression.name);
		if (this._hasHooksForInfo(this.hooks.expression, info)) {
			this._callHooksForInfo(
				this.hooks.expression,
				info,
				undefined,
				undefined,
				[expression]
			);
		}
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
	 * @param {HookMap<SyncBailHook<T, R>>} hookMap hooks the should be called
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
	 * @param {HookMap<SyncBailHook<T, R>>} hookMap hooks the should be called
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
	 * @param {HookMap<SyncBailHook<T, R>>} hookMap hooks the should be called
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
	 * @param {HookMap<SyncBailHook<T, R>>} hookMap hooks that should be called
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
	 * @param {HookMap<SyncBailHook<T, R>>} hookMap hooks the should be called
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
	 * Whether `_callHooksForInfo` would find any hook to call — the same
	 * resolution without collecting hook args, so untapped names (the vast
	 * majority) skip the per-call args array entirely.
	 * @param {HookMap<SyncBailHook<EXPECTED_ANY, EXPECTED_ANY>>} hookMap hooks that would be called
	 * @param {ExportedVariableInfo} info variable info
	 * @returns {boolean} true when a tag or name hook exists
	 */
	_hasHooksForInfo(hookMap, info) {
		/** @type {string} */
		let name;
		if (typeof info === "string") {
			name = info;
		} else {
			if (!(info instanceof VariableInfo)) return false;
			let tagInfo = info.tagInfo;
			while (tagInfo !== undefined) {
				if (hookMap.get(tagInfo.tag) !== undefined) return true;
				tagInfo = tagInfo.next;
			}
			if (!info.isFree() && !info.isTagged()) return false;
			name = /** @type {string} */ (info.name);
		}
		return hookMap.get(name) !== undefined;
	}

	/**
	 * Shared core for the callHooksFor* helpers. Takes `args` as an already
	 * collected array so the public wrappers each allocate it once instead of
	 * re-collecting it through several rest-parameter layers (hot per identifier).
	 * @template T
	 * @template R
	 * @param {HookMap<SyncBailHook<T, R>>} hookMap hooks that should be called
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
			if (!(info instanceof VariableInfo)) {
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
	 * Call hooks for name with fallback.
	 * @template T
	 * @template R
	 * @param {HookMap<SyncBailHook<T, R>>} hookMap hooks the should be called
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
	 * Processes the provided fn.
	 * @param {() => void} fn inner function
	 * @param {boolean} inExecutedPath executed state
	 * @returns {void}
	 */
	inBlockScope(fn, inExecutedPath = false) {
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

		fn();

		const terminated = this.scope.terminated;

		if (inExecutedPath && terminated) {
			oldScope.terminated = terminated;
		}

		this.scope = oldScope;
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
		if (value === "use strict") {
			this.scope.isStrict = true;
		} else if (value === "use asm") {
			this.scope.isAsmJs = true;
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
		if (!this.callHooksForName(this.hooks.pattern, pattern.name, pattern)) {
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

		let ast;
		/** @type {Comment[]} */
		let comments;

		if (typeof source === "object") {
			ast = /** @type {Program} */ (source);
			comments = source.comments;
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
					importPhases: this.options.importPhases === true,
					// the store is dropped when this walk ends
					transientAst: true
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
		const oldSoaStore = this._soaStore;
		const oldStrictInModuleOutput = this._strictInModuleOutput;
		const oldSource = this._source;
		const oldLineStarts = this._lineStarts;
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
		this.state = state;
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
		// ImportMetaPlugin's tap only ever answers `undefined` (never an
		// identifier), so it cannot defeat the no-info member fast paths
		const memberEvalHook = this.hooks.evaluate.get("MemberExpression");
		this._evalMemberOwnTaps =
			memberEvalHook !== undefined &&
			memberEvalHook.interceptors.length === 0 &&
			memberEvalHook.taps.every(
				(tap) => tap.name === CLASS_NAME || tap.name === "ImportMetaPlugin"
			);
		// these own taps forward sub-evaluations or build value results; an
		// identifier can only enter through a foreign tap or the name-keyed
		// dispatches checked per node in `_soaCannotRename`
		const ownTapsOnly = (/** @type {string} */ name) => {
			const hook = this.hooks.evaluate.get(name);
			return (
				hook !== undefined &&
				hook.interceptors.length === 0 &&
				hook.taps.every((tap) => tap.name === CLASS_NAME)
			);
		};
		this._evalCallOwnTaps = ownTapsOnly("CallExpression");
		this._evalNewOwnTaps = ownTapsOnly("NewExpression");
		this._evalLogicalOwnTaps = ownTapsOnly("LogicalExpression");
		this._evalConditionalOwnTaps = ownTapsOnly("ConditionalExpression");
		const inert = this._soaEvalInertTypes;
		for (const candidate of SOA_EVAL_INERT_CANDIDATES) {
			const hook = this.hooks.evaluate.get(candidate.name);
			// a no-own-tap candidate passes only vacuously (any tap is foreign)
			inert[candidate.type] =
				hook === undefined ||
				(hook.interceptors.length === 0 &&
					hook.taps.every(
						(tap) => candidate.ownTaps && tap.name === CLASS_NAME
					))
					? 1
					: 0;
		}
		const binaryHook = this.hooks.binaryExpression;
		this._soaBinaryInOnlyTaps =
			binaryHook.interceptors.length === 0 &&
			binaryHook.taps.every(
				(tap) => tap.name === "HarmonyImportDependencyParserPlugin"
			);
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
			this.destructuringAssignmentProperties = new WeakMap();
			// with a SoA-backed AST the Program itself is a store row and all
			// passes run on the column store (id-based dispatch), materializing
			// facades only at escape points. The store is held on the parser so
			// pending `statementPath` id entries can materialize on access.
			const soaStore = /** @type {EXPECTED_ANY} */ (ast)[SOA_KEY_STORE];
			if (
				soaStore !== undefined &&
				/** @type {EXPECTED_ANY} */ (ast)[SOA_KEY_MEMO] === undefined
			) {
				const rootId = /** @type {EXPECTED_ANY} */ (ast)[SOA_KEY_ID];
				this._soaStore = soaStore;
				this._detectModeId(soaStore, rootId);
				// a strict program (ESM source, `"use strict"`) keeps its behavior
				// in strict output — drop the flag so the walk pays no per-node
				// checks
				if (this._strictInModuleOutput && this.scope.isStrict) {
					this._strictInModuleOutput = false;
				}
				this._modulePreWalkStatementsId(soaStore, rootId);
				this._prevStatement = undefined;
				this._preWalkStatementsId(soaStore, rootId);
				this._prevStatement = undefined;
				this._blockPreWalkStatementsId(soaStore, rootId);
				this._prevStatement = undefined;
				this._walkStatementsId(soaStore, rootId);
			} else {
				// object-backed Program, or a program hook materialized (and may
				// have replaced) the facade Program's body — the object walkers
				// own the list; the store still serves any facades inside it
				this._soaStore = soaStore;
				this.detectMode(ast.body);
				if (this._strictInModuleOutput && this.scope.isStrict) {
					this._strictInModuleOutput = false;
				}
				this.modulePreWalkStatements(ast.body);
				this._prevStatement = undefined;
				this.preWalkStatements(ast.body);
				this._prevStatement = undefined;
				this.blockPreWalkStatements(ast.body);
				this._prevStatement = undefined;
				if (soaStore !== undefined) {
					this._walkStatementsIdList(soaStore, ast.body);
				} else {
					this.walkStatements(ast.body);
				}
			}
			this.destructuringAssignmentProperties = undefined;
		}
		this.hooks.finish.call(ast, comments);
		this.scope = oldScope;
		this.state = oldState;
		this.comments = oldComments;
		this.semicolons = oldSemicolons;
		this._statementPath = oldStatementPath;
		this._prevStatement = oldPrevStatement;
		this._soaStore = oldSoaStore;
		this._strictInModuleOutput = oldStrictInModuleOutput;
		// release — these retain the whole source string and its line table
		this._source = oldSource;
		this._lineStarts = oldLineStarts;
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
	 * @param {Expression | Declaration | PrivateIdentifier | MaybeNamedFunctionDeclaration | MaybeNamedClassDeclaration | null | undefined} expr an expression
	 * @param {number} commentsStartPos source position from which annotation comments are checked
	 * @returns {boolean} true, when the expression is pure
	 */
	isPure(expr, commentsStartPos) {
		if (!expr) return true;
		const result = this.hooks.isPure
			.for(expr.type)
			.call(expr, commentsStartPos);
		if (typeof result === "boolean") return result;
		switch (expr.type) {
			case "ClassDeclaration":
			case "ClassExpression": {
				if (expr.body.type !== "ClassBody") return false;
				if (
					expr.superClass &&
					!this.isPure(expr.superClass, /** @type {Range} */ (expr.range)[0])
				) {
					return false;
				}
				const items = expr.body.body;
				return items.every((item) => {
					if (item.type === "StaticBlock") {
						return false;
					}

					if (
						item.computed &&
						item.key &&
						!this.isPure(
							item.key,
							/** @type {Range} */
							(item.range)[0]
						)
					) {
						return false;
					}

					if (
						item.static &&
						item.value &&
						!this.isPure(
							item.value,
							item.key
								? /** @type {Range} */ (item.key.range)[1]
								: /** @type {Range} */ (item.range)[0]
						)
					) {
						return false;
					}

					if (
						expr.superClass &&
						item.type === "MethodDefinition" &&
						item.kind === "constructor"
					) {
						return false;
					}

					return true;
				});
			}
			case "TemplateLiteral":
				// Thread `commentsStartPos` through the interpolations so a
				// /*#__PURE__*/ comment that sits inside `${ ... }` (or before
				// the first interpolation) is part of the scanned range when
				// the inner expression's purity is evaluated.
				return expr.expressions.every((e) => {
					const pureFlag = this.isPure(e, commentsStartPos);
					commentsStartPos = /** @type {Range} */ (e.range)[1];
					return pureFlag;
				});
			case "FunctionDeclaration":
			case "FunctionExpression":
			case "ArrowFunctionExpression":
			case "ThisExpression":
			case "Literal":
			case "Identifier":
			case "PrivateIdentifier":
				return true;

			case "VariableDeclaration":
				return expr.declarations.every((decl) =>
					this.isPure(decl.init, /** @type {Range} */ (decl.range)[0])
				);

			case "ArrayExpression":
				return expr.elements.every((element) => {
					if (element === null) return true;
					if (element.type === "SpreadElement") return false;
					const pureFlag = this.isPure(element, commentsStartPos);
					commentsStartPos = /** @type {Range} */ (element.range)[1];
					return pureFlag;
				});

			case "ObjectExpression": {
				return expr.properties.every((property) => {
					if (property.type === "SpreadElement") return false;

					if (
						property.computed &&
						!this.isPure(property.key, commentsStartPos)
					) {
						return false;
					}

					const pureFlag = this.isPure(
						/** @type {Exclude<Property["value"], AssignmentPattern | ObjectPattern | ArrayPattern | RestElement>} */
						(property.value),
						/** @type {Range} */ (property.key.range)[1]
					);
					commentsStartPos = /** @type {Range} */ (property.range)[1];
					return pureFlag;
				});
			}

			case "ChainExpression":
				return this.isPure(expr.expression, commentsStartPos);

			case "UnaryExpression":
				// Safe unary operators — produce their result without invoking
				// user code on the operand:
				//   - `typeof` returns a type tag and never throws, even for
				//     undeclared identifiers; no coercion.
				//   - `void` evaluates the operand and discards it, returning
				//     `undefined`; pure iff the operand is pure.
				//   - `!` coerces via ToBoolean, which is defined to not call
				//     any user code (objects → true, etc.).
				// Other operators (`+`, `-`, `~`, `delete`) fall through to
				// the generic evaluator which can still recognize literal
				// cases (e.g. `-1`, `+5`).
				if (
					expr.operator === "typeof" ||
					expr.operator === "void" ||
					expr.operator === "!"
				) {
					return this.isPure(expr.argument, commentsStartPos);
				}
				break;

			case "MetaProperty":
				return true;

			case "BinaryExpression":
				// Strict (in)equality compares without coercion and never invokes
				// user code on its operands, so the result is pure iff both sides
				// are pure. All other binary operators may invoke `valueOf` /
				// `toString` / `[Symbol.hasInstance]` / Proxy traps and fall through
				// to the generic evaluator, which can still recognize the cases
				// where both sides evaluate to known primitive literals.
				if (expr.operator === "===" || expr.operator === "!==") {
					return (
						this.isPure(expr.left, commentsStartPos) &&
						this.isPure(expr.right, /** @type {Range} */ (expr.left.range)[1])
					);
				}
				break;

			case "ConditionalExpression":
				return (
					this.isPure(expr.test, commentsStartPos) &&
					this.isPure(
						expr.consequent,
						/** @type {Range} */ (expr.test.range)[1]
					) &&
					this.isPure(
						expr.alternate,
						/** @type {Range} */ (expr.consequent.range)[1]
					)
				);

			case "LogicalExpression":
				return (
					this.isPure(expr.left, commentsStartPos) &&
					this.isPure(expr.right, /** @type {Range} */ (expr.left.range)[1])
				);

			case "SequenceExpression":
				return expr.expressions.every((expr) => {
					const pureFlag = this.isPure(expr, commentsStartPos);
					commentsStartPos = /** @type {Range} */ (expr.range)[1];
					return pureFlag;
				});

			case "CallExpression": {
				const pureFlag =
					/** @type {Range} */ (expr.range)[0] - commentsStartPos > 12 &&
					this.getComments([
						commentsStartPos,
						/** @type {Range} */ (expr.range)[0]
					]).some(
						(comment) =>
							comment.type === "Block" &&
							CompilerHintNotationRegExp.Pure.test(comment.value)
					);
				if (!pureFlag) return false;
				commentsStartPos = /** @type {Range} */ (expr.callee.range)[1];
				return expr.arguments.every((arg) => {
					if (arg.type === "SpreadElement") return false;
					const pureFlag = this.isPure(arg, commentsStartPos);
					commentsStartPos = /** @type {Range} */ (arg.range)[1];
					return pureFlag;
				});
			}

			case "NewExpression": {
				const pureFlag =
					/** @type {Range} */ (expr.range)[0] - commentsStartPos > 12 &&
					this.getComments([
						commentsStartPos,
						/** @type {Range} */ (expr.range)[0]
					]).some(
						(comment) =>
							comment.type === "Block" &&
							CompilerHintNotationRegExp.Pure.test(comment.value)
					);
				if (!pureFlag) return false;
				commentsStartPos = /** @type {Range} */ (expr.callee.range)[1];
				return expr.arguments.every((arg) => {
					if (arg.type === "SpreadElement") return false;
					const pureFlag = this.isPure(arg, commentsStartPos);
					commentsStartPos = /** @type {Range} */ (arg.range)[1];
					return pureFlag;
				});
			}

			case "TaggedTemplateExpression": {
				const pureFlag =
					/** @type {Range} */ (expr.range)[0] - commentsStartPos > 12 &&
					this.getComments([
						commentsStartPos,
						/** @type {Range} */ (expr.range)[0]
					]).some(
						(comment) =>
							comment.type === "Block" &&
							CompilerHintNotationRegExp.Pure.test(comment.value)
					);
				if (!pureFlag) return false;
				commentsStartPos = /** @type {Range} */ (expr.tag.range)[1];
				return expr.quasi.expressions.every((e) => {
					const pureFlag = this.isPure(e, commentsStartPos);
					commentsStartPos = /** @type {Range} */ (e.range)[1];
					return pureFlag;
				});
			}
		}
		const evaluated = this.evaluateExpression(expr);
		return !evaluated.couldHaveSideEffects();
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
		return /** @type {DependencyLocation} */ (node.loc);
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
	 * First significant char code at or after `pos`, skipping whitespace and
	 * comments, or -1 at end of source.
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
	 * Checks whether this javascript parser is asi position.
	 * @param {number} pos source code position
	 * @returns {boolean} true when a semicolon has been inserted before this position, false if not
	 */
	isAsiPosition(pos) {
		const currentStatement = this._statementPathTail();
		if (currentStatement === undefined) throw new Error("Not in statement");
		const range = /** @type {Range} */ (currentStatement.range);

		return (
			// Either asking directly for the end position of the current statement
			(range[1] === pos && this._isAsiPosition(pos)) ||
			// Or asking for the start position of the current statement,
			// here we have to check multiple things
			(range[0] === pos &&
				// is there a previous statement which might be relevant?
				// (the accessor materializes a pending id)
				this.prevStatement !== undefined &&
				// is the end position of the previous statement an ASI position?
				this._isAsiPosition(/** @type {Range} */ (this.prevStatement.range)[1]))
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
		const currentStatement = /** @type {StatementPathItem} */ (
			this._statementPathTail()
		);
		return (
			expr === currentStatement ||
			(currentStatement.type === "ExpressionStatement" &&
				currentStatement.expression === expr)
		);
	}

	/**
	 * Returns tag data.
	 * @param {string} name name
	 * @param {Tag} tag tag info
	 * @returns {TagData | undefined} tag data
	 */
	getTagData(name, tag) {
		const info = this.scope.definitions.get(name);
		if (info instanceof VariableInfo) {
			let tagInfo = info.tagInfo;
			while (tagInfo !== undefined) {
				if (tagInfo.tag === tag) return tagInfo.data;
				tagInfo = tagInfo.next;
			}
		}
	}

	/**
	 * Processes the provided name.
	 * @param {string} name name
	 * @param {Tag} tag tag info
	 * @param {TagData=} data data
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
		} else if (oldInfo instanceof VariableInfo) {
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
	}

	/**
	 * Processes the provided name.
	 * @param {string} name variable name
	 */
	defineVariable(name) {
		const oldInfo = this.scope.definitions.get(name);
		// Don't redefine variable in same scope to keep existing tags
		if (
			oldInfo instanceof VariableInfo &&
			oldInfo.declaredScope === this.scope
		) {
			return;
		}
		this.scope.definitions.set(name, this.scope);
	}

	/**
	 * Processes the provided name.
	 * @param {string} name variable name
	 */
	undefineVariable(name) {
		this.scope.definitions.delete(name);
	}

	/**
	 * Checks whether this javascript parser is variable defined.
	 * @param {string} name variable name
	 * @returns {boolean} true, when variable is defined
	 */
	isVariableDefined(name) {
		const info = this.scope.definitions.get(name);
		if (info === undefined) return false;
		if (info instanceof VariableInfo) {
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
		if (info instanceof VariableInfo) {
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
	 * @returns {{ options: Record<string, EXPECTED_ANY> | null, errors: (Error & { comment: Comment })[] | null }} result
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
		// a store-backed chain descends the columns, materializing only the
		// root instead of every link
		const id = /** @type {EXPECTED_ANY} */ (expression)[SOA_KEY_ID];
		if (id !== undefined) {
			const store = /** @type {EXPECTED_ANY} */ (expression)[SOA_KEY_STORE];
			const rootId = this._soaMemberRootId(store, id);
			if (rootId !== 0) {
				return /** @type {Expression | Super} */ (
					/** @type {EXPECTED_ANY} */ (store.nodeAt(rootId))
				);
			}
		}
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
		return this._extractMemberExpressionChain(expression, true);
	}

	/**
	 * Core of `extractMemberExpressionChain`. The walker skips the side
	 * arrays: optionals/ranges are deferred until a hook actually reads them,
	 * so the chain nodes' `range` arrays are never materialized either.
	 * @param {Expression | Super} expression a member expression
	 * @param {boolean} withSideArrays whether to collect optionals and ranges
	 * @returns {{ members: Members, object: Expression | Super, membersOptionals: MembersOptionals, memberRanges: MemberRanges }} member names (reverse order) and remaining object (side arrays empty when not collected)
	 */
	_extractMemberExpressionChain(expression, withSideArrays) {
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
			} else {
				if (expr.property.type !== "Identifier") break;
				members.push(expr.property.name); // the identifier
			}
			if (withSideArrays) {
				// the range of the expression fragment before the member
				memberRanges.push(/** @type {Range} */ (expr.object.range));
				membersOptionals.push(expr.optional);
			}
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
	 * Deferred side-array accessor for member-chain info objects: the chain
	 * is re-extracted with side arrays only when a hook actually reads them.
	 * @template {"membersOptionals" | "memberRanges"} F
	 * @param {Expression | Super} expression the full member expression
	 * @param {F} field which side array to serve
	 * @returns {() => { membersOptionals: MembersOptionals, memberRanges: MemberRanges }[F]} memoized accessor
	 */
	_lazySideArray(expression, field) {
		/** @type {{ membersOptionals: MembersOptionals, memberRanges: MemberRanges }[F] | undefined} */
		let cached;
		return () =>
			cached ||
			(cached =
				/** @type {{ membersOptionals: MembersOptionals, memberRanges: MemberRanges }[F]} */ (
					this._extractMemberExpressionChain(expression, true)[field].reverse()
				));
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
		if (info instanceof VariableInfo && info.name) {
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
		if (info instanceof VariableInfo && info.name) {
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
	 * Gets member expression info.
	 * @param {Expression | Super} expression a member expression
	 * @param {number} allowedTypes which types should be returned, presented in bit mask
	 * @returns {CallExpressionInfo | ExpressionExpressionInfo | undefined} expression info
	 */
	getMemberExpressionInfo(expression, allowedTypes) {
		// Resolve the root first (no allocation); most calls reject here and so
		// never build the member arrays via extractMemberExpressionChain.
		const object = this.getMemberExpressionRoot(expression);
		switch (object.type) {
			case "CallExpression": {
				if ((allowedTypes & ALLOWED_MEMBER_TYPES_CALL_EXPRESSION) === 0) return;
				const calleeExpr = object.callee;
				const callee =
					calleeExpr.type === "MemberExpression"
						? this.getMemberExpressionRoot(calleeExpr)
						: calleeExpr;
				const rootName = getRootName(callee);
				if (!rootName) return;
				const result = this.getNameInfoFromVariable(rootName);
				if (!result) return;
				const { info: rootInfo, name: resolvedRoot } = result;
				const rootMembers =
					calleeExpr.type === "MemberExpression"
						? this._extractMemberExpressionChain(calleeExpr, false).members
						: EMPTY_ARRAY;
				const { members } = this._extractMemberExpressionChain(
					expression,
					false
				);
				const calleeName = objectAndMembersToName(resolvedRoot, rootMembers);
				return {
					type: "call",
					call: object,
					calleeName,
					rootInfo,
					getCalleeMembers: lazyReverse(rootMembers),
					name: objectAndMembersToName(`${calleeName}()`, members),
					getMembers: lazyReverse(members),
					getMembersOptionals: this._lazySideArray(
						expression,
						"membersOptionals"
					),
					getMemberRanges: this._lazySideArray(expression, "memberRanges")
				};
			}
			case "Identifier":
			case "MetaProperty":
			case "ThisExpression": {
				if ((allowedTypes & ALLOWED_MEMBER_TYPES_EXPRESSION) === 0) return;
				const rootName = getRootName(object);
				if (!rootName) return;

				const result = this.getNameInfoFromVariable(rootName);
				if (!result) return;
				const { info: rootInfo, name: resolvedRoot } = result;
				const { members } = this._extractMemberExpressionChain(
					expression,
					false
				);
				return {
					type: "expression",
					name: objectAndMembersToName(resolvedRoot, members),
					rootInfo,
					getMembers: lazyReverse(members),
					getMembersOptionals: this._lazySideArray(
						expression,
						"membersOptionals"
					),
					getMemberRanges: this._lazySideArray(expression, "memberRanges")
				};
			}
		}
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
	 * Get module parse function.
	 * @param {Compilation} compilation compilation
	 * @param {Module} module module
	 * @returns {ParseFunction | undefined} parser
	 */
	static _getModuleParseFunction(compilation, module) {
		// Get from module if available
		if (
			module instanceof NormalModule &&
			module.parser instanceof JavascriptParser
		) {
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
		const wantRanges = parserOptions.ranges === true;
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

			// Whenever ranges are wanted (the main parse path and the concatenation
			// re-parse), have the parser plugin serve `range` on demand instead of
			// eagerly. `wantRanges` is hoisted since the auto-fallback re-enters
			// with the same (mutated) options object.
			options.lazyNodes = wantRanges;
			if (wantRanges) {
				// the lazy plugin replaces acorn's native tracking — disabling it
				// here lets WebpackParser skip its defensive options copy
				options.locations = false;
				options.ranges = false;
			}

			if (options.comments) {
				if (wantRanges) {
					// the parser plugin collects the comments itself, deferring the
					// text slice until some hook actually reads `value`
					options.lazyComments = comments;
				} else {
					/** @type {AcornOptions} */
					(options).onComment =
						/** @type {import("acorn").Comment[]} */
						(/** @type {unknown} */ (comments));
				}
			}

			const ast =
				/** @type {Program} */
				(parser.parse(code, /** @type {AcornOptions} */ (options)));

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
		/** @type {AcornOptions} */
		(parserOptions).onComment = undefined;

		if (threw) {
			throw error;
		}

		return /** @type {ParseResult} */ ({ ast, comments });
	}

	/**
	 * Returns parser.
	 * @param {((BaseParser: AcornParser) => AcornParser)[]} plugins parser plugin
	 * @returns {typeof JavascriptParser} parser
	 */
	static extend(...plugins) {
		parser = parser.extend(...plugins);
		return JavascriptParser;
	}
}

module.exports = JavascriptParser;
module.exports.ALLOWED_MEMBER_TYPES_ALL = ALLOWED_MEMBER_TYPES_ALL;
module.exports.ALLOWED_MEMBER_TYPES_CALL_EXPRESSION =
	ALLOWED_MEMBER_TYPES_CALL_EXPRESSION;
module.exports.ALLOWED_MEMBER_TYPES_EXPRESSION =
	ALLOWED_MEMBER_TYPES_EXPRESSION;
module.exports.VariableInfo = VariableInfo;
module.exports.VariableInfoFlags = VariableInfoFlags;
module.exports.getImportAttributes = getImportAttributes;
