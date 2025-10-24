const path = require("path");
const { dirname, filename } = require("./commonjs.js");

it("should bundle", async () => {
	const __dirname = __STATS__.children[__STATS_I__].outputPath;
	const __filename = path.join(__STATS__.children[__STATS_I__].outputPath, `./bundle${__STATS_I__}.js`);

	expect(dirname).toBe(__dirname);
	expect(filename).toBe(__filename);
});
