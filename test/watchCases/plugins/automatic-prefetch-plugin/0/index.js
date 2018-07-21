it("should watch for changes", function() {
	require("./foo/" + WATCH_STEP).should.be.eql('This is only a test.' + WATCH_STEP);
	if(+WATCH_STEP > 0) {
		STATS_JSON.modules[0].prefetched.should.be.true();
		STATS_JSON.modules[1].prefetched.should.be.true();
		STATS_JSON.modules[2].prefetched.should.be.true();
		STATS_JSON.modules[3].prefetched.should.be.true();
	}
});
