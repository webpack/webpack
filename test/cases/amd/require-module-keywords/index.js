it("should work when require module keywords", (done) => {
	require(['require', 'module', 'exports'], function (webpackRequire, webpackModule, webpackExports) {
		expect(require("./module")).toBe(42);
		expect(webpackRequire).toBeDefined();
		expect(webpackModule).toBeDefined();
		expect(webpackExports).toBeDefined();

		done();
	});
});
