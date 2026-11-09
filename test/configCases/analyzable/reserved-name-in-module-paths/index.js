import fs from "fs";
import path from "path";

// Spelled in two halves: this file is in the bundle too.
const AT = "@@";
const HASH_DIRECTORY = `hash*${AT}webpackFullHash-0@@`;
const CHUNK_DIRECTORY = `${AT}webpackAnalyzableChunk:W1sibGl0ZXJhbCIsIiovIl1d@@`;

const readBundle = () =>
	fs.readFileSync(path.join(__STATS__.outputPath, "bundle0.mjs"), "utf-8");

it("should keep a module header comment naming a reserved name closed", () => {
	const bundle = readBundle();
	expect(global.reservedNameDirectories).toEqual(["hash", "chunk"]);
	// the header splits the `@@` of a reserved name with a space
	expect(bundle).toContain(
		`../${HASH_DIRECTORY.replace(AT, "@ @")}/hash.js ***!`
	);
	expect(bundle).toContain(
		`../${CHUNK_DIRECTORY.replace(AT, "@ @")}/chunk.js ***!`
	);
});
