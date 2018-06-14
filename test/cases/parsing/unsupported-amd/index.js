it("should fail on unsupported use of AMD require 1", function() {
	expect(function() {
		var abc = ["./a", "./b"];
		require(abc, function(a, b) {});
	}).toThrowError();
});

it("should fail on unsupported use of AMD require 2", function() {
	expect(function() {
		var abc = ["./a", "./b"];
		function f(a, b) {}
		require(abc, f);
	}).toThrowError();
});
