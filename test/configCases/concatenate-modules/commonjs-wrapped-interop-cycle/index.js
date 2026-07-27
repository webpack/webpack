// only a never-taken branch reaches "namespace-user", so nothing in the cycle
// may run before the root finishes initializing its own bindings
if (global.__neverSet) {
	const user = require("./namespace-user");
	global.__cycleRead = user.read();
}

export const rootValue = "root";

it("should not evaluate a wrapped cycle member before the root is initialized", () => {
	expect(rootValue).toBe("root");
	expect(global.__cycleSaw).toBeUndefined();
});
