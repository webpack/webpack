const fs = require("node:fs");
const path = require("path");

it("should name a core module external by the key it matched, whichever spelling the code uses", () => {
	expect(typeof fs.readFileSync).toBe("function");
	expect(typeof path.join).toBe("function");
	expect(require.resolveWeak("node:fs")).toBe("fs");
	expect(require.resolveWeak("path")).toBe("node:path");
});
