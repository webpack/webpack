it("should correctly escape chunk id", function(done) {
	var fs = require("fs");
	var source = fs.readFileSync(__filename, "utf-8");
	source.should.match(/__webpack_require__\.e\/\* nsure \*\/\("named"\/\*! named \*\/\)/);

	require.ensure(["./a", "./b"], function(require) {
		var chunk = require("./a");
		var chunkB = require("./b");
		chunk.should.be.eql("a");
		chunkB.should.be.eql("b");
		done();
	}, "named");
});
