it("should close once with a blocked loader and a pending invalidation", async () => {
	expect(require("./value")).toBe(0);
	await CLOSE_PENDING();
});
