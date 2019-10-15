it("should ignore require.config", function() {
	require.config({

	});
	requirejs.config({

	});
});
it("should have a require.version", function() {
	expect(require.version).toBeTypeOf("string");
});
it("should have a requirejs.onError function", function() {
	function f(){}
	expect(requirejs.onError).toBeTypeOf("undefined"); // has no default handler
	var org = requirejs.onError;
	requirejs.onError = f;
	expect(requirejs.onError).toBe(f);
	requirejs.onError = org;
	require(["./file.js"], function() {});
});
