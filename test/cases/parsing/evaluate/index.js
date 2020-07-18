it("should evaluate null", function() {
	const y = null ? require("fail") : require("./a");
	if(null)
		require("fail");
});

it("should evaluate logical expression", function() {
	const value1 = "hello" || require("fail");
	const value2 = typeof require === "function" || require("fail");
	const value3 = "" && require("fail");
	const value4 = typeof require !== "function" && require("fail");
	const value5 = "hello" && (() => "value5")();
	const value6 = "" || (() => "value6")();
	const value7 = (function () { return'value7'===typeof 'value7'&&'value7'})();
	const value8 = [] != [] || require("fail");
	const value9 = (null === 1) && require("fail");
	const value91 = [] === [] && require("fail");
	const value92 = /a/ === /a/ && require("fail");

	expect(value1).toBe("hello");
	expect(value2).toBe(true);
	expect(value3).toBe("");
	expect(value4).toBe(false);
	expect(value5).toBe("value5");
	expect(value6).toBe("value6");
	expect(value7).toBe(false);
	expect(value8).toBe(true);
	expect(value9).toBe(false);
	expect(value91).toBe(false);
	expect(value92).toBe(false);

	if (!process.version.startsWith("v14")) return;

	const value10 = "" ?? require("fail");
	const value11 = null ?? "expected";
	const value12 = ("" ?? require("fail")) && true;

	expect(value10).toBe("");
	expect(value11).toBe("expected");
	expect(value12).toBe("")
});

it("shouldn't evaluate expression", function() {
	const value = "";
	const x = (value + "") ? "fail" : "ok";
	expect(x).toBe("ok");
});

it("should short-circuit evaluating", function() {
	let expr;
	const a = false && expr ? require("fail") : require("./a");
	const b = true || expr ? require("./a") : require("fail");
});

it("should evaluate __dirname and __resourceQuery with replace and substr", function() {
	const result = require("./resourceQuery/index?" + __dirname);
	expect(result).toEqual("?resourceQuery");
});

it("should evaluate __dirname and __resourceFragment with replace and substr", function() {
	const result = require("./resourceFragment/index#" + __dirname);
	expect(result).toEqual("#resourceFragment");
});

it("should allow resourceFragment in context", function() {
	const fn = x => require(`./resourceFragment/${x}#..`);
	expect(fn("index")).toEqual("#resourceFragment");
	expect(fn("returnRF")).toBe("#..")
});
