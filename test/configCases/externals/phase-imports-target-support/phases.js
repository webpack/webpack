import defer * as deferred from "ext-defer";
import source sourced from "ext-source";

// The dynamic forms resolve to the source object itself, not to a namespace.
const dynamicDeferred = import.defer("ext-import-defer");
const dynamicSourced = import.source("ext-import-source");

// The same request in two phases must stay two imports without concatenation too.
import defer * as bothDefer from "ext-both";
import source bothSource from "ext-both";

export { deferred, sourced, dynamicDeferred, dynamicSourced, bothDefer, bothSource };
