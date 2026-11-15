/** @returns {boolean} whether the stylesheet the worker shares is in the document */
const hasWorkerCss = () =>
	Array.from(document.getElementsByTagName("link")).some(link =>
		link.href.includes("/worker-css.")
	);

it("should remove a stylesheet only a worker's runtime still has", async () => {
	await require("./owner").load();
	expect(hasWorkerCss()).toBe(true);

	await new Promise((resolve, reject) => {
		NEXT(error => (error ? reject(error) : resolve()));
	});
	await module.hot.check(true);
	expect(hasWorkerCss()).toBe(false);
});
