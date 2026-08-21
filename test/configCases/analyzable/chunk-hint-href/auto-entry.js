import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

it("should hint at every child and load them", async () => {
	const a = await import(
		/* webpackChunkName: "a", webpackPrefetch: true */ "./a.js"
	);
	// Reachable but hinted at by nothing, so no url is written out for it.
	const plain = await import(
		/* webpackChunkName: "plain" */ "./plain.js"
	);

	expect(a.default).toBe("a");
	expect(plain.default).toBe("plain");

	// The neutral runtime guards the DOM, so the hints only land where there is one.
	if (typeof document !== "undefined") {
		const links = document.head._children.filter((el) => el._type === "link");

		expect(links.map((link) => link.rel).sort()).toEqual([
			"modulepreload",
			"prefetch",
			"prefetch"
		]);
		// A baked href is absolute, so this is the emitted file itself rather than a
		// name that only resolves against wherever the document happened to sit.
		for (const link of links) {
			expect(link.href).toMatch(/^file:\/\//);
			expect(fs.existsSync(fileURLToPath(link.href))).toBe(true);
		}
	}
});

it("should write the hint urls out and drop what built them", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
		"utf8"
	);

	expect(bundle).toContain("link.href = chunkUrls[chunkId]();");
	expect(bundle).toContain(`new URL("./${__NAME__}-a.mjs"`);
	expect(bundle).toContain(`new URL("./${__NAME__}-b.mjs"`);
	// Both children hint at it, and it is written out once.
	expect(bundle.split(`new URL("./${__NAME__}-shared.mjs"`)).toHaveLength(2);
	// Nothing hints at it, so it is not in the map.
	expect(bundle).not.toContain(`new URL("./${__NAME__}-plain.mjs"`);
	// Nothing reads the id-keyed lookup or the public path any more, so neither ships.
	expect(bundle).not.toContain(`${"__webpack_require__"}.u = `);
	expect(bundle).not.toContain(`${"__webpack_require__"}.p = `);
});

it("should write a url out for every id a trigger can hand a handler", () => {
	// Built from pieces so this file's own source, inlined into the bundle, is not
	// what the patterns find.
	const source = fs
		.readFileSync(
			path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}.mjs`),
			"utf8"
		)
		.replace(/\/\*+\/ ?/g, "");
	const find = (pattern) => new RegExp(pattern, "g");
	const dispatched = new Set();

	for (const match of source.matchAll(
		find(`${"chunkToChildren"}Map = (\\{[\\s\\S]*?\\n\\t\\});`)
	)) {
		for (const ids of Object.values(JSON.parse(match[1]))) {
			for (const id of ids) dispatched.add(id);
		}
	}
	// The startup hint names its chunk directly rather than through a map.
	for (const match of source.matchAll(
		find(`${"__webpack_require__"}\\.[EG]\\("([^"]+)"\\)`)
	)) {
		dispatched.add(match[1]);
	}

	const block = source.match(find(`const ${"chunk"}Urls = \\{([\\s\\S]*?)\\n\\t\\};`));
	const baked = new Set(
		[...block[0].matchAll(find('"([^"]+)": \\(\\) =>'))].map((m) => m[1])
	);

	expect(dispatched.size).toBeGreaterThan(0);
	// A handler reached with an id no url was written for would silently skip the hint,
	// so the two sets have to agree exactly.
	expect([...dispatched].sort()).toEqual([...baked].sort());
});
