it("should keep its own policy when createPolicy returns none", function () {
	window.trustedTypes = { createPolicy: () => undefined };

	const promise = import("./empty" /* webpackChunkName: "without-result" */);

	var script = document.head._children.pop();
	__non_webpack_require__("./without-result.web.js");
	expect(script.src).toBe("https://test.cases/path/without-result.web.js");

	return promise.finally(() => {
		delete window.trustedTypes;
	});
});
