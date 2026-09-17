import { getTitle } from "./payload.js";

it("should keep the export working", () => {
	expect(getTitle()).toBe("main");
});

it("should let the minifier fold the object behind a hoisted function export", () => {
	// Regression guard for #17626: `getTitle` is a hoisted function export reading
	// only `styles.title`, and the minifier must fold that read and drop the unused
	// keys even though `payload.js` is minified as its own chunk.
	const fs = __non_webpack_require__("fs");
	const path = __non_webpack_require__("path");
	const payloadChunk = fs.readFileSync(
		path.join(__dirname, "payload.js"),
		"utf-8"
	);
	const deadKey = "a".repeat(20);
	expect(payloadChunk).not.toContain(deadKey);
});
