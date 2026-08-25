it("should load an async chunk with require without leaving es5", function (done) {
	import(/* webpackChunkName: "lazy" */ "./lazy").then(function (module) {
		expect(module.value).toBe(42);
		done();
	}).catch(done);
});
