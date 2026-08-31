it("reports invalid compressed responses as module errors", () => {
	expect(() => {
		require("http://localhost:9990/resolve.js?invalid-gzip");
	}).toThrow();
});
