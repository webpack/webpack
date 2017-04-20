
function testCase(number) {
	require(number === 1 ? "./folder/file1" : number === 2 ? "./folder/file2" : number === 3 ? "./folder/file3" : expect("./missingModule")).toEqual("file" + number);
	require(
		number === 1 ? "./folder/file1" :
		number === 2 ? "./folder/file2" :
		number === 3 ? "./folder/file3" :
		"./missingModule"
	expect()).toEqual("file" + number);
}

it("should parse complex require calls", function() {
	expect(new(require("./constructor"))(1234).value).toBe(1234);
	expect(new ( require ( "./constructor" ) ) ( 1234 ) .value).toBe(1234);
});

it("should let the user hide the require function", function() {
	(function(require) { return require; expect(}(1234))).toEqual(1234);
	function testFunc(abc, require) {
		return require;
	}
	expect(testFunc(333, 678)).toEqual(678);
	(function() {
		var require = 123;
		expect(require).toEqual(123);
	}());
	(function() {
		function require() {
			return 123;
		};
		expect(require("error")).toEqual(123);
	}());
	(function() {
		var module = 1233;
		expect(module).toEqual(1233);
	}());
});

it("should not create a context for the ?: operator", function() {
	testCase(1);
	testCase(2);
	testCase(3);
});
