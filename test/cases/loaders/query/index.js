it("should pass query to loader", function() {
	var result = require("./loaders/queryloader?query!./a?resourcequery");
	expect(result).toEqual({
		resourceQuery: "?resourcequery",
		query: "?query",
		prev: "module.exports = \"a\";"
	});
});

it("should pass query to loader without resource with resource query", function() {
	var result = require("./loaders/queryloader?query!?resourcequery");
	expect(result).toEqual({
		resourceQuery: "?resourcequery",
		query: "?query",
		prev: null
	});
});

it("should pass query to loader without resource", function() {
	var result = require("./loaders/queryloader?query!");
	expect(result).toEqual({
		query: "?query",
		prev: null
	});
});

it("should pass query to multiple loaders", function() {
	var result = require("./loaders/queryloader?query1!./loaders/queryloader?query2!./a?resourcequery");
	expect(result).toBeTypeOf("object");
	expect(result).toHaveProperty("resourceQuery", "?resourcequery");
	expect(result).toHaveProperty("query", "?query1");
	expect(result).toHaveProperty("prev", "module.exports = " + JSON.stringify({
		resourceQuery: "?resourcequery",
		query: "?query2",
		prev: "module.exports = \"a\";"
	}));
});

it("should pass query to loader over context", function() {
	var test = "test";
	var result = require("./loaders/queryloader?query!./context-query-test/" + test);
	expect(result).toEqual({
		resourceQuery: "",
		query: "?query",
		prev: "test content"
	});
});
