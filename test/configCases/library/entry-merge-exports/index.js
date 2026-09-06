export const fromIndex = "index";

it("should expose the exports of every entry module", () => {
	expect(MergedLib.fromA).toBe("a");
	expect(MergedLib.fromB).toBe("b");
	expect(MergedLib.fromIndex).toBe("index");
});

it("should let a later entry module win a conflicting export name", () => {
	expect(MergedLib.shared).toBe("from-b");
});

it("should mark the merged exports as a namespace object", () => {
	expect(MergedLib.__esModule).toBe(true);
});
