function testCase(number) {
	expect(require(number === 1 ? "./folder/file1" : number === 2 ? "./folder/file2" : number === 3 ? "./folder/file3" : "./missingModule")).toBe("file" + number);
	expect(require(
		number === 1 ? "./folder/file1" :
		number === 2 ? "./folder/file2" :
		number === 3 ? "./folder/file3" :
		"./missingModule"
	)).toBe("file" + number);
}

it("should parse complex require calls", function() {
	// "Parse require in new(...) should work"
	expect(new(require("./constructor"))(1234).value).toBe(1234);
	// "Parse require in new(...) should work, with spaces"
	expect(new ( require ( "./constructor" ) ) ( 1234 ) .value).toBe(1234);
});

it("should let the user hide the require function", function() {
	expect((function(require) { return require; })(1234)).toBe(1234);
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

