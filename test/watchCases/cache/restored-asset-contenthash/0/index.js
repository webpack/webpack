import url from "./data.txt";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const emitted = (name) =>
	fs.readFileSync(path.join(STATS_JSON.outputPath, name), "utf8");

// A stale url still names a file an earlier step emitted, so read it back.
it("should point a restored consumer at a changed asset's content hash", () => {
	expect(emitted(url).trim()).toBe(`content-${WATCH_STEP}`);
});
