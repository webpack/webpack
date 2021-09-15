it("should emit the correct error for loaders not returning buffer or string", function() {
	expect(() => require("./loader.js!./file.js")).toThrowError(
		/Module build failed/
	);
	expect(() => require("./loader.js!./pitch-loader.js!./file.js")).toThrowError(
		/Module build failed/
	);
});
