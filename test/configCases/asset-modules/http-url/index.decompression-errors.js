it("should report invalid compressed responses as module errors", () => {
	expect(() => {
		require("http://localhost:9990/resolve.js?invalid-gzip");
	}).toThrow();
	expect(() => {
		require("http://localhost:9990/resolve.js?invalid-br");
	}).toThrow();
	expect(() => {
		require("http://localhost:9990/resolve.js?invalid-deflate");
	}).toThrow();
});
