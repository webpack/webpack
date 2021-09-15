const type = require("./typeof");

it("should not output invalid code", () => {
	expect(type).toBe("number");
});
