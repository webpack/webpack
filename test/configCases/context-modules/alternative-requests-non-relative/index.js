it("should keep an alternative request which is not relative", () => {
	const context = require.context("./configs", false, /\.js$/);
	expect(context.keys()).toEqual(["package/a.js"]);
	expect(context("package/a.js").value).toBe("external a");
});
