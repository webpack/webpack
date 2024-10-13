it("should regenerate contenthash", function(done) {
	const value = new URL("./file.text", import.meta.url);
	expect(/file\.7eff7665bf7fc2696232\.text/.test(value.toString())).toBe(true);
	module.hot.accept("./file.text", function() {
		const value = new URL("./file.text", import.meta.url);
		expect(/file\.402033be7494a9255415\.text/.test(value.toString())).toBe(true);
		done();
	});
	NEXT(require("../../update")(done));
});
