it("should result in a warning when using module.exports in harmony module", function() {
	var x = require("./module1");
	expect(x).toEqual(nsObj({
		default: 1234
	}));
});
