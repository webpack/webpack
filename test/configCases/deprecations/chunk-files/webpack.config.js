/** @type {import("../../../../").Configuration} */
module.exports = {
	plugins: [
		compiler => {
			compiler.hooks.done.tap("Test", ({ compilation }) => {
				for (const c of compilation.chunks) {
					const chunk = /** @type {{ files: string[] } & import("../../../../").Chunk} */ (c);
					expect(chunk.files.length).toBe(chunk.files.size);
					expect(chunk.files[0]).toBe(Array.from(chunk.files)[0]);
					expect(chunk.files.join(",")).toBe(Array.from(chunk.files).join(","));
					expect(() => (chunk.files.length = 0)).toThrow();
					expect(() => chunk.files.pop()).toThrow();
					chunk.files.push("test.js");
					expect(chunk.files).toContain("test.js");
					chunk.files.delete("test.js");
				}
			});
		}
	]
};
