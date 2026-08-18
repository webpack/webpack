const path = require("path");

it("should report even though hints are off", () => {
	expect(typeof path.join).toBe("function");
});
