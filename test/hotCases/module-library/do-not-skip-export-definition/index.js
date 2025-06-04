// We don't call `NEXT` here because we now don't support HMR in module library.
// But we should ensure module rendering is correct in first compilation.

import value from "@foo/value";

it("should compile and run", () => {
	expect(value).toBe(987654321);
});

export default value;

