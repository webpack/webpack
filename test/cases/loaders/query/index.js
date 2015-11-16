it("should pass query to loader", function() {
	var result = require("./loaders/queryloader?query!./a?resourcequery");
	result.should.be.eql({
		resourceQuery: "?resourcequery",
		query: "?query",
		prev: "module.exports = \"a\";"
	});
});

it("should pass query to loader without resource with resource query", function() {
	var result = require("./loaders/queryloader?query!?resourcequery");
	result.should.be.eql({
		resourceQuery: "?resourcequery",
		query: "?query",
		prev: null
	});
});

it("should pass query to loader without resource", function() {
	var result = require("./loaders/queryloader?query!");
	result.should.be.eql({
		query: "?query",
		prev: null
	});
});

it("should pass query to multiple loaders", function() {
	var result = require("./loaders/queryloader?query1!./loaders/queryloader?query2!./a?resourcequery");
	result.should.have.type("object");
	result.should.have.property("resourceQuery").be.eql("?resourcequery");
	result.should.have.property("query").be.eql("?query1");
	result.should.have.property("prev").be.eql("module.exports = " + JSON.stringify({
		resourceQuery: "?resourcequery",
		query: "?query2",
		prev: "module.exports = \"a\";"
	}));
});

it("should pass query to loader over context", function() {
	var test = "test";
	var result = require("./loaders/queryloader?query!./context-query-test/" + test);
	result.should.be.eql({
		resourceQuery: null,
		query: "?query",
		prev: "test content"
	});
});
