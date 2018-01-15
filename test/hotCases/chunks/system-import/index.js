it("should import a changed chunk", function(done) {
	import("./chunk").then(function(chunk) {
		chunk.value.should.be.eql(1);
		chunk.value2.should.be.eql(3);
		chunk.counter.should.be.eql(0);
		NEXT(require("../../update")(done, true, function() {
			chunk.value.should.be.eql(2);
			chunk.value2.should.be.eql(4);
			chunk.counter.should.be.eql(1);
			import("./chunk2").then(function(chunk2) {
				chunk2.value.should.be.eql(2);
				chunk2.value2.should.be.eql(4);
				chunk2.counter.should.be.eql(0);
				done();
			}).catch(done);
		}));
	}).catch(done);
});
