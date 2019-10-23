"use strict";
const isFunction = require("../lib/util/isFunction");

describe("util::isFunction", function() {
	it("should validate Function", function() {
		expect(isFunction(function() {})).toEqual(true);
		expect(isFunction("function")).toEqual(false);
	});
});
