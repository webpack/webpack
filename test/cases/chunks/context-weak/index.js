it("should not bundle context requires with asyncMode === 'weak'", function() {
	const contextRequire = import.meta.webpackContext(".", {
		recursive: false,
		regExp: /two/,
		mode: "weak"
	});
	expect(function() {
		contextRequire("./two")
	}).toThrowError(/not available/);
});

it("should find module with asyncMode === 'weak' when required elsewhere", function() {
	const contextRequire = require.context(".", false, /.+/, "weak");
	expect(contextRequire("./three")).toBe(3);
	require("./three"); // in a real app would be served as a separate chunk
});

it("should find module with asyncMode === 'weak' when required elsewhere (recursive)", function() {
	const contextRequire = require.context(".", true, /.+/, "weak");
	expect(contextRequire("./dir/four")).toBe(4);
	require("./dir/four"); // in a real app would be served as a separate chunk
});
