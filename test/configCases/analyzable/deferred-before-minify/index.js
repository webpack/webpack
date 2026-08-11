import fs from "fs";
import path from "path";

const BASE64 =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Generated column of every mapping, per generated line — the only field of a
 * segment this needs, decoded here so the case pulls in no bundled dependency.
 * @param {string} mappings the map's `mappings` field
 * @returns {number[][]} generated columns, indexed by zero-based generated line
 */
const generatedColumns = (mappings) =>
	mappings.split(";").map((line) => {
		const columns = [];
		let column = 0;

		for (const segment of line.split(",")) {
			if (segment === "") continue;

			let value = 0;
			let shift = 0;
			let index = 0;
			let digit;

			do {
				digit = BASE64.indexOf(segment[index++]);
				value += (digit & 31) << shift;
				shift += 5;
			} while (digit & 32);

			column += value & 1 ? -(value >> 1) : value >> 1;
			columns.push(column);
		}

		return columns;
	});

it("should load the chunk through the baked specifier", async () => {
	const { value, describe } = await import(
		/* webpackChunkName: "dynamic" */ "./dynamic"
	);

	expect(value).toBe("dynamic");
	expect(describe(2)).toContain("minifier");
});

it("should keep every mapping inside the line it names after minification", () => {
	const dir = __STATS__.outputPath;
	const code = fs.readFileSync(path.join(dir, "bundle0.mjs"), "utf8");
	const map = JSON.parse(
		fs.readFileSync(path.join(dir, "bundle0.mjs.map"), "utf8")
	);
	// A source checked out with CRLF ends each line with a `\r` the mappings do not
	// name — drop it so the line lengths are the same on every platform.
	const lines = code.split("\n").map((text) => text.replace(/\r$/, ""));
	const specifier = /"(\.\/dynamic\.[0-9a-f]+\.mjs)"/.exec(code);

	expect(specifier).not.toBe(null);
	expect(fs.existsSync(path.join(dir, specifier[1].slice(2)))).toBe(true);

	// A map written before the stand-in was replaced describes text longer than what
	// was emitted, so the mappings past the specifier run off the end of their line.
	const columns = generatedColumns(map.mappings);

	expect(columns.length).toBeLessThanOrEqual(lines.length);
	for (const [line, inLine] of columns.entries()) {
		for (const column of inLine) {
			expect([line, column]).toEqual([
				line,
				Math.min(column, lines[line].length)
			]);
		}
	}
});
