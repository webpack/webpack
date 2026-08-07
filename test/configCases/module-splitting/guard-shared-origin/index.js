import { other } from "./barrel";
import { viaDirect } from "./direct";

it("does not split a re-exported origin another module also imports", async () => {
	expect(other).toBe("OTHER_VALUE");
	const ns = await import("./barrel");
	expect(ns.shared.tag).toBe("SHARED_ORIGIN_PAYLOAD");
	// Splitting the origin would give the barrel its own copy of the binding.
	expect(ns.shared).toBe(viaDirect);
});
