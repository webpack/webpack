import { mark } from "./inner";

// concatenating with `./inner` is what gives this module the code generation
// data the rename would otherwise trust in place of the rendered source
export const marked = mark();
