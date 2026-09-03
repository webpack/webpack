import "./sheet-style.css";

it("minifies a stylesheet the style export type injects", () => {
	// This case's own document — a registry on globalThis is shared with every
	// other case the worker runs, and is cleared before these bodies do.
	const injected = [...document.getElementsByTagName("style")].map(
		(element) => element.textContent
	);

	expect(injected).toMatchSnapshot();
});
