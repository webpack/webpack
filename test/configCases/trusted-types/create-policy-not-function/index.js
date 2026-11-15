it("should load a chunk when createPolicy is not a function", function () {
	window.trustedTypes = { createPolicy: document.createElement("input") };

	const promise = import("./empty" /* webpackChunkName: "not-function" */);

	var script = document.head._children.pop();
	__non_webpack_require__("./not-function.web.js");
	expect(script.src).toBe("https://test.cases/path/not-function.web.js");

	return promise.finally(() => {
		delete window.trustedTypes;
	});
});
