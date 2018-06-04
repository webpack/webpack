const errorRegex = /wasm function signature contains illegal type|invalid type/;

it("should disallow exporting a func signature with result i64", function() {
	return import("./export-i64-result").then(({a}) => {
		expect(() => a()).toThrow(errorRegex);
	});
});

it("should disallow exporting a func signature with param i64", function() {
	return import("./export-i64-param").then(({a}) => {
		expect(() => a()).toThrow(errorRegex);
	});
});

it("should disallow importing a value type of i64", function() {
	return expect(import("./import-i64.wat")).rejects.toThrow(errorRegex);
});
