it("should import a changed chunk", function(done) {
	System.import("./chunk").then(function(chunk) {
		chunk.value.should.be.eql(1);
		System.import("./chunk2").then(function(chunk2) {
			chunk2.value.should.be.eql(1);
			NEXT(require("../../update")(done));
			module.hot.accept(["./chunk", "./chunk2"], function() {
				System.import("./chunk").then(function(chunk) {
					chunk.value.should.be.eql(2);
					System.import("./chunk2").then(function(chunk2) {
						chunk2.value.should.be.eql(2);
						done();
					}).catch(done);
				}).catch(done);
			});
		}).catch(done);
	}).catch(done);
});
