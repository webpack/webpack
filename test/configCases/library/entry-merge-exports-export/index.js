export const picked = { answer: 42 };
export const unusedFromIndex = "index";

it("should pick the named export off the merged exports", () => {
	expect(PickedLib.answer).toBe(42);
});
