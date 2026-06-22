const firstOnly = "first";

it("the first inlined entry runs in the shared startup scope", () => {
	expect(firstOnly).toBe("first");
});
