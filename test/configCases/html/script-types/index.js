import page from "./page.html";

// `import page` is typed loosely through the html module type; normalize once.
const pageContent = typeof page === "string" ? page : "";

const scriptChunkUrls = [
	...pageContent.matchAll(/<script[^>]*\bsrc="(__html_[^"]+)"/g)
].map((m) => m[1]);

it("should bundle every executable JavaScript script type", () => {
	// One marker per spelling in the generated table, so an entry that is
	// mis-routed leaves its own body inline and names itself in the failure.
	const inlineMarkers = [...pageContent.matchAll(/window\.__t(\d+)/g)].map(
		(m) => m[1]
	);
	expect(inlineMarkers).toEqual([]);

	// Every one became its own entry chunk instead.
	expect(scriptChunkUrls).toHaveLength(18);
});

it("should leave a data block inline", () => {
	// Bundling one of these would run data as code.
	for (let i = 0; i < 5; i++) {
		expect(pageContent).toContain(`{"inline${i}":1}`);
	}
	expect(pageContent).toContain('<script type="application/ld+json">');
	expect(pageContent).toContain('<script type="importmap">');
	expect(pageContent).toContain('<script type="application/wasm">');
});
