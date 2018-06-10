it("should be possible to export default an imported name", function() {
	var x = require("./module");
	expect(x).toEqual({ default: 1234, [Symbol.toStringTag]: "Module" });
});
