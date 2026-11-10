import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

it("should emit an asset whose file name holds '#' where its url points", () => {
	const url = new URL("./img#1.png", import.meta.url);
	const file = fileURLToPath(url);
	expect(path.basename(file)).toMatch(/^img_1\.[0-9a-f]{8}\.png$/);
	expect(fs.existsSync(file)).toBe(true);
});
