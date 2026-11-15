import { createRequire } from "module";

const require = createRequire(import.meta.url);
const { definitions } = require("../../../schemas/WebpackOptions.json");

// Every library type webpack ships, read from the schema so a new one is
// measured without editing this case.
const [{ enum: types }] = definitions.LibraryType.anyOf;

// WHY: an ES module is named by whoever imports it, and `amd-require` runs
// the library instead of defining it, so both reject a name.
const UNNAMED = new Set(["module", "amd-require"]);

/** @type {import("../../..").Configuration[]} */
export default types.map((type) => ({
	name: type,
	entry: "./src/index.js",
	output: {
		filename: type === "module" ? "my-library.mjs" : "my-library.js",
		library: UNNAMED.has(type) ? { type } : { type, name: "MyLibrary" }
	}
}));
