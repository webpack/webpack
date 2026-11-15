/**
 * @param {object} element the value of `document.currentScript`
 * @param {string} bundle the bundle to start
 * @returns {() => void} starts the bundle
 */
const startWithCurrentScript = (element, bundle) => () => {
	Object.defineProperty(document, "currentScript", {
		configurable: true,
		get: () => element,
		set: () => {}
	});
	// another script on the page that a scan would pick
	const other = document.createElement("script");
	other.src = "https://other.test/x.js";
	document.head.appendChild(other);
	try {
		__non_webpack_require__(bundle);
	} finally {
		delete document.currentScript;
		document.head.removeChild(other);
	}
};

it("should not scan the page's scripts when currentScript is an image", () => {
	const image = { tagName: "IMG", src: "https://other.test/image.png" };
	expect(startWithCurrentScript(image, "./inner/image.js")).toThrow(
		"Automatic publicPath is not supported in this browser"
	);
});

it("should not throw a type error when currentScript has no string tagName", () => {
	const control = document.createElement("input");
	const form = { tagName: control, src: control };
	expect(startWithCurrentScript(form, "./inner/app.js")).toThrow(
		"Automatic publicPath is not supported in this browser"
	);
});
