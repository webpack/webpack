it("should ignore missing modules as entries", function() {
	// a.js and b.js should be evaluated correctly
});

it("should use WebpackMissingModule when evaluating missing modules", function() {
  expect(function() {
    require("./intentionally-missing-module");
  }).toThrow("Cannot find module './intentionally-missing-module'");
});
