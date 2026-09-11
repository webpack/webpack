import url from "./data.txt";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

// A stale url still names a file the earlier step emitted, so reading it back
// catches a consumer that kept the previous content hash.
it("should point a cached consumer at the current content hash", () => {
	const file = path.join(STATS_JSON.outputPath, path.basename(url));
	expect(fs.readFileSync(file, "utf8").trim()).toBe(`content-${WATCH_STEP}`);
});
