it("should resolve aliased loader module with query (issue-3320)", function() {
	var foo = require('./a');

	foo.should.be.eql("someMessage");
});

it("should favor explicit loader query over aliased query (issue-3320)", function() {
	var foo = require('./b');

	foo.should.be.eql("someOtherMessage");
});
