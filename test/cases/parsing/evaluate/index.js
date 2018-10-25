it("should evaluate null", function() {
	var y = null ? require("fail") : require("./a");
	if(null)
		require("fail");
});

it("should evaluate logical expression", function() {
	var value1 = "hello" || require("fail");
	var value2 = typeof require === "function" || require("fail");
	var value3 = "" && require("fail");
	var value4 = typeof require !== "function" && require("fail");
	var value5 = "hello" && (() => "value5")();
	var value6 = "" || (() => "value6")();
	var value7 = (function () { return'value7'===typeof 'value7'&&'value7'})();

	expect(value1).toBe("hello");
	expect(value2).toBe(true);
	expect(value3).toBe("");
	expect(value4).toBe(false);
	expect(value5).toBe("value5");
	expect(value6).toBe("value6");
	expect(value7).toBe(false);
});

if("shouldn't evaluate expression", function() {
	var value = "";
	var x = (value + "") ? "fail" : "ok";
	expect(x).toBe("ok");
});

it("should short-circuit evaluating", function() {
	var expr;
	var a = false && expr ? require("fail") : require("./a");
	var b = true || expr ? require("./a") : require("fail");
});

it("should evaluate __dirname and __resourceQuery with replace and substr", function() {
	var result = require("./resourceQuery/index?" + __dirname);
	expect(result).toEqual("?resourceQuery");
});
