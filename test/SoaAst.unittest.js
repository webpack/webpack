"use strict";

const {
	FLAG_OPTIONAL,
	SoaAst,
	TYPE_CALL_EXPRESSION,
	TYPE_EXPRESSION_STATEMENT,
	TYPE_IDENTIFIER,
	TYPE_MEMBER_EXPRESSION,
	TYPE_PROGRAM
} = require("../lib/javascript/SoaAst");

/**
 * Builds columns for `obj.prop(arg);` and returns the store plus ids.
 * @returns {EXPECTED_ANY} store and node ids
 */
const buildCallAst = () => {
	const source = "obj.prop(arg);";
	const ast = new SoaAst(source);
	const obj = ast.allocNode(TYPE_IDENTIFIER, 0, 3);
	const prop = ast.allocNode(TYPE_IDENTIFIER, 4, 8);
	const member = ast.allocNode(TYPE_MEMBER_EXPRESSION, 0, 8);
	ast.kid0[member] = obj;
	ast.kid1[member] = prop;
	const arg = ast.allocNode(TYPE_IDENTIFIER, 9, 12);
	const call = ast.allocNode(TYPE_CALL_EXPRESSION, 0, 13);
	ast.kid0[call] = member;
	ast.setList(call, [arg]);
	const statement = ast.allocNode(TYPE_EXPRESSION_STATEMENT, 0, 14);
	ast.kid0[statement] = call;
	const program = ast.allocNode(TYPE_PROGRAM, 0, 14);
	ast.setList(program, [statement]);
	return { ast, obj, member, call, statement, program };
};

describe("SoaAst", () => {
	it("should serve estree-shaped facades from the columns", () => {
		const { ast, program } = buildCallAst();
		const root = /** @type {EXPECTED_ANY} */ (ast.nodeAt(program));
		expect(root.type).toBe("Program");
		const statement = root.body[0];
		expect(statement.type).toBe("ExpressionStatement");
		const call = statement.expression;
		expect(call.type).toBe("CallExpression");
		expect(call.callee.type).toBe("MemberExpression");
		expect(call.callee.object.name).toBe("obj");
		expect(call.callee.property.name).toBe("prop");
		expect(call.arguments).toHaveLength(1);
		expect(call.arguments[0].name).toBe("arg");
		expect(call.start).toBe(0);
		expect(call.end).toBe(13);
		expect(call.range).toEqual([0, 13]);
	});

	it("should keep facade identity and memoization stable", () => {
		const { ast, call, statement } = buildCallAst();
		const statementFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(statement));
		expect(statementFacade.expression).toBe(ast.nodeAt(call));
		expect(statementFacade.expression).toBe(statementFacade.expression);
		const args = statementFacade.expression.arguments;
		expect(statementFacade.expression.arguments).toBe(args);
		const range = statementFacade.range;
		expect(statementFacade.range).toBe(range);
	});

	it("should accept mutation like plain estree nodes", () => {
		const { ast, call } = buildCallAst();
		const callFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(call));
		callFacade.callee = "REPLACED";
		expect(callFacade.callee).toBe("REPLACED");
		callFacade.type = "NewExpression";
		expect(callFacade.type).toBe("NewExpression");
		callFacade.range = [1, 2];
		expect(callFacade.range).toEqual([1, 2]);
	});

	it("should serve flags and null children", () => {
		const { ast, member } = buildCallAst();
		ast.flags[member] |= FLAG_OPTIONAL;
		const memberFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(member));
		expect(memberFacade.optional).toBe(true);
		expect(memberFacade.computed).toBe(false);
		expect(ast.nodeAt(0)).toBeNull();
	});

	it("should keep symbol slots invisible to enumeration and JSON", () => {
		const { ast, call } = buildCallAst();
		const callFacade = /** @type {EXPECTED_ANY} */ (ast.nodeAt(call));
		// the C0 verdict's documented trade-off: own scalars enumerate,
		// prototype-served children do not (full enumeration is the opt-in
		// defineProperties mode of a later step)
		expect(Object.keys(callFacade)).toEqual([
			"type",
			"start",
			"end",
			"optional"
		]);
		expect(JSON.stringify(callFacade)).toBe(
			'{"type":"CallExpression","start":0,"end":13,"optional":false}'
		);
		// reading a child memoizes into a symbol slot — still not enumerated
		expect(callFacade.callee.type).toBe("MemberExpression");
		expect(Object.keys(callFacade)).toEqual([
			"type",
			"start",
			"end",
			"optional"
		]);
	});

	it("should grow columns and the flat buffer beyond their initial capacity", () => {
		const ast = new SoaAst("x");
		/** @type {number[]} */
		const refs = [];
		for (let i = 0; i < 5000; i++) {
			refs.push(ast.allocNode(TYPE_IDENTIFIER, i, i + 1));
		}
		const program = ast.allocNode(TYPE_PROGRAM, 0, 5000);
		ast.setList(program, refs);
		expect(ast.count).toBe(5002);
		expect(ast.types[refs[4999]]).toBe(TYPE_IDENTIFIER);
		expect(ast.listLens[program]).toBe(5000);
		const root = /** @type {EXPECTED_ANY} */ (ast.nodeAt(program));
		expect(root.body).toHaveLength(5000);
		expect(root.body[4999].start).toBe(4999);
	});
});
