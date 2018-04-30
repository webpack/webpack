it("should not bundle context requires with asyncMode === 'weak'", function() {
	var contextRequire = require.context(".", false, /two/, "weak");
	(function() {
		contextRequire("./two")
	}).should.throw(/not available/);
});

it("should find module with asyncMode === 'weak' when required elsewhere", function() {
	var contextRequire = require.context(".", false, /.+/, "weak");
	contextRequire("./three").should.be.eql(3);
	require("./three"); // in a real app would be served as a separate chunk
});

it("should find module with asyncMode === 'weak' when required elsewhere (recursive)", function() {
	var contextRequire = require.context(".", true, /.+/, "weak");
	contextRequire("./dir/four").should.be.eql(4);
	require("./dir/four"); // in a real app would be served as a separate chunk
});
