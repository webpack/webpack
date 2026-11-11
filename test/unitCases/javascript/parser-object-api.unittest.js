"use strict";

const JavascriptParser = require("../../../lib/javascript/JavascriptParser");

/** @typedef {import("estree").Node} Node */
/** @typedef {import("estree").Program} Program */
/** @typedef {import("../../../lib/module/Parser").ParserState} ParserState */

const SOURCE = `"use asm";
label: if (a) b(); else c();
switch (a) { case 1: var s = 1; }
try { t(); } catch ({ message }) { m(); }
var { x } = y;
let z;
({ x } = y);
a + b;
(class C {});
a?.b;
import("./m");
f().g;
f().g.h;
function fd() {}
`;

/**
 * Parses SOURCE, calling the parser's object-taking methods on its nodes.
 * @param {(parser: JavascriptParser, body: Program["body"]) => void} callback called with the program's statements
 * @returns {void}
 */
const withProgram = (callback) => {
	const parser = new JavascriptParser("auto");
	parser.hooks.program.tap("test", (ast) => {
		callback(parser, /** @type {Program} */ (ast).body);
	});
	parser.parse(
		SOURCE,
		/** @type {ParserState} */ (/** @type {unknown} */ ({ source: SOURCE }))
	);
};

/**
 * @param {Program["body"][number]} node a statement
 * @returns {Node} the expression it holds
 */
const expressionOf = (node) =>
	/** @type {import("estree").ExpressionStatement} */ (node).expression;

describe("JavascriptParser object API", () => {
	it("should map the nodes a plugin hands it to the tree", () => {
		/** @type {string[]} */
		const declared = [];
		withProgram((parser, body) => {
			const [, labeled, switchStatement, tryStatement, declaration, letDeclaration] =
				body;
			parser.detectMode(body);
			expect(parser.scope.isAsmJs).toBe(true);
			const ifStatement = /** @type {import("estree").LabeledStatement} */ (
				labeled
			).body;
			parser.walkLabeledStatement(
				/** @type {import("estree").LabeledStatement} */ (labeled)
			);
			parser.walkIfStatement(
				/** @type {import("estree").IfStatement} */ (ifStatement)
			);
			const { cases } = /** @type {import("estree").SwitchStatement} */ (
				switchStatement
			);
			parser.preWalkSwitchCases(cases);
			parser.walkSwitchCases(cases);
			parser.preWalkCatchClause(
				/** @type {import("estree").CatchClause} */ (
					/** @type {import("estree").TryStatement} */ (tryStatement).handler
				)
			);
			parser.blockPreWalkStatement(
				/** @type {import("estree").Statement} */ (letDeclaration)
			);
			parser.preWalkVariableDeclarator(
				/** @type {import("estree").VariableDeclaration} */ (declaration)
					.declarations[0]
			);
			parser.enterDeclaration(
				/** @type {import("estree").Declaration} */ (declaration),
				(name, identifier) => {
					expect(identifier.type).toBe("Identifier");
					declared.push(name);
				}
			);
			parser.preWalkAssignmentExpression(
				/** @type {import("estree").AssignmentExpression} */ (
					expressionOf(body[6])
				)
			);
			parser.walkLeftRightExpression(
				/** @type {import("estree").BinaryExpression} */ (expressionOf(body[7]))
			);
			parser.walkClassExpression(
				/** @type {import("estree").ClassExpression} */ (expressionOf(body[8]))
			);
			parser.walkChainExpression(
				/** @type {import("estree").ChainExpression} */ (expressionOf(body[9]))
			);
			parser.walkImportExpression(
				/** @type {import("estree").ImportExpression} */ (
					expressionOf(body[10])
				)
			);
			const member = /** @type {import("estree").MemberExpression} */ (
				expressionOf(body[11])
			);
			parser.walkMemberExpression(member);
			parser.walkCallExpression(
				/** @type {import("estree").CallExpression} */ (member.object)
			);
			const info = parser.getMemberExpressionInfo(
				/** @type {import("estree").MemberExpression} */ (
					expressionOf(body[12])
				),
				JavascriptParser.ALLOWED_MEMBER_TYPES_ALL
			);
			expect(info && info.type).toBe("call");
			expect(
				info && info.type === "call" ? info.call.type : undefined
			).toBe("CallExpression");
			parser.enterDeclaration(
				/** @type {import("estree").Declaration} */ (body[13]),
				(name) => declared.push(name)
			);
			// an outside caller hands the parser's own `ids` tap an object
			const literal = /** @type {import("estree").Literal} */ (
				/** @type {import("estree").SwitchCase} */ (cases[0]).test
			);
			const evaluated = parser.hooks.evaluate.for("Literal").call(literal);
			expect(evaluated && evaluated.asCompileTimeValue()).toBe(1);
			// an assignment to a target no parser writes still walks its sides
			parser.walkExpression(
				/** @type {import("estree").AssignmentExpression} */ (
					/** @type {unknown} */ ({
					type: "AssignmentExpression",
					operator: "=",
					left: literal,
					right: literal,
					range: literal.range,
					start: literal.range && literal.range[0],
					end: literal.range && literal.range[1]
				})
				)
			);
		});
		expect(declared).toEqual(["x", "fd"]);
	});

	it("should walk and read the statement and pattern objects a plugin hands it", () => {
		const code = `"use strict";
function t() { return 1; foo(); function g() {} }
f().g;
o.a["b"].c;
o[k].c;
var { p, q } = r;
`;
		const parser = new JavascriptParser("script");
		parser.hooks.terminate.tap("test", () => true);
		/** @type {string[]} */
		const unused = [];
		parser.hooks.unusedStatement.tap("test", (statement) => {
			unused.push(statement.type);
			return true;
		});
		/** @type {boolean[]} */
		const statementLevel = [];
		parser.hooks.statement.tap("test", (statement) => {
			if (statement.type !== "ExpressionStatement") return;
			const plain = /** @type {import("estree").Identifier} */ ({
				type: "Identifier",
				name: "plain",
				start: 0,
				end: 1
			});
			statementLevel.push(
				parser.isStatementLevelExpression(statement.expression),
				parser.isStatementLevelExpression(plain)
			);
		});
		parser.hooks.program.tap("test", (ast) => {
			const body = /** @type {Program} */ (ast).body;
			const [directive, fn, call, member, computed, declaration] = body;
			parser.preWalkStatements(body);
			parser.blockPreWalkStatements(body);
			parser.scope.isStrict = false;
			parser.detectMode(body);
			expect(parser.scope.isStrict).toBe(true);
			expect(parser.getDirective(directive)).toBe("use strict");
			expect(parser.getDirective(fn)).toBeUndefined();
			// a return ends a function's scope, past which only declarations count
			const { topLevelScope } = parser.scope;
			parser.scope.topLevelScope = false;
			parser.walkStatements(
				/** @type {import("estree").FunctionDeclaration} */ (fn).body.body
			);
			parser.scope.topLevelScope = topLevelScope;
			parser.scope.terminated = undefined;
			expect(unused).toEqual(["ExpressionStatement"]);
			parser.walkExpressions([
				/** @type {import("estree").Expression} */ (expressionOf(call)),
				null
			]);
			const root = parser.getMemberExpressionRoot(
				/** @type {import("estree").MemberExpression} */ (expressionOf(member))
			);
			expect(/** @type {import("estree").Identifier} */ (root).name).toBe("o");
			expect(
				parser.getMemberExpressionRoot(
					/** @type {import("estree").MemberExpression} */ (
						expressionOf(computed)
					)
				).type
			).toBe("MemberExpression");
			const info =
				/** @type {{ type: string, getCalleeMembers: () => string[], call: import("estree").CallExpression }} */ (
					parser.getMemberExpressionInfo(
						/** @type {import("estree").MemberExpression} */ (
							expressionOf(call)
						),
						3
					)
				);
			expect(info.type).toBe("call");
			expect(info.getCalleeMembers()).toEqual([]);
			expect(info.call.type).toBe("CallExpression");
			const pattern = /** @type {import("estree").VariableDeclaration} */ (
				declaration
			).declarations[0].id;
			/** @type {string[]} */
			const names = [];
			parser.enterPatterns(["n", "", pattern], (name) => {
				names.push(name);
			});
			parser.enterPattern(
				/** @type {import("estree").Pattern} */ (
					/** @type {unknown} */ (null)
				),
				() => {
					names.push("none");
				}
			);
			expect(names).toEqual(["n", "p", "q"]);
		});
		parser.parse(
			code,
			/** @type {ParserState} */ (/** @type {unknown} */ ({ source: code }))
		);
		// each expression statement, the directive included: its expression, then the plain object
		expect(statementLevel).toEqual([
			true,
			false,
			true,
			false,
			true,
			false,
			true,
			false
		]);
	});

	it("should evaluate an object outside a parse in a tree of its own", () => {
		const parser = new JavascriptParser("module");
		const result = parser.evaluateExpression(
			/** @type {import("estree").Literal} */ ({
				type: "Literal",
				value: 1,
				raw: "1",
				start: 0,
				end: 1
			})
		);
		expect(result.isNumber()).toBe(true);
		expect(result.number).toBe(1);
	});

	it("should run the object taps and helpers a plugin outside webpack calls", () => {
		const code = "class K { m() {} }\no.a;\nnew RegExp();\nnull?.b;\n";
		const parser = new JavascriptParser("script");
		/** @type {string[]} */
		const elements = [];
		parser.hooks.classBodyElement.tap("test", (element) => {
			elements.push(element.type);
			return true;
		});
		parser.hooks.program.tap("test", (ast) => {
			const body = /** @type {Program} */ (ast).body;
			const member = /** @type {import("estree").MemberExpression} */ (
				expressionOf(body[1])
			);
			/** @type {string[]} */
			const fallbacks = [];
			expect(
				parser.callHooksForExpressionWithFallback(
					parser.hooks.expression,
					member,
					(name) => {
						fallbacks.push(name);
						return true;
					},
					undefined,
					member
				)
			).toBe(true);
			expect(fallbacks).toEqual(["o.a"]);
			expect(
				parser.callHooksForName(parser.hooks.expression, "untapped", member)
			).toBeUndefined();
			const tag = Symbol("tag");
			parser.tagVariable("tagged", tag, {});
			const nameInfo =
				/** @type {{ name: string }} */
				(parser.getNameInfoFromVariable("tagged"));
			expect(nameInfo.name).toBe("tagged");
			const [, , regExp, optional] =
				/** @type {import("estree").Expression[]} */ (body.map(expressionOf));
			expect(parser.evaluateExpression(regExp).isRegExp()).toBe(true);
			expect(parser.evaluateExpression(optional).asNullish()).toBe(true);
		});
		parser.parse(
			code,
			/** @type {ParserState} */ (/** @type {unknown} */ ({ source: code }))
		);
		expect(elements).toEqual(["MethodDefinition"]);
		expect(() =>
			parser.parseString(
				/** @type {import("estree").Expression} */ ({
					type: "Identifier",
					name: "x"
				})
			)
		).toThrow("Identifier is not supported as parameter for require");
		expect(() =>
			parser.parse(
				/** @type {string} */ (/** @type {unknown} */ (null)),
				/** @type {ParserState} */ (/** @type {unknown} */ ({}))
			)
		).toThrow("source must not be null");
	});

	it("should read a directive and a member root from objects outside a parse", () => {
		const parser = new JavascriptParser("script");
		/**
		 * @param {string} raw the literal's source
		 * @param {[number, number]} statementRange the statement's range
		 * @returns {import("estree").ExpressionStatement} a statement no parser made
		 */
		const statement = (raw, statementRange) => ({
			type: "ExpressionStatement",
			range: statementRange,
			expression: {
				type: "Literal",
				value: "use strict",
				raw,
				range: [1, 13]
			}
		});
		expect(parser.getDirective(statement("'use strict'", [1, 14]))).toBe(
			"use strict"
		);
		// a parenthesized string starts after the statement does
		expect(
			parser.getDirective(statement("'use strict'", [0, 15]))
		).toBeUndefined();
		const unquoted = statement("'use strict'", [1, 14]);
		delete (/** @type {import("estree").SimpleLiteral} */ (unquoted.expression).raw);
		expect(parser.getDirective(unquoted)).toBe("use strict");
		expect(
			parser.getDirective({
				type: "ExpressionStatement",
				expression: { type: "Identifier", name: "x" }
			})
		).toBeUndefined();
		const member = /** @type {import("estree").MemberExpression} */ ({
			type: "MemberExpression",
			computed: false,
			optional: false,
			object: { type: "ThisExpression" },
			property: { type: "PrivateIdentifier", name: "x" }
		});
		expect(parser.getMemberExpressionRoot(member)).toBe(member);
	});

	it("should push a view node's single and listed children", () => {
		const { EstreeView } = require("../../../lib/javascript/syntax-parser");

		const view = new EstreeView();
		const node = view.add(
			/** @type {import("estree").Node} */ ({
				type: "ExpressionStatement",
				expression: { type: "Identifier", name: "x" }
			})
		);
		/** @type {number[]} */
		const children = [];
		view.pushChildren(node, children);
		expect(children).toHaveLength(1);
		expect(
			/** @type {import("estree").Identifier} */ (view.object(children[0])).name
		).toBe("x");
	});

	it("should skip a node type the tree has no layout for", () => {
		const parser = new JavascriptParser("module");
		const code = "a;";
		/** @type {import("../../../lib/javascript/JavascriptParser").StatementPathItem[]} */
		const statements = [];
		parser.hooks.statement.tap("test", (statement) => {
			statements.push(statement);
		});
		parser.parse(
			/** @type {import("../../../lib/module/Parser").PreparsedAst} */ (
				/** @type {unknown} */ ({
					type: "Program",
					sourceType: "module",
					start: 0,
					end: 2,
					body: [
						{
							type: "ExpressionStatement",
							start: 0,
							end: 2,
							expression: { type: "JSXElement", start: 0, end: 1 }
						}
					],
					comments: []
				})
			),
			/** @type {ParserState} */ (/** @type {unknown} */ ({ source: code }))
		);
		expect(statements).toHaveLength(1);
	});

	it("should reject a source that is not an expression", () => {
		const parser = new JavascriptParser("module");
		expect(() => parser.evaluate("1); (2")).toThrow(
			"evaluate: Source is not a expression"
		);
	});

	it("should reject a node of an unknown type outside a parse", () => {
		const parser = new JavascriptParser("module");
		expect(() =>
			parser.evaluateExpression(
				/** @type {import("estree").Expression} */ (
					/** @type {unknown} */ ({ type: "Bogus", start: 0, end: 1 })
				)
			)
		).toThrow("Unknown node type Bogus");
	});
});
