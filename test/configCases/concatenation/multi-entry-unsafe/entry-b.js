// entry-b: imports page-a WITHOUT going through shared.
// This means "shared" is NOT in entry-b's chunk group ancestors —
// so isAvailableChunk(sharedChunk, pageAChunk) = false when viewed from entry-b.
// The plugin MUST bail out on concatenating shared into page-a.
import { pageA } from "./page-a";

it("entry-b: page-a still works without shared being pre-loaded", () => {
    // page-a must use the normal require() path to load shared,
    // not assume it was already concatenated/inlined
    expect(pageA()).toBe("shared-multi-entry:unsafe-concat");
});
