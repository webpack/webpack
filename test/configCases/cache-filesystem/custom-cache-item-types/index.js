const fs = require("fs");
const path = require("path");

it("should restore every value kind a plugin stores in the filesystem cache", () => {
	const result = JSON.parse(
		fs.readFileSync(path.join(__dirname, "cache-result.json"), "utf8")
	);
	// Under a filesystem cache this run follows two builds that filled it.
	expect(result.restored).toBe(result.filesystem);
});
