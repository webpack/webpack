const fs = require("fs");
const path = require("path");

it("should call a handler installed through a legacy main template hook", async () => {
	const lazy = await import("./lazy.js");
	expect(lazy.default).toBe("lazy");
	expect(global.__legacyHandlerCalled).toBe(true);
});

it("should keep the general dispatch when a module cannot name what it installs", () => {
	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, "runtime.js"),
		"utf8"
	);

	// Built at runtime so the needles are not source string literals here.
	const handlers = `${"__webpack_require__"}.f`;
	expect(source).toContain(`Object.keys(${handlers})`);
	expect(source).not.toContain(`${handlers}.require(chunkId, promises)`);
});
