import { USED } from "./pkg";
import { state } from "./state";

// A side-effect-free package lets webpack drop the bare import entirely, so the
// flag decides whether the effect runs at all.
it("should re-read a package sideEffects flag that changed", () => {
	expect(USED).toBe("used");
	expect(state.ran).toBe(Number(WATCH_STEP) === 1);
});
