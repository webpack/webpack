/* globals it, should */
it("should define FALSE", function() {
	expect(FALSE).toBe(false);
	expect((typeof TRUE)).toBe("boolean");
	var x = require(FALSE ? "fail" : "./dir/a");
	var y = FALSE ? require("fail") : require("./dir/a");
});

it("should define CODE", function() {
	expect(CODE).toBe(3);
	expect((typeof CODE)).toBe("number");
	if(CODE !== 3) require("fail");
	if(typeof CODE !== "number") require("fail");
});
it("should define FUNCTION", function() {
	expect((FUNCTION(5))).toBe(6);
	expect((typeof FUNCTION)).toBe("function");
	if(typeof FUNCTION !== "function") require("fail");
});
it("should define UNDEFINED", function() {
	expect((typeof UNDEFINED)).toBe("undefined");
	if(typeof UNDEFINED !== "undefined") require("fail");
});
it("should define REGEXP", function() {
	expect(REGEXP.toString()).toBe("/abc/i");
	expect((typeof REGEXP)).toBe("object");
	if(typeof REGEXP !== "object") require("fail");
});
it("should define OBJECT", function() {
	var o = OBJECT;
	expect(o.SUB.FUNCTION(10)).toBe(11);
});
it("should define OBJECT.SUB.CODE", function() {
	expect((typeof OBJECT.SUB.CODE)).toBe("number");
	expect(OBJECT.SUB.CODE).toBe(3);
	if(OBJECT.SUB.CODE !== 3) require("fail");
	if(typeof OBJECT.SUB.CODE !== "number") require("fail");

	(function(sub) {
		// should not crash
		expect(sub.CODE).toBe(3);
	}(OBJECT.SUB));
});
it("should define OBJECT.SUB.STRING", function() {
	expect((typeof OBJECT.SUB.STRING)).toBe("string");
	expect(OBJECT.SUB.STRING).toBe("string");
	if(OBJECT.SUB.STRING !== "string") require("fail");
	if(typeof OBJECT.SUB.STRING !== "string") require("fail");

	(function(sub) {
		// should not crash
		expect(sub.STRING).toBe("string");
	}(OBJECT.SUB));
});
it("should define process.env.DEFINED_NESTED_KEY", function() {
	expect((process.env.DEFINED_NESTED_KEY)).toBe(5);
	expect((typeof process.env.DEFINED_NESTED_KEY)).toBe("number");
	if(process.env.DEFINED_NESTED_KEY !== 5) require("fail");
	if(typeof process.env.DEFINED_NESTED_KEY !== "number") require("fail");

	var x = process.env.DEFINED_NESTED_KEY;
	expect(x).toBe(5);

	var indirect = process.env;
	expect((indirect.DEFINED_NESTED_KEY)).toBe(5);

	(function(env) {
		expect((env.DEFINED_NESTED_KEY)).toBe(5);
		expect((typeof env.DEFINED_NESTED_KEY)).toBe("number");
		if(env.DEFINED_NESTED_KEY !== 5) require("fail");
		if(typeof env.DEFINED_NESTED_KEY !== "number") require("fail");

		var x = env.DEFINED_NESTED_KEY;
		expect(x).toBe(5);
	}(process.env));
});
it("should define process.env.DEFINED_NESTED_KEY_STRING", function() {
	if(process.env.DEFINED_NESTED_KEY_STRING !== "string") require("fail");
});
it("should assign to process.env", function() {
	process.env.TEST = "test";
	expect(process.env.TEST).toBe("test");
});
it("should not have brackets on start", function() {
	function f() {
		throw new Error("should not be called");
	}
	f // <- no semicolon here
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
	if(!module.hot && process.env.DEFINED_NESTED_KEY_STRING === "string") {
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
	var tmp = '';
	expect(require('./dir/' + A_DOT_J + tmp + 's')).toBe(a);
	expect(require('./dir/' + tmp + A_DOT_J + 's')).toBe(a);
	expect(require('./dir/' + tmp + A_DOT_J + tmp + 's')).toBe(a);
	expect(require('./dir/' + tmp + A_DOT_J + (tmp + 's'))).toBe(a);
	expect(require('./dir/' + tmp + (A_DOT_J + tmp + 's'))).toBe(a);
	expect(require('./dir/' + tmp + (A_DOT_J + tmp) + 's')).toBe(a);
	expect(require('./dir/' + (tmp + A_DOT_J + tmp + 's'))).toBe(a);
	expect(require('./dir/' + (tmp + A_DOT_J + tmp) + 's')).toBe(a);
	expect(require('./dir/' + (tmp + A_DOT_J) + tmp + 's')).toBe(a);
});
