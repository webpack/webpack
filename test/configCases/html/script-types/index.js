const fs = require("fs");
const path = require("path");

const page = require("./page.html");

// `import page` is typed loosely through the html module type; normalize once.
const pageContent = typeof page === "string" ? page : "";

// No `matchAll` — this bundle also runs on the Node 10 CI job.
const matches = (/** @type {RegExp} */ re) => pageContent.match(re) || [];

it("should bundle every executable JavaScript script type", () => {
	// One marker per spelling in the generated table, so an entry that is
	// mis-routed leaves its own body inline and names itself in the failure.
	expect(matches(/window\.__t\d+/g)).toEqual([]);

	// The tags are adjacent, so one run carries every body — the markers above
	// are what says each type was routed to it rather than left as data.
	const urls = matches(/<script[^>]*\bsrc="([\w-]+\d*\.js)"/g);
	expect(urls).toHaveLength(1);
	const chunk = fs.readFileSync(path.resolve(__dirname, "page.js"), "utf-8");
	for (let i = 0; i < 18; i++) {
		expect(chunk).toContain(`window.__t${i} = true`);
	}
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
