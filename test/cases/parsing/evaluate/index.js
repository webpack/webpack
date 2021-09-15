it("should evaluate null", function () {
	const y = null ? require("fail") : require("./a");
	if (null) require("fail");
});

it("should evaluate logical expression", function () {
	const value1 = "hello" || require("fail");
	const value2 = typeof require === "function" || require("fail");
	const value3 = "" && require("fail");
	const value4 = typeof require !== "function" && require("fail");
	const value5 = "hello" && (() => "value5")();
	const value6 = "" || (() => "value6")();
	const value7 = (function () { return'value7'===typeof 'value7'&&'value7'})();
	const value8 = [] != [] || require("fail");
	const value9 = null === 1 && require("fail");
	const value91 = [] === [] && require("fail");
	const value92 = /a/ === /a/ && require("fail");
	const value93 =
		`hello${Math.random()}` === `world${Math.random()}` && require("fail");
	const value94 =
		`${Math.random()}hello` != `${Math.random()}world` || require("fail");
	let value95 = 1;
	const value96 = `${value95++}hello` != `${value95++}world` || require("fail");

	if (`${value95++}hello` === `${value95++}world`) {
		require("fail");
	}

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
	expect(value93).toBe(false);
	expect(value94).toBe(true);
	expect(value95).toBe(5);
	expect(value96).toBe(true);
});

it("shouldn't evaluate expression", function () {
	const value = "";
	const x = value + "" ? "fail" : "ok";
	expect(x).toBe("ok");
});

it("should short-circuit evaluating", function () {
	let expr;
	const a = false && expr ? require("fail") : require("./a");
	const b = true || expr ? require("./a") : require("fail");
});

it("should evaluate __dirname and __resourceQuery with replace and substr", function () {
	const result = require("./resourceQuery/index?" + __dirname);
	expect(result).toEqual("?resourceQuery");
});

it("should evaluate __dirname and __resourceFragment with replace and substr", function () {
	const result = require("./resourceFragment/index#" + __dirname);
	expect(result).toEqual("#resourceFragment");
});

it("should allow resourceFragment in context", function () {
	const fn = x => require(`./resourceFragment/${x}#..`);
	expect(fn("index")).toEqual("#resourceFragment");
	expect(fn("returnRF")).toBe("#..");
});

it("should try to evaluate new RegExp()", function () {
	function expectAOnly (r) {
		r.keys().forEach(key => {
			expect(r(key)).toBe(1);
		});
	}

	expectAOnly(
		require.context("./regexp", false, new RegExp("(?<!filtered)\\.js$", ""))
	);
	expectAOnly(
		require.context("./regexp", false, new RegExp(`(?<!${"FILTERED"})\\.js$`, "i"))
	);
	expectAOnly(
		require.context("./regexp", false, new RegExp("(?<!filtered)\\.js$"))
	);
});

it("should not evaluate new RegExp for redefined RegExp", () => {
	const RegExp = function() { return /other/; };
	expect(require("./regexp/" + ("a".replace(new RegExp("a"), "wrong")))).toBe(1);
});
