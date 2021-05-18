it("should load chunk when there are no trusted types", function () {
	const promise = import(
		"./empty?a" /* webpackChunkName: "no-trusted-types" */
	);

	var script = document.head._children.pop();
	__non_webpack_require__("./no-trusted-types.web.js");
	expect(script.src).toBe("https://test.cases/path/no-trusted-types.web.js");

	return promise;
});
