it("should be possible to export default an imported name", function() {
	var x = require("./module");
	expect(x).toEqual(nsObj({ default: 1234 }));
});
