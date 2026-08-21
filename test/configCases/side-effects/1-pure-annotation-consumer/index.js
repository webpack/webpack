import { plus } from "library";

it("should keep the export it uses", () => {
	expect(plus(1, 2)).toBe(3);
});

it("should drop the side-effect-free module behind the unused export", () => {
	const fs = require("fs");
	const source = fs.readFileSync(__filename, "utf-8");
	// Spelled out in pieces, so this assertion is not itself a hit.
	const marker = ["PURE", "CJS", "MODULE", "MARKER"].join("_");

	expect(source).not.toContain(marker);
});
