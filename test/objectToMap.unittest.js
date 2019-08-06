"use strict";

var objectToMap = require("../lib/util/objectToMap");

describe("objectToMap", () => {
	it("should convert a plain object into a Map successfully", () => {
		const map = objectToMap({
			foo: "bar",
			bar: "baz"
		});

		expect(map.get("foo")).toBe("bar");
		expect(map.get("bar")).toBe("baz");
	});
});
