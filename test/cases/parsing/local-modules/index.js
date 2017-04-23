it("should define and require a local module", function() {
	module.exports = "not set";
	define("my-module", function() {
		return 1234;
	});
	expect(module.exports).toEqual("not set");
	define(["my-module"], function(myModule) {
		expect(myModule).toEqual(1234);
		return 2345;
	});
	expect(module.exports).toEqual(2345);
	expect(require("my-module")).toEqual(1234);
	require(["my-module"]);
});

it("should not create a chunk for a AMD require to a local module", function(done) {
	define("my-module2", function() {
		return 1235;
	});
	var sync = false;
	require(["my-module2"], function(myModule2) {
		expect(myModule2).toEqual(1235);
		sync = true;
	});
	setImmediate(function() {
		expect(sync).toEqual(true);
		done();
	});
});

it("should define and require a local module with deps", function() {
	module.exports = "not set";
	define("my-module3", ["./dep"], function(dep) {
		expect(dep).toEqual("dep");
		return 1234;
	});
	expect(module.exports).toEqual("not set");
	define("my-module4", ["my-module3", "./dep"], function(myModule, dep) {
		expect(dep).toEqual("dep");
		expect(myModule).toEqual(1234);
		return 2345;
	});
	expect(module.exports).toEqual("not set");
	expect(require("my-module3")).toEqual(1234);
	expect(require("my-module4")).toEqual(2345);
});

it("should define and require a local module that is relative", function () {
	define("my-dir/my-module3", function() {
		return 1234;
	});
	define("my-dir/my-other-dir/my-module4", function() {
		return 2345;
	});
	define("my-dir/my-other-dir/my-module5", ["./my-module4", "../my-module3"], function(myModule4, myModule3) {
		expect(myModule3).toEqual(1234);
		expect(myModule4).toEqual(2345);
		return 3456;
	});
	expect(require("my-dir/my-other-dir/my-module5")).toEqual(3456);
})
