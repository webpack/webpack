it("should fire multiple code load callbacks in the correct order", function(done) {
	var calls = [];
	require.ensure([], function(require) {
		require("./duplicate");
		require("./duplicate2");
		calls.push(1);
	});
	require.ensure([], function(require) {
		require("./duplicate");
		require("./duplicate2");
		calls.push(2);
		calls.should.be.eql([1,2]);
		done();
	});
});
