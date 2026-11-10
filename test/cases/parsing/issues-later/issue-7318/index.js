const type = require("./typeof");

it("issue-7318: should not output invalid code", () => {
	expect(type).toBe("number");
});
