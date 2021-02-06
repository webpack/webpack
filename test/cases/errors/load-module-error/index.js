it("should error loadModule when the referenced module contains errors", () => {
	expect(function() {
		require("./loader!./a")
	}).toThrowError();
});
