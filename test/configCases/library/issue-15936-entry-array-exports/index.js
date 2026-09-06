export const fromIndex = "index";

it("should expose exports of all entry modules in the library (issue 15936)", () => {
	expect(MultiEntryLib.fromA).toBe("a");
	expect(MultiEntryLib.fromB).toBe("b");
	expect(MultiEntryLib.fromIndex).toBe("index");
});

it("should let later entry modules win on export name conflicts", () => {
	expect(MultiEntryLib.shared).toBe("from-b");
});
