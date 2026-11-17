"use strict";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

// never called: the test harness cannot serve a file name holding `:`
export const load = () => import(/* webpackChunkName: "h#i:j" */ "./fourth");

it("checks a chunk name as its filename writes it, `#` as `_`", () => {
	const manifest = JSON.parse(
		fs.readFileSync(path.join(__dirname, MANIFEST), "utf-8")
	);
	expect(__webpack_require__.p + __webpack_require__.u("h_i:j")).toBe(
		"./h_i:j.js"
	);
	expect(manifest["./fourth.js"]).toEqual(["./h_i:j.js"]);
});
