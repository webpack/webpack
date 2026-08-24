import total from "dep";

it("should handle the no-hints channel", () => {
	expect(total).toBe(66);
	expect(__STATS__.hints).toHaveLength(0);
});
