const fs = require("fs");
const path = require("path");

it("should expose hostChunks on each entrypoint hint and honor per-chunk rewrites", () => {
	const manifest = JSON.parse(
		fs.readFileSync(path.resolve(__dirname, "hints.json"), "utf-8")
	);
	const hints = manifest.home;
	expect(Array.isArray(hints)).toBe(true);

	// Every descriptor carries its origin chunk name(s).
	for (const h of hints) {
		expect(Array.isArray(h.hostChunks)).toBe(true);
		expect(h.hostChunks.length).toBeGreaterThan(0);
	}

	// The runtime-chunk hint was rewritten with the `?rt` marker by the callback.
	const runtimeHint = hints.find((h) => h.hostChunks.includes("runtime"));
	expect(runtimeHint).toBeDefined();
	expect(runtimeHint.href).toContain("?rt");

	// A non-runtime hint (the font asset) is left untouched.
	const font = hints.find((h) => h.href.includes("inter.woff2"));
	expect(font).toBeDefined();
	expect(font.href).not.toContain("?rt");
});
