/** @returns {boolean} whether the shared stylesheet is in the document */
const hasShared = () =>
	Array.from(document.getElementsByTagName("link")).some(link =>
		link.href.includes("/shared.")
	);

it("should keep a stylesheet another runtime on the page still uses", async () => {
	await require("./owner").load();
	await import(/* webpackIgnore: true */ "./other.mjs");
	await globalThis.otherShared;
	expect(hasShared()).toBe(true);

	await new Promise((resolve, reject) => {
		NEXT(error => (error ? reject(error) : resolve()));
	});
	await module.hot.check(true);
	expect(hasShared()).toBe(true);
});
