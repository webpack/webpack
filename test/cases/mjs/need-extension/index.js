it("should not be able to import a module without extension from .mjs files", function() {
	(function() {
		require("./test.mjs");
	}).should.throw('Cannot find module "./module"');
});
