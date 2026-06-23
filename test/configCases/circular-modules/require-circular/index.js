const a = require("./a");

it("should mark every module of a CommonJS require cycle as circular", () => {
	expect(a).toBe("a");
});
