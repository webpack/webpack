import { count, bump } from "./store.js";
import marker from "./marker.js";
import update from "../../update.esm.js";

export { bump } from "./store.js";

import.meta.webpackHot.accept(["./store.js", "./marker.js"]);

it("should initialize late async exports before and after replacing their module", async () => {
	expect(bump()).toBe(2);
	await new Promise((resolve, reject) => NEXT(update(reject, true, resolve)));
	expect(marker).toBe(2);
	expect(count).toBe(2);

	const first = await import(/* webpackIgnore: true */ "./first.mjs");
	expect(first.count).toBe(2);
	expect(first.bump()).toBe(3);
	expect(first.count).toBe(3);

	await new Promise((resolve, reject) => NEXT(update(reject, true, resolve)));
	expect(first.count).toBe(10);
	expect(bump()).toBe(11);
	expect(first.count).toBe(11);

	const second = await import(/* webpackIgnore: true */ "./second.mjs");
	expect(second.count).toBe(11);
	expect(second.bump()).toBe(12);
	expect(second.count).toBe(12);
	expect(first.count).toBe(12);
});
