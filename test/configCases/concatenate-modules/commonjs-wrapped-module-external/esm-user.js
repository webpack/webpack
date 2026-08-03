// pulls the `module` external into the require() target's closure, so wrap
// propagation reaches it
import { existsSync } from "fs";

export const fromExternal = typeof existsSync;
