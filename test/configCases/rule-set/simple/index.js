it("should match only one rule in a oneOf block", function () {
	var ab = require("./ab");
	expect(ab).toEqual(["ab", "?first"]);
});

it("should not match not condition (absolute)", function () {
	var ab = require("./not-ab");
	expect(ab).toEqual(["not-ab"]);
});

it("should not match not condition (not absolute)", function () {
	var ab = require("./ab?not");
	expect(ab).toEqual(["ab"]);
});

it("should match with issuer and any option value", function () {
	var a = require("./a");
	var b = require("./b");
	expect(a).toEqual(["a", "?third"]);
	expect(b).toEqual([["a", "second-3", "?second-2", ""]]);
});
