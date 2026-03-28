export const c = 3;

it("should export from all entry modules", function () {
	expect(MultiEntryLib.a).toBe(1);
	expect(MultiEntryLib.b).toBe(2);
	expect(MultiEntryLib.c).toBe(3);
});
