it("should allow to access utils in loader", () => {
	expect(require("./loader!" + __filename)).toEqual({
		request1: "./index.js",
		request2: "./index.js"
	});
});
