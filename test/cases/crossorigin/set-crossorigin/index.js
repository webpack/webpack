it("should load script without crossorigin attribute", function(done) {
	import("./empty?a" /* webpackChunkName: "chunk-with-crossorigin-attr" */);
	// if in browser context, test that crossorigin attribute was not added.
	if (typeof document !== 'undefined') {
		var script = document.querySelector('script[src="js/chunk-with-crossorigin-attr.web.js"]');
		script.getAttribute('crossorigin').should.be.exactly(null);
	}
	done();
});

it("should load script with crossorigin attribute 'anonymous'", function(done) {
	var originalValue = __webpack_public_path__;
	__webpack_public_path__ = 'https://example.com/';
	import("./empty?b" /* webpackChunkName: "chunk-without-crossorigin-attr" */);
	__webpack_public_path__ = originalValue;
	// if in browser context, test that crossorigin attribute was added.
	if (typeof document !== 'undefined') {
		var script = document.querySelector('script[src="https://example.com/js/chunk-without-crossorigin-attr.web.js"]');
		script.getAttribute('crossorigin').should.be.exactly('anonymous');
	}
	__webpack_public_path__ = originalValue;
	done();
});
