it("should load a file with a hashbang", function() {
	var result = require("./hashbang");
	expect(result).toEqual("ok");
});
