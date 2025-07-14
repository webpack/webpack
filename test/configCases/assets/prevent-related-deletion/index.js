const fs = require("fs")
const path = require("path")

try {
	import("./module.js");
} catch (_err) {
	// Nothing
}

it("should prevent related deletion", async () => {
	expect(fs.existsSync(path.join(__STATS__.outputPath, "module_js.bundle0.js"))).toBe(false);
	expect(fs.existsSync(path.join(__STATS__.outputPath, "module_js.bundle0.js.map"))).toBe(true);
});
