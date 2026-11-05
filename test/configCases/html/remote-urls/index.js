const fragment = require("./fragment.html");

it("should keep absolute remote URLs as written", () => {
	// On a `web` target, `externalsPresets.web` turns these into externals; the
	// emitted markup must carry the URL itself, not a `data:,` placeholder.
	expect(fragment).not.toContain("data:,");
	expect(fragment).toContain('src="https://example.com/remote.png"');
	expect(fragment).toContain("https://example.com/remote-1x.png 1x");
	expect(fragment).toContain('poster="https://example.com/poster.jpg"');
	expect(fragment).toContain('src="https://example.com/movie.mp4"');
	expect(fragment).toContain('src="//cdn.example.com/protocol-relative.png"');
});

it("should still bundle local URLs next to remote ones", () => {
	expect(fragment).toMatch(/<img src="image\.png" alt="local">/);
	expect(fragment).toMatch(/remote-1x\.png 1x, image\.png 2x/);
});
