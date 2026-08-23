import defer * as deferred from "ext-defer";
import source sourced from "ext-source";

// The dynamic forms resolve to the source object itself, not to a namespace.
const dynamicDeferred = import.defer("ext-import-defer");
const dynamicSourced = import.source("ext-import-source");

export { deferred, sourced, dynamicDeferred, dynamicSourced };
