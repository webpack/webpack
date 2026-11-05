it("should load a chunk when a form with a createPolicy control is named trustedTypes", function () {
	// `<form id="trustedTypes"><input name="createPolicy"></form>` in a browser
	// without Trusted Types
	window.trustedTypes = { createPolicy: document.createElement("input") };

	const promise = import("./empty" /* webpackChunkName: "named-element" */);

	var script = document.head._children.pop();
	__non_webpack_require__("./named-element.web.js");
	expect(script.src).toBe("https://test.cases/path/named-element.web.js");

	return promise.finally(() => {
		delete window.trustedTypes;
	});
});
