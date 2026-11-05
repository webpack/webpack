/**
 * @param {object} element what the page's markup puts at `document.currentScript`
 * @param {string} bundle the bundle to start
 * @returns {() => void} starts the bundle
 */
const startWithShadowedCurrentScript = (element, bundle) => () => {
	Object.defineProperty(document, "currentScript", {
		configurable: true,
		get: () => element,
		set: () => {}
	});
	// an injected, inert `<script src>` that a scan of the page would pick
	const decoy = document.createElement("script");
	decoy.src = "https://attacker.test/x.js";
	document.head.appendChild(decoy);
	try {
		__non_webpack_require__(bundle);
	} finally {
		delete document.currentScript;
		document.head.removeChild(decoy);
	}
};

it("should not scan the page's scripts when an image is named currentScript", () => {
	// `<img name="currentScript" src="…">`
	const image = { tagName: "IMG", src: "https://attacker.test/image.png" };
	expect(startWithShadowedCurrentScript(image, "./inner/image.js")).toThrow(
		"Automatic publicPath is not supported in this browser"
	);
});

it("should refuse a form named currentScript without a type error", () => {
	// `<form name="currentScript">` with `<input name="tagName">` and `<input name="src">`
	const control = document.createElement("input");
	const form = { tagName: control, src: control };
	expect(startWithShadowedCurrentScript(form, "./inner/app.js")).toThrow(
		"Automatic publicPath is not supported in this browser"
	);
});
