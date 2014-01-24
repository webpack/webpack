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

it("should not create a chunk for a AMD require to a local module", function() {
	define("my-module2", function() {
		return 1235;
	});
	var sync = false;
	require(["my-module2"], function(myModule2) {
		myModule2.should.be.eql(1235);
		sync = true;
	});
	sync.should.be.eql(true);
});
