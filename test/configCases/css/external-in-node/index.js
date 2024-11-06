it("should import an external css", done => {
	import("../external/style.css").then(x => {
		expect(x).toEqual(nsObj({}));
		done();
	}, done);
});
