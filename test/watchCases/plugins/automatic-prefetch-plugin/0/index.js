it("should watch for changes", function() {
	require("./foo/" + WATCH_STEP).should.be.eql('This is only a test.' + WATCH_STEP);
	if(+WATCH_STEP > 0) {
		for(var m of STATS_JSON.modules.filter(m => /(a|b|c)\.js$/.test(m.identifier)))
			m.prefetched.should.be.true();
	}
});
