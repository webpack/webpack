it("should compile", async () => {
	await import("./style.module.css");
	// The real test is in test.config.js afterExecute
	expect(true).toBe(true);
});
