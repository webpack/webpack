require.ensure(["./b"], function(require) {
	require("./b").should.be.eql("a");
})