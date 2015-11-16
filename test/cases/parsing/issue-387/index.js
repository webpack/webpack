it("should parse cujojs UMD modules", function() {
	(function (define) {

		// using the define signature that triggers AMD-wrapped CommonJS
		define(function (require) {
			return 123;
		});
	}(
		typeof define == 'function' && define.amd
			? define
			: function (factory) { module.exports = factory(require); }
	));
	module.exports.should.be.eql(123);
});

it("should parse cujojs UMD modules with deps", function() {
	(function (define) {

		// dependencies are listed in the dependency array
		define(['./file'], function (file) {
			return 1234;
		});

	}(
		typeof define == 'function' && define.amd
			? define
			: function (ids, factory) {
				// note: the lambda function cannot be removed in some CJS environments
				var deps = ids.map(function (id) { return require(id); });
				module.exports = factory.apply(null, deps);
			}
	));
	module.exports.should.be.eql(1234);
});

it("should parse cujojs UMD modules with inlinded deps", function() {
	(function (define) {

		// using the define signature that triggers AMD-wrapped CommonJS
		define(function (require) {
			return require("./file");
		});
	}(
		typeof define == 'function' && define.amd
			? define
			: function (factory) { module.exports = factory(require); }
	));
	module.exports.should.be.eql(4321);
});