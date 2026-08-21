it("should stay quiet when hints are off", () => {
	// The harness fails on an unexpected warning; the stats channel is the one
	// nothing else checks.
	expect(__STATS__.hints).toHaveLength(0);
});
