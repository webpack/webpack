import fs from "fs";
import path from "path";

// never called: the chunk only has to exist for the CSS loading runtime to be
// emitted, and loading it here would use node's `fs`, which a worker lacks
export const loadStyled = () => import("./styled.js");

// split, because this file is part of the bundle it reads back and the needles
// would otherwise match themselves
const diskRead = ["read", "File("].join("");
const domLink = ["load", "Stylesheet("].join("");

it("keeps the node-only disk read out of a webworker build", () => {
	const source = fs.readFileSync(
		path.join(__STATS__.outputPath, "bundle0.mjs"),
		"utf8"
	);

	expect(typeof loadStyled).toBe("function");
	expect(source).not.toContain(diskRead);
	expect(source).toContain(domLink);
});
