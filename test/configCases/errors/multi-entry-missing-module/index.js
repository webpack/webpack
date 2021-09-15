it("should ignore missing modules as entries", function() {
	// a.js and b.js should be evaulated correctly
});

it("should use WebpackMissingModule when evaluating missing modules", function() {
  expect(function() {
    require("./intentionally-missing-module");
  }).toThrowError("Cannot find module './intentionally-missing-module'");
});
