"use strict";

const fs = __non_webpack_require__("fs");
const path = __non_webpack_require__("path");

const manifest = JSON.parse(
	fs.readFileSync(path.join(__dirname, MANIFEST), "utf-8")
);

// never called: the test harness cannot serve a file name holding `:`
export const load = () => [
	import(/* webpackChunkName: "x:y" */ "./value"),
	import(/* webpackChunkName: "plain" */ "./other"),
	import(/* webpackChunkName: "/z:w" */ "./third")
];

it("starts the relative url of a chunk whose filename reads like a scheme with ./", () => {
	for (const id of Object.keys(EXPECTED_URLS)) {
		expect(__webpack_require__.p + __webpack_require__.u(id)).toBe(
			EXPECTED_URLS[id]
		);
	}
	expect(manifest["./value.js"]).toEqual([EXPECTED_URLS["x:y"]]);
	expect(manifest["./other.js"]).toEqual([EXPECTED_URLS.plain]);
	expect(manifest["./third.js"]).toEqual([EXPECTED_URLS["/z:w"]]);
});
