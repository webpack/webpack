"use strict";

const fs = require("fs");
const path = require("path");

module.exports = {
	afterExecute(options) {
		const dir = options.output.path;
		const chunks = fs
			.readdirSync(dir)
			.filter((file) => file.endsWith(".mjs") && file !== "bundle0.mjs")
			.map((file) => ({
				file,
				content: fs.readFileSync(path.join(dir, file), "utf8")
			}));
		const chunkOf = (mark) => {
			const found = chunks.filter(({ content }) => content.includes(mark));
			expect(found).toHaveLength(1);
			return found[0];
		};
		// A browser that runs scripts reads the head `noscript` to its end tag as
		// text, so the script the tree builder moves out of it stays apart.
		expect(chunkOf("MARK_A").file).not.toBe(chunkOf("MARK_B").file);
		// The script that runs holds the runtime rather than taking it from a
		// `noscript` script's chunk, which never loads.
		const noscript = chunkOf("MARK_N");
		const runs = chunkOf("MARK_D");
		expect(runs.file).not.toBe(noscript.file);
		expect(runs.content).not.toContain(noscript.file);
	}
};
