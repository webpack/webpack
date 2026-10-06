import count from "./count-loader!./subject";
import other from "./other";

// The loader counts its runs: step 1 changes another module only, so the
// result is read from the cache; step 2 changes the subject, so it runs again.
it("should not run a loader again for a module that did not change", () => {
	expect(other).toBe(WATCH_STEP);
	expect(count).toBe(WATCH_STEP === "2" ? 1 : 0);
});
