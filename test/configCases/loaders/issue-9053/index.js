it("should apply inline loaders before matchResource", function() {
	var foo = require("c.js!=!loader1!./b.js");

	expect(foo).toEqual(["b", "1", "2"]);
});

it("should apply config loaders before inline loaders", function() {
	var foo = require("loader1!./c.js");

	expect(foo).toEqual(["c", "2", "1"]);
});

it("should not apply config loaders when matchResource is used", function() {
	var foo = require("d.js!=!loader1!./c.js");

	expect(foo).toEqual(["c", "1", "3"]);
});
