"use strict";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

// never called: the test harness cannot serve a file name holding `:`
export const load = () => import(/* webpackChunkName: "q?r:s" */ "./fourth");

it("checks a chunk name as its filename writes it, `?` as `_`", () => {
	const manifest = JSON.parse(
		fs.readFileSync(path.join(__dirname, MANIFEST), "utf-8")
	);
	expect(__webpack_require__.p + __webpack_require__.u("q_r:s")).toBe(
		"./q_r:s.js"
	);
	expect(manifest["./fourth.js"]).toEqual(["./q_r:s.js"]);
});
