import "./barrel";

it("should re-evaluate side-effect state after the leaf gains one", () => {
	const sideEffectGained = global.__sideEffectGained;
	delete global.__sideEffectGained;
	expect(sideEffectGained).toBe(WATCH_STEP === "0" ? undefined : true);
});
