// This module lives in a shared (parent) chunk.
// It should be concatenatable into page-a (child chunk) because
// the parent chunk is guaranteed to be loaded before the child chunk.
export const sharedValue = "shared-value";

export function sharedHelper() {
    return "from-shared";
}
