it("should define and require a local module", function() {
	module.exports = "not set";
	define("my-module", function() {
		return 1234;
	});
	module.exports.should.be.eql("not set");
	define(["my-module"], function(myModule) {
		myModule.should.be.eql(1234);
		return 2345;
	});
	module.exports.should.be.eql(2345);
	require("my-module").should.be.eql(1234);
	require(["my-module"]);
});

it("should not create a chunk for a AMD require to a local module", function(done) {
	define("my-module2", function() {
		return 1235;
	});
	var sync = false;
	require(["my-module2"], function(myModule2) {
		myModule2.should.be.eql(1235);
		sync = true;
	});
	setImmediate(function() {
		sync.should.be.eql(true);
		done();
	});
});

it("should define and require a local module with deps", function() {
	module.exports = "not set";
	define("my-module3", ["./dep"], function(dep) {
		dep.should.be.eql("dep");
		return 1234;
	});
	module.exports.should.be.eql("not set");
	define("my-module4", ["my-module3", "./dep"], function(myModule, dep) {
		dep.should.be.eql("dep");
		myModule.should.be.eql(1234);
		return 2345;
	});
	module.exports.should.be.eql("not set");
	require("my-module3").should.be.eql(1234);
	require("my-module4").should.be.eql(2345);
});

it("should define and require a local module that is relative", function () {
	define("my-dir/my-module3", function() {
		return 1234;
	});
	define("my-dir/my-other-dir/my-module4", function() {
		return 2345;
	});
	define("my-dir/my-other-dir/my-module5", ["./my-module4", "../my-module3"], function(myModule4, myModule3) {
		myModule3.should.be.eql(1234);
		myModule4.should.be.eql(2345);
		return 3456;
	});
	require("my-dir/my-other-dir/my-module5").should.be.eql(3456);
})
