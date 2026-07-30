import "./barrel";

it("should re-evaluate side-effect state after the leaf gains one", () => {
	expect(global.__sideEffectGained).toBe(WATCH_STEP === "0" ? undefined : true);
});
