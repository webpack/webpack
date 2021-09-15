it("should replace a context with a new resource and reqExp", function(done) {
	function rqInContext(x, callback) {
		require([x], function(x) {
			callback(x);
		});
	}
	rqInContext("replaced", function(r) {
		expect(r).toBe("ok");
		done();
	});
});
