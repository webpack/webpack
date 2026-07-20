// URL asset with a `webpackPreload` comment under `target: ["web", "node"]`:
// the startup-hint runtime and the __webpack_require__.LA helper must both
// short-circuit on Node (no `document`) without throwing.
const img = new URL(/* webpackPreload: true */ "./image.png", import.meta.url);

it("should not throw on universal target when document is missing", () => {
	// Reaching here at all proves the runtime didn't throw on Node.
	expect(typeof img.href).toBe("string");
});
