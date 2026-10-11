it("should keep the other compiler's output", () => {
	expect(STATS_JSON.children).toHaveLength(WATCH_STEP === "0" ? 2 : 1);
});
