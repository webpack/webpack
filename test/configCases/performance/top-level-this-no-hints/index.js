import values from "./dep";

it("should handle the no-hints channel", () => {
	expect(values[0]).toBeUndefined();
	expect(values[1]).toBeUndefined();
	expect(__STATS__.hints).toHaveLength(0);
});
