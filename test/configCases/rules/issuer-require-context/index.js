it("should apply an issuer rule to files imported via require.context", () => {
	function importAll(r) { r.keys().forEach(r); }
	importAll(require.context(".", false, /\.svg$/));
});
