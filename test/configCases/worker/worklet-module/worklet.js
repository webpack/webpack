import { upper } from "./helper.js";
import { VENDOR } from "./vendor.js";

// upper stays in the entry chunk; VENDOR is forced into a split chunk that the
// module worklet links via native `import` (no runtime chunk pre-loading).
registerProcessor("test", (input) => upper(input) + VENDOR);
