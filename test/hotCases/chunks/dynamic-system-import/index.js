it("should import a changed chunk (dynamic import)", function(done) {
	function load(name) {
		return import("./chunk" + name);
	}
	load(1).then(function(chunk) {
		chunk.value.should.be.eql(1);
		NEXT(require("../../update")(done, true, function() {
			chunk.value.should.be.eql(2);
			load(2).then(function(chunk2) {
				chunk2.value.should.be.eql(2);
				done();
			}).catch(done);
		}));
	}).catch(done);
});
