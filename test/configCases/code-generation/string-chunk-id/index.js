it("should escape chunk id correctly", function(done) {
	require.ensure(["./a", "./b"], function(require) {
		var chunk = require("./a");
		var chunkB = require("./b");
		console.log(chunkB);
		chunk.should.be.eql("a");
		chunkB.should.be.eql("b");
		done();
	}, "named");
});
