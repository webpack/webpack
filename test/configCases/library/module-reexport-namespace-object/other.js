// The missing import marks `missing` as `provided === false` on `./inner`,
// which is what makes the library plugin inspect the reexport target
import { missing } from "./inner";

export const x = typeof missing;
