it("should disallow exporting a func signature with result i64", function() {
	return import("./export-i64-result.wat").then(({a}) => {
		expect(a).toThrow(/invalid type/);
	});
});

it("should disallow exporting a func signature with param i64", function() {
	return import("./export-i64-param.wat").then(({a}) => {
		expect(a).toThrow(/invalid type/);
	});
});

it("should disallow importing a value type of i64", function() {
	return expect(import("./import-i64.wat")).rejects.toThrow(/invalid type/);
});
