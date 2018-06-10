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
	expect(module.exports).toBe(123);
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
	expect(module.exports).toBe(1234);
});

it("should parse cujojs UMD modules with inlined deps", function() {
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
	expect(module.exports).toBe(4321);
});
