import { upper } from "./helper.js";
import { VENDOR } from "./vendor.js";

// upper -> stays in the entry chunk; VENDOR -> forced into a split chunk;
// dynamic import -> a separate async chunk. All are pre-added by the bootstrap.
registerProcessor("test", async (input) => {
	const { suffix } = await import("./dynamic.js");
	return upper(input) + VENDOR + suffix;
});
