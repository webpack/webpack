"use strict";

// never called: the test harness cannot serve a file name holding `:`
export const load = () => import(/* webpackChunkName: "x:y" */ "./value");

it("adds ./ only when the entry's own public path is empty", () => {
	expect(__webpack_require__.p + __webpack_require__.u("x:y")).toBe(
		EXPECTED_URLS["x:y"]
	);
});
