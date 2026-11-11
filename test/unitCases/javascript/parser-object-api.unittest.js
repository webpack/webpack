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
