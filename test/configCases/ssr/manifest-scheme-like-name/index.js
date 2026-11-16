"use strict";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const manifest = JSON.parse(
	fs.readFileSync(path.join(__STATS__.outputPath, "ssr-manifest.json"), "utf-8")
);

// never called: the test harness cannot serve a file name holding `:`
export const load = () => import(/* webpackChunkName: "x:y" */ "./value");

it("starts the relative url of a chunk whose name reads like a scheme with ./", () => {
	expect(__webpack_require__.p + __webpack_require__.u("x:y")).toBe(
		"./x:y.js"
	);
	expect(manifest["./value.js"]).toEqual(["./x:y.js"]);
});
