import { value as brValue } from "http://localhost:9990/resolve.js?br-case";
import { value as deflateValue } from "http://localhost:9990/resolve.js?deflate-case";
import { value as gzipValue } from "http://localhost:9990/resolve.js?gzip-case";

it("should decode a content-encoding spelled with a different case", () => {
	expect(gzipValue).toBe(42);
	expect(brValue).toBe(42);
	expect(deflateValue).toBe(42);
});
