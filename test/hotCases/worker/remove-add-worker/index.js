import compute from "./compute";

const update = () =>
	new Promise((resolve, reject) => {
		NEXT(require("../../update")(reject, true, resolve));
	});

it("should support adding and removing runtimes", async () => {
	expect(await compute()).toBe(42);
	await update();
	expect(await compute()).toBe(42);
	await update();
	expect(await compute()).toBe(42);
	await update();
	expect(await compute()).toBe(42);
	await update();
	expect(await compute()).toBe(42);
	await update();
	expect(await compute()).toBe(42);
});

import.meta.webpackHot.accept("./compute");
