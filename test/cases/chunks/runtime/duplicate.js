require.ensure(["./a"], function(require) {
	require("./a").should.be.eql("a");
})