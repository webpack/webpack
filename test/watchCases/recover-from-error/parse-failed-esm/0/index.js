it("should recover from syntax error in module", async () => {
	switch (WATCH_STEP) {
		case "0":
		case "2":
			await expect(import("test-module")).rejects.toEqual(
				expect.objectContaining({
					message: expect.stringContaining("Module parse failed")
				})
			);
			break;
		case "1":
			await expect(import("test-module")).resolves.toEqual(
				expect.objectContaining({
					default: 42
				})
			);
			break;
		case "3":
			await expect(import("test-module")).resolves.toEqual(
				expect.objectContaining({
					default: 43
				})
			);
			break;
	}
});
