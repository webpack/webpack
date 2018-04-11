it("should load script without crossorigin attribute", function(done) {
	require.ensure([], function(require) {
		require("./empty?a");
	}, "chunk-with-crossorigin-attr");
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
	require.ensure([], function(require) {
		require("./empty?b");
	}, "chunk-with-crossorigin-attr");
	__webpack_public_path__ = originalValue;
	// if in browser context, test that crossorigin attribute was added.
	if (typeof document !== 'undefined') {
		var script = document.querySelector('script[src="https://example.com/js/chunk-with-crossorigin-attr.web.js"]');
		script.getAttribute('crossorigin').should.be.exactly('anonymous');
	}
	__webpack_public_path__ = originalValue;
	done();
});
