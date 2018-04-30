it("should be able to load JSON files without loader", function() {
	var someJson = require("./some.json");
	expect(someJson).toHaveProperty("it", "works");
	expect(someJson).toHaveProperty("number", 42);
});

it("should also work when the json extension is omitted", function() {
	var someJson = require("./some");
	expect(someJson).toHaveProperty("it", "works");
	expect(someJson).toHaveProperty("number", 42);
});
