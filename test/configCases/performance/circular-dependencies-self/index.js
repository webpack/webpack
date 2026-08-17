const selfcyc = require("./selfcyc");

it("should name both modules of the group, not the self-reference", () => {
	expect(selfcyc.y).toBe(2);
	expect(selfcyc.getOther()).toBe(2);
});
