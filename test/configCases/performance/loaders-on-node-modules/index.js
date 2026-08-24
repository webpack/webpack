import total from "dep";

it("should report a loader that ran over node_modules", () => {
	expect(total).toBe(66);
});
