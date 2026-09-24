import { url as imported } from "./url";

const url = new URL('data:application/json,{ "a" : "b c" }', import.meta.url);
const fragment = new URL('data:application/json,{ "a" : "b#c" }', import.meta.url);

it("should hand `new URL` the rendered payload, escaped only where it must be", () => {
	// The spaces inside the string stay as written rather than every byte being
	// percent-encoded.
	expect(url.href).toBe('data:application/json,{"a":"b c"}');
});

it("should reach a `new URL` in a module concatenated into another", () => {
	// A `%` the payload holds is escaped, or it would start an escape.
	expect(imported.href).toBe('data:application/json,{"a":"b c%25"}');
});

it("should leave a payload a raw `#` cuts short as written", () => {
	// Built at runtime, so it is the URL the browser reads from the source.
	const written = ["data:application/json,", '{ "a" : "b#c" }'].join("");
	expect(fragment.href).toBe(new URL(written).href);
});
