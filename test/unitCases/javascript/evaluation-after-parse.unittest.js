"use strict";

const acorn = require("acorn");
const JavascriptParser = require("../../../lib/javascript/JavascriptParser");
const {
	Field,
	lazyObjectOfSource,
	parseProgram,
	takeParsedTree
} = require("../../../lib/javascript/syntax-parser");

/** @typedef {import("../../../lib/javascript/syntax-parser")._SyntaxTree} SyntaxTree */
/** @typedef {import("../../../lib/javascript/BasicEvaluatedExpression")} BasicEvaluatedExpression */
/** @typedef {import("../../../lib/module/Parser").ParserState} ParserState */
/** @typedef {import("../../../lib/javascript/JavascriptParser").ParseOptions} ParseOptions */
/** @typedef {import("../../../lib/javascript/JavascriptParser").ParseResult} ParseResult */

const SOURCE = "use(a.b.c, `x${a}y`, f(1, [2]), a ? b : c);";

/**
 * Parses a source, keeping what `evaluateExpression` returns for each argument of `use(…)`.
 * @param {string} source the source
 * @param {JavascriptParser=} parser the parser
 * @returns {{ evaluated: BasicEvaluatedExpression[], nodes: number[] }} the evaluations, and their node ids during the parse
 */
const evaluateArguments = (source, parser = new JavascriptParser("auto")) => {
	/** @type {BasicEvaluatedExpression[]} */
	const evaluated = [];
	/** @type {number[]} */
	const nodes = [];
	parser.hooks.call
		.for("use")
		.tap({ name: "test", path: true }, (path, node) => {
			// by id, so the walk builds no object of the tree
			const count = path.fieldCount(Field.arguments, node);
			for (let i = 0; i < count; i++) {
				const result = parser.evaluateExpression(
					path.field(i, Field.arguments, node)
				);
				evaluated.push(result);
				nodes.push(result.expressionNode);
			}
			return true;
		});
	parser.parse(source, /** @type {ParserState} */ (/** @type {unknown} */ ({})));
	return { evaluated, nodes };
};

describe("BasicEvaluatedExpression after its parse", () => {
	it("should read ranges and expressions after the tree is released and reused", () => {
		const { evaluated, nodes } = evaluateArguments(SOURCE);
		// another parse reuses the released tree's columns
		evaluateArguments("other(1, 2, 3, 4, 5, 6, 7, 8, 9);");
		const expected = acorn.parseExpressionAt(SOURCE, 0, {
			ecmaVersion: "latest",
			ranges: true
		});
		const args = /** @type {import("estree").CallExpression} */ (expected)
			.arguments;
		expect(nodes.every((node) => node > 0)).toBe(true);
		expect(evaluated.map((result) => result.expressionNode)).toEqual([
			0, 0, 0, 0
		]);
		for (let i = 0; i < args.length; i++) {
			expect(evaluated[i].range).toEqual(args[i].range);
			const object = /** @type {import("estree").Node} */ (
				evaluated[i].expression
			);
			expect(object.type).toBe(args[i].type);
			expect(object.range).toEqual(args[i].range);
			// the same object each time it is read
			expect(evaluated[i].expression).toBe(object);
		}
		const template = /** @type {import("estree").TemplateLiteral} */ (
			evaluated[1].expression
		);
		expect(template.quasis.map((quasi) => quasi.value.cooked)).toEqual([
			"x",
			"y"
		]);
		const call = /** @type {import("estree").CallExpression} */ (
			evaluated[2].expression
		);
		const array = /** @type {import("estree").Node} */ (call.arguments[1]);
		expect({ type: array.type, range: array.range }).toEqual({
			type: "ArrayExpression",
			range: /** @type {import("estree").Node} */ (
				/** @type {import("estree").CallExpression} */ (args[2]).arguments[1]
			).range
		});
		// the template's parts are its quasis' nodes, read the same way
		const quasis = /** @type {BasicEvaluatedExpression[]} */ (
			evaluated[1].quasis
		);
		expect(
			/** @type {import("estree").TemplateElement} */ (quasis[0].expression)
				.value.raw
		).toBe("x");
	});

	it("should read an expression read during the parse after it", () => {
		const parser = new JavascriptParser("auto");
		/** @type {import("estree").Node[]} */
		const read = [];
		parser.hooks.call.for("use").tap("test", (expression) => {
			const result = parser.evaluateExpression(
				/** @type {import("estree").Expression} */ (expression.arguments[0])
			);
			read.push(/** @type {import("estree").Node} */ (result.expression));
			return true;
		});
		parser.parse(
			"use(a.b);",
			/** @type {ParserState} */ (/** @type {unknown} */ ({}))
		);
		evaluateArguments("other(1, 2, 3);");
		expect(read[0].type).toBe("MemberExpression");
		expect(
			/** @type {import("estree").MemberExpression} */ (read[0]).property
		).toMatchObject({ type: "Identifier", name: "b" });
	});

	it("should copy the columns for a tree its text cannot rebuild", () => {
		/**
		 * Parses with acorn, so the walk reads a preparsed program.
		 * @param {string} code source code
		 * @param {ParseOptions} options parse options
		 * @returns {ParseResult} parse result
		 */
		const parse = (code, options) => ({
			ast: /** @type {ParseResult["ast"]} */ (
				acorn.parse(code, {
					sourceType: options.sourceType,
					ecmaVersion: "latest",
					ranges: true
				})
			),
			comments: []
		});
		const parser = new JavascriptParser("auto", { parse });
		const { evaluated } = evaluateArguments(SOURCE, parser);
		evaluateArguments("other(1, 2, 3, 4, 5, 6, 7, 8, 9);");
		// the copied columns still hold the node
		expect(evaluated[0].expressionNode).toBeGreaterThan(0);
		expect(evaluated[0].range).toEqual([4, 9]);
		expect(
			/** @type {import("estree").Node} */ (evaluated[0].expression).type
		).toBe("MemberExpression");
	});

	it("should pin a node a tree adds after the parse its rebuild makes", () => {
		/**
		 * Parses `a;` into a new tree.
		 * @returns {{ tree: SyntaxTree, statement: number }} the tree and its statement
		 */
		const parse = () => {
			const program = /** @type {number} */ (
				/** @type {unknown} */ (parseProgram("a;", 0, { sourceType: "module" }))
			);
			const tree = /** @type {SyntaxTree} */ (takeParsedTree());
			return { tree, statement: tree.field(0, Field.body, program) };
		};
		let rebuilds = 0;
		/**
		 * @returns {SyntaxTree} the tree the same text parses into
		 */
		const rebuild = () => {
			rebuilds++;
			return parse().tree;
		};
		const appended = parse();
		appended.tree.setRebuild(rebuild);
		const added = appended.tree.addNode0(
			appended.tree.type(appended.statement),
			0,
			2,
			0
		);
		expect(appended.tree.evaluationSource(added).pinned).toBe(true);
		appended.tree.release();

		const { tree, statement } = parse();
		tree.setRebuild(rebuild);
		const source = tree.evaluationSource(statement);
		expect(source.pinned).toBe(false);
		tree.release();
		expect(source.released).toBe(true);
		parse().tree.release();
		const first = /** @type {import("estree").Node} */ (
			lazyObjectOfSource(source, statement)
		);
		// the rebuilt tree serves every later read
		expect(lazyObjectOfSource(source, statement)).toBe(first);
		expect(rebuilds).toBe(1);
		expect(first.type).toBe("ExpressionStatement");
		expect(first.range).toEqual([0, 2]);
	});
});
