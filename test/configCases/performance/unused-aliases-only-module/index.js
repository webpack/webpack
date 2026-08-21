import sub from "@only/sub";

it("should not count a prefix match for an exact-only alias", () => {
	expect(sub).toBe("sub");
});
