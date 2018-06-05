it("should be able to load the split chunk on demand", () => {
	const promise = import(/* webpackChunkName: "shared" */ "./shared");

	const script = document.head._children[0];
	expect(script.src).toBe("dep~b~shared.js");

	__non_webpack_require__("./dep~b~shared.js");

	return promise;
});
