const path = require("path");

it("should stay quiet when every external is imported", () => {
	expect(typeof path.join).toBe("function");
});
