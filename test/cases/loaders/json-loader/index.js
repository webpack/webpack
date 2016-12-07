var should = require("should");

it("should be able to load JSON files without loader", function() {
	var someJson = require("./some.json");
	someJson.should.have.property("it", "works");
	someJson.should.have.property("number", 42);
});

it("should also work when the json extension is omitted", function() {
	var someJson = require("./some");
	someJson.should.have.property("it", "works");
	someJson.should.have.property("number", 42);
});

it("should still be possible to manually apply the json-loader for compatibility reasons", function() {
	var someJson = require("json-loader!./some.json");
	someJson.should.have.property("it", "works");
	someJson.should.have.property("number", 42);
});

it("should still be possible to use a custom loader", function() {
	var someJson = JSON.parse(require("raw-loader!./some.json"));
	someJson.should.have.property("it", "works");
	someJson.should.have.property("number", 42);
});
