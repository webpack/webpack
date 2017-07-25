it("should watch for changes", function() {
	if(WATCH_STEP === '0') {
		require("./foo/" + WATCH_STEP).should.be.eql('This is only a test.' + WATCH_STEP);
	}
	else if(WATCH_STEP === '1') {
		require("./foo/" + WATCH_STEP).should.be.eql('This should be a test.' + WATCH_STEP);
	}
	else if(WATCH_STEP === '2') {
		require("./foo/" + WATCH_STEP).should.be.eql('This should be working.' + WATCH_STEP);
	}

	STATS_JSON.modules.length.should.equal(4 + Number(WATCH_STEP));
});
