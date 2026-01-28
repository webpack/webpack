const fs = require("fs");
const path = require("path");

it("should be able to ignore require.resolve()", () => {
	const source = fs.readFileSync(path.join(__dirname, "bundle1.js"), "utf-8");
	expect(source).toMatch(`require.resolve(/* webpackIgnore: true */ "./non-exists")`);
	expect(source).toMatch(`createRequire(import.meta.url).resolve(/* webpackIgnore: true */ "./non-exists")`);
	expect(source).toMatch(`require.resolve(/* webpackIgnore: true */ "./non-exists")`);
});
