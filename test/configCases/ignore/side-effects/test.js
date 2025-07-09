"use strict";

import "ignored-module";
import "./ignored-module";

it("should remove all ignored modules", async function() {
	// Current module + module with runtime code to load context modules
	expect(Object.keys(__webpack_modules__)).toHaveLength(2);

	const x = "a";
	const locale = (await import("./locales/" + x)).default;

	expect(locale).toBe("a");
	expect(Object.keys(__webpack_modules__)).toHaveLength(3);
});
