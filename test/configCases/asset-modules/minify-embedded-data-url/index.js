import { url as imported } from "./url";

const url = new URL('data:application/json,{ "a" : "b c#" }', import.meta.url);

it("should hand `new URL` the rendered payload, escaped only where it must be", () => {
	// Only the `#` is escaped: it would start a fragment. The spaces inside the
	// string stay as written rather than every byte being percent-encoded.
	expect(url.href).toBe('data:application/json,{"a":"b c%23"}');
});

it("should reach a `new URL` in a module concatenated into another", () => {
	expect(imported.href).toBe('data:application/json,{"a":"b c%23"}');
});
