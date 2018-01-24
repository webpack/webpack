it("should watch for changes", function() {
	expect(require("./foo/" + WATCH_STEP)).toBe('This is only a test.' + WATCH_STEP);
	if(+WATCH_STEP > 0) {
		for(var m of STATS_JSON.modules.filter(m => /(a|b|c)\.js$/.test(m.identifier)))
			expect(m.prefetched).toBe(true);
	}
});
