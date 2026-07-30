import { disposed as awaitUsingDisposed } from "./await-using.js";
import { disposed as asyncDisposeDisposed } from "./await-using-async-dispose.js";

// Read at evaluation time of this module: each imported module must already
// have disposed its top-level resource.
export const results = { awaitUsingDisposed, asyncDisposeDisposed };
