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

it("should re-encode character references in remote URLs", () => {
	// `&amp;copy;` is decoded to `&copy;` when the page is parsed; written back
	// bare, the browser would read `©`. A decoded `&quot;` would end the value.
	expect(fragment).toContain('src="https://example.com/q.png?a=1&amp;copy;=2"');
	expect(fragment).toContain(
		'src="https://example.com/quote.png?q=&quot;x&quot;"'
	);
});

it("should still bundle local URLs next to remote ones", () => {
	expect(fragment).toMatch(/<img src="image\.png" alt="local">/);
	expect(fragment).toMatch(/remote-1x\.png 1x, image\.png 2x/);
});
