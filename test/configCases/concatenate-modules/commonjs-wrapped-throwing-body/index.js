// strictModuleErrorHandling caches the error and re-throws it on every later
// access instead of handing back the half-initialized exports
import { get } from "./mid";

function attempt() {
	try {
		return { ok: get() };
	} catch (err) {
		return { error: err.message };
	}
}

it("should re-throw the cached error on every access to a failed member", () => {
	expect(attempt()).toEqual({ error: "boom" });
	expect(attempt()).toEqual({ error: "boom" });
});
