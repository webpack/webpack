it("should match only one rule in a oneOf block", function() {
	var ab = require("./ab");
	expect(ab).toEqual(["ab", "?first"]);
});
it("should match with issuer and any option value", function() {
	var a = require("./a");
	var b = require("./b");
	expect(a).toEqual(["a", "?third"]);
	expect(b).toEqual([["a", "second-3", "?second-2", ""]]);
});
