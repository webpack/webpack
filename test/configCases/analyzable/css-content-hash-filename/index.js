import fs from "fs";
import path from "path";

// Source of our own may spell a stand-in: one whose payload is not a chunk reference,
// one whose payload is not even readable.
const DECOYS = [
	"./@@webpackAnalyzableChunk:e30@@",
	"./@@webpackAnalyzableChunk:zzzz@@"
];

it("should load the chunk named after its css content hash", async () => {
	const lazy = await import("./lazy");
	expect(lazy.value).toBe("lazy");
});

it("should bake a specifier that is a file on disk", () => {
	const bundle = fs.readFileSync(
		path.join(__STATS__.outputPath, "main.mjs"),
		"utf8"
	);
	// Needle built at runtime so it is not a source string literal here.
	const helper = `${"__webpack_require__"}.ei(`;

	expect(bundle).toContain(helper);
	const specifier = /import\((?:\/\*[^*]*\*\/\s*)?"([^"]+)"\)/.exec(
		bundle.slice(bundle.indexOf(helper))
	);

	expect(specifier).not.toBe(null);
	// A hash the probe never offered used to read back as `undefined` in both calls,
	// which made the name look constant and baked that word into the specifier.
	expect(specifier[1]).not.toContain("undefined");
	expect(fs.existsSync(path.join(__STATS__.outputPath, specifier[1]))).toBe(
		true
	);

	for (const decoy of DECOYS) expect(bundle).toContain(decoy);
});
