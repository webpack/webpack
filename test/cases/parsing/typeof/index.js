it("should not create a context for typeof require", function () {
	expect(require("./typeof")).toBe("function");
});

it("should answer typeof require correctly", function () {
	expect(typeof require).toBe("function");
});
it("should answer typeof define correctly", function () {
	expect(typeof define).toBe("function");
});
it("should answer typeof require.amd correctly", function () {
	expect(typeof require.amd).toBe("object");
});
it("should answer typeof define.amd correctly", function () {
	expect(typeof define.amd).toBe("object");
});
it("should answer typeof module correctly", function () {
	expect(typeof module).toBe("object");
});
it("should answer typeof exports correctly", function () {
	expect(typeof exports).toBe("object");
});
it("should answer typeof require.include correctly", function () {
	expect(typeof require.include).toBe("function");
});
it("should answer typeof require.ensure correctly", function () {
	expect(typeof require.ensure).toBe("function");
});
it("should answer typeof require.resolve correctly", function () {
	expect(typeof require.resolve).toBe("function");
});

it("should not parse filtered stuff", function () {
	if (typeof require != "function") require("fail");
	if (typeof require !== "function") require("fail");
	if (!(typeof require == "function")) require("fail");
	if (!(typeof require === "function")) require("fail");
	if (typeof require == "undefined") require = require("fail");
	if (typeof require === "undefined") require = require("fail");
	if (typeof require.resolve !== "function") require("fail");
	if (typeof module == "undefined") module = require("fail");
	if (typeof module === "undefined") module = require("fail");
	if (typeof module != "object") module = require("fail");
	if (typeof exports == "undefined") exports = require("fail");
	if (typeof require.include !== "function") require.include("fail");
	if (typeof require.ensure !== "function")
		require.ensure(["fail"], function () {});
});
