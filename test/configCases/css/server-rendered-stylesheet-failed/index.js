// This config need to be set on initial evaluation to be effective
__webpack_public_path__ = "https://test.cases/";

it("gives up on an adopted stylesheet that never reports, keeping it", async () => {
	// A server-rendered <link> whose request already failed replays no event, so
	// the runtime only ever sees a link without a `sheet`.
	const printed = document.createElement("link");
	printed.rel = "stylesheet";
	printed.href = "https://test.cases/button.css";
	printed.sheet = undefined;
	document.head.appendChild(printed);

	const promise = import(/* webpackChunkName: "button" */ "./button.js");

	// drive the <script> load for chunk "button" so only the stylesheet is pending
	const script = document.head._children[document.head._children.length - 1];
	expect(script._type).toBe("script");
	__non_webpack_require__("./button.js");
	script.onload();

	expect(typeof printed.onload).toBe("function");

	// webpack did not create this link, so the timeout resolves rather than
	// rejecting with a ChunkLoadError
	const { renderButton } = await promise;

	expect(renderButton("Buy")).toBe('<button class="button">Buy</button>');

	// and the document keeps the stylesheet it was served with
	const stylesheets = document.head._children.filter(
		(element) => element._type === "link" && element.rel === "stylesheet"
	);

	expect(stylesheets).toHaveLength(1);
	expect(stylesheets[0]).toBe(printed);
});
