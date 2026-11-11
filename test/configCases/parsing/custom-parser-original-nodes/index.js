"use strict";

const marker = 1;

// a free name, so the plugin's `call` tap sees it
global.probe = (value) => value;

it("should hand hooks the objects a custom parser built", () => {
	expect(probe(marker)).toBe(1);
});
