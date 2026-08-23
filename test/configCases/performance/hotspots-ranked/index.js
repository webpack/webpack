it("should rank two plugins and the hooks they ran under", () => {
	// The ranking itself is in `warnings.js`; this pins that it arrives as one
	// report rather than one per hotspot.
	expect(__STATS__.warnings).toHaveLength(1);
});
