it("should resolve aliased loader module with query (issue-3320)", function() {
	var foo = require('./a');

	foo.should.be.eql("someMessage");
});
