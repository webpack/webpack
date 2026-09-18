"use strict";

// `var` (not `const`) so the parser cannot fold the branch away and drop the
// module that references the async value whose generator rejects.
var never = false;

it("should surface a rejected async generator only when its value is used", function () {
	expect(ASYNC_OK).toBe("ASYNC_OK");
	if (never) {
		require("./throw.js");
	}
});