it("should compile and run", done => {
	expect(true).toBe(true);
	import("./async").then(module => {
		expect(module.default).toBe("async");
		done();
	}, done);
});
