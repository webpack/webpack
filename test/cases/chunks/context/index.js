it("should also work in a chunk", function(done) {
	require.ensure([], function(require) {
		var contextRequire = require.context(".", false, /two/);
		contextRequire("./two").should.be.eql(2);
		var tw = "tw";
		require("." + "/" + tw + "o").should.be.eql(2);
		done();
	});
});

