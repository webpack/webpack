it("should have a require.onError function by default", function() {
	expect((typeof require.onError)).toBe("function");
	require(["./file"]);
});
