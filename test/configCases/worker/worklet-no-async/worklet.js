import { upper } from "./helper.js";
import { VENDOR } from "./vendor.js";

// entry chunk (upper), split chunk (VENDOR) and a dynamic import() async chunk —
// all pre-added by the bootstrap, which here uses a Promise-chain fallback.
registerProcessor("test", async (input) => {
	const { suffix } = await import("./dynamic.js");
	return upper(input) + VENDOR + suffix;
});
