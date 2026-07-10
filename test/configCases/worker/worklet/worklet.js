import { upper } from "./helper.js";

// Registered in the worklet scope; exercises a static import (bundled into the
// entry chunk) and a dynamic import (a separate chunk pre-added by the bootstrap).
registerProcessor("test", async (input) => {
	const { suffix } = await import("./dynamic.js");
	return upper(input) + suffix;
});
