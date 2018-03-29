var should = require("should");

function testCase(number) {
	require(number === 1 ? "./folder/file1" : number === 2 ? "./folder/file2" : number === 3 ? "./folder/file3" : "./missingModule").should.be.eql("file" + number);
	require(
		number === 1 ? "./folder/file1" :
		number === 2 ? "./folder/file2" :
		number === 3 ? "./folder/file3" :
		"./missingModule"
	).should.be.eql("file" + number);
}

it("should parse complex require calls", function() {
	should.strictEqual(new(require("./constructor"))(1234).value, 1234, "Parse require in new(…) should work");
	should.strictEqual(new ( require ( "./constructor" ) ) ( 1234 ) .value, 1234, "Parse require in new(…) should work, with spaces");
});

it("should let the user hide the require function", function() {
	(function(require) { return require; }(1234)).should.be.eql(1234);
	function testFunc(abc, require) {
		return require;
	}
	testFunc(333, 678).should.be.eql(678);
	(function() {
		var require = 123;
		require.should.be.eql(123);
	}());
	(function() {
		function require() {
			return 123;
		};
		require("error").should.be.eql(123);
	}());
	(function() {
		var module = 1233;
		module.should.be.eql(1233);
	}());
});

it("should not create a context for the ?: operator", function() {
	testCase(1);
	testCase(2);
	testCase(3);
});
