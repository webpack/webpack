it("should inject the module object into a chunk (AMD1)", function(done) {
	require([], function() {
		module.webpackPolyfill.should.be.eql(1);
		done();
	});
});

it("should inject the module object into a chunk (AMD2)"/*, function() {
	require([module.webpackPolyfill ? "./x1" : "./fail"]);
}*/);

it("should inject the module object into a chunk (ensure)", function(done) {
	require.ensure([], function(require) {
		module.webpackPolyfill.should.be.eql(1);
		done();
	});
});
