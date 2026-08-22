"use strict";

const JavascriptParser = require("../lib/javascript/JavascriptParser");
const { getPathInAst } = require("../lib/util/concatenate");

/** @import { Node, Program } from "estree" */

/**
 * @param {string} source source code
 * @returns {Program} parsed ast
 */
const parse = (source) =>
	JavascriptParser._parse(source, { sourceType: "module", ranges: true }).ast;

/**
 * @param {Node} node node to search in
 * @param {(node: Node) => boolean} test predicate
 * @returns {Node} first matching node
 */
const findNode = (node, test) => {
	if (test(node)) return node;
	for (const key of Object.keys(node)) {
		const value = /** @type {EXPECTED_ANY} */ (node)[key];
		for (const child of Array.isArray(value) ? value : [value]) {
			if (
				child &&
				typeof child === "object" &&
				typeof child.type === "string"
			) {
				const found = findNode(child, test);
				if (found) return found;
			}
		}
	}
	return /** @type {EXPECTED_ANY} */ (undefined);
};

/**
 * @param {Node[] | undefined} path path
 * @returns {string[]} node types
 */
const types = (path) => /** @type {Node[]} */ (path).map((node) => node.type);

describe("getPathInAst", () => {
	it("should return an empty path for the ast itself", () => {
		const ast = parse("const value = 1;");
		expect(getPathInAst(ast, ast)).toEqual([]);
	});

	it("should return the ancestors innermost first", () => {
		const ast = parse("const value = { nested: [42] };");
		const literal = findNode(ast, (node) => node.type === "Literal");
		expect(types(getPathInAst(ast, literal))).toEqual([
			"Literal",
			"ArrayExpression",
			"Property",
			"ObjectExpression",
			"VariableDeclarator",
			"VariableDeclaration"
		]);
	});

	it("should accept a node array as the ast", () => {
		const ast = parse("const first = 1;\nconst second = 2;");
		const declarator = findNode(
			ast.body[1],
			(node) => node.type === "VariableDeclarator"
		);
		expect(types(getPathInAst(ast.body, declarator))).toEqual([
			"VariableDeclarator",
			"VariableDeclaration"
		]);
	});

	it("should tell the key and the value of a shorthand property apart", () => {
		// both identifiers share one range, so the value is only reachable by
		// continuing the scan past the key
		const ast = parse("const a = 1;\nconst o = { a };");
		const property = /** @type {EXPECTED_ANY} */ (
			findNode(ast, (node) => node.type === "Property")
		);
		const keyPath = /** @type {Node[]} */ (getPathInAst(ast, property.key));
		const valuePath = /** @type {Node[]} */ (getPathInAst(ast, property.value));
		expect(property.key).not.toBe(property.value);
		expect(keyPath[0]).toBe(property.key);
		expect(keyPath[1]).toBe(property);
		expect(valuePath[0]).toBe(property.value);
		expect(valuePath[1]).toBe(property);
	});

	it("should skip holes in a node array", () => {
		const ast = parse("const list = [];\nconst [, second] = list;");
		const identifier = findNode(
			ast.body[1],
			(node) => node.type === "Identifier" && node.name === "second"
		);
		expect(types(getPathInAst(ast, identifier))).toEqual([
			"Identifier",
			"ArrayPattern",
			"VariableDeclarator",
			"VariableDeclaration"
		]);
	});

	it("should support nodes that only expose range", () => {
		const identifier = { type: "Identifier", name: "a", range: [10, 11] };
		const statement = {
			type: "ExpressionStatement",
			expression: identifier,
			range: [10, 12]
		};
		const program = {
			type: "Program",
			body: [statement],
			range: [0, 12]
		};
		const ast = /** @type {EXPECTED_ANY} */ (program);
		expect(getPathInAst(ast, /** @type {EXPECTED_ANY} */ (identifier))).toEqual(
			[identifier, statement]
		);
	});

	it("should scan past siblings without position info", () => {
		const identifier = { type: "Identifier", name: "a", range: [4, 5] };
		const program = /** @type {EXPECTED_ANY} */ ({
			type: "Program",
			body: [{ type: "EmptyStatement" }, identifier],
			range: [0, 6]
		});
		expect(
			getPathInAst(program, /** @type {EXPECTED_ANY} */ (identifier))
		).toEqual([identifier]);
		expect(
			getPathInAst(
				program,
				/** @type {EXPECTED_ANY} */ ({ type: "Identifier", range: [9, 10] })
			)
		).toBeUndefined();
	});

	it("should ignore an own range property", () => {
		const ast = parse("const value = 1;");
		const literal = findNode(ast, (node) => node.type === "Literal");
		for (const node of /** @type {{ start: number, end: number, range?: [number, number] }[]} */ (
			/** @type {unknown} */ ([ast, ...ast.body])
		)) {
			node.range = [node.start, node.end];
		}
		expect(types(getPathInAst(ast, literal))).toEqual([
			"Literal",
			"VariableDeclarator",
			"VariableDeclaration"
		]);
	});

	it("should return undefined for a node outside the ast", () => {
		const ast = parse("const value = 1;");
		const other = findNode(
			parse("other;"),
			(node) => node.type === "Identifier"
		);
		expect(getPathInAst(ast, other)).toBeUndefined();
		expect(getPathInAst(ast.body, other)).toBeUndefined();
	});

	it("should return undefined when the ast is not a node", () => {
		const identifier = findNode(
			parse("value;"),
			(node) => node.type === "Identifier"
		);
		expect(
			getPathInAst(/** @type {EXPECTED_ANY} */ ("not a node"), identifier)
		).toBeUndefined();
	});
});
