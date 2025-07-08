"use strict";

import "ignored-module";
import "./ignored-module";

it("should remove all ignored moduels", function() {
	expect(Object.keys(__webpack_modules__).length).toBe(1);
});
