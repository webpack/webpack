"use strict";

// never called: the test harness cannot serve a file name holding `:`
export const load = () => import(/* webpackChunkName: "plain" */ "./other");

it("reads [uniqueName] as the filename writes it", () => {
	expect(__webpack_require__.p + __webpack_require__.u("plain")).toBe(
		"./x:y.plain.js"
	);
});
