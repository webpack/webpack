it("should handle mixed size types chunk in splitChunks", async () => {
	import("./chunk1");
	import("./chunk2");
});
