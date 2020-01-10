module.exports = {
	entry: () => {
		return Promise.resolve({
			i: { import: "./i", dependOn: "j" },
			h: { import: "./h", dependOn: "i" },
			d: { import: "./d", dependOn: "e" },
			e: { import: "./e", dependOn: "f" },
			b: { import: "./b" },
			g: "./g",
			j: "./j",
			f: { import: "./f", dependOn: ["g", "h"] },
			c: { import: "./c", dependOn: "e" },
			bundle0: { import: "./a", dependOn: ["b", "c", "d"] }
		});
	},
	output: {
		filename: "[name].js"
	},
	plugins: [
		{
			apply(compiler) {
				const entries = new Set();
				compiler.hooks.compilation.tap("dependOn", compilation => {
					compilation.hooks.succeedEntry.tap(
						"dependOn",
						(dep, name, module) => {
							entries.add(name);
						}
					);
				});

				compiler.hooks.done.tap("dependOn", () => {
					const entriesArray = [...entries];
					expect(entriesArray.length).toBe(10);
					expect(entriesArray[entriesArray.length - 1]).toBe("bundle0");
				});
			}
		}
	]
};
