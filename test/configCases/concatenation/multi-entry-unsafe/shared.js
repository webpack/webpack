// Shared module that is imported by two different entry points.
// entry-a: entry-a → shared → page-a
// entry-b: entry-b → page-a  (does NOT go through shared)
//
// This means "shared" is NOT guaranteed to be available for all paths
// that reach page-a, so concatenation of "shared" into page-a is UNSAFE.
export const sharedValue = "shared-multi-entry";

export function sharedHelper() {
    return "unsafe-concat";
}
