it("should load an async chunk from an es module", function (done) {
	import(/* webpackChunkName: "lazy" */ "./lazy").then(function (module) {
		expect(module.value).toBe(42);
		done();
	}, done);
});
