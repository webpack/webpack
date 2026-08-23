// Neither binding is used: narrowing the source one to `import "…"` would
// evaluate the module whose source was asked for.
import source unusedSource from "ext-source";
import defer * as unusedDefer from "ext-defer";

// The same request in two phases must stay two imports, concatenated or not.
import defer * as bothDefer from "ext-both";
import source bothSource from "ext-both";

export const keep = 1;
