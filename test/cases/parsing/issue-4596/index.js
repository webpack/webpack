it("should evaluate require.resolve as truthy value", function() {
	var id;
	if(require.resolve)
		id = require.resolve("./module.js");

	(typeof id).should.be.oneOf("number", "string");
});

it("should evaluate require.resolve in ?: expression", function() {
	var id = require.resolve ? require.resolve("./module.js") : null;

	(typeof id).should.be.oneOf("number", "string");
});
