import source sourced from "ext-source";

it("should report a target version that predates the source phase", () => {
	expect(typeof sourced).toBe("object");
});
