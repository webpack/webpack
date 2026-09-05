const fs = require("fs");
const path = require("path");
const acorn = require("acorn");

const page = fs
	.readFileSync(path.resolve(__dirname, "page.html"))
	.toString("utf-8");

const bodies = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(
	(match) => match[1]
);

// `output.html.inline` leaves a sentinel where each chunk's code goes and swaps
// it in after the print, so the printer reads a stand-in rather than JavaScript.
it("declines a run whose bodies the print does not itself write", () => {
	expect(page.match(/<script\b/g)).toHaveLength(2);
	expect(bodies).toHaveLength(2);
});

it("keeps both chunks' code", () => {
	expect(bodies.join("\n")).toContain("webpackChunk");
	expect(bodies.join("\n")).toContain("console.log");
});

// Folding the sentinels handed the JavaScript minifier a pair of identifiers,
// which it joined with a `,` — leaving each chunk either side of one.
it("emits a page whose every script parses", () => {
	for (const body of bodies) {
		expect(() =>
			acorn.parse(body, { ecmaVersion: "latest", sourceType: "script" })
		).not.toThrow();
	}
});

// The entry chunk opens with one, and a fold would leave it behind the runtime
// where it is a plain string rather than a directive.
it("leaves the entry chunk's `use strict` where it is a directive", () => {
	const entry = bodies.find((body) => body.includes("console.log"));
	expect(entry.trimStart().startsWith('"use strict"')).toBe(true);
});
