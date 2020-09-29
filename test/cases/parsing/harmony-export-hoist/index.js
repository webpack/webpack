"use strict";

it("should hoist exports", function () {
	var result = require("./foo").results;
	expect(typeof result.foo).toEqual("function");
	expect(typeof result.foo2).toEqual("function");
	expect(typeof result.foo3).toEqual("function");
	expect(result.foo()).toBe("ok");
	expect(result.foo2()).toBe("ok");
	expect(result.foo3()).toBe("ok");
});

it("should hoist export default functions", () => {
	require("./func-no-args-no-name");
	require("./func-no-args-with-name");
	require("./func-with-args-no-name");
	require("./func-with-args-with-name");
});

it("should hoist export default classes", () => {
	require("./class-no-name");
	require("./class-with-name");
	require("./class-with-super-no-name");
	require("./class-with-super-with-name");
});
