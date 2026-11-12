import { value as plainValue } from "http://localhost:9991/resolve.js";
import { value as gzipValue } from "http://localhost:9991/resolve.js?gzip";

it("should allow every URI matched by a global regexp in allowedUris", () => {
	expect(plainValue).toBe(42);
	expect(gzipValue).toBe(42);
});
