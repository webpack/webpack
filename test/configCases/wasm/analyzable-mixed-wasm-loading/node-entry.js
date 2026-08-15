import fs from "fs";
import path from "path";

const read = (chunk) =>
	fs.readFileSync(
		path.join(__STATS__.children[__INDEX__].outputPath, `${__NAME__}-${chunk}`),
		"utf8"
	);

it("should reach the binary through the loader its own runtime asked for", async () => {
	const { run } = await import(
		/* webpackChunkName: "node-lazy" */ "./node-lazy"
	);

	expect(run()).toBe(42);
});

it("should reference the binary in the form its runtime allows", () => {
	expect(read("node-lazy.mjs")).toContain(__NODE_REF__);
});
