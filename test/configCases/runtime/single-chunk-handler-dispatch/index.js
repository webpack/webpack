const fs = require("fs");
const path = require("path");

it("should load a content-hashed chunk through the single handler", async () => {
	const lazy = await import("./lazy.js");
	expect(lazy.default).toBe("lazy");
});

it("should call the one chunk handler directly next to a hash-dependent sibling", () => {
	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, "runtime.js"),
		"utf8"
	);

	// Built at runtime so the needles are not source string literals here.
	const handlers = `${"__webpack_require__"}.f`;
	expect(source).toContain(`${handlers}.require(chunkId, promises)`);
	expect(source).not.toContain(`Object.keys(${handlers})`);
	// The sibling that made this hash-dependent still emits a real hash, not the
	// pre-hash placeholder the early read sees.
	expect(source).not.toMatch(/\.xxxxxxxx\.js/);
});
