/*
	MIT License http://www.opensource.org/licenses/mit-license.php
	Author Tobias Koppers @sokra
*/

"use strict";

const { Parser: AcornParser } = require("acorn");
const { importAssertions } = require("acorn-import-assertions");
const { SyncBailHook, HookMap } = require("tapable");
const vm = require("vm");
const Parser = require("../Parser");
const StackedMap = require("../util/StackedMap");
const binarySearchBounds = require("../util/binarySearchBounds");
const memoize = require("../util/memoize");
const BasicEvaluatedExpression = require("./BasicEvaluatedExpression");

/** @typedef {import("acorn").Options} AcornOptions */
/** @typedef {import("estree").AssignmentExpression} AssignmentExpression */
/** @typedef {import("estree").BinaryExpression} BinaryExpression */
/** @typedef {import("estree").BlockStatement} BlockStatement */
/** @typedef {import("estree").SequenceExpression} SequenceExpression */
/** @typedef {import("estree").CallExpression} CallExpression */
/** @typedef {import("estree").BaseCallExpression} BaseCallExpression */
/** @typedef {import("estree").StaticBlock} StaticBlock */
/** @typedef {import("estree").ImportExpression} ImportExpression */
/** @typedef {import("estree").ClassDeclaration} ClassDeclaration */
/** @typedef {import("estree").ForStatement} ForStatement */
/** @typedef {import("estree").SwitchStatement} SwitchStatement */
/** @typedef {import("estree").ExportNamedDeclaration} ExportNamedDeclaration */
/** @typedef {import("estree").ClassExpression} ClassExpression */
/** @typedef {import("estree").Comment} Comment */
/** @typedef {import("estree").ConditionalExpression} ConditionalExpression */
/** @typedef {import("estree").Declaration} Declaration */
/** @typedef {import("estree").PrivateIdentifier} PrivateIdentifier */
/** @typedef {import("estree").PropertyDefinition} PropertyDefinition */
/** @typedef {import("estree").Expression} Expression */
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
/** @typedef {import("estree").ModuleDeclaration} ModuleDeclaration */
/** @typedef {import("estree").NewExpression} NewExpression */
/** @typedef {import("estree").SpreadElement} SpreadElement */
/** @typedef {import("estree").FunctionExpression} FunctionExpression */
/** @typedef {import("estree").WhileStatement} WhileStatement */
/** @typedef {import("estree").ArrowFunctionExpression} ArrowFunctionExpression */
/** @typedef {import("estree").ExpressionStatement} ExpressionStatement */
/** @typedef {import("estree").FunctionDeclaration} FunctionDeclaration */
/** @typedef {import("estree").DoWhileStatement} DoWhileStatement */
/** @typedef {import("estree").TryStatement} TryStatement */
/** @typedef {import("estree").Node} AnyNode */
/** @typedef {import("estree").Program} Program */
/** @typedef {import("estree").Directive} Directive */
/** @typedef {import("estree").Statement} Statement */
/** @typedef {import("estree").ImportDeclaration} ImportDeclaration */
/** @typedef {import("estree").ExportDefaultDeclaration} ExportDefaultDeclaration */
/** @typedef {import("estree").ExportAllDeclaration} ExportAllDeclaration */
/** @typedef {import("estree").Super} Super */
/** @typedef {import("estree").TaggedTemplateExpression} TaggedTemplateExpression */
/** @typedef {import("estree").TemplateLiteral} TemplateLiteral */
/** @typedef {Record<string, any>} Assertions */
/** @template T @typedef {import("tapable").AsArray<T>} AsArray<T> */
/** @typedef {import("../Parser").ParserState} ParserState */
/** @typedef {import("../Parser").PreparsedAst} PreparsedAst */
/** @typedef {{declaredScope: ScopeInfo, freeName: string | true, tagInfo: TagInfo | undefined}} VariableInfoInterface */
/** @typedef {{ name: string | VariableInfo, rootInfo: string | VariableInfo, getMembers: () => string[], getMembersOptionals: () => boolean[] }} GetInfoResult */

const EMPTY_ARRAY = [];
const ALLOWED_MEMBER_TYPES_CALL_EXPRESSION = 0b01;
const ALLOWED_MEMBER_TYPES_EXPRESSION = 0b10;
const ALLOWED_MEMBER_TYPES_ALL = 0b11;

// Syntax: https://developer.mozilla.org/en/SpiderMonkey/Parser_API

const parser = AcornParser.extend(importAssertions);

class VariableInfo {
	/**
	 * @param {ScopeInfo} declaredScope scope in which the variable is declared
	 * @param {string | true} freeName which free name the variable aliases, or true when none
	 * @param {TagInfo | undefined} tagInfo info about tags
	 */
	constructor(declaredScope, freeName, tagInfo) {
		this.declaredScope = declaredScope;
		this.freeName = freeName;
		this.tagInfo = tagInfo;
	}
}

/** @typedef {string | ScopeInfo | VariableInfo} ExportedVariableInfo */
/** @typedef {Literal | string | null | undefined} ImportSource */
/** @typedef {Omit<AcornOptions, "sourceType" | "ecmaVersion"> & { sourceType: "module" | "script" | "auto", ecmaVersion?: AcornOptions["ecmaVersion"] }} ParseOptions */

/**
 * @typedef {Object} TagInfo
 * @property {any} tag
 * @property {any} data
 * @property {TagInfo | undefined} next
 */

/**
 * @typedef {Object} ScopeInfo
 * @property {StackedMap<string, VariableInfo | ScopeInfo>} definitions
 * @property {boolean | "arrow"} topLevelScope
 * @property {boolean | string} inShorthand
 * @property {boolean} isStrict
 * @property {boolean} isAsmJs
 * @property {boolean} inTry
 */

/** @typedef {[number, number]} Range */

/**
 * Helper function for joining two ranges into a single range. This is useful
 * when working with AST nodes, as it allows you to combine the ranges of child nodes
 * to create the range of the _parent node_.
 *
 * @param {[number, number]} startRange start range to join
 * @param {[number, number]} endRange end range to join
 * @returns {[number, number]} joined range
 *
 * @example
 * ```js
 * 	const startRange = [0, 5];
 * 	const endRange = [10, 15];
 * 	const joinedRange = joinRanges(startRange, endRange);
 * 	console.log(joinedRange); // [0, 15]
 * ```
 *
 */
const joinRanges = (startRange, endRange) => {
	if (!endRange) return startRange;
	if (!startRange) return endRange;
	return [startRange[0], endRange[1]];
};

/**
 * Helper function used to generate a string representation of a
 * [member expression](https://github.com/estree/estree/blob/master/es5.md#memberexpression).
 *
 * @param {string} object object to name
 * @param {string[]} membersReversed reversed list of members
 * @returns {string} member expression as a string
 * @example
 * ```js
 * const membersReversed = ["property1", "property2", "property3"]; // Members parsed from the AST
 * const name = objectAndMembersToName("myObject", membersReversed);
 *
 * console.log(name); // "myObject.property1.property2.property3"
 * ```
 *
 */
const objectAndMembersToName = (object, membersReversed) => {
	let name = object;
	for (let i = membersReversed.length - 1; i >= 0; i--) {
		name = name + "." + membersReversed[i];
	}
	return name;
};

/**
 * Grabs the name of a given expression and returns it as a string or undefined. Has particular
 * handling for [Identifiers](https://github.com/estree/estree/blob/master/es5.md#identifier),
 * [ThisExpressions](https://github.com/estree/estree/blob/master/es5.md#identifier), and
 * [MetaProperties](https://github.com/estree/estree/blob/master/es2015.md#metaproperty) which is
 * specifically for handling the `new.target` meta property.
 *
 * @param {Expression | Super} expression expression
 * @returns {string | "this" | undefined} name or variable info
 */
const getRootName = expression => {
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

/** @type {AcornOptions} */
const defaultParserOptions = {
	ranges: true,
	locations: true,
	ecmaVersion: "latest",
	sourceType: "module",
	// https://github.com/tc39/proposal-hashbang
	allowHashBang: true,
	onComment: null
};

// regexp to match at least one "magic comment"
const webpackCommentRegExp = new RegExp(/(^|\W)webpack[A-Z]{1,}[A-Za-z]{1,}:/);

const EMPTY_COMMENT_OPTIONS = {
	options: null,
	errors: null
};

class JavascriptParser extends Parser {
	/**
	 * @param {"module" | "script" | "auto"} sourceType default source type
	 */
	constructor(sourceType = "auto") {
		super();
		this.hooks = Object.freeze({
			/** @type {HookMap<SyncBailHook<[UnaryExpression], BasicEvaluatedExpression | undefined | null>>} */
			evaluateTypeof: new HookMap(() => new SyncBailHook(["expression"])),
			/** @type {HookMap<SyncBailHook<[Expression], BasicEvaluatedExpression | undefined | null>>} */
			evaluate: new HookMap(() => new SyncBailHook(["expression"])),
			/** @type {HookMap<SyncBailHook<[Identifier | ThisExpression | MemberExpression | MetaProperty], BasicEvaluatedExpression | undefined | null>>} */
			evaluateIdentifier: new HookMap(() => new SyncBailHook(["expression"])),
			/** @type {HookMap<SyncBailHook<[Identifier | ThisExpression | MemberExpression], BasicEvaluatedExpression | undefined | null>>} */
			evaluateDefinedIdentifier: new HookMap(
				() => new SyncBailHook(["expression"])
			),
			/** @type {HookMap<SyncBailHook<[NewExpression], BasicEvaluatedExpression | undefined | null>>} */
			evaluateNewExpression: new HookMap(
				() => new SyncBailHook(["expression"])
			),
			/** @type {HookMap<SyncBailHook<[CallExpression], BasicEvaluatedExpression | undefined | null>>} */
			evaluateCallExpression: new HookMap(
				() => new SyncBailHook(["expression"])
			),
			/** @type {HookMap<SyncBailHook<[CallExpression, BasicEvaluatedExpression | undefined], BasicEvaluatedExpression | undefined | null>>} */
			evaluateCallExpressionMember: new HookMap(
				() => new SyncBailHook(["expression", "param"])
			),
			/** @type {HookMap<SyncBailHook<[Expression | Declaration | PrivateIdentifier, number], boolean | void>>} */
			isPure: new HookMap(
				() => new SyncBailHook(["expression", "commentsStartPosition"])
			),
			/** @type {SyncBailHook<[Statement | ModuleDeclaration], boolean | void>} */
			preStatement: new SyncBailHook(["statement"]),

			/** @type {SyncBailHook<[Statement | ModuleDeclaration], boolean | void>} */
			blockPreStatement: new SyncBailHook(["declaration"]),
			/** @type {SyncBailHook<[Statement | ModuleDeclaration], boolean | void>} */
			statement: new SyncBailHook(["statement"]),
			/** @type {SyncBailHook<[IfStatement], boolean | void>} */
			statementIf: new SyncBailHook(["statement"]),
			/** @type {SyncBailHook<[Expression, ClassExpression | ClassDeclaration], boolean | void>} */
			classExtendsExpression: new SyncBailHook([
				"expression",
				"classDefinition"
			]),
			/** @type {SyncBailHook<[MethodDefinition | PropertyDefinition | StaticBlock, ClassExpression | ClassDeclaration], boolean | void>} */
			classBodyElement: new SyncBailHook(["element", "classDefinition"]),
			/** @type {SyncBailHook<[Expression, MethodDefinition | PropertyDefinition, ClassExpression | ClassDeclaration], boolean | void>} */
			classBodyValue: new SyncBailHook([
				"expression",
				"element",
				"classDefinition"
			]),
			/** @type {HookMap<SyncBailHook<[LabeledStatement], boolean | void>>} */
			label: new HookMap(() => new SyncBailHook(["statement"])),
			/** @type {SyncBailHook<[ImportDeclaration, ImportSource], boolean | void>} */
			import: new SyncBailHook(["statement", "source"]),
			/** @type {SyncBailHook<[ImportDeclaration, ImportSource, string, string], boolean | void>} */
			importSpecifier: new SyncBailHook([
				"statement",
				"source",
				"exportName",
				"identifierName"
			]),
			/** @type {SyncBailHook<[ExportNamedDeclaration | ExportAllDeclaration], boolean | void>} */
			export: new SyncBailHook(["statement"]),
			/** @type {SyncBailHook<[ExportNamedDeclaration | ExportAllDeclaration, ImportSource], boolean | void>} */
			exportImport: new SyncBailHook(["statement", "source"]),
			/** @type {SyncBailHook<[ExportNamedDeclaration | ExportAllDeclaration, Declaration], boolean | void>} */
			exportDeclaration: new SyncBailHook(["statement", "declaration"]),
			/** @type {SyncBailHook<[ExportDefaultDeclaration, Declaration], boolean | void>} */
			exportExpression: new SyncBailHook(["statement", "declaration"]),
			/** @type {SyncBailHook<[ExportNamedDeclaration | ExportAllDeclaration, string, string, number | undefined], boolean | void>} */
			exportSpecifier: new SyncBailHook([
				"statement",
				"identifierName",
				"exportName",
				"index"
			]),
			/** @type {SyncBailHook<[ExportNamedDeclaration | ExportAllDeclaration, ImportSource, string, string, number | undefined], boolean | void>} */
			exportImportSpecifier: new SyncBailHook([
				"statement",
				"source",
				"identifierName",
				"exportName",
				"index"
			]),
			/** @type {SyncBailHook<[VariableDeclarator, Statement], boolean | void>} */
			preDeclarator: new SyncBailHook(["declarator", "statement"]),
			/** @type {SyncBailHook<[VariableDeclarator, Statement], boolean | void>} */
			declarator: new SyncBailHook(["declarator", "statement"]),
			/** @type {HookMap<SyncBailHook<[Declaration], boolean | void>>} */
			varDeclaration: new HookMap(() => new SyncBailHook(["declaration"])),
			/** @type {HookMap<SyncBailHook<[Declaration], boolean | void>>} */
			varDeclarationLet: new HookMap(() => new SyncBailHook(["declaration"])),
			/** @type {HookMap<SyncBailHook<[Declaration], boolean | void>>} */
			varDeclarationConst: new HookMap(() => new SyncBailHook(["declaration"])),
			/** @type {HookMap<SyncBailHook<[Declaration], boolean | void>>} */
			varDeclarationVar: new HookMap(() => new SyncBailHook(["declaration"])),
			/** @type {HookMap<SyncBailHook<[Identifier], boolean | void>>} */
			pattern: new HookMap(() => new SyncBailHook(["pattern"])),
			/** @type {HookMap<SyncBailHook<[Expression], boolean | void>>} */
			canRename: new HookMap(() => new SyncBailHook(["initExpression"])),
			/** @type {HookMap<SyncBailHook<[Expression], boolean | void>>} */
			rename: new HookMap(() => new SyncBailHook(["initExpression"])),
			/** @type {HookMap<SyncBailHook<[AssignmentExpression], boolean | void>>} */
			assign: new HookMap(() => new SyncBailHook(["expression"])),
			/** @type {HookMap<SyncBailHook<[AssignmentExpression, string[]], boolean | void>>} */
			assignMemberChain: new HookMap(
				() => new SyncBailHook(["expression", "members"])
			),
			/** @type {HookMap<SyncBailHook<[Expression], boolean | void>>} */
			typeof: new HookMap(() => new SyncBailHook(["expression"])),
			/** @type {SyncBailHook<[ImportExpression], boolean | void>} */
			importCall: new SyncBailHook(["expression"]),
			/** @type {SyncBailHook<[Expression], boolean | void>} */
			topLevelAwait: new SyncBailHook(["expression"]),
			/** @type {HookMap<SyncBailHook<[BaseCallExpression], boolean | void>>} */
			call: new HookMap(() => new SyncBailHook(["expression"])),
			/** Something like "a.b()" */
			/** @type {HookMap<SyncBailHook<[CallExpression, string[], boolean[]], boolean | void>>} */
			callMemberChain: new HookMap(
				() => new SyncBailHook(["expression", "members", "membersOptionals"])
			),
			/** Something like "a.b().c.d" */
			/** @type {HookMap<SyncBailHook<[Expression, string[], CallExpression, string[]], boolean | void>>} */
			memberChainOfCallMemberChain: new HookMap(
				() =>
					new SyncBailHook([
						"expression",
						"calleeMembers",
						"callExpression",
						"members"
					])
			),
			/** Something like "a.b().c.d()"" */
			/** @type {HookMap<SyncBailHook<[Expression, string[], CallExpression, string[]], boolean | void>>} */
			callMemberChainOfCallMemberChain: new HookMap(
				() =>
					new SyncBailHook([
						"expression",
						"calleeMembers",
						"innerCallExpression",
						"members"
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
			/** @type {HookMap<SyncBailHook<[Expression, string[], boolean[]], boolean | void>>} */
			expressionMemberChain: new HookMap(
				() => new SyncBailHook(["expression", "members", "membersOptionals"])
			),
			/** @type {HookMap<SyncBailHook<[Expression, string[]], boolean | void>>} */
			unhandledExpressionMemberChain: new HookMap(
				() => new SyncBailHook(["expression", "members"])
			),
			/** @type {SyncBailHook<[Expression], boolean | void>} */
			expressionConditionalOperator: new SyncBailHook(["expression"]),
			/** @type {SyncBailHook<[Expression], boolean | void>} */
			expressionLogicalOperator: new SyncBailHook(["expression"]),
			/** @type {SyncBailHook<[Program, Comment[]], boolean | void>} */
			program: new SyncBailHook(["ast", "comments"]),
			/** @type {SyncBailHook<[Program, Comment[]], boolean | void>} */
			finish: new SyncBailHook(["ast", "comments"])
		});
		this.sourceType = sourceType;
		/** @type {ScopeInfo} */
		this.scope = undefined;
		/** @type {ParserState} */
		this.state = undefined;
		this.comments = undefined;
		this.semicolons = undefined;
		/** @type {(Statement | ModuleDeclaration | Expression)[]} */
		this.statementPath = undefined;
		/** @type {Statement | ModuleDeclaration | Expression} */
		this.prevStatement = undefined;
		/** @type {WeakMap<Expression, Set<string>>} */
		this.destructuringAssignmentProperties = undefined;
		this.currentTagData = undefined;
		this._initializeEvaluating();
	}

	_initializeEvaluating() {
		this.hooks.evaluate.for("Literal").tap("JavascriptParser", _expr => {
			const expr = /** @type {Literal} */ (_expr);

			switch (typeof expr.value) {
				case "number":
					return new BasicEvaluatedExpression()
						.setNumber(expr.value)
						.setRange(expr.range);
				case "bigint":
					return new BasicEvaluatedExpression()
						.setBigInt(expr.value)
						.setRange(expr.range);
				case "string":
					return new BasicEvaluatedExpression()
						.setString(expr.value)
						.setRange(expr.range);
				case "boolean":
					return new BasicEvaluatedExpression()
						.setBoolean(expr.value)
						.setRange(expr.range);
			}
			if (expr.value === null) {
				return new BasicEvaluatedExpression().setNull().setRange(expr.range);
			}
			if (expr.value instanceof RegExp) {
				return new BasicEvaluatedExpression()
					.setRegExp(expr.value)
					.setRange(expr.range);
			}
		});
		this.hooks.evaluate.for("NewExpression").tap("JavascriptParser", _expr => {
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
			)
				return;

			let regExp, flags;
			const arg1 = expr.arguments[0];

			if (arg1) {
				if (arg1.type === "SpreadElement") return;

				const evaluatedRegExp = this.evaluateExpression(arg1);

				if (!evaluatedRegExp) return;

				regExp = evaluatedRegExp.asString();

				if (!regExp) return;
			} else {
				return new BasicEvaluatedExpression()
					.setRegExp(new RegExp(""))
					.setRange(expr.range);
			}

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
					)
						return;
				}
			}

			return new BasicEvaluatedExpression()
				.setRegExp(flags ? new RegExp(regExp, flags) : new RegExp(regExp))
				.setRange(expr.range);
		});
		this.hooks.evaluate
			.for("LogicalExpression")
			.tap("JavascriptParser", _expr => {
				const expr = /** @type {LogicalExpression} */ (_expr);

				const left = this.evaluateExpression(expr.left);
				let returnRight = false;
				/** @type {boolean|undefined} */
				let allowedRight;
				if (expr.operator === "&&") {
					const leftAsBool = left.asBool();
					if (leftAsBool === false) return left.setRange(expr.range);
					returnRight = leftAsBool === true;
					allowedRight = false;
				} else if (expr.operator === "||") {
					const leftAsBool = left.asBool();
					if (leftAsBool === true) return left.setRange(expr.range);
					returnRight = leftAsBool === false;
					allowedRight = true;
				} else if (expr.operator === "??") {
					const leftAsNullish = left.asNullish();
					if (leftAsNullish === false) return left.setRange(expr.range);
					if (leftAsNullish !== true) return;
					returnRight = true;
				} else return;
				const right = this.evaluateExpression(expr.right);
				if (returnRight) {
					if (left.couldHaveSideEffects()) right.setSideEffects();
					return right.setRange(expr.range);
				}

				const asBool = right.asBool();

				if (allowedRight === true && asBool === true) {
					return new BasicEvaluatedExpression()
						.setRange(expr.range)
						.setTruthy();
				} else if (allowedRight === false && asBool === false) {
					return new BasicEvaluatedExpression().setRange(expr.range).setFalsy();
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
		 * @param {boolean | number | BigInt | string} value the value to convert to an expression
		 * @param {BinaryExpression | UnaryExpression} expr the expression being evaluated
		 * @param {boolean} sideEffects whether the expression has side effects
		 * @returns {BasicEvaluatedExpression} the evaluated expression
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
						.setRange(expr.range);
				case "number":
					return new BasicEvaluatedExpression()
						.setNumber(value)
						.setSideEffects(sideEffects)
						.setRange(expr.range);
				case "bigint":
					return new BasicEvaluatedExpression()
						.setBigInt(value)
						.setSideEffects(sideEffects)
						.setRange(expr.range);
				case "string":
					return new BasicEvaluatedExpression()
						.setString(value)
						.setSideEffects(sideEffects)
						.setRange(expr.range);
			}
		};

		this.hooks.evaluate
			.for("BinaryExpression")
			.tap("JavascriptParser", _expr => {
				const expr = /** @type {BinaryExpression} */ (_expr);

				/**
				 * Evaluates a binary expression if and only if it is a const operation (e.g. 1 + 2, "a" + "b", etc.).
				 *
				 * @template T
				 * @param {(leftOperand: T, rightOperand: T) => boolean | number | BigInt | string} operandHandler the handler for the operation (e.g. (a, b) => a + b)
				 * @returns {BasicEvaluatedExpression | undefined} the evaluated expression
				 */
				const handleConstOperation = operandHandler => {
					const left = this.evaluateExpression(expr.left);
					if (!left.isCompileTimeValue()) return;

					const right = this.evaluateExpression(expr.right);
					if (!right.isCompileTimeValue()) return;

					const result = operandHandler(
						left.asCompileTimeValue(),
						right.asCompileTimeValue()
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
				 *
				 * @param {boolean} a first boolean to compare
				 * @param {boolean} b second boolean to compare
				 * @returns {boolean} true if the two booleans are always different, false otherwise
				 */
				const isAlwaysDifferent = (a, b) =>
					(a === true && b === false) || (a === false && b === true);

				const handleTemplateStringCompare = (left, right, res, eql) => {
					const getPrefix = parts => {
						let value = "";
						for (const p of parts) {
							const v = p.asString();
							if (v !== undefined) value += v;
							else break;
						}
						return value;
					};
					const getSuffix = parts => {
						let value = "";
						for (let i = parts.length - 1; i >= 0; i--) {
							const v = parts[i].asString();
							if (v !== undefined) value = v + value;
							else break;
						}
						return value;
					};
					const leftPrefix = getPrefix(left.parts);
					const rightPrefix = getPrefix(right.parts);
					const leftSuffix = getSuffix(left.parts);
					const rightSuffix = getSuffix(right.parts);
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
				const handleStrictEqualityComparison = eql => {
					const left = this.evaluateExpression(expr.left);
					const right = this.evaluateExpression(expr.right);
					const res = new BasicEvaluatedExpression();
					res.setRange(expr.range);

					const leftConst = left.isCompileTimeValue();
					const rightConst = right.isCompileTimeValue();

					if (leftConst && rightConst) {
						return res
							.setBoolean(
								eql ===
									(left.asCompileTimeValue() === right.asCompileTimeValue())
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
						(leftPrimitive === false &&
							(leftConst || rightPrimitive === true)) ||
						(rightPrimitive === false &&
							(rightConst || leftPrimitive === true)) ||
						// Different nullish or boolish status also means not equal
						isAlwaysDifferent(left.asBool(), right.asBool()) ||
						isAlwaysDifferent(left.asNullish(), right.asNullish())
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
				const handleAbstractEqualityComparison = eql => {
					const left = this.evaluateExpression(expr.left);
					const right = this.evaluateExpression(expr.right);
					const res = new BasicEvaluatedExpression();
					res.setRange(expr.range);

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
							res.setString(left.string + right.string);
						} else if (right.isNumber()) {
							res.setString(left.string + right.number);
						} else if (
							right.isWrapped() &&
							right.prefix &&
							right.prefix.isString()
						) {
							// "left" + ("prefix" + inner + "postfix")
							// => ("leftPrefix" + inner + "postfix")
							res.setWrapped(
								new BasicEvaluatedExpression()
									.setString(left.string + right.prefix.string)
									.setRange(joinRanges(left.range, right.prefix.range)),
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
							res.setString(left.number + right.string);
						} else if (right.isNumber()) {
							res.setNumber(left.number + right.number);
						} else {
							return;
						}
					} else if (left.isBigInt()) {
						if (right.isBigInt()) {
							res.setBigInt(left.bigint + right.bigint);
						}
					} else if (left.isWrapped()) {
						if (left.postfix && left.postfix.isString() && right.isString()) {
							// ("prefix" + inner + "postfix") + "right"
							// => ("prefix" + inner + "postfixRight")
							res.setWrapped(
								left.prefix,
								new BasicEvaluatedExpression()
									.setString(left.postfix.string + right.string)
									.setRange(joinRanges(left.postfix.range, right.range)),
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
									.setString(left.postfix.string + right.number)
									.setRange(joinRanges(left.postfix.range, right.range)),
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
									.setString(right.number + "")
									.setRange(right.range),
								left.wrappedInnerExpressions
							);
						} else if (right.isWrapped()) {
							// ("prefix1" + inner1 + "postfix1") + ("prefix2" + inner2 + "postfix2")
							// ("prefix1" + inner1 + "postfix1" + "prefix2" + inner2 + "postfix2")
							res.setWrapped(
								left.prefix,
								right.postfix,
								left.wrappedInnerExpressions &&
									right.wrappedInnerExpressions &&
									left.wrappedInnerExpressions
										.concat(left.postfix ? [left.postfix] : [])
										.concat(right.prefix ? [right.prefix] : [])
										.concat(right.wrappedInnerExpressions)
							);
						} else {
							// ("prefix" + inner + postfix) + expr
							// => ("prefix" + inner + postfix + expr + [null])
							res.setWrapped(
								left.prefix,
								null,
								left.wrappedInnerExpressions &&
									left.wrappedInnerExpressions.concat(
										left.postfix ? [left.postfix, right] : [right]
									)
							);
						}
					} else {
						if (right.isString()) {
							// left + "right"
							// => ([null] + left + "right")
							res.setWrapped(null, right, [left]);
						} else if (right.isWrapped()) {
							// left + (prefix + inner + "postfix")
							// => ([null] + left + prefix + inner + "postfix")
							res.setWrapped(
								null,
								right.postfix,
								right.wrappedInnerExpressions &&
									(right.prefix ? [left, right.prefix] : [left]).concat(
										right.wrappedInnerExpressions
									)
							);
						} else {
							return;
						}
					}
					if (left.couldHaveSideEffects() || right.couldHaveSideEffects())
						res.setSideEffects();
					res.setRange(expr.range);
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
				}
			});
		this.hooks.evaluate
			.for("UnaryExpression")
			.tap("JavascriptParser", _expr => {
				const expr = /** @type {UnaryExpression} */ (_expr);

				/**
				 * Evaluates a UnaryExpression if and only if it is a basic const operator (e.g. +a, -a, ~a).
				 *
				 * @template T
				 * @param {(operand: T) => boolean | number | BigInt | string} operandHandler handler for the operand
				 * @returns {BasicEvaluatedExpression | undefined} evaluated expression
				 */
				const handleConstOperation = operandHandler => {
					const argument = this.evaluateExpression(expr.argument);
					if (!argument.isCompileTimeValue()) return;
					const result = operandHandler(argument.asCompileTimeValue());
					return valueAsExpression(
						result,
						expr,
						argument.couldHaveSideEffects()
					);
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
								getRootName(expr.argument),
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
								.setRange(expr.range);
						}
					}
					const arg = this.evaluateExpression(expr.argument);
					if (arg.isUnknown()) return;
					if (arg.isString()) {
						return new BasicEvaluatedExpression()
							.setString("string")
							.setRange(expr.range);
					}
					if (arg.isWrapped()) {
						return new BasicEvaluatedExpression()
							.setString("string")
							.setSideEffects()
							.setRange(expr.range);
					}
					if (arg.isUndefined()) {
						return new BasicEvaluatedExpression()
							.setString("undefined")
							.setRange(expr.range);
					}
					if (arg.isNumber()) {
						return new BasicEvaluatedExpression()
							.setString("number")
							.setRange(expr.range);
					}
					if (arg.isBigInt()) {
						return new BasicEvaluatedExpression()
							.setString("bigint")
							.setRange(expr.range);
					}
					if (arg.isBoolean()) {
						return new BasicEvaluatedExpression()
							.setString("boolean")
							.setRange(expr.range);
					}
					if (arg.isConstArray() || arg.isRegExp() || arg.isNull()) {
						return new BasicEvaluatedExpression()
							.setString("object")
							.setRange(expr.range);
					}
					if (arg.isArray()) {
						return new BasicEvaluatedExpression()
							.setString("object")
							.setSideEffects(arg.couldHaveSideEffects())
							.setRange(expr.range);
					}
				} else if (expr.operator === "!") {
					const argument = this.evaluateExpression(expr.argument);
					const bool = argument.asBool();
					if (typeof bool !== "boolean") return;
					return new BasicEvaluatedExpression()
						.setBoolean(!bool)
						.setSideEffects(argument.couldHaveSideEffects())
						.setRange(expr.range);
				} else if (expr.operator === "~") {
					return handleConstOperation(v => ~v);
				} else if (expr.operator === "+") {
					return handleConstOperation(v => +v);
				} else if (expr.operator === "-") {
					return handleConstOperation(v => -v);
				}
			});
		this.hooks.evaluateTypeof.for("undefined").tap("JavascriptParser", expr => {
			return new BasicEvaluatedExpression()
				.setString("undefined")
				.setRange(expr.range);
		});
		this.hooks.evaluate.for("Identifier").tap("JavascriptParser", expr => {
			if (/** @type {Identifier} */ (expr).name === "undefined") {
				return new BasicEvaluatedExpression()
					.setUndefined()
					.setRange(expr.range);
			}
		});
		/**
		 * @param {string} exprType expression type name
		 * @param {function(Expression): GetInfoResult | undefined} getInfo get info
		 * @returns {void}
		 */
		const tapEvaluateWithVariableInfo = (exprType, getInfo) => {
			/** @type {Expression | undefined} */
			let cachedExpression = undefined;
			/** @type {GetInfoResult | undefined} */
			let cachedInfo = undefined;
			this.hooks.evaluate.for(exprType).tap("JavascriptParser", expr => {
				const expression = /** @type {MemberExpression} */ (expr);

				const info = getInfo(expr);
				if (info !== undefined) {
					return this.callHooksForInfoWithFallback(
						this.hooks.evaluateIdentifier,
						info.name,
						name => {
							cachedExpression = expression;
							cachedInfo = info;
						},
						name => {
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
				.tap({ name: "JavascriptParser", stage: 100 }, expr => {
					const info = cachedExpression === expr ? cachedInfo : getInfo(expr);
					if (info !== undefined) {
						return new BasicEvaluatedExpression()
							.setIdentifier(
								info.name,
								info.rootInfo,
								info.getMembers,
								info.getMembersOptionals
							)
							.setRange(expr.range);
					}
				});
			this.hooks.finish.tap("JavascriptParser", () => {
				// Cleanup for GC
				cachedExpression = cachedInfo = undefined;
			});
		};
		tapEvaluateWithVariableInfo("Identifier", expr => {
			const info = this.getVariableInfo(/** @type {Identifier} */ (expr).name);
			if (
				typeof info === "string" ||
				(info instanceof VariableInfo && typeof info.freeName === "string")
			) {
				return {
					name: info,
					rootInfo: info,
					getMembers: () => [],
					getMembersOptionals: () => []
				};
			}
		});
		tapEvaluateWithVariableInfo("ThisExpression", expr => {
			const info = this.getVariableInfo("this");
			if (
				typeof info === "string" ||
				(info instanceof VariableInfo && typeof info.freeName === "string")
			) {
				return {
					name: info,
					rootInfo: info,
					getMembers: () => [],
					getMembersOptionals: () => []
				};
			}
		});
		this.hooks.evaluate.for("MetaProperty").tap("JavascriptParser", expr => {
			const metaProperty = /** @type {MetaProperty} */ (expr);

			return this.callHooksForName(
				this.hooks.evaluateIdentifier,
				getRootName(expr),
				metaProperty
			);
		});
		tapEvaluateWithVariableInfo("MemberExpression", expr =>
			this.getMemberExpressionInfo(
				/** @type {MemberExpression} */ (expr),
				ALLOWED_MEMBER_TYPES_EXPRESSION
			)
		);

		this.hooks.evaluate.for("CallExpression").tap("JavascriptParser", _expr => {
			const expr = /** @type {CallExpression} */ (_expr);
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
			.tap("JavascriptParser", (expr, param) => {
				if (!param.isString()) return;
				if (expr.arguments.length === 0) return;
				const [arg1, arg2] = expr.arguments;
				if (arg1.type === "SpreadElement") return;
				const arg1Eval = this.evaluateExpression(arg1);
				if (!arg1Eval.isString()) return;
				const arg1Value = arg1Eval.string;

				let result;
				if (arg2) {
					if (arg2.type === "SpreadElement") return;
					const arg2Eval = this.evaluateExpression(arg2);
					if (!arg2Eval.isNumber()) return;
					result = param.string.indexOf(arg1Value, arg2Eval.number);
				} else {
					result = param.string.indexOf(arg1Value);
				}
				return new BasicEvaluatedExpression()
					.setNumber(result)
					.setSideEffects(param.couldHaveSideEffects())
					.setRange(expr.range);
			});
		this.hooks.evaluateCallExpressionMember
			.for("replace")
			.tap("JavascriptParser", (expr, param) => {
				if (!param.isString()) return;
				if (expr.arguments.length !== 2) return;
				if (expr.arguments[0].type === "SpreadElement") return;
				if (expr.arguments[1].type === "SpreadElement") return;
				let arg1 = this.evaluateExpression(expr.arguments[0]);
				let arg2 = this.evaluateExpression(expr.arguments[1]);
				if (!arg1.isString() && !arg1.isRegExp()) return;
				const arg1Value = arg1.regExp || arg1.string;
				if (!arg2.isString()) return;
				const arg2Value = arg2.string;
				return new BasicEvaluatedExpression()
					.setString(param.string.replace(arg1Value, arg2Value))
					.setSideEffects(param.couldHaveSideEffects())
					.setRange(expr.range);
			});
		["substr", "substring", "slice"].forEach(fn => {
			this.hooks.evaluateCallExpressionMember
				.for(fn)
				.tap("JavascriptParser", (expr, param) => {
					if (!param.isString()) return;
					let arg1;
					let result,
						str = param.string;
					switch (expr.arguments.length) {
						case 1:
							if (expr.arguments[0].type === "SpreadElement") return;
							arg1 = this.evaluateExpression(expr.arguments[0]);
							if (!arg1.isNumber()) return;
							result = str[fn](arg1.number);
							break;
						case 2: {
							if (expr.arguments[0].type === "SpreadElement") return;
							if (expr.arguments[1].type === "SpreadElement") return;
							arg1 = this.evaluateExpression(expr.arguments[0]);
							const arg2 = this.evaluateExpression(expr.arguments[1]);
							if (!arg1.isNumber()) return;
							if (!arg2.isNumber()) return;
							result = str[fn](arg1.number, arg2.number);
							break;
						}
						default:
							return;
					}
					return new BasicEvaluatedExpression()
						.setString(result)
						.setSideEffects(param.couldHaveSideEffects())
						.setRange(expr.range);
				});
		});

		/**
		 * @param {"cooked" | "raw"} kind kind of values to get
		 * @param {TemplateLiteral} templateLiteralExpr TemplateLiteral expr
		 * @returns {{quasis: BasicEvaluatedExpression[], parts: BasicEvaluatedExpression[]}} Simplified template
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
						prevExpr.setRange([prevExpr.range[0], quasiExpr.range[1]]);
						// We unset the expression as it doesn't match to a single expression
						prevExpr.setExpression(undefined);
						continue;
					}
					parts.push(expr);
				}

				const part = new BasicEvaluatedExpression()
					.setString(quasi)
					.setRange(quasiExpr.range)
					.setExpression(quasiExpr);
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
			.tap("JavascriptParser", _node => {
				const node = /** @type {TemplateLiteral} */ (_node);

				const { quasis, parts } = getSimplifiedTemplateResult("cooked", node);
				if (parts.length === 1) {
					return parts[0].setRange(node.range);
				}
				return new BasicEvaluatedExpression()
					.setTemplateString(quasis, parts, "cooked")
					.setRange(node.range);
			});
		this.hooks.evaluate
			.for("TaggedTemplateExpression")
			.tap("JavascriptParser", _node => {
				const node = /** @type {TaggedTemplateExpression} */ (_node);
				const tag = this.evaluateExpression(node.tag);

				if (tag.isIdentifier() && tag.identifier === "String.raw") {
					const { quasis, parts } = getSimplifiedTemplateResult(
						"raw",
						node.quasi
					);
					return new BasicEvaluatedExpression()
						.setTemplateString(quasis, parts, "raw")
						.setRange(node.range);
				}
			});

		this.hooks.evaluateCallExpressionMember
			.for("concat")
			.tap("JavascriptParser", (expr, param) => {
				if (!param.isString() && !param.isWrapped()) return;

				let stringSuffix = null;
				let hasUnknownParams = false;
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
						? argExpr.string
						: "" + argExpr.number;

					const newString = value + (stringSuffix ? stringSuffix.string : "");
					const newRange = /** @type {Range} */ ([
						argExpr.range[0],
						(stringSuffix || argExpr).range[1]
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
							? param.wrappedInnerExpressions.concat(innerExpressions.reverse())
							: innerExpressions.reverse();
					return new BasicEvaluatedExpression()
						.setWrapped(prefix, stringSuffix, inner)
						.setRange(expr.range);
				} else if (param.isWrapped()) {
					const postfix = stringSuffix || param.postfix;
					const inner = param.wrappedInnerExpressions
						? param.wrappedInnerExpressions.concat(innerExpressions.reverse())
						: innerExpressions.reverse();
					return new BasicEvaluatedExpression()
						.setWrapped(param.prefix, postfix, inner)
						.setRange(expr.range);
				} else {
					const newString =
						param.string + (stringSuffix ? stringSuffix.string : "");
					return new BasicEvaluatedExpression()
						.setString(newString)
						.setSideEffects(
							(stringSuffix && stringSuffix.couldHaveSideEffects()) ||
								param.couldHaveSideEffects()
						)
						.setRange(expr.range);
				}
			});
		this.hooks.evaluateCallExpressionMember
			.for("split")
			.tap("JavascriptParser", (expr, param) => {
				if (!param.isString()) return;
				if (expr.arguments.length !== 1) return;
				if (expr.arguments[0].type === "SpreadElement") return;
				let result;
				const arg = this.evaluateExpression(expr.arguments[0]);
				if (arg.isString()) {
					result = param.string.split(arg.string);
				} else if (arg.isRegExp()) {
					result = param.string.split(arg.regExp);
				} else {
					return;
				}
				return new BasicEvaluatedExpression()
					.setArray(result)
					.setSideEffects(param.couldHaveSideEffects())
					.setRange(expr.range);
			});
		this.hooks.evaluate
			.for("ConditionalExpression")
			.tap("JavascriptParser", _expr => {
				const expr = /** @type {ConditionalExpression} */ (_expr);

				const condition = this.evaluateExpression(expr.test);
				const conditionValue = condition.asBool();
				let res;
				if (conditionValue === undefined) {
					const consequent = this.evaluateExpression(expr.consequent);
					const alternate = this.evaluateExpression(expr.alternate);
					res = new BasicEvaluatedExpression();
					if (consequent.isConditional()) {
						res.setOptions(consequent.options);
					} else {
						res.setOptions([consequent]);
					}
					if (alternate.isConditional()) {
						res.addOptions(alternate.options);
					} else {
						res.addOptions([alternate]);
					}
				} else {
					res = this.evaluateExpression(
						conditionValue ? expr.consequent : expr.alternate
					);
					if (condition.couldHaveSideEffects()) res.setSideEffects();
				}
				res.setRange(expr.range);
				return res;
			});
		this.hooks.evaluate
			.for("ArrayExpression")
			.tap("JavascriptParser", _expr => {
				const expr = /** @type {ArrayExpression} */ (_expr);

				const items = expr.elements.map(element => {
					return (
						element !== null &&
						element.type !== "SpreadElement" &&
						this.evaluateExpression(element)
					);
				});
				if (!items.every(Boolean)) return;
				return new BasicEvaluatedExpression()
					.setItems(items)
					.setRange(expr.range);
			});
		this.hooks.evaluate
			.for("ChainExpression")
			.tap("JavascriptParser", _expr => {
				const expr = /** @type {ChainExpression} */ (_expr);
				/** @type {Expression[]} */
				const optionalExpressionsStack = [];
				/** @type {Expression|Super} */
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
					const expression = optionalExpressionsStack.pop();
					const evaluated = this.evaluateExpression(expression);

					if (evaluated.asNullish()) {
						return evaluated.setRange(_expr.range);
					}
				}
				return this.evaluateExpression(expr.expression);
			});
	}

	/**
	 * @param {Expression} node node
	 * @returns {Set<string>|undefined} destructured identifiers
	 */
	destructuringAssignmentPropertiesFor(node) {
		if (!this.destructuringAssignmentProperties) return undefined;
		return this.destructuringAssignmentProperties.get(node);
	}

	/**
	 * @param {Expression} expr expression
	 * @returns {string | VariableInfoInterface | undefined} identifier
	 */
	getRenameIdentifier(expr) {
		const result = this.evaluateExpression(expr);
		if (result.isIdentifier()) {
			return result.identifier;
		}
	}

	/**
	 * @param {ClassExpression | ClassDeclaration} classy a class node
	 * @returns {void}
	 */
	walkClass(classy) {
		if (classy.superClass) {
			if (!this.hooks.classExtendsExpression.call(classy.superClass, classy)) {
				this.walkExpression(classy.superClass);
			}
		}
		if (classy.body && classy.body.type === "ClassBody") {
			const scopeParams = [];
			// Add class name in scope for recursive calls
			if (classy.id) {
				scopeParams.push(classy.id);
			}
			this.inClassScope(true, scopeParams, () => {
				for (const classElement of /** @type {TODO} */ (classy.body.body)) {
					if (!this.hooks.classBodyElement.call(classElement, classy)) {
						if (classElement.computed && classElement.key) {
							this.walkExpression(classElement.key);
						}
						if (classElement.value) {
							if (
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
						} else if (classElement.type === "StaticBlock") {
							const wasTopLevel = this.scope.topLevelScope;
							this.scope.topLevelScope = false;
							this.walkBlockStatement(classElement);
							this.scope.topLevelScope = wasTopLevel;
						}
					}
				}
			});
		}
	}

	/**
	 * Pre walking iterates the scope for variable declarations
	 *
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
	 *
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
	 *
	 * @param {(Statement | ModuleDeclaration)[]} statements statements
	 */
	walkStatements(statements) {
		for (let index = 0, len = statements.length; index < len; index++) {
			const statement = statements[index];
			this.walkStatement(statement);
		}
	}

	/**
	 * Walking iterates the statements and expressions and processes them
	 *
	 * @param {Statement | ModuleDeclaration} statement statement
	 */
	preWalkStatement(statement) {
		this.statementPath.push(statement);
		if (this.hooks.preStatement.call(statement)) {
			this.prevStatement = this.statementPath.pop();
			return;
		}
		switch (statement.type) {
			case "BlockStatement":
				this.preWalkBlockStatement(statement);
				break;
			case "DoWhileStatement":
				this.preWalkDoWhileStatement(statement);
				break;
			case "ForInStatement":
				this.preWalkForInStatement(statement);
				break;
			case "ForOfStatement":
				this.preWalkForOfStatement(statement);
				break;
			case "ForStatement":
				this.preWalkForStatement(statement);
				break;
			case "FunctionDeclaration":
				this.preWalkFunctionDeclaration(statement);
				break;
			case "IfStatement":
				this.preWalkIfStatement(statement);
				break;
			case "LabeledStatement":
				this.preWalkLabeledStatement(statement);
				break;
			case "SwitchStatement":
				this.preWalkSwitchStatement(statement);
				break;
			case "TryStatement":
				this.preWalkTryStatement(statement);
				break;
			case "VariableDeclaration":
				this.preWalkVariableDeclaration(statement);
				break;
			case "WhileStatement":
				this.preWalkWhileStatement(statement);
				break;
			case "WithStatement":
				this.preWalkWithStatement(statement);
				break;
		}
		this.prevStatement = this.statementPath.pop();
	}

	/**
	 * @param {Statement | ModuleDeclaration} statement statement
	 */
	blockPreWalkStatement(statement) {
		this.statementPath.push(statement);
		if (this.hooks.blockPreStatement.call(statement)) {
			this.prevStatement = this.statementPath.pop();
			return;
		}
		switch (statement.type) {
			case "ImportDeclaration":
				this.blockPreWalkImportDeclaration(statement);
				break;
			case "ExportAllDeclaration":
				this.blockPreWalkExportAllDeclaration(statement);
				break;
			case "ExportDefaultDeclaration":
				this.blockPreWalkExportDefaultDeclaration(statement);
				break;
			case "ExportNamedDeclaration":
				this.blockPreWalkExportNamedDeclaration(statement);
				break;
			case "VariableDeclaration":
				this.blockPreWalkVariableDeclaration(statement);
				break;
			case "ClassDeclaration":
				this.blockPreWalkClassDeclaration(statement);
				break;
			case "ExpressionStatement":
				this.blockPreWalkExpressionStatement(statement);
		}
		this.prevStatement = this.statementPath.pop();
	}

	/**
	 * @param {Statement | ModuleDeclaration} statement statement
	 */
	walkStatement(statement) {
		this.statementPath.push(statement);
		if (this.hooks.statement.call(statement) !== undefined) {
			this.prevStatement = this.statementPath.pop();
			return;
		}
		switch (statement.type) {
			case "BlockStatement":
				this.walkBlockStatement(statement);
				break;
			case "ClassDeclaration":
				this.walkClassDeclaration(statement);
				break;
			case "DoWhileStatement":
				this.walkDoWhileStatement(statement);
				break;
			case "ExportDefaultDeclaration":
				this.walkExportDefaultDeclaration(statement);
				break;
			case "ExportNamedDeclaration":
				this.walkExportNamedDeclaration(statement);
				break;
			case "ExpressionStatement":
				this.walkExpressionStatement(statement);
				break;
			case "ForInStatement":
				this.walkForInStatement(statement);
				break;
			case "ForOfStatement":
				this.walkForOfStatement(statement);
				break;
			case "ForStatement":
				this.walkForStatement(statement);
				break;
			case "FunctionDeclaration":
				this.walkFunctionDeclaration(statement);
				break;
			case "IfStatement":
				this.walkIfStatement(statement);
				break;
			case "LabeledStatement":
				this.walkLabeledStatement(statement);
				break;
			case "ReturnStatement":
				this.walkReturnStatement(statement);
				break;
			case "SwitchStatement":
				this.walkSwitchStatement(statement);
				break;
			case "ThrowStatement":
				this.walkThrowStatement(statement);
				break;
			case "TryStatement":
				this.walkTryStatement(statement);
				break;
			case "VariableDeclaration":
				this.walkVariableDeclaration(statement);
				break;
			case "WhileStatement":
				this.walkWhileStatement(statement);
				break;
			case "WithStatement":
				this.walkWithStatement(statement);
				break;
		}
		this.prevStatement = this.statementPath.pop();
	}

	/**
	 * Walks a statements that is nested within a parent statement
	 * and can potentially be a non-block statement.
	 * This enforces the nested statement to never be in ASI position.
	 *
	 * @param {Statement} statement the nested statement
	 */
	walkNestedStatement(statement) {
		this.prevStatement = undefined;
		this.walkStatement(statement);
	}

	// Real Statements
	/**
	 * @param {BlockStatement} statement block statement
	 */
	preWalkBlockStatement(statement) {
		this.preWalkStatements(statement.body);
	}

	/**
	 * @param {BlockStatement} statement block statement
	 */
	walkBlockStatement(statement) {
		this.inBlockScope(() => {
			const body = statement.body;
			const prev = this.prevStatement;
			this.blockPreWalkStatements(body);
			this.prevStatement = prev;
			this.walkStatements(body);
		});
	}

	/**
	 * @param {ExpressionStatement} statement expression statement
	 */
	walkExpressionStatement(statement) {
		this.walkExpression(statement.expression);
	}

	/**
	 * @param {IfStatement} statement if statement
	 */
	preWalkIfStatement(statement) {
		this.preWalkStatement(statement.consequent);
		if (statement.alternate) {
			this.preWalkStatement(statement.alternate);
		}
	}

	/**
	 * @param {IfStatement} statement if statement
	 */
	walkIfStatement(statement) {
		const result = this.hooks.statementIf.call(statement);
		if (result === undefined) {
			this.walkExpression(statement.test);
			this.walkNestedStatement(statement.consequent);
			if (statement.alternate) {
				this.walkNestedStatement(statement.alternate);
			}
		} else {
			if (result) {
				this.walkNestedStatement(statement.consequent);
			} else if (statement.alternate) {
				this.walkNestedStatement(statement.alternate);
			}
		}
	}

	/**
	 * @param {LabeledStatement} statement with statement
	 */
	preWalkLabeledStatement(statement) {
		this.preWalkStatement(statement.body);
	}

	/**
	 * @param {LabeledStatement} statement with statement
	 */
	walkLabeledStatement(statement) {
		const hook = this.hooks.label.get(statement.label.name);
		if (hook !== undefined) {
			const result = hook.call(statement);
			if (result === true) return;
		}
		this.walkNestedStatement(statement.body);
	}

	/**
	 * @param {WithStatement} statement with statement
	 */
	preWalkWithStatement(statement) {
		this.preWalkStatement(statement.body);
	}

	/**
	 * @param {WithStatement} statement with statement
	 */
	walkWithStatement(statement) {
		this.walkExpression(statement.object);
		this.walkNestedStatement(statement.body);
	}

	/**
	 * @param {SwitchStatement} statement switch statement
	 */
	preWalkSwitchStatement(statement) {
		this.preWalkSwitchCases(statement.cases);
	}

	/**
	 * @param {SwitchStatement} statement switch statement
	 */
	walkSwitchStatement(statement) {
		this.walkExpression(statement.discriminant);
		this.walkSwitchCases(statement.cases);
	}

	/**
	 * @param {ReturnStatement | ThrowStatement} statement return or throw statement
	 */
	walkTerminatingStatement(statement) {
		if (statement.argument) this.walkExpression(statement.argument);
	}

	/**
	 * @param {ReturnStatement} statement return statement
	 */
	walkReturnStatement(statement) {
		this.walkTerminatingStatement(statement);
	}

	/**
	 * @param {ThrowStatement} statement return statement
	 */
	walkThrowStatement(statement) {
		this.walkTerminatingStatement(statement);
	}

	/**
	 * @param {TryStatement} statement try statement
	 */
	preWalkTryStatement(statement) {
		this.preWalkStatement(statement.block);
		if (statement.handler) this.preWalkCatchClause(statement.handler);
		if (statement.finalizer) this.preWalkStatement(statement.finalizer);
	}

	/**
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
		if (statement.handler) this.walkCatchClause(statement.handler);
		if (statement.finalizer) this.walkStatement(statement.finalizer);
	}

	/**
	 * @param {WhileStatement} statement while statement
	 */
	preWalkWhileStatement(statement) {
		this.preWalkStatement(statement.body);
	}

	/**
	 * @param {WhileStatement} statement while statement
	 */
	walkWhileStatement(statement) {
		this.walkExpression(statement.test);
		this.walkNestedStatement(statement.body);
	}

	/**
	 * @param {DoWhileStatement} statement do while statement
	 */
	preWalkDoWhileStatement(statement) {
		this.preWalkStatement(statement.body);
	}

	/**
	 * @param {DoWhileStatement} statement do while statement
	 */
	walkDoWhileStatement(statement) {
		this.walkNestedStatement(statement.body);
		this.walkExpression(statement.test);
	}

	/**
	 * @param {ForStatement} statement for statement
	 */
	preWalkForStatement(statement) {
		if (statement.init) {
			if (statement.init.type === "VariableDeclaration") {
				this.preWalkStatement(statement.init);
			}
		}
		this.preWalkStatement(statement.body);
	}

	/**
	 * @param {ForStatement} statement for statement
	 */
	walkForStatement(statement) {
		this.inBlockScope(() => {
			if (statement.init) {
				if (statement.init.type === "VariableDeclaration") {
					this.blockPreWalkVariableDeclaration(statement.init);
					this.prevStatement = undefined;
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
				const prev = this.prevStatement;
				this.blockPreWalkStatements(body.body);
				this.prevStatement = prev;
				this.walkStatements(body.body);
			} else {
				this.walkNestedStatement(body);
			}
		});
	}

	/**
	 * @param {ForInStatement} statement for statement
	 */
	preWalkForInStatement(statement) {
		if (statement.left.type === "VariableDeclaration") {
			this.preWalkVariableDeclaration(statement.left);
		}
		this.preWalkStatement(statement.body);
	}

	/**
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
				const prev = this.prevStatement;
				this.blockPreWalkStatements(body.body);
				this.prevStatement = prev;
				this.walkStatements(body.body);
			} else {
				this.walkNestedStatement(body);
			}
		});
	}

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
				const prev = this.prevStatement;
				this.blockPreWalkStatements(body.body);
				this.prevStatement = prev;
				this.walkStatements(body.body);
			} else {
				this.walkNestedStatement(body);
			}
		});
	}

	/**
	 * @param {FunctionDeclaration} statement function declaration
	 */
	preWalkFunctionDeclaration(statement) {
		if (statement.id) {
			this.defineVariable(statement.id.name);
		}
	}

	/**
	 * @param {FunctionDeclaration} statement function declaration
	 */
	walkFunctionDeclaration(statement) {
		const wasTopLevel = this.scope.topLevelScope;
		this.scope.topLevelScope = false;
		this.inFunctionScope(true, statement.params, () => {
			for (const param of statement.params) {
				this.walkPattern(param);
			}
			if (statement.body.type === "BlockStatement") {
				this.detectMode(statement.body.body);
				const prev = this.prevStatement;
				this.preWalkStatement(statement.body);
				this.prevStatement = prev;
				this.walkStatement(statement.body);
			} else {
				this.walkExpression(statement.body);
			}
		});
		this.scope.topLevelScope = wasTopLevel;
	}

	/**
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
	 * @param {AssignmentExpression} expression assignment expression
	 */
	preWalkAssignmentExpression(expression) {
		if (
			expression.left.type !== "ObjectPattern" ||
			!this.destructuringAssignmentProperties
		)
			return;
		const keys = this._preWalkObjectPattern(expression.left);
		if (!keys) return;

		// check multiple assignments
		if (this.destructuringAssignmentProperties.has(expression)) {
			const set = this.destructuringAssignmentProperties.get(expression);
			this.destructuringAssignmentProperties.delete(expression);
			for (const id of set) keys.add(id);
		}

		this.destructuringAssignmentProperties.set(
			expression.right.type === "AwaitExpression"
				? expression.right.argument
				: expression.right,
			keys
		);

		if (expression.right.type === "AssignmentExpression") {
			this.preWalkAssignmentExpression(expression.right);
		}
	}

	blockPreWalkImportDeclaration(statement) {
		const source = statement.source.value;
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
							specifier.imported.name || specifier.imported.value,
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

	blockPreWalkExportNamedDeclaration(statement) {
		let source;
		if (statement.source) {
			source = statement.source.value;
			this.hooks.exportImport.call(statement, source);
		} else {
			this.hooks.export.call(statement);
		}
		if (statement.declaration) {
			if (
				!this.hooks.exportDeclaration.call(statement, statement.declaration)
			) {
				const prev = this.prevStatement;
				this.preWalkStatement(statement.declaration);
				this.prevStatement = prev;
				this.blockPreWalkStatement(statement.declaration);
				let index = 0;
				this.enterDeclaration(statement.declaration, def => {
					this.hooks.exportSpecifier.call(statement, def, def, index++);
				});
			}
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
						const name = specifier.exported.name || specifier.exported.value;
						if (source) {
							this.hooks.exportImportSpecifier.call(
								statement,
								source,
								specifier.local.name,
								name,
								specifierIndex
							);
						} else {
							this.hooks.exportSpecifier.call(
								statement,
								specifier.local.name,
								name,
								specifierIndex
							);
						}
						break;
					}
				}
			}
		}
	}

	/**
	 * @param {ExportNamedDeclaration} statement the statement
	 */
	walkExportNamedDeclaration(statement) {
		if (statement.declaration) {
			this.walkStatement(statement.declaration);
		}
	}

	blockPreWalkExportDefaultDeclaration(statement) {
		const prev = this.prevStatement;
		this.preWalkStatement(statement.declaration);
		this.prevStatement = prev;
		this.blockPreWalkStatement(statement.declaration);
		if (
			statement.declaration.id &&
			statement.declaration.type !== "FunctionExpression" &&
			statement.declaration.type !== "ClassExpression"
		) {
			this.hooks.exportSpecifier.call(
				statement,
				statement.declaration.id.name,
				"default",
				undefined
			);
		}
	}

	walkExportDefaultDeclaration(statement) {
		this.hooks.export.call(statement);
		if (
			statement.declaration.id &&
			statement.declaration.type !== "FunctionExpression" &&
			statement.declaration.type !== "ClassExpression"
		) {
			if (
				!this.hooks.exportDeclaration.call(statement, statement.declaration)
			) {
				this.walkStatement(statement.declaration);
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
			if (!this.hooks.exportExpression.call(statement, statement.declaration)) {
				this.hooks.exportSpecifier.call(
					statement,
					statement.declaration,
					"default",
					undefined
				);
			}
		}
	}

	blockPreWalkExportAllDeclaration(statement) {
		const source = statement.source.value;
		const name = statement.exported ? statement.exported.name : null;
		this.hooks.exportImport.call(statement, source);
		this.hooks.exportImportSpecifier.call(statement, source, null, name, 0);
	}

	/**
	 * @param {VariableDeclaration} statement variable declaration
	 */
	preWalkVariableDeclaration(statement) {
		if (statement.kind !== "var") return;
		this._preWalkVariableDeclaration(statement, this.hooks.varDeclarationVar);
	}

	/**
	 * @param {VariableDeclaration} statement variable declaration
	 */
	blockPreWalkVariableDeclaration(statement) {
		if (statement.kind === "var") return;
		const hookMap =
			statement.kind === "const"
				? this.hooks.varDeclarationConst
				: this.hooks.varDeclarationLet;
		this._preWalkVariableDeclaration(statement, hookMap);
	}

	/**
	 * @param {VariableDeclaration} statement variable declaration
	 * @param {TODO} hookMap map of hooks
	 */
	_preWalkVariableDeclaration(statement, hookMap) {
		for (const declarator of statement.declarations) {
			switch (declarator.type) {
				case "VariableDeclarator": {
					this.preWalkVariableDeclarator(declarator);
					if (!this.hooks.preDeclarator.call(declarator, statement)) {
						this.enterPattern(declarator.id, (name, decl) => {
							let hook = hookMap.get(name);
							if (hook === undefined || !hook.call(decl)) {
								hook = this.hooks.varDeclaration.get(name);
								if (hook === undefined || !hook.call(decl)) {
									this.defineVariable(name);
								}
							}
						});
					}
					break;
				}
			}
		}
	}

	_preWalkObjectPattern(objectPattern) {
		const ids = new Set();
		const properties = objectPattern.properties;
		for (let i = 0; i < properties.length; i++) {
			const property = properties[i];
			if (property.type !== "Property") return;
			const key = property.key;
			if (key.type === "Identifier") {
				ids.add(key.name);
			} else {
				const id = this.evaluateExpression(key);
				const str = id.asString();
				if (str) {
					ids.add(str);
				} else {
					// could not evaluate key
					return;
				}
			}
		}

		return ids;
	}

	/**
	 * @param {VariableDeclarator} declarator variable declarator
	 */
	preWalkVariableDeclarator(declarator) {
		if (
			!declarator.init ||
			declarator.id.type !== "ObjectPattern" ||
			!this.destructuringAssignmentProperties
		)
			return;
		const keys = this._preWalkObjectPattern(declarator.id);

		if (!keys) return;
		this.destructuringAssignmentProperties.set(
			declarator.init.type === "AwaitExpression"
				? declarator.init.argument
				: declarator.init,
			keys
		);

		if (declarator.init.type === "AssignmentExpression") {
			this.preWalkAssignmentExpression(declarator.init);
		}
	}

	/**
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
						if (hook !== undefined && hook.call(declarator.init)) {
							// renaming with "var a = b;"
							const hook = this.hooks.rename.get(renameIdentifier);
							if (hook === undefined || !hook.call(declarator.init)) {
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
	 * @param {ClassDeclaration} statement class declaration
	 */
	blockPreWalkClassDeclaration(statement) {
		if (statement.id) {
			this.defineVariable(statement.id.name);
		}
	}

	/**
	 * @param {ClassDeclaration} statement class declaration
	 */
	walkClassDeclaration(statement) {
		this.walkClass(statement);
	}

	/**
	 * @param {SwitchCase[]} switchCases switch statement
	 */
	preWalkSwitchCases(switchCases) {
		for (let index = 0, len = switchCases.length; index < len; index++) {
			const switchCase = switchCases[index];
			this.preWalkStatements(switchCase.consequent);
		}
	}

	/**
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
					const prev = this.prevStatement;
					this.blockPreWalkStatements(switchCase.consequent);
					this.prevStatement = prev;
				}
			}

			for (let index = 0; index < len; index++) {
				const switchCase = switchCases[index];

				if (switchCase.test) {
					this.walkExpression(switchCase.test);
				}
				if (switchCase.consequent.length > 0) {
					this.walkStatements(switchCase.consequent);
				}
			}
		});
	}

	/**
	 * @param {CatchClause} catchClause catch clause
	 */
	preWalkCatchClause(catchClause) {
		this.preWalkStatement(catchClause.body);
	}

	/**
	 * @param {CatchClause} catchClause catch clause
	 */
	walkCatchClause(catchClause) {
		this.inBlockScope(() => {
			// Error binding is optional in catch clause since ECMAScript 2019
			if (catchClause.param !== null) {
				this.enterPattern(catchClause.param, ident => {
					this.defineVariable(ident);
				});
				this.walkPattern(catchClause.param);
			}
			const prev = this.prevStatement;
			this.blockPreWalkStatement(catchClause.body);
			this.prevStatement = prev;
			this.walkStatement(catchClause.body);
		});
	}

	/**
	 * @param {Pattern} pattern pattern
	 */
	walkPattern(pattern) {
		switch (pattern.type) {
			case "ArrayPattern":
				this.walkArrayPattern(pattern);
				break;
			case "AssignmentPattern":
				this.walkAssignmentPattern(pattern);
				break;
			case "MemberExpression":
				this.walkMemberExpression(pattern);
				break;
			case "ObjectPattern":
				this.walkObjectPattern(pattern);
				break;
			case "RestElement":
				this.walkRestElement(pattern);
				break;
		}
	}

	/**
	 * @param {AssignmentPattern} pattern assignment pattern
	 */
	walkAssignmentPattern(pattern) {
		this.walkExpression(pattern.right);
		this.walkPattern(pattern.left);
	}

	walkObjectPattern(pattern) {
		for (let i = 0, len = pattern.properties.length; i < len; i++) {
			const prop = pattern.properties[i];
			if (prop) {
				if (prop.computed) this.walkExpression(prop.key);
				if (prop.value) this.walkPattern(prop.value);
			}
		}
	}

	/**
	 * @param {ArrayPattern} pattern array pattern
	 */
	walkArrayPattern(pattern) {
		for (let i = 0, len = pattern.elements.length; i < len; i++) {
			const element = pattern.elements[i];
			if (element) this.walkPattern(element);
		}
	}

	/**
	 * @param {RestElement} pattern rest element
	 */
	walkRestElement(pattern) {
		this.walkPattern(pattern.argument);
	}

	/**
	 * @param {(Expression | SpreadElement | null)[]} expressions expressions
	 */
	walkExpressions(expressions) {
		for (const expression of expressions) {
			if (expression) {
				this.walkExpression(expression);
			}
		}
	}

	walkExpression(expression) {
		switch (expression.type) {
			case "ArrayExpression":
				this.walkArrayExpression(expression);
				break;
			case "ArrowFunctionExpression":
				this.walkArrowFunctionExpression(expression);
				break;
			case "AssignmentExpression":
				this.walkAssignmentExpression(expression);
				break;
			case "AwaitExpression":
				this.walkAwaitExpression(expression);
				break;
			case "BinaryExpression":
				this.walkBinaryExpression(expression);
				break;
			case "CallExpression":
				this.walkCallExpression(expression);
				break;
			case "ChainExpression":
				this.walkChainExpression(expression);
				break;
			case "ClassExpression":
				this.walkClassExpression(expression);
				break;
			case "ConditionalExpression":
				this.walkConditionalExpression(expression);
				break;
			case "FunctionExpression":
				this.walkFunctionExpression(expression);
				break;
			case "Identifier":
				this.walkIdentifier(expression);
				break;
			case "ImportExpression":
				this.walkImportExpression(expression);
				break;
			case "LogicalExpression":
				this.walkLogicalExpression(expression);
				break;
			case "MetaProperty":
				this.walkMetaProperty(expression);
				break;
			case "MemberExpression":
				this.walkMemberExpression(expression);
				break;
			case "NewExpression":
				this.walkNewExpression(expression);
				break;
			case "ObjectExpression":
				this.walkObjectExpression(expression);
				break;
			case "SequenceExpression":
				this.walkSequenceExpression(expression);
				break;
			case "SpreadElement":
				this.walkSpreadElement(expression);
				break;
			case "TaggedTemplateExpression":
				this.walkTaggedTemplateExpression(expression);
				break;
			case "TemplateLiteral":
				this.walkTemplateLiteral(expression);
				break;
			case "ThisExpression":
				this.walkThisExpression(expression);
				break;
			case "UnaryExpression":
				this.walkUnaryExpression(expression);
				break;
			case "UpdateExpression":
				this.walkUpdateExpression(expression);
				break;
			case "YieldExpression":
				this.walkYieldExpression(expression);
				break;
		}
	}

	/**
	 * @param {AwaitExpression} expression await expression
	 */
	walkAwaitExpression(expression) {
		if (this.scope.topLevelScope === true)
			this.hooks.topLevelAwait.call(expression);
		this.walkExpression(expression.argument);
	}

	/**
	 * @param {ArrayExpression} expression array expression
	 */
	walkArrayExpression(expression) {
		if (expression.elements) {
			this.walkExpressions(expression.elements);
		}
	}

	/**
	 * @param {SpreadElement} expression spread element
	 */
	walkSpreadElement(expression) {
		if (expression.argument) {
			this.walkExpression(expression.argument);
		}
	}

	/**
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
			this.walkExpression(prop.value);
		}
	}

	/**
	 * @param {FunctionExpression} expression arrow function expression
	 */
	walkFunctionExpression(expression) {
		const wasTopLevel = this.scope.topLevelScope;
		this.scope.topLevelScope = false;
		const scopeParams = [...expression.params];

		// Add function name in scope for recursive calls
		if (expression.id) {
			scopeParams.push(expression.id);
		}

		this.inFunctionScope(true, scopeParams, () => {
			for (const param of expression.params) {
				this.walkPattern(param);
			}
			if (expression.body.type === "BlockStatement") {
				this.detectMode(expression.body.body);
				const prev = this.prevStatement;
				this.preWalkStatement(expression.body);
				this.prevStatement = prev;
				this.walkStatement(expression.body);
			} else {
				this.walkExpression(expression.body);
			}
		});
		this.scope.topLevelScope = wasTopLevel;
	}

	/**
	 * @param {ArrowFunctionExpression} expression arrow function expression
	 */
	walkArrowFunctionExpression(expression) {
		const wasTopLevel = this.scope.topLevelScope;
		this.scope.topLevelScope = wasTopLevel ? "arrow" : false;
		this.inFunctionScope(false, expression.params, () => {
			for (const param of expression.params) {
				this.walkPattern(param);
			}
			if (expression.body.type === "BlockStatement") {
				this.detectMode(expression.body.body);
				const prev = this.prevStatement;
				this.preWalkStatement(expression.body);
				this.prevStatement = prev;
				this.walkStatement(expression.body);
			} else {
				this.walkExpression(expression.body);
			}
		});
		this.scope.topLevelScope = wasTopLevel;
	}

	/**
	 * @param {SequenceExpression} expression the sequence
	 */
	walkSequenceExpression(expression) {
		if (!expression.expressions) return;
		// We treat sequence expressions like statements when they are one statement level
		// This has some benefits for optimizations that only work on statement level
		const currentStatement = this.statementPath[this.statementPath.length - 1];
		if (
			currentStatement === expression ||
			(currentStatement.type === "ExpressionStatement" &&
				currentStatement.expression === expression)
		) {
			const old = this.statementPath.pop();
			for (const expr of expression.expressions) {
				this.statementPath.push(expr);
				this.walkExpression(expr);
				this.statementPath.pop();
			}
			this.statementPath.push(old);
		} else {
			this.walkExpressions(expression.expressions);
		}
	}

	/**
	 * @param {UpdateExpression} expression the update expression
	 */
	walkUpdateExpression(expression) {
		this.walkExpression(expression.argument);
	}

	/**
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
		}
		this.walkExpression(expression.argument);
	}

	/**
	 * @param {LogicalExpression | BinaryExpression} expression the expression
	 */
	walkLeftRightExpression(expression) {
		this.walkExpression(expression.left);
		this.walkExpression(expression.right);
	}

	/**
	 * @param {BinaryExpression} expression the binary expression
	 */
	walkBinaryExpression(expression) {
		if (this.hooks.binaryExpression.call(expression) === undefined) {
			this.walkLeftRightExpression(expression);
		}
	}

	/**
	 * @param {LogicalExpression} expression the logical expression
	 */
	walkLogicalExpression(expression) {
		const result = this.hooks.expressionLogicalOperator.call(expression);
		if (result === undefined) {
			this.walkLeftRightExpression(expression);
		} else {
			if (result) {
				this.walkExpression(expression.right);
			}
		}
	}

	/**
	 * @param {AssignmentExpression} expression assignment expression
	 */
	walkAssignmentExpression(expression) {
		if (expression.left.type === "Identifier") {
			const renameIdentifier = this.getRenameIdentifier(expression.right);
			if (renameIdentifier) {
				if (
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
			}
			this.walkExpression(expression.right);
			this.enterPattern(expression.left, (name, decl) => {
				if (!this.callHooksForName(this.hooks.assign, name, expression)) {
					this.walkExpression(expression.left);
				}
			});
			return;
		}
		if (expression.left.type.endsWith("Pattern")) {
			this.walkExpression(expression.right);
			this.enterPattern(expression.left, (name, decl) => {
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
			if (exprName) {
				if (
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
			this.walkExpression(expression.right);
			this.walkExpression(expression.left);
		} else {
			this.walkExpression(expression.right);
			this.walkExpression(expression.left);
		}
	}

	/**
	 * @param {ConditionalExpression} expression conditional expression
	 */
	walkConditionalExpression(expression) {
		const result = this.hooks.expressionConditionalOperator.call(expression);
		if (result === undefined) {
			this.walkExpression(expression.test);
			this.walkExpression(expression.consequent);
			if (expression.alternate) {
				this.walkExpression(expression.alternate);
			}
		} else {
			if (result) {
				this.walkExpression(expression.consequent);
			} else if (expression.alternate) {
				this.walkExpression(expression.alternate);
			}
		}
	}

	/**
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
	 * @param {YieldExpression} expression yield expression
	 */
	walkYieldExpression(expression) {
		if (expression.argument) {
			this.walkExpression(expression.argument);
		}
	}

	/**
	 * @param {TemplateLiteral} expression template literal
	 */
	walkTemplateLiteral(expression) {
		if (expression.expressions) {
			this.walkExpressions(expression.expressions);
		}
	}

	/**
	 * @param {TaggedTemplateExpression} expression tagged template expression
	 */
	walkTaggedTemplateExpression(expression) {
		if (expression.tag) {
			this.walkExpression(expression.tag);
		}
		if (expression.quasi && expression.quasi.expressions) {
			this.walkExpressions(expression.quasi.expressions);
		}
	}

	/**
	 * @param {ClassExpression} expression the class expression
	 */
	walkClassExpression(expression) {
		this.walkClass(expression);
	}

	/**
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

	_walkIIFE(functionExpression, options, currentThis) {
		const getVarInfo = argOrThis => {
			const renameIdentifier = this.getRenameIdentifier(argOrThis);
			if (renameIdentifier) {
				if (
					this.callHooksForInfo(
						this.hooks.canRename,
						renameIdentifier,
						argOrThis
					)
				) {
					if (
						!this.callHooksForInfo(
							this.hooks.rename,
							renameIdentifier,
							argOrThis
						)
					) {
						return typeof renameIdentifier === "string"
							? this.getVariableInfo(renameIdentifier)
							: renameIdentifier;
					}
				}
			}
			this.walkExpression(argOrThis);
		};
		const { params, type } = functionExpression;
		const arrow = type === "ArrowFunctionExpression";
		const renameThis = currentThis ? getVarInfo(currentThis) : null;
		const varInfoForArgs = options.map(getVarInfo);
		const wasTopLevel = this.scope.topLevelScope;
		this.scope.topLevelScope = wasTopLevel && arrow ? "arrow" : false;
		const scopeParams = params.filter(
			(identifier, idx) => !varInfoForArgs[idx]
		);

		// Add function name in scope for recursive calls
		if (functionExpression.id) {
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
				this.setVariable(params[i].name, varInfo);
			}
			if (functionExpression.body.type === "BlockStatement") {
				this.detectMode(functionExpression.body.body);
				const prev = this.prevStatement;
				this.preWalkStatement(functionExpression.body);
				this.prevStatement = prev;
				this.walkStatement(functionExpression.body);
			} else {
				this.walkExpression(functionExpression.body);
			}
		});
		this.scope.topLevelScope = wasTopLevel;
	}

	/**
	 * @param {ImportExpression} expression import expression
	 */
	walkImportExpression(expression) {
		let result = this.hooks.importCall.call(expression);
		if (result === true) return;

		this.walkExpression(expression.source);
	}

	walkCallExpression(expression) {
		const isSimpleFunction = fn => {
			return fn.params.every(p => p.type === "Identifier");
		};
		if (
			expression.callee.type === "MemberExpression" &&
			expression.callee.object.type.endsWith("FunctionExpression") &&
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
			expression.callee.type.endsWith("FunctionExpression") &&
			isSimpleFunction(expression.callee)
		) {
			// (function(…) { }(…))
			this._walkIIFE(expression.callee, expression.arguments, null);
		} else {
			if (expression.callee.type === "MemberExpression") {
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
						exprInfo.getMembers()
					);
					if (result === true) return;
				}
			}
			const callee = this.evaluateExpression(expression.callee);
			if (callee.isIdentifier()) {
				const result1 = this.callHooksForInfo(
					this.hooks.callMemberChain,
					callee.rootInfo,
					expression,
					callee.getMembers(),
					callee.getMembersOptionals
						? callee.getMembersOptionals()
						: callee.getMembers().map(() => false)
				);
				if (result1 === true) return;
				const result2 = this.callHooksForInfo(
					this.hooks.call,
					callee.identifier,
					expression
				);
				if (result2 === true) return;
			}

			if (expression.callee) {
				if (expression.callee.type === "MemberExpression") {
					// because of call context we need to walk the call context as expression
					this.walkExpression(expression.callee.object);
					if (expression.callee.computed === true)
						this.walkExpression(expression.callee.property);
				} else {
					this.walkExpression(expression.callee);
				}
			}
			if (expression.arguments) this.walkExpressions(expression.arguments);
		}
	}

	/**
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
					const membersOptionals = exprInfo.getMembersOptionals();
					const result2 = this.callHooksForInfo(
						this.hooks.expressionMemberChain,
						exprInfo.rootInfo,
						expression,
						members,
						membersOptionals
					);
					if (result2 === true) return;
					this.walkMemberExpressionWithExpressionName(
						expression,
						exprInfo.name,
						exprInfo.rootInfo,
						members.slice(),
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
					const result = this.callHooksForInfo(
						this.hooks.memberChainOfCallMemberChain,
						exprInfo.rootInfo,
						expression,
						exprInfo.getCalleeMembers(),
						exprInfo.call,
						exprInfo.getMembers()
					);
					if (result === true) return;
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
			const property =
				expression.property.name || `${expression.property.value}`;
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
	 * @param {ThisExpression} expression this expression
	 */
	walkThisExpression(expression) {
		this.callHooksForName(this.hooks.expression, "this", expression);
	}

	/**
	 * @param {Identifier} expression identifier
	 */
	walkIdentifier(expression) {
		this.callHooksForName(this.hooks.expression, expression.name, expression);
	}

	/**
	 * @param {MetaProperty} metaProperty meta property
	 */
	walkMetaProperty(metaProperty) {
		this.hooks.expression.for(getRootName(metaProperty)).call(metaProperty);
	}

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
	 * @template T
	 * @template R
	 * @param {HookMap<SyncBailHook<T, R>>} hookMap hooks the should be called
	 * @param {MemberExpression} expr expression info
	 * @param {function(string, string | ScopeInfo | VariableInfo, function(): string[]): any} fallback callback when variable in not handled by hooks
	 * @param {function(string): any} defined callback when variable is defined
	 * @param {AsArray<T>} args args for the hook
	 * @returns {R} result of hook
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
					(name => fallback(name, exprName.rootInfo, exprName.getMembers)),
				defined && (() => defined(exprName.name)),
				...args
			);
		}
	}

	/**
	 * @template T
	 * @template R
	 * @param {HookMap<SyncBailHook<T, R>>} hookMap hooks the should be called
	 * @param {string} name key in map
	 * @param {AsArray<T>} args args for the hook
	 * @returns {R} result of hook
	 */
	callHooksForName(hookMap, name, ...args) {
		return this.callHooksForNameWithFallback(
			hookMap,
			name,
			undefined,
			undefined,
			...args
		);
	}

	/**
	 * @template T
	 * @template R
	 * @param {HookMap<SyncBailHook<T, R>>} hookMap hooks that should be called
	 * @param {ExportedVariableInfo} info variable info
	 * @param  {AsArray<T>} args args for the hook
	 * @returns {R} result of hook
	 */
	callHooksForInfo(hookMap, info, ...args) {
		return this.callHooksForInfoWithFallback(
			hookMap,
			info,
			undefined,
			undefined,
			...args
		);
	}

	/**
	 * @template T
	 * @template R
	 * @param {HookMap<SyncBailHook<T, R>>} hookMap hooks the should be called
	 * @param {ExportedVariableInfo} info variable info
	 * @param {function(string): any} fallback callback when variable in not handled by hooks
	 * @param {function(): any} defined callback when variable is defined
	 * @param {AsArray<T>} args args for the hook
	 * @returns {R} result of hook
	 */
	callHooksForInfoWithFallback(hookMap, info, fallback, defined, ...args) {
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
			if (info.freeName === true) {
				if (defined !== undefined) {
					return defined();
				}
				return;
			}
			name = info.freeName;
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
	 * @template T
	 * @template R
	 * @param {HookMap<SyncBailHook<T, R>>} hookMap hooks the should be called
	 * @param {string} name key in map
	 * @param {function(string): any} fallback callback when variable in not handled by hooks
	 * @param {function(): any} defined callback when variable is defined
	 * @param {AsArray<T>} args args for the hook
	 * @returns {R} result of hook
	 */
	callHooksForNameWithFallback(hookMap, name, fallback, defined, ...args) {
		return this.callHooksForInfoWithFallback(
			hookMap,
			this.getVariableInfo(name),
			fallback,
			defined,
			...args
		);
	}

	/**
	 * @deprecated
	 * @param {any} params scope params
	 * @param {function(): void} fn inner function
	 * @returns {void}
	 */
	inScope(params, fn) {
		const oldScope = this.scope;
		this.scope = {
			topLevelScope: oldScope.topLevelScope,
			inTry: false,
			inShorthand: false,
			isStrict: oldScope.isStrict,
			isAsmJs: oldScope.isAsmJs,
			definitions: oldScope.definitions.createChild()
		};

		this.undefineVariable("this");

		this.enterPatterns(params, (ident, pattern) => {
			this.defineVariable(ident);
		});

		fn();

		this.scope = oldScope;
	}

	inClassScope(hasThis, params, fn) {
		const oldScope = this.scope;
		this.scope = {
			topLevelScope: oldScope.topLevelScope,
			inTry: false,
			inShorthand: false,
			isStrict: oldScope.isStrict,
			isAsmJs: oldScope.isAsmJs,
			definitions: oldScope.definitions.createChild()
		};

		if (hasThis) {
			this.undefineVariable("this");
		}

		this.enterPatterns(params, (ident, pattern) => {
			this.defineVariable(ident);
		});

		fn();

		this.scope = oldScope;
	}

	inFunctionScope(hasThis, params, fn) {
		const oldScope = this.scope;
		this.scope = {
			topLevelScope: oldScope.topLevelScope,
			inTry: false,
			inShorthand: false,
			isStrict: oldScope.isStrict,
			isAsmJs: oldScope.isAsmJs,
			definitions: oldScope.definitions.createChild()
		};

		if (hasThis) {
			this.undefineVariable("this");
		}

		this.enterPatterns(params, (ident, pattern) => {
			this.defineVariable(ident);
		});

		fn();

		this.scope = oldScope;
	}

	inBlockScope(fn) {
		const oldScope = this.scope;
		this.scope = {
			topLevelScope: oldScope.topLevelScope,
			inTry: oldScope.inTry,
			inShorthand: false,
			isStrict: oldScope.isStrict,
			isAsmJs: oldScope.isAsmJs,
			definitions: oldScope.definitions.createChild()
		};

		fn();

		this.scope = oldScope;
	}

	detectMode(statements) {
		const isLiteral =
			statements.length >= 1 &&
			statements[0].type === "ExpressionStatement" &&
			statements[0].expression.type === "Literal";
		if (isLiteral && statements[0].expression.value === "use strict") {
			this.scope.isStrict = true;
		}
		if (isLiteral && statements[0].expression.value === "use asm") {
			this.scope.isAsmJs = true;
		}
	}

	enterPatterns(patterns, onIdent) {
		for (const pattern of patterns) {
			if (typeof pattern !== "string") {
				this.enterPattern(pattern, onIdent);
			} else if (pattern) {
				onIdent(pattern);
			}
		}
	}

	enterPattern(pattern, onIdent) {
		if (!pattern) return;
		switch (pattern.type) {
			case "ArrayPattern":
				this.enterArrayPattern(pattern, onIdent);
				break;
			case "AssignmentPattern":
				this.enterAssignmentPattern(pattern, onIdent);
				break;
			case "Identifier":
				this.enterIdentifier(pattern, onIdent);
				break;
			case "ObjectPattern":
				this.enterObjectPattern(pattern, onIdent);
				break;
			case "RestElement":
				this.enterRestElement(pattern, onIdent);
				break;
			case "Property":
				if (pattern.shorthand && pattern.value.type === "Identifier") {
					this.scope.inShorthand = pattern.value.name;
					this.enterIdentifier(pattern.value, onIdent);
					this.scope.inShorthand = false;
				} else {
					this.enterPattern(pattern.value, onIdent);
				}
				break;
		}
	}

	/**
	 * @param {Identifier} pattern identifier pattern
	 * @param {TODO} onIdent callback
	 */
	enterIdentifier(pattern, onIdent) {
		if (!this.callHooksForName(this.hooks.pattern, pattern.name, pattern)) {
			onIdent(pattern.name, pattern);
		}
	}

	/**
	 * @param {ObjectPattern} pattern object pattern
	 * @param {TODO} onIdent callback
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
	 * @param {ArrayPattern} pattern object pattern
	 * @param {TODO} onIdent callback
	 */
	enterArrayPattern(pattern, onIdent) {
		for (
			let elementIndex = 0, len = pattern.elements.length;
			elementIndex < len;
			elementIndex++
		) {
			const element = pattern.elements[elementIndex];
			// TODO check on `null`?
			this.enterPattern(element, onIdent);
		}
	}

	/**
	 * @param {RestElement} pattern object pattern
	 * @param {TODO} onIdent callback
	 */
	enterRestElement(pattern, onIdent) {
		this.enterPattern(pattern.argument, onIdent);
	}

	/**
	 * @param {AssignmentPattern} pattern object pattern
	 * @param {TODO} onIdent callback
	 */
	enterAssignmentPattern(pattern, onIdent) {
		this.enterPattern(pattern.left, onIdent);
	}

	/**
	 * @param {Expression} expression expression node
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
		} catch (e) {
			console.warn(e);
			// ignore error
		}
		return new BasicEvaluatedExpression()
			.setRange(expression.range)
			.setExpression(expression);
	}

	/**
	 * @param {Expression} expression expression
	 * @returns {string} parsed string
	 */
	parseString(expression) {
		switch (expression.type) {
			case "BinaryExpression":
				if (expression.operator === "+") {
					return (
						this.parseString(expression.left) +
						this.parseString(expression.right)
					);
				}
				break;
			case "Literal":
				return expression.value + "";
		}
		throw new Error(
			expression.type + " is not supported as parameter for require"
		);
	}

	parseCalculatedString(expression) {
		switch (expression.type) {
			case "BinaryExpression":
				if (expression.operator === "+") {
					const left = this.parseCalculatedString(expression.left);
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
								left.range[0],
								right.range ? right.range[1] : left.range[1]
							],
							value: left.value + right.value,
							code: true,
							conditional: false
						};
					} else {
						return {
							range: [left.range[0], right.range[1]],
							value: left.value + right.value,
							code: false,
							conditional: false
						};
					}
				}
				break;
			case "ConditionalExpression": {
				const consequent = this.parseCalculatedString(expression.consequent);
				const alternate = this.parseCalculatedString(expression.alternate);
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
					value: expression.value + "",
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
	 * @param {string | Buffer | PreparsedAst} source the source to parse
	 * @param {ParserState} state the parser state
	 * @returns {ParserState} the parser state
	 */
	parse(source, state) {
		let ast;
		let comments;
		const semicolons = new Set();
		if (source === null) {
			throw new Error("source must not be null");
		}
		if (Buffer.isBuffer(source)) {
			source = source.toString("utf-8");
		}
		if (typeof source === "object") {
			ast = /** @type {Program} */ (source);
			comments = source.comments;
		} else {
			comments = [];
			ast = JavascriptParser._parse(source, {
				sourceType: this.sourceType,
				onComment: comments,
				onInsertedSemicolon: pos => semicolons.add(pos)
			});
		}

		const oldScope = this.scope;
		const oldState = this.state;
		const oldComments = this.comments;
		const oldSemicolons = this.semicolons;
		const oldStatementPath = this.statementPath;
		const oldPrevStatement = this.prevStatement;
		this.scope = {
			topLevelScope: true,
			inTry: false,
			inShorthand: false,
			isStrict: false,
			isAsmJs: false,
			definitions: new StackedMap()
		};
		/** @type {ParserState} */
		this.state = state;
		this.comments = comments;
		this.semicolons = semicolons;
		this.statementPath = [];
		this.prevStatement = undefined;
		if (this.hooks.program.call(ast, comments) === undefined) {
			this.destructuringAssignmentProperties = new WeakMap();
			this.detectMode(ast.body);
			this.preWalkStatements(ast.body);
			this.prevStatement = undefined;
			this.blockPreWalkStatements(ast.body);
			this.prevStatement = undefined;
			this.walkStatements(ast.body);
			this.destructuringAssignmentProperties = undefined;
		}
		this.hooks.finish.call(ast, comments);
		this.scope = oldScope;
		/** @type {ParserState} */
		this.state = oldState;
		this.comments = oldComments;
		this.semicolons = oldSemicolons;
		this.statementPath = oldStatementPath;
		this.prevStatement = oldPrevStatement;
		return state;
	}

	/**
	 * @param {string} source source code
	 * @returns {BasicEvaluatedExpression} evaluation result
	 */
	evaluate(source) {
		const ast = JavascriptParser._parse("(" + source + ")", {
			sourceType: this.sourceType,
			locations: false
		});
		if (ast.body.length !== 1 || ast.body[0].type !== "ExpressionStatement") {
			throw new Error("evaluate: Source is not a expression");
		}
		return this.evaluateExpression(ast.body[0].expression);
	}

	/**
	 * @param {Expression | Declaration | PrivateIdentifier | null | undefined} expr an expression
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
			// TODO handle more cases
			case "ClassDeclaration":
			case "ClassExpression": {
				if (expr.body.type !== "ClassBody") return false;
				if (expr.superClass && !this.isPure(expr.superClass, expr.range[0])) {
					return false;
				}
				const items =
					/** @type {TODO[]} */
					(expr.body.body);
				return items.every(item => {
					if (
						item.computed &&
						item.key &&
						!this.isPure(item.key, item.range[0])
					) {
						return false;
					}

					if (
						item.static &&
						item.value &&
						!this.isPure(
							item.value,
							item.key ? item.key.range[1] : item.range[0]
						)
					) {
						return false;
					}

					if (item.type === "StaticBlock") {
						return false;
					}

					return true;
				});
			}

			case "FunctionDeclaration":
			case "FunctionExpression":
			case "ArrowFunctionExpression":
			case "ThisExpression":
			case "Literal":
			case "TemplateLiteral":
			case "Identifier":
			case "PrivateIdentifier":
				return true;

			case "VariableDeclaration":
				return expr.declarations.every(decl =>
					this.isPure(decl.init, decl.range[0])
				);

			case "ConditionalExpression":
				return (
					this.isPure(expr.test, commentsStartPos) &&
					this.isPure(expr.consequent, expr.test.range[1]) &&
					this.isPure(expr.alternate, expr.consequent.range[1])
				);

			case "LogicalExpression":
				return (
					this.isPure(expr.left, commentsStartPos) &&
					this.isPure(expr.right, expr.left.range[1])
				);

			case "SequenceExpression":
				return expr.expressions.every(expr => {
					const pureFlag = this.isPure(expr, commentsStartPos);
					commentsStartPos = expr.range[1];
					return pureFlag;
				});

			case "CallExpression": {
				const pureFlag =
					expr.range[0] - commentsStartPos > 12 &&
					this.getComments([commentsStartPos, expr.range[0]]).some(
						comment =>
							comment.type === "Block" &&
							/^\s*(#|@)__PURE__\s*$/.test(comment.value)
					);
				if (!pureFlag) return false;
				commentsStartPos = expr.callee.range[1];
				return expr.arguments.every(arg => {
					if (arg.type === "SpreadElement") return false;
					const pureFlag = this.isPure(arg, commentsStartPos);
					commentsStartPos = arg.range[1];
					return pureFlag;
				});
			}
		}
		const evaluated = this.evaluateExpression(expr);
		return !evaluated.couldHaveSideEffects();
	}

	/**
	 * @param {Range} range range
	 * @returns {TODO[]} comments in the range
	 */
	getComments(range) {
		const [rangeStart, rangeEnd] = range;
		const compare = (comment, needle) => comment.range[0] - needle;
		let idx = binarySearchBounds.ge(this.comments, rangeStart, compare);
		let commentsInRange = [];
		while (this.comments[idx] && this.comments[idx].range[1] <= rangeEnd) {
			commentsInRange.push(this.comments[idx]);
			idx++;
		}

		return commentsInRange;
	}

	/**
	 * @param {number} pos source code position
	 * @returns {boolean} true when a semicolon has been inserted before this position, false if not
	 */
	isAsiPosition(pos) {
		const currentStatement = this.statementPath[this.statementPath.length - 1];
		if (currentStatement === undefined) throw new Error("Not in statement");
		return (
			// Either asking directly for the end position of the current statement
			(currentStatement.range[1] === pos && this.semicolons.has(pos)) ||
			// Or asking for the start position of the current statement,
			// here we have to check multiple things
			(currentStatement.range[0] === pos &&
				// is there a previous statement which might be relevant?
				this.prevStatement !== undefined &&
				// is the end position of the previous statement an ASI position?
				this.semicolons.has(this.prevStatement.range[1]))
		);
	}

	/**
	 * @param {number} pos source code position
	 * @returns {void}
	 */
	unsetAsiPosition(pos) {
		this.semicolons.delete(pos);
	}

	isStatementLevelExpression(expr) {
		const currentStatement = this.statementPath[this.statementPath.length - 1];
		return (
			expr === currentStatement ||
			(currentStatement.type === "ExpressionStatement" &&
				currentStatement.expression === expr)
		);
	}

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

	tagVariable(name, tag, data) {
		const oldInfo = this.scope.definitions.get(name);
		/** @type {VariableInfo} */
		let newInfo;
		if (oldInfo === undefined) {
			newInfo = new VariableInfo(this.scope, name, {
				tag,
				data,
				next: undefined
			});
		} else if (oldInfo instanceof VariableInfo) {
			newInfo = new VariableInfo(oldInfo.declaredScope, oldInfo.freeName, {
				tag,
				data,
				next: oldInfo.tagInfo
			});
		} else {
			newInfo = new VariableInfo(oldInfo, true, {
				tag,
				data,
				next: undefined
			});
		}
		this.scope.definitions.set(name, newInfo);
	}

	/**
	 * @param {string} name variable name
	 */
	defineVariable(name) {
		const oldInfo = this.scope.definitions.get(name);
		// Don't redefine variable in same scope to keep existing tags
		if (oldInfo instanceof VariableInfo && oldInfo.declaredScope === this.scope)
			return;
		this.scope.definitions.set(name, this.scope);
	}

	/**
	 * @param {string} name variable name
	 */
	undefineVariable(name) {
		this.scope.definitions.delete(name);
	}

	/**
	 * @param {string} name variable name
	 * @returns {boolean} true, when variable is defined
	 */
	isVariableDefined(name) {
		const info = this.scope.definitions.get(name);
		if (info === undefined) return false;
		if (info instanceof VariableInfo) {
			return info.freeName === true;
		}
		return true;
	}

	/**
	 * @param {string} name variable name
	 * @returns {ExportedVariableInfo} info for this variable
	 */
	getVariableInfo(name) {
		const value = this.scope.definitions.get(name);
		if (value === undefined) {
			return name;
		} else {
			return value;
		}
	}

	/**
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
					new VariableInfo(this.scope, variableInfo, undefined)
				);
			}
		} else {
			this.scope.definitions.set(name, variableInfo);
		}
	}

	/**
	 * @param {TagInfo} tagInfo tag info
	 * @returns {VariableInfo} variable info
	 */
	evaluatedVariable(tagInfo) {
		return new VariableInfo(this.scope, undefined, tagInfo);
	}

	/**
	 * @param {Range} range range of the comment
	 * @returns {TODO} TODO
	 */
	parseCommentOptions(range) {
		const comments = this.getComments(range);
		if (comments.length === 0) {
			return EMPTY_COMMENT_OPTIONS;
		}
		let options = {};
		/** @type {unknown[]} */
		let errors = [];
		for (const comment of comments) {
			const { value } = comment;
			if (value && webpackCommentRegExp.test(value)) {
				// try compile only if webpack options comment is present
				try {
					for (let [key, val] of Object.entries(
						vm.runInNewContext(`(function(){return {${value}};})()`)
					)) {
						if (typeof val === "object" && val !== null) {
							if (val.constructor.name === "RegExp") val = new RegExp(val);
							else val = JSON.parse(JSON.stringify(val));
						}
						options[key] = val;
					}
				} catch (e) {
					const newErr = new Error(String(e.message));
					newErr.stack = String(e.stack);
					Object.assign(newErr, { comment });
					errors.push(newErr);
				}
			}
		}
		return { options, errors };
	}

	/**
	 * @param {MemberExpression} expression a member expression
	 * @returns {{ members: string[], object: Expression | Super, membersOptionals: boolean[] }} member names (reverse order) and remaining object
	 */
	extractMemberExpressionChain(expression) {
		/** @type {AnyNode} */
		let expr = expression;
		const members = [];
		const membersOptionals = [];
		while (expr.type === "MemberExpression") {
			if (expr.computed) {
				if (expr.property.type !== "Literal") break;
				members.push(`${expr.property.value}`);
			} else {
				if (expr.property.type !== "Identifier") break;
				members.push(expr.property.name);
			}
			membersOptionals.push(expr.optional);
			expr = expr.object;
		}

		return {
			members,
			membersOptionals,
			object: expr
		};
	}

	/**
	 * @param {string} varName variable name
	 * @returns {{name: string, info: VariableInfo | string}} name of the free variable and variable info for that
	 */
	getFreeInfoFromVariable(varName) {
		const info = this.getVariableInfo(varName);
		let name;
		if (info instanceof VariableInfo) {
			name = info.freeName;
			if (typeof name !== "string") return undefined;
		} else if (typeof info !== "string") {
			return undefined;
		} else {
			name = info;
		}
		return { info, name };
	}

	/** @typedef {{ type: "call", call: CallExpression, calleeName: string, rootInfo: string | VariableInfo, getCalleeMembers: () => string[], name: string, getMembers: () => string[], getMembersOptionals: () => boolean[]}} CallExpressionInfo */
	/** @typedef {{ type: "expression", rootInfo: string | VariableInfo, name: string, getMembers: () => string[], getMembersOptionals: () => boolean[]}} ExpressionExpressionInfo */

	/**
	 * @param {MemberExpression} expression a member expression
	 * @param {number} allowedTypes which types should be returned, presented in bit mask
	 * @returns {CallExpressionInfo | ExpressionExpressionInfo | undefined} expression info
	 */
	getMemberExpressionInfo(expression, allowedTypes) {
		const { object, members, membersOptionals } =
			this.extractMemberExpressionChain(expression);
		switch (object.type) {
			case "CallExpression": {
				if ((allowedTypes & ALLOWED_MEMBER_TYPES_CALL_EXPRESSION) === 0)
					return undefined;
				let callee = object.callee;
				let rootMembers = EMPTY_ARRAY;
				if (callee.type === "MemberExpression") {
					({ object: callee, members: rootMembers } =
						this.extractMemberExpressionChain(callee));
				}
				const rootName = getRootName(callee);
				if (!rootName) return undefined;
				const result = this.getFreeInfoFromVariable(rootName);
				if (!result) return undefined;
				const { info: rootInfo, name: resolvedRoot } = result;
				const calleeName = objectAndMembersToName(resolvedRoot, rootMembers);
				return {
					type: "call",
					call: object,
					calleeName,
					rootInfo,
					getCalleeMembers: memoize(() => rootMembers.reverse()),
					name: objectAndMembersToName(`${calleeName}()`, members),
					getMembers: memoize(() => members.reverse()),
					getMembersOptionals: memoize(() => membersOptionals.reverse())
				};
			}
			case "Identifier":
			case "MetaProperty":
			case "ThisExpression": {
				if ((allowedTypes & ALLOWED_MEMBER_TYPES_EXPRESSION) === 0)
					return undefined;
				const rootName = getRootName(object);
				if (!rootName) return undefined;

				const result = this.getFreeInfoFromVariable(rootName);
				if (!result) return undefined;
				const { info: rootInfo, name: resolvedRoot } = result;
				return {
					type: "expression",
					name: objectAndMembersToName(resolvedRoot, members),
					rootInfo,
					getMembers: memoize(() => members.reverse()),
					getMembersOptionals: memoize(() => membersOptionals.reverse())
				};
			}
		}
	}

	/**
	 * @param {MemberExpression} expression an expression
	 * @returns {{ name: string, rootInfo: ExportedVariableInfo, getMembers: () => string[]}} name info
	 */
	getNameForExpression(expression) {
		return this.getMemberExpressionInfo(
			expression,
			ALLOWED_MEMBER_TYPES_EXPRESSION
		);
	}

	/**
	 * @param {string} code source code
	 * @param {ParseOptions} options parsing options
	 * @returns {Program} parsed ast
	 */
	static _parse(code, options) {
		const type = options ? options.sourceType : "module";
		/** @type {AcornOptions} */
		const parserOptions = {
			...defaultParserOptions,
			allowReturnOutsideFunction: type === "script",
			...options,
			sourceType: type === "auto" ? "module" : type
		};

		/** @type {AnyNode} */
		let ast;
		let error;
		let threw = false;
		try {
			ast = /** @type {AnyNode} */ (parser.parse(code, parserOptions));
		} catch (e) {
			error = e;
			threw = true;
		}

		if (threw && type === "auto") {
			parserOptions.sourceType = "script";
			if (!("allowReturnOutsideFunction" in options)) {
				parserOptions.allowReturnOutsideFunction = true;
			}
			if (Array.isArray(parserOptions.onComment)) {
				parserOptions.onComment.length = 0;
			}
			try {
				ast = /** @type {AnyNode} */ (parser.parse(code, parserOptions));
				threw = false;
			} catch (e) {
				// we use the error from first parse try
				// so nothing to do here
			}
		}

		if (threw) {
			throw error;
		}

		return /** @type {Program} */ (ast);
	}
}

module.exports = JavascriptParser;
module.exports.ALLOWED_MEMBER_TYPES_ALL = ALLOWED_MEMBER_TYPES_ALL;
module.exports.ALLOWED_MEMBER_TYPES_EXPRESSION =
	ALLOWED_MEMBER_TYPES_EXPRESSION;
module.exports.ALLOWED_MEMBER_TYPES_CALL_EXPRESSION =
	ALLOWED_MEMBER_TYPES_CALL_EXPRESSION;
