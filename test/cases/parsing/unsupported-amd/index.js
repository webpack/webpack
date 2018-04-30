it("should fail on unsupported use of AMD require 1", function() {
	(function() {
		var abc = ["./a", "./b"];
		require(abc, function(a, b) {});
	}).should.throw();
});

it("should fail on unsupported use of AMD require 2", function() {
	(function() {
		var abc = ["./a", "./b"];
		function f(a, b) {}
		require(abc, f);
	}).should.throw();
});
