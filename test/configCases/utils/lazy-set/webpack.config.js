/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		compiler => {
			compiler.hooks.done.tap("Test", ({ compilation }) => {
				const items1 = Array.from(compilation.fileDependencies);
				const items2 = new Set(compilation.fileDependencies.keys());
				const items3 = new Set(compilation.fileDependencies.values());
				const items4 = new Set(compilation.fileDependencies.entries());
				expect(compilation.fileDependencies.has(items1[0])).toBe(true);
				compilation.fileDependencies.delete(items1[0]);
				expect(compilation.fileDependencies.has(items1[0])).toBe(false);
				compilation.fileDependencies.add(items1[0]);
				expect(compilation.fileDependencies.has(items1[0])).toBe(true);
				compilation.fileDependencies.add(items1[0]);
				expect(compilation.fileDependencies.size).toBe(items1.length);
				const items1Set = new Set(items1);
				expect(items2).toEqual(items1Set);
				expect(items3).toEqual(items1Set);
				expect(items4).toEqual(new Set(items1.map(x => [x, x])));
			});
		}
	]
};
