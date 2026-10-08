it("harmony-injecting-order: should inject variables before exporting", function() {
	expect(require("./file").f()).toEqual({});
});
