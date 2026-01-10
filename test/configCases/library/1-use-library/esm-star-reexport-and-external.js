import { readFile, foo, bar, resolve } from "library";

it("should handle external module correctly with star reexports", () => {
	// `foo` and `bar` are reexported by `reexport-foo` module and `reexport-bar` module,
	// but the entry module's exports take precedence.
	expect(foo).toBe(1);
	expect(bar).toBe(1);

	const fs = require("fs");
	expect(readFile).toBe(fs.readFile);

	const path = require("path");
	expect(resolve).toBe(path.resolve);
});
