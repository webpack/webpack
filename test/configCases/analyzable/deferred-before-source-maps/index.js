import fs from "fs";
import path from "path";

const BASE64 =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Generated columns of the mappings on one line, which is the only field of a
 * segment this needs — decoded here so the case pulls in no bundled dependency.
 * @param {string} mappings the map's `mappings` field
 * @param {number} line one-based generated line
 * @returns {number[]} generated column of each mapping on that line
 */
const generatedColumns = (mappings, line) => {
	const columns = [];
	let column = 0;

	for (const segment of mappings.split(";")[line - 1].split(",")) {
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
};

it("should load the chunk through the baked specifier", async () => {
	const { value } = await import(/* webpackChunkName: "dynamic" */ "./dynamic");

	expect(value).toBe("dynamic");
});

it("should keep the mappings past the specifier on the columns they name", () => {
	const dir = __STATS__.outputPath;
	const code = fs.readFileSync(path.join(dir, "bundle0.mjs"), "utf8");
	const map = JSON.parse(
		fs.readFileSync(path.join(dir, "bundle0.mjs.map"), "utf8")
	);
	// A source checked out with CRLF puts a `\r` after the statement, which the
	// mappings do not name — drop it so the last column is the same on every platform.
	const lines = code.split("\n").map((text) => text.replace(/\r$/, ""));
	const line = lines.findIndex((text) =>
		/"\.\/dynamic\.[0-9a-f]+\.mjs"/.test(text)
	);

	expect(line).not.toBe(-1);
	const specifier = /"(\.\/dynamic\.[0-9a-f]+\.mjs)"/.exec(lines[line]);

	expect(fs.existsSync(path.join(dir, specifier[1].slice(2)))).toBe(true);

	const columns = generatedColumns(map.mappings, line + 1);

	// The statement's last mapping names its last character. A map written against
	// the stand-in names a column short by what the two names differ in length by.
	expect(columns.length).toBeGreaterThan(1);
	expect(columns[columns.length - 1]).toBe(lines[line].length - 1);
	expect(columns[columns.length - 1]).toBeGreaterThan(lines[line].indexOf(specifier[1]));
});
