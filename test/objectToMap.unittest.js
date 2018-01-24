/* globals describe it */

require("should");

var objectToMap = require("../lib/util/objectToMap");

describe("objectToMap", function() {
	it("should convert a plain object into a Map successfully", function() {
		const map = objectToMap({
			foo: "bar",
			bar: "baz"
		});

		map.get("foo").should.eql("bar");
		map.get("bar").should.eql("baz");
	});
});
