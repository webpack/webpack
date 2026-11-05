it("should keep its own policy when a callable element is named createPolicy", function () {
	// `<form id="trustedTypes"><object name="createPolicy"></form>` in browsers
	// where `<object>` is callable and returns nothing
	window.trustedTypes = { createPolicy: () => undefined };

	const promise = import("./empty" /* webpackChunkName: "callable-element" */);

	var script = document.head._children.pop();
	__non_webpack_require__("./callable-element.web.js");
	expect(script.src).toBe("https://test.cases/path/callable-element.web.js");

	return promise.finally(() => {
		delete window.trustedTypes;
	});
});
