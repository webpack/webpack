/** @returns {boolean} whether the shared stylesheet is in the document */
const hasShared = () =>
	Array.from(document.getElementsByTagName("link")).some(link =>
		link.href.includes("/shared.")
	);

/** @returns {Promise<void>} the next compilation */
const rebuild = () =>
	new Promise((resolve, reject) => {
		NEXT(error => (error ? reject(error) : resolve()));
	});

it("should keep a stylesheet another runtime on the page still uses", async () => {
	// Not awaited, so "other" finds the link while it is still loading.
	const loading = require("./owner").load();
	await import(/* webpackIgnore: true */ "./other.mjs");
	await Promise.all([loading, window.otherShared]);
	expect(hasShared()).toBe(true);

	await rebuild();
	await module.hot.check(true);
	await window.otherHot.check(true);
	expect(hasShared()).toBe(true);

	// "third" keeps the chunk in the build, so only the marks decide.
	await rebuild();
	await module.hot.check(true);
	await window.otherHot.check(true);
	expect(hasShared()).toBe(false);
});
