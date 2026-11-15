"use strict";

const marker = 1;

// a free name, so the plugin's `call` tap sees it
global.probe = () => undefined;

it("should walk, evaluate and enter nodes a plugin built", () => {
	expect(probe(marker)).toBe(undefined);
	const synthetic = __SYNTHETIC__;
	if (synthetic === null) return;
	expect(synthetic).toEqual({
		evaluated: 3,
		pure: true,
		walked: ["syntheticName"],
		entered: ["a", "b"],
		outsideEvaluated: "abc"
	});
});
