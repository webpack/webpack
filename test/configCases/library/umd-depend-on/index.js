const fs = require("fs");
const path = require("path");
const vm = require("vm");

const outputPath = __STATS__.children[__STATS_I__].outputPath;

// Each call gets a fresh global so the chunk loading array can't leak between orders.
const load = (files) => {
	const context = vm.createContext({});
	return files.map((file) => {
		const code = fs.readFileSync(path.join(outputPath, file), "utf-8");
		const factory = vm.runInContext(
			`(function(module, exports) {\n${code}\n})`,
			context,
			{ filename: file }
		);
		const module = { exports: {} };
		factory(module, module.exports);
		return module.exports;
	});
};

it("should export a dependOn entry when its runtime chunk was loaded first", () => {
	const [, middle, leaf] = load(["shared.js", "middle.js", "leaf.js"]);

	expect(middle.middle).toBe("middle+shared");
	expect(leaf.leaf).toBe("leaf+middle+shared");
});

it("should throw when a dependOn entry runs without its runtime chunk", () => {
	expect(() => load(["middle.js"])).toThrow(
		'Chunk "middle" has no webpack runtime of its own. The chunks it needs ("shared") must be loaded before it, otherwise its library exports are not available.'
	);
});

it("should throw when a dependOn entry runs before the entry it depends on", () => {
	expect(() => load(["shared.js", "leaf.js"])).toThrow(
		'Chunk "leaf" has no webpack runtime of its own. The chunks it needs ("middle", "shared") must be loaded before it, otherwise its library exports are not available.'
	);
});
