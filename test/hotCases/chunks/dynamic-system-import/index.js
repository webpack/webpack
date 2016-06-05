it("should import a changed chunk (dynamic import)", function(done) {
	function load(name) {
		return System.import("./chunk" + name);
	}
	load(1).then(function(chunk) {
		chunk.value.should.be.eql(1);
		NEXT(require("../../update")(done));
		setTimeout(function() {
			chunk.value.should.be.eql(2);
			load(2).then(function(chunk2) {
				chunk2.value.should.be.eql(2);
				done();
			}).catch(done);
		}, 100);
	}).catch(done);
});
