it("should load script without crossorigin attribute (default)", function() {
	const promise = import("./empty?a" /* webpackChunkName: "crossorigin-default" */);

	var script = document.head._children.pop();
	__non_webpack_require__("./crossorigin-default.web.js");
	expect(script.src).toBe("https://test.cases/path/crossorigin-default.web.js");
	expect(script.crossOrigin).toBe(undefined);

	return promise;
});

it("should load script without crossorigin attribute (relative)", function() {
	var originalValue = __webpack_public_path__;
	__webpack_public_path__ = "../";
	const promise = import("./empty?b" /* webpackChunkName: "crossorigin-relative" */);
	__webpack_public_path__ = originalValue;

	var script = document.head._children.pop();
	__non_webpack_require__("./crossorigin-relative.web.js");
	expect(script.src).toBe("https://test.cases/crossorigin-relative.web.js");
	expect(script.crossOrigin).toBe(undefined);

	return promise;
});

it("should load script without crossorigin attribute (server relative)", function() {
	var originalValue = __webpack_public_path__;
	__webpack_public_path__ = "/server/";
	const promise = import("./empty?c" /* webpackChunkName: "crossorigin-server-relative" */);
	__webpack_public_path__ = originalValue;

	var script = document.head._children.pop();
	__non_webpack_require__("./crossorigin-server-relative.web.js");
	expect(script.src).toBe("https://test.cases/server/crossorigin-server-relative.web.js");
	expect(script.crossOrigin).toBe(undefined);

	return promise;
});

it("should load script without crossorigin attribute (same origin)", function() {
	var originalValue = __webpack_public_path__;
	__webpack_public_path__ = "https://test.cases/";
	const promise = import("./empty?d" /* webpackChunkName: "crossorigin-same-origin" */);
	__webpack_public_path__ = originalValue;

	var script = document.head._children.pop();
	__non_webpack_require__("./crossorigin-same-origin.web.js");
	expect(script.src).toBe("https://test.cases/crossorigin-same-origin.web.js");
	expect(script.crossOrigin).toBe(undefined);

	return promise;
});

it("should load script with crossorigin attribute anonymous (different origin)", function() {
	var originalValue = __webpack_public_path__;
	__webpack_public_path__ = "https://example.com/";
	const promise = import("./empty?e" /* webpackChunkName: "crossorigin-different-origin" */);
	__webpack_public_path__ = originalValue;


	var script = document.head._children.pop();
	__non_webpack_require__("./crossorigin-different-origin.web.js");
	expect(script.src).toBe("https://example.com/crossorigin-different-origin.web.js");
	expect(script.crossOrigin).toBe("anonymous");

	return promise;
});
