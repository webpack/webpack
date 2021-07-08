it("should handle mixed size types chunk in splitChunks", () =>
	Promise.all([import("./chunk1"), import("./chunk2")]));
