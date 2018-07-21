it("should ignore require.config", function() {
	require.config({

	});
	requirejs.config({

	});
});
it("should have a require.version", function() {
	require.version.should.be.type("string");
});
it("should have a requirejs.onError function", function() {
	function f(){}
	requirejs.onError.should.be.type("function"); // has default handler
	var org = requirejs.onError;
	requirejs.onError = f;
	requirejs.onError.should.be.eql(f);
	requirejs.onError = org;
	require(["./file.js"], function() {});
});
