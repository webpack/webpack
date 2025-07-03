/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		compiler => {
			compiler.hooks.done.tap("Test", ({ compilation }) => {
				for (const c of compilation.chunks) {
					const chunk =
						/** @type {{ files: string[] } & import("../../../../").Chunk} */ (
							c
						);
					expect(chunk.files).toHaveLength(chunk.files.size);
					expect(chunk.files[0]).toBe([...chunk.files][0]);
					expect(chunk.files.join(",")).toBe([...chunk.files].join(","));
					expect(() => (chunk.files.length = 0)).toThrow(
						/chunk\.files was changed from Array to Set \(writing to Array property 'length' is not possible\)/
					);
					expect(() => chunk.files.pop()).toThrow(
						/chunk\.files was changed from Array to Set \(using Array method 'pop' is not possible\)/
					);
					chunk.files.push("test.js");
					expect(chunk.files).toContain("test.js");
					chunk.files.delete("test.js");
				}
			});
		}
	]
};
