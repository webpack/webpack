export const fromIndex = "index";

it("should expose the exports of every entry module", () => {
	expect(MergedLib.fromA).toBe("a");
	expect(MergedLib.fromB).toBe("b");
	expect(MergedLib.fromIndex).toBe("index");
});

it("should leave out a name the entry modules bind differently", () => {
	expect("shared" in MergedLib).toBe(false);
});

it("should keep a name the entry modules take from one binding", () => {
	expect(MergedLib.fromBoth).toBe("both");
});

it("should mark the merged exports as a namespace object", () => {
	expect(MergedLib.__esModule).toBe(true);
});
