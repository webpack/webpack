"use strict";

const JavascriptParser = require("../../../lib/javascript/JavascriptParser");

/** @typedef {import("estree").ImportExpression} ImportExpression */
/** @typedef {import("estree").ImportDeclaration} ImportDeclaration */
/** @typedef {import("estree").MemberExpression} MemberExpression */

/**
 * @param {string} name a key
 * @param {string} value its value
 * @param {boolean=} quoted whether the key is a string literal
 * @returns {import("estree").Property} the property
 */
const property = (name, value, quoted) =>
	/** @type {import("estree").Property} */ ({
		type: "Property",
		computed: false,
		kind: "init",
		method: false,
		shorthand: false,
		key: quoted
			? { type: "Literal", value: name }
			: { type: "Identifier", name },
		value: { type: "Literal", value }
	});

/**
 * @param {import("estree").Property[]} properties the options' properties
 * @returns {ImportExpression} an `import()` with those options
 */
const importWith = (properties) =>
	/** @type {ImportExpression} */ ({
		type: "ImportExpression",
		source: { type: "Literal", value: "./a" },
		options: { type: "ObjectExpression", properties }
	});

/**
 * @param {import("estree").Property[]} properties the attributes
 * @returns {import("estree").ObjectExpression} the attributes object
 */
const objectOf = (properties) => ({ type: "ObjectExpression", properties });

describe("JavascriptParser object forms", () => {
	describe("getImportAttributes", () => {
		const { getImportAttributes } = JavascriptParser;

		it("should read `with` attributes of an import() object", () => {
			const node = importWith([
				/** @type {import("estree").Property} */ ({
					...property("with", ""),
					value: objectOf([property("type", "json")])
				})
			]);
			expect(getImportAttributes(node)).toEqual({ type: "json" });
		});

		it("should read legacy `assert` attributes, quoted keys and the last of a repeat", () => {
			const node = importWith([
				/** @type {import("estree").Property} */ ({
					...property("assert", "", true),
					value: objectOf([property("type", "css", true)])
				})
			]);
			const result = /** @type {Record<string, unknown>} */ (
				getImportAttributes(node)
			);
			expect(result.type).toBe("css");
			expect(result._isLegacyAssert).toBe(true);
		});

		it("should skip an import() without attributes", () => {
			expect(
				getImportAttributes(
					/** @type {ImportExpression} */ ({
						type: "ImportExpression",
						source: { type: "Literal", value: "./a" }
					})
				)
			).toBeUndefined();
			expect(
				getImportAttributes(
					importWith([
						/** @type {import("estree").Property} */ ({
							...property("with", ""),
							computed: true
						}),
						property("other", "x")
					])
				)
			).toBeUndefined();
			expect(
				getImportAttributes(
					importWith([
						/** @type {import("estree").Property} */ ({
							...property("with", ""),
							value: objectOf([])
						})
					])
				)
			).toBeUndefined();
		});

		it("should read a declaration's attributes", () => {
			const node = /** @type {ImportDeclaration} */ ({
				type: "ImportDeclaration",
				specifiers: [],
				source: { type: "Literal", value: "./a" },
				attributes: [
					{
						type: "ImportAttribute",
						key: { type: "Identifier", name: "type" },
						value: { type: "Literal", value: "json" }
					}
				]
			});
			expect(getImportAttributes(node)).toEqual({ type: "json" });
			expect(
				getImportAttributes(
					/** @type {ImportDeclaration} */ ({ ...node, attributes: [] })
				)
			).toBeUndefined();
		});
	});

	describe("extractMemberExpressionChain", () => {
		it("should read a member chain built outside a parse", () => {
			const parser = new JavascriptParser("auto");
			const base = /** @type {import("estree").Identifier} */ ({
				type: "Identifier",
				name: "a",
				range: [0, 1]
			});
			const dotted = /** @type {MemberExpression} */ ({
				type: "MemberExpression",
				computed: false,
				optional: false,
				object: base,
				property: { type: "Identifier", name: "b" },
				range: [0, 3]
			});
			const computed = /** @type {MemberExpression} */ ({
				type: "MemberExpression",
				computed: true,
				optional: true,
				object: dotted,
				property: { type: "Literal", value: "c" },
				range: [0, 9]
			});
			const result = parser.extractMemberExpressionChain(computed);
			expect(result.members).toEqual(["c", "b"]);
			expect(result.membersOptionals).toEqual([true, false]);
			expect(result.memberRanges).toEqual([
				[0, 3],
				[0, 1]
			]);
			expect(result.object).toBe(base);
		});
	});

	describe("statementPath", () => {
		it("should give an object tap the statements it is in as objects", () => {
			const parser = new JavascriptParser("auto");
			/** @type {string[][]} */
			const paths = [];
			parser.hooks.statement.tap("test", () => {
				paths.push(
					/** @type {NonNullable<typeof parser.statementPath>} */ (
						parser.statementPath
					).map((item) => item.type)
				);
			});
			parser.parse(
				"if (a) { b(); }",
				/** @type {import("../../../lib/module/Parser").ParserState} */ (
					/** @type {unknown} */ ({})
				)
			);
			expect(paths).toEqual([
				["IfStatement"],
				["IfStatement", "BlockStatement"],
				["IfStatement", "BlockStatement", "ExpressionStatement"]
			]);
		});
	});
});
