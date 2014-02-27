it("should inject the module object into a chunk (AMD1)", function() {
	require([], function() {
		module.webpackPolyfill.should.be.eql(1);
	});
});

it("should inject the module object into a chunk (AMD2)"/*, function() {
	require([module.webpackPolyfill ? "./x1" : "./fail"]);
}*/);

it("should inject the module object into a chunk (ensure)", function() {
	require.ensure([], function(require) {
		module.webpackPolyfill.should.be.eql(1);
	});
});
