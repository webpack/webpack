// strictModuleExceptionHandling drops the memo when the body throws, so the
// next access runs it again instead of reusing the half-initialized exports
import { runs } from "./counter";
import { get } from "./mid";

function attempt() {
	try {
		return { ok: get() };
	} catch (err) {
		return { error: err.message };
	}
}

it("should run a failed member body again on every access", () => {
	expect(attempt()).toEqual({ error: "boom" });
	expect(runs()).toBe(1);
	expect(attempt()).toEqual({ error: "boom" });
	expect(runs()).toBe(2);
});

it("should keep a member that did not throw memoized", () => {
	// counter.js is required by every boom.js run but only evaluates once
	expect(runs()).toBe(2);
});
