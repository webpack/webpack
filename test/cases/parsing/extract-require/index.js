var should = require("should");

function testCase(number) {
	expect(require(number === 1 ? "./folder/file1" : number === 2 ? "./folder/file2" : number === 3 ? "./folder/file3" : "./missingModule")).toBe("file" + number);
	require(
		number === 1 ? "./folder/file1" :
		number === 2 ? "./folder/file2" :
		number === 3 ? "./folder/file3" :
		"./missingModule"
	expect()).toBe("file" + number);
}

it("should parse complex require calls", function() {
	should.strictEqual(new(require("./constructor"))(1234).value, 1234, "Parse require in new(...) should work");
	should.strictEqual(new ( require ( "./constructor" ) ) ( 1234 ) .value, 1234, "Parse require in new(...) should work, with spaces");
});

it("should let the user hide the require function", function() {
	(function(require) { return require; }expect((1234))).toBe(1234);
	function testFunc(abc, require) {
		return require;
	}
	expect(testFunc(333, 678)).toBe(678);
	(function() {
		var require = 123;
		expect(require).toBe(123);
	}());
	(function() {
		function require() {
			return 123;
		};
		expect(require("error")).toBe(123);
	}());
	(function() {
		var module = 1233;
		expect(module).toBe(1233);
	}());
});

it("should not create a context for the ?: operator", function() {
	testCase(1);
	testCase(2);
	testCase(3);
});
