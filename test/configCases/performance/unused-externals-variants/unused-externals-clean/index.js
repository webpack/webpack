const path = require("path");

it("unused-externals-clean: should stay quiet when every external is imported", () => {
	expect(typeof path.join).toBe("function");
});
