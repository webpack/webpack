// This config need to be set on initial evaluation to be effective
__webpack_public_path__ = "https://example.com/assets/";

it("reuses the stylesheet a server render already put in the document", async () => {
	// what the SSR manifest names for this route, printed into the markup
	const printed = document.createElement("link");
	printed.rel = "stylesheet";
	printed.href = "https://example.com/assets/button.css";
	document.head.appendChild(printed);

	const promise = import(/* webpackChunkName: "button" */ "./button.js");

	// drive the <script> load for chunk "button"
	const script = document.head._children[document.head._children.length - 1];
	expect(script._type).toBe("script");
	__non_webpack_require__("./button.js");
	script.onload();

	const { renderButton } = await promise;

	expect(renderButton("Buy")).toBe('<button class="button">Buy</button>');

	const stylesheets = document.head._children.filter(
		(el) => el._type === "link" && el.rel === "stylesheet"
	);

	// adopted, not loaded a second time
	expect(stylesheets).toHaveLength(1);
	expect(stylesheets[0]).toBe(printed);
});
