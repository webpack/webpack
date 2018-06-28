import d from "library";
var data = require("library");

it("should get default export from library (" + NAME + ")", function() {
	expect(data).toBe("default-value");
	expect(d).toBe("default-value");
});
