function donotcallme() {
	expect("asi unsafe call happened").toBe(false);
}

it("should define FALSE", function() {
	expect(FALSE).toBe(false);
	expect(typeof FALSE).toBe("boolean");
	var x = require(FALSE ? "fail" : "./dir/a");
	var y = FALSE ? require("fail") : require("./dir/a");
});
it("should define TRUE", function() {
	expect(TRUE).toBe(true);
	expect(typeof TRUE).toBe("boolean");
	var x = require(TRUE ? "./dir/a" : "fail");
	var y = TRUE ? require("./dir/a") : require("fail");
});
it("should define CODE", function() {
	expect(CODE).toBe(3);
	expect(typeof CODE).toBe("number");
	if (CODE !== 3) require("fail");
	if (typeof CODE !== "number") require("fail");
});
it("should define FUNCTION", function() {
	expect(FUNCTION(5)).toBe(6);
	expect(typeof FUNCTION).toBe("function");
	if (typeof FUNCTION !== "function") require("fail");
});
it("should define NULL", function() {
	expect(NULL).toBeNull();
	if (NULL) require("fail");
	if (NULL !== null) require("fail");
	if (typeof NULL !== "object") require("fail");
});
it("should define UNDEFINED", function() {
	expect(typeof UNDEFINED).toBe("undefined");
	if (typeof UNDEFINED !== "undefined") require("fail");
});
it("should define NUMBER", function() {
	expect(NUMBER).toBe(100.05);
	expect(typeof NUMBER).toBe("number");
	if (NUMBER !== 100.05) require("fail");
	if (typeof NUMBER !== "number") require("fail");
});
it("should define ZERO", function() {
	expect(ZERO).toBe(0);
	expect(typeof ZERO).toBe("number");
	if (ZERO !== 0) require("fail");
	if (typeof ZERO !== "number") require("fail");
});
it("should define ONE", function() {
	expect(ONE).toBe(1);
	expect(typeof ONE).toBe("number");
	expect(42 / ONE).toBe(42);
	if (ONE !== 1) require("fail");
	if (typeof ONE !== "number") require("fail");
});
it("should define BIGINT", function() {
	expect(BIGINT).toBe(9007199254740993n);
	expect(typeof BIGINT).toBe("bigint");
});
it("should define ZERO_BIGINT", function() {
	expect(ZERO_BIGINT).toBe(0n);
	expect(typeof BIGINT).toBe("bigint");
});
it("should define POSITIVE_ZERO", function() {
	expect(POSITIVE_ZERO).toBe(+0);
	expect(POSITIVE_ZERO).toBe(0);
	expect(typeof POSITIVE_ZERO).toBe("number");
	expect(Object.is(POSITIVE_ZERO, 0)).toBe(true);
	expect(Object.is(POSITIVE_ZERO, +0)).toBe(true);
	expect(Object.is(POSITIVE_ZERO, -0)).toBe(false);
	if (POSITIVE_ZERO) require("fail");
	if (typeof POSITIVE_ZERO !== "number") require("fail");
	if (POSITIVE_ZERO !== +0) require("fail");
	if (POSITIVE_ZERO != +0) require("fail");
	if (POSITIVE_ZERO !== 0) require("fail");
	if (POSITIVE_ZERO != 0) require("fail");
});
it("should define NEGATIVE_ZER0", function() {
	expect(NEGATIVE_ZER0).toBe(-0);
	expect(typeof NEGATIVE_ZER0).toBe("number");
	expect(Object.is(NEGATIVE_ZER0, 0)).toBe(false);
	expect(Object.is(NEGATIVE_ZER0, +0)).toBe(false);
	expect(Object.is(NEGATIVE_ZER0, -0)).toBe(true);
	if (NEGATIVE_ZER0) require("fail");
	if (typeof NEGATIVE_ZER0 !== "number") require("fail");
	if (NEGATIVE_ZER0 !== +0) require("fail");
	if (NEGATIVE_ZER0 != +0) require("fail");
	if (NEGATIVE_ZER0 !== 0) require("fail");
	if (NEGATIVE_ZER0 != 0) require("fail");
});
it("should define NEGATIVE_NUMBER", function() {
	expect(NEGATIVE_NUMBER).toBe(-100.25);
	expect(typeof NEGATIVE_NUMBER).toBe("number");
	expect(100.25 / NEGATIVE_NUMBER).toBe(-1);
	if (!NEGATIVE_NUMBER) require("fail");
	if (typeof NEGATIVE_NUMBER !== "number") require("fail");
});
it("should define POSITIVE_NUMBER", function() {
	expect(POSITIVE_NUMBER).toBe(+100.25);
	expect(typeof POSITIVE_NUMBER).toBe("number");
	expect(POSITIVE_NUMBER / 100.25).toBe(1);
	if (!POSITIVE_NUMBER) require("fail");
	if (typeof POSITIVE_NUMBER !== "number") require("fail");
});
it("should define STRING", function() {
	expect(STRING).toBe("string");
	expect(typeof STRING).toBe("string");
	if (!STRING) require("fail");
	if (typeof STRING !== "string") require("fail");
	if (STRING === "") require("fail");
	if (STRING == "") require("fail");
});
it("should define EMPTY_STRING", function() {
	expect(EMPTY_STRING).toBe("");
	expect(typeof EMPTY_STRING).toBe("string");
	if (EMPTY_STRING) require("fail");
	if (typeof EMPTY_STRING !== "string") require("fail");
	if (EMPTY_STRING !== "") require("fail");
	if (EMPTY_STRING != "") require("fail");
});
it("should define REGEXP", function() {
	expect(REGEXP.toString()).toBe("/abc/i");
	expect(typeof REGEXP).toBe("object");
	if (typeof REGEXP !== "object") require("fail");
});
it("should define OBJECT", function() {
	var o = OBJECT;
	expect(o.SUB.FUNCTION(10)).toBe(11);
});
it("should define OBJECT.SUB.CODE", function() {
	(donotcallme)
	OBJECT;
	(donotcallme)
	OBJECT.SUB;
	expect(typeof OBJECT.SUB.CODE).toBe("number");
	expect(OBJECT.SUB.CODE).toBe(3);
	if (OBJECT.SUB.CODE !== 3) require("fail");
	if (typeof OBJECT.SUB.CODE !== "number") require("fail");

	(function(sub) {
		// should not crash
		expect(sub.CODE).toBe(3);
	})(OBJECT.SUB);
});
it("should define OBJECT.SUB.STRING", function() {
	expect(typeof OBJECT.SUB.STRING).toBe("string");
	expect(OBJECT.SUB.STRING).toBe("string");
	if (OBJECT.SUB.STRING !== "string") require("fail");
	if (typeof OBJECT.SUB.STRING !== "string") require("fail");

	(function(sub) {
		// should not crash
		expect(sub.STRING).toBe("string");
	})(OBJECT.SUB);
});
it("should define ARRAY", function() {
	(donotcallme)
	ARRAY;
	expect(Array.isArray(ARRAY)).toBeTruthy();
	expect(ARRAY).toHaveLength(2);
});
it("should define ARRAY[0]", function() {
	expect(ARRAY[0]).toBe(2);
});
it("should define ARRAY[1][0]", function() {
	expect(Array.isArray(ARRAY[1])).toBeTruthy();
	expect(ARRAY[1]).toHaveLength(1);
	expect(ARRAY[1][0]).toBe("six");
});
it("should define process.env.DEFINED_NESTED_KEY", function() {
	expect(process.env.DEFINED_NESTED_KEY).toBe(5);
	expect(typeof process.env.DEFINED_NESTED_KEY).toBe("number");
	if (process.env.DEFINED_NESTED_KEY !== 5) require("fail");
	if (typeof process.env.DEFINED_NESTED_KEY !== "number") require("fail");

	var x = process.env.DEFINED_NESTED_KEY;
	expect(x).toBe(5);

	var indirect = process.env;
	expect(indirect.DEFINED_NESTED_KEY).toBe(5);

	(function(env) {
		expect(env.DEFINED_NESTED_KEY).toBe(5);
		expect(typeof env.DEFINED_NESTED_KEY).toBe("number");
		if (env.DEFINED_NESTED_KEY !== 5) require("fail");
		if (typeof env.DEFINED_NESTED_KEY !== "number") require("fail");

		var x = env.DEFINED_NESTED_KEY;
		expect(x).toBe(5);
	})(process.env);
});
it("should define process.env.DEFINED_NESTED_KEY_STRING", function() {
	if (process.env.DEFINED_NESTED_KEY_STRING !== "string") require("fail");
});
it("should assign to process.env", function() {
	process.env.TEST = "test";
	expect(process.env.TEST).toBe("test");
});
it("should not have brackets on start", function() {
	function f() {
		throw new Error("should not be called");
	}
	f; // <- no semicolon here
	OBJECT;
});

it("should not explode on recursive typeof calls", function() {
	expect(typeof wurst).toEqual("undefined"); // <- is recursively defined in config
});

it("should not explode on recursive statements", function() {
	expect(function() {
		wurst; // <- is recursively defined in config
	}).toThrowError("suppe is not defined");
});

it("should evaluate composed expressions (issue 5100)", function() {
	if (!module.hot && process.env.DEFINED_NESTED_KEY_STRING === "string") {
		// ok
	} else {
		require("fail");
	}
});

it("should follow renamings in var (issue 5215)", function() {
	var _process$env = process.env,
		TEST = _process$env.TEST,
		DEFINED_NESTED_KEY = _process$env.DEFINED_NESTED_KEY;
	expect(TEST).toBe("test");
	expect(DEFINED_NESTED_KEY).toBe(5);
});

it("should check that runtimeValue callback argument is a module", function() {
	expect(RUNTIMEVALUE_CALLBACK_ARGUMENT_IS_A_MODULE).toEqual(true);
});

it("should expand properly", function() {
	const a = require("./dir/a");
	var tmp = "";
	expect(require("./dir/" + A_DOT_J + tmp + "s")).toBe(a);
	expect(require("./dir/" + tmp + A_DOT_J + "s")).toBe(a);
	expect(require("./dir/" + tmp + A_DOT_J + tmp + "s")).toBe(a);
	expect(require("./dir/" + tmp + A_DOT_J + (tmp + "s"))).toBe(a);
	expect(require("./dir/" + tmp + (A_DOT_J + tmp + "s"))).toBe(a);
	expect(require("./dir/" + tmp + (A_DOT_J + tmp) + "s")).toBe(a);
	expect(require("./dir/" + (tmp + A_DOT_J + tmp + "s"))).toBe(a);
	expect(require("./dir/" + (tmp + A_DOT_J + tmp) + "s")).toBe(a);
	expect(require("./dir/" + (tmp + A_DOT_J) + tmp + "s")).toBe(a);
});
