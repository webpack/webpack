"use strict";

it("should hoist exports", function() {
	var result = require("./foo").default;
	expect(typeof result.foo).toEqual("function");
	expect(typeof result.foo2).toEqual("function");
	expect(result.foo()).toBe("ok");
	expect(result.foo2()).toBe("ok");
});
