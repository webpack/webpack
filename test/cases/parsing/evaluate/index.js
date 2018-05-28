it("should evaluate null", function() {
	var y = null ? require("fail") : require("./a");
	if(null)
		require("fail");
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
