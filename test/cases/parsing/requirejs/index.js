it("should ignore require.config", function() {
	require.config({
	
	});
	requirejs.config({
	
	});
});
it("should have a require.version", function() {
	require.version.should.be.type("string");
});
