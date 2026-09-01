import fs from "fs";
import path from "path";

import { shared } from "./empty.js";

const DEPTH = 16;

it("should build a deep chain of dependOn diamonds", () => {
	expect(shared).toBe("shared");
});

it("should emit every entrypoint of the chain", () => {
	for (let i = 0; i < DEPTH; i++) {
		for (const name of [`left${i}`, `right${i}`, `join${i}`]) {
			expect(fs.existsSync(path.resolve(__dirname, `${name}.js`))).toBe(true);
		}
	}
});
