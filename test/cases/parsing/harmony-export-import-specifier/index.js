"use strict";

import { x, y } from "./a";

it("namespace export as from commonjs should override named export", function() {
	expect(x).toBe(1);
	expect(y).toBe(3);
});
