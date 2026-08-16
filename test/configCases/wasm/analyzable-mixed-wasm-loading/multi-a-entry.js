import fs from "fs";
import path from "path";

// Both entries reach this one chunk, so its runtime is a set of keys rather than a
// single one -- and neither fetches, so every chunk is scanned before the answer.
it("should reach the binary of a chunk two runtimes share", async () => {
	const { run } = await import(
		/* webpackChunkName: "multi-lazy" */ "./multi-lazy"
	);

	expect(run()).toBe(42);
});

it("should bake for a shared chunk no runtime fetches", () => {
	const source = fs.readFileSync(
		path.join(
			__STATS__.children[__INDEX__].outputPath,
			`${__NAME__}-multi-lazy.mjs`
		),
		"utf8"
	);

	expect(source).toContain(__BAKED__);
});
