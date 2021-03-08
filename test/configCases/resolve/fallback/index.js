it("ignores the fallback if an existing module is present", () => {
	const two = require("./b/2");
	expect(two).toBe(2);
});

it("can fallback if the module does not exist", () => {
	const one = require("./b/1");
	expect(one).toBe(1);
});
