const expected = { 0: "a", 1: "b", 2: "a" };

it("gives byte-identical output when a change is reverted", () => {
	expect(require("./v").value).toBe(expected[WATCH_STEP]);
});
