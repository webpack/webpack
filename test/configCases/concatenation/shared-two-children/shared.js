// Shared module that will be split into its own chunk.
// Both page-a and page-b import this module.
export const sharedValue = "shared-value";

export function sharedHelper() {
    return "from-shared";
}
