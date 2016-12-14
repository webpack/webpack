it("should resolve aliased loader module with query", function() {
	var foo = require('./a');

	foo.should.be.eql("someMessage");
});

it("should favor explicit loader query over aliased query (options in rule)", function() {
	var foo = require('./b');

	foo.should.be.eql("someOtherMessage");
});

it("should favor explicit loader query over aliased query (inline query in rule)", function() {
	var foo = require('./b2');

	foo.should.be.eql("someOtherMessage");
});

it("should favor explicit loader query over aliased query (inline query in rule.use)", function() {
	var foo = require('./b3');

	foo.should.be.eql("someOtherMessage");
});
