"use strict";

const BasicEvaluatedExpression = require("../lib/javascript/BasicEvaluatedExpression");

describe("BasicEvaluatedExpression", () => {
	it("should start unknown with side effects and no facts", () => {
		const e = new BasicEvaluatedExpression();
		expect(e.isUnknown()).toBe(true);
		expect(e.couldHaveSideEffects()).toBe(true);
		expect(e.isTruthy()).toBe(false);
		expect(e.isFalsy()).toBe(false);
		expect(e.isNullish()).toBeUndefined();
		expect(e.isPrimitiveType()).toBeUndefined();
		expect(e.isCompileTimeValue()).toBe(false);
		expect(e.asBool()).toBeUndefined();
		expect(e.asString()).toBeUndefined();
		expect(e.asNullish()).toBeUndefined();
	});

	it("should hold scalar values and reset them on type changes", () => {
		const e = new BasicEvaluatedExpression().setString("hi");
		expect(e.isString()).toBe(true);
		expect(e.string).toBe("hi");
		expect(e.number).toBeUndefined();
		expect(e.asString()).toBe("hi");
		expect(e.asBool()).toBe(true);
		expect(e.asCompileTimeValue()).toBe("hi");

		e.setNumber(0);
		expect(e.isNumber()).toBe(true);
		expect(e.isCompileTimeValue()).toBe(true);
		expect(e.number).toBe(0);
		expect(e.string).toBeUndefined();
		expect(e.asBool()).toBe(false);
		expect(e.asString()).toBe("0");
		expect(e.asCompileTimeValue()).toBe(0);

		e.setBigInt(BigInt(0));
		expect(e.isBigInt()).toBe(true);
		expect(e.bigint).toBe(BigInt(0));
		expect(e.asBool()).toBe(false);
		expect(e.asString()).toBe("0");
		expect(e.asCompileTimeValue()).toBe(BigInt(0));

		e.setBoolean(true);
		expect(e.isBoolean()).toBe(true);
		expect(e.bool).toBe(true);
		expect(e.asBool()).toBe(true);
		expect(e.asString()).toBe("true");
		expect(e.asNullish()).toBe(false);
		expect(e.asCompileTimeValue()).toBe(true);

		const regExp = /x/g;
		e.setRegExp(regExp);
		expect(e.isRegExp()).toBe(true);
		expect(e.regExp).toBe(regExp);
		expect(e.asBool()).toBe(true);
		expect(e.asString()).toBe("/x/g");
		expect(e.isPrimitiveType()).toBe(false);
		expect(e.asCompileTimeValue()).toBe(regExp);
	});

	it("should represent null and undefined", () => {
		const e = new BasicEvaluatedExpression().setNull();
		expect(e.isNull()).toBe(true);
		expect(e.asBool()).toBe(false);
		expect(e.asString()).toBe("null");
		expect(e.asNullish()).toBe(true);
		expect(e.asCompileTimeValue()).toBeNull();

		e.setUndefined();
		expect(e.isUndefined()).toBe(true);
		expect(e.asBool()).toBe(false);
		expect(e.asString()).toBe("undefined");
		expect(e.asNullish()).toBe(true);
		expect(e.asCompileTimeValue()).toBeUndefined();
	});

	it("should hold identifiers with member getters", () => {
		const getMembers = () => ["a", "b"];
		const getMembersOptionals = () => [false, true];
		const getMemberRanges = () => [];
		const e = new BasicEvaluatedExpression().setIdentifier(
			"foo",
			"root",
			getMembers,
			getMembersOptionals,
			getMemberRanges
		);
		expect(e.isIdentifier()).toBe(true);
		expect(e.identifier).toBe("foo");
		expect(e.rootInfo).toBe("root");
		expect(e.getMembers).toBe(getMembers);
		expect(e.getMembersOptionals).toBe(getMembersOptionals);
		expect(e.getMemberRanges).toBe(getMemberRanges);
		expect(e.couldHaveSideEffects()).toBe(true);
		expect(e.string).toBeUndefined();
		expect(() => e.asCompileTimeValue()).toThrow(
			/must only be called for compile-time values/
		);
	});

	it("should hold conditional options and add more", () => {
		const a = new BasicEvaluatedExpression().setString("a");
		const b = new BasicEvaluatedExpression().setString("b");
		const e = new BasicEvaluatedExpression().setOptions([a]);
		expect(e.isConditional()).toBe(true);
		expect(e.options).toEqual([a]);
		e.addOptions([b]);
		expect(e.options).toEqual([a, b]);

		const fresh = new BasicEvaluatedExpression();
		fresh.addOptions([a]);
		expect(fresh.isConditional()).toBe(true);
		expect(fresh.options).toEqual([a]);
	});

	it("should hold array items and const arrays", () => {
		const item = new BasicEvaluatedExpression().setNumber(1);
		const e = new BasicEvaluatedExpression().setItems([item]);
		expect(e.isArray()).toBe(true);
		expect(e.items).toEqual([item]);
		expect(e.couldHaveSideEffects()).toBe(false);
		expect(e.asBool()).toBe(true);
		expect(e.asString()).toBe("1");

		e.setArray(["x", "y"]);
		expect(e.isConstArray()).toBe(true);
		expect(e.array).toEqual(["x", "y"]);
		// expression-valued fields are plain data properties and persist
		expect(e.items).toEqual([item]);
		expect(e.asBool()).toBe(true);
		expect(e.asString()).toBe("x,y");
		expect(e.asCompileTimeValue()).toEqual(["x", "y"]);
	});

	it("should hold template strings with kind", () => {
		const q1 = new BasicEvaluatedExpression().setString("a");
		const q2 = new BasicEvaluatedExpression().setString("b");
		const e = new BasicEvaluatedExpression().setTemplateString(
			[q1, q2],
			[q1, q2],
			"cooked"
		);
		expect(e.isTemplateString()).toBe(true);
		expect(e.quasis).toEqual([q1, q2]);
		expect(e.parts).toEqual([q1, q2]);
		expect(e.templateStringKind).toBe("cooked");
		expect(e.asString()).toBe("ab");
		expect(e.asBool()).toBe(true);
		expect(e.isPrimitiveType()).toBe(true);
		expect(e.couldHaveSideEffects()).toBe(false);
	});

	it("should hold wrapped expressions", () => {
		const prefix = new BasicEvaluatedExpression().setString("pre");
		const postfix = new BasicEvaluatedExpression().setString("post");
		const inner = [new BasicEvaluatedExpression()];
		const e = new BasicEvaluatedExpression().setWrapped(prefix, postfix, inner);
		expect(e.isWrapped()).toBe(true);
		expect(e.prefix).toBe(prefix);
		expect(e.postfix).toBe(postfix);
		expect(e.wrappedInnerExpressions).toBe(inner);
		expect(e.asBool()).toBe(true);
		expect(e.isPrimitiveType()).toBe(true);

		const unknownWrap = new BasicEvaluatedExpression().setWrapped(
			null,
			null,
			undefined
		);
		expect(unknownWrap.prefix).toBeNull();
		expect(unknownWrap.postfix).toBeNull();
		expect(unknownWrap.asBool()).toBeUndefined();
	});

	it("should track truthy/falsy/nullish facts", () => {
		const e = new BasicEvaluatedExpression();
		e.setTruthy();
		expect(e.isTruthy()).toBe(true);
		expect(e.isFalsy()).toBe(false);
		expect(e.isNullish()).toBe(false);
		expect(e.asBool()).toBe(true);
		expect(e.asNullish()).toBe(false);

		e.setFalsy();
		expect(e.isTruthy()).toBe(false);
		expect(e.isFalsy()).toBe(true);
		expect(e.asBool()).toBe(false);

		e.setNullish(true);
		expect(e.isNullish()).toBe(true);
		expect(e.isFalsy()).toBe(true);
		expect(e.asNullish()).toBe(true);

		e.nullish = undefined;
		expect(e.isNullish()).toBeUndefined();
		e.setNullish(false);
		expect(e.isNullish()).toBe(false);
	});

	it("should keep range, expression and explicit side effects", () => {
		const e = new BasicEvaluatedExpression();
		e.setRange([1, 2]);
		expect(e.range).toEqual([1, 2]);
		const node = { type: "Identifier", name: "x" };
		e.setExpression(node);
		expect(e.expression).toBe(node);
		e.setSideEffects(false);
		expect(e.couldHaveSideEffects()).toBe(false);
		e.setSideEffects();
		expect(e.couldHaveSideEffects()).toBe(true);
	});

	it("should accept direct field assignments through the accessors", () => {
		const e = new BasicEvaluatedExpression();
		e.type = 3; // TypeString
		e.string = "direct";
		expect(e.isString()).toBe(true);
		expect(e.string).toBe("direct");
		e.truthy = true;
		expect(e.truthy).toBe(true);
		e.truthy = false;
		e.falsy = true;
		expect(e.falsy).toBe(true);
		e.falsy = false;
		e.sideEffects = false;
		expect(e.sideEffects).toBe(false);
	});

	it("should validate regexp flags statically", () => {
		// cspell:ignore gimy gimys
		const isValid = BasicEvaluatedExpression.isValidRegExpFlags;
		expect(isValid("")).toBe(true);
		expect(isValid("g")).toBe(true);
		expect(isValid("gimy")).toBe(true);
		expect(isValid("gg")).toBe(false);
		expect(isValid("q")).toBe(false);
		expect(isValid("gimys")).toBe(false);
	});
});
