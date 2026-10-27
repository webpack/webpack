"use strict";

const {
	EstreeView,
	Field,
	Flag,
	NodeType,
	Part,
	WebpackParser
} = require("../../../lib/javascript/syntax-parser");
const { hasSideEffects } = require("../../../lib/javascript/side-effects");

/**
 * @param {string} code an expression
 * @returns {import("estree").Expression} its ESTree object
 */
const expressionOf = (code) =>
	/** @type {import("estree").ExpressionStatement} */ (
		WebpackParser.parse(code, { ecmaVersion: "latest", ranges: true }).body[0]
	).expression;

describe("EstreeView", () => {
	it("reads ESTree objects as a SyntaxTree reads its nodes", () => {
		const view = new EstreeView();
		const call = view.add(expressionOf("a.b(`x${1}`, ...c, [, d])"));
		expect(view.type(call)).toBe(NodeType.CallExpression);
		expect(view.start(call)).toBe(0);
		expect(view.fieldCount(Field.arguments, call)).toBe(3);
		expect(view.fieldCount(Field.callee, call)).toBe(1);
		expect(view.fieldCount(Field.body, call)).toBe(0);

		const callee = view.field(0, Field.callee, call);
		expect(view.object(callee)).toBe(
			/** @type {import("estree").CallExpression} */ (view.object(call)).callee
		);
		expect(view.flag(Flag.computed, callee)).toBe(false);
		expect(view.field(1, Field.callee, call)).toBe(0);
		expect(view.name(view.field(0, Field.object, callee))).toBe("a");
		expect(view.name(callee)).toBe("");

		const template = view.field(0, Field.arguments, call);
		const one = view.field(0, Field.expressions, template);
		expect(view.value(one)).toBe(1);
		expect(view.textOf(Part.raw, one)).toBe("1");
		expect(view.textOf(Part.operator, one)).toBeNull();

		const array = view.field(2, Field.arguments, call);
		expect(view.field(0, Field.elements, array)).toBe(0);
		expect(view.type(view.field(1, Field.elements, array))).toBe(
			NodeType.Identifier
		);
	});

	it("gives a type it has no record of none", () => {
		const view = new EstreeView();
		const node = view.add(
			/** @type {import("estree").Node} */ (
				/** @type {unknown} */ ({ type: "JSXElement", range: [0, 1] })
			)
		);
		expect(view.type(node)).toBe(0);
	});

	it("forgets its ids on reset", () => {
		const view = new EstreeView();
		view.add(expressionOf("a"));
		view.reset();
		expect(view.add(expressionOf("b"))).toBe(1);
		expect(view.object(2)).toBeUndefined();
	});

	it("lets the side-effects rules read ESTree objects", () => {
		/** @type {import("../../../lib/javascript/side-effects").SideEffectsContext} */
		const context = {
			readHasSideEffects: () => false,
			readsGlobalMember: () => false,
			nameKind: () => undefined,
			isPureCall: () => false
		};
		/**
		 * @param {string} code a statement
		 * @returns {boolean} whether the rules find an effect in it
		 */
		const statementHasSideEffects = (code) => {
			const view = new EstreeView();
			return hasSideEffects(
				view,
				view.add(
					WebpackParser.parse(code, {
						ecmaVersion: "latest",
						sourceType: "module",
						ranges: true
					}).body[0]
				),
				context
			);
		};
		expect(statementHasSideEffects("var a = 1, c = [d];")).toBe(false);
		expect(statementHasSideEffects("var a = b();")).toBe(true);
		expect(statementHasSideEffects("using a = b;")).toBe(true);
		expect(statementHasSideEffects("await using a = b;")).toBe(true);
	});
});
