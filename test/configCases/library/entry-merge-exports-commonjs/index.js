exports.fromIndex = "index";

it("should merge the exports of CommonJS entry modules", () => {
	expect(MergedCjsLib.fromA).toBe("a");
	expect(MergedCjsLib.fromB).toBe("b");
	expect(MergedCjsLib.fromIndex).toBe("index");
});

it("should leave out a name the entry modules bind differently", () => {
	expect("shared" in MergedCjsLib).toBe(false);
});

it("should not mark merged CommonJS exports as a namespace object", () => {
	expect(MergedCjsLib.__esModule).toBe(undefined);
});
