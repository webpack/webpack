it("should ignore require.config", function() {
	require.config({

	});

	requirejs.config({

	});
});
it("should have a require.version", function() {
	expect(typeof require.version).toBe('string');
});
