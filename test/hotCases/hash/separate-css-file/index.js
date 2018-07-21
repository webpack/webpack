import "./file.css";

it("should not change hash of file after css update", function(done) {
	var hash1 = STATS.chunks[0].hash;
	NEXT(require("../../update")(done, true, function(newSTATS) {
		var hash2 = newSTATS.chunks[0].hash;
		hash1.should.be.eql(hash2);
		done();
	}));
});
