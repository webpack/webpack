// This config need to be set on initial evaluation to be effective
__webpack_public_path__ = "https://test.cases/";

it("waits for a server-rendered stylesheet that has not applied yet", async () => {
	// A streamed render inserts its <link> after the shell, so it is not render
	// blocking: no `sheet` yet means the rules are still on their way.
	const printed = document.createElement("link");
	printed.rel = "stylesheet";
	printed.href = "https://test.cases/button.css";
	printed.sheet = undefined;
	document.head.appendChild(printed);

	let loaded = false;
	const promise = import(/* webpackChunkName: "button" */ "./button.js").then(
		(module) => {
			loaded = true;
			return module;
		}
	);

	// drive the <script> load for chunk "button" so only the stylesheet is pending
	const script = document.head._children[document.head._children.length - 1];
	expect(script._type).toBe("script");
	__non_webpack_require__("./button.js");
	script.onload();

	// the runtime adopted the printed link rather than creating its own
	expect(typeof printed.onload).toBe("function");

	await new Promise((resolve) => setTimeout(resolve, 0));
	expect(loaded).toBe(false);

	printed.sheet = {};
	printed.onload({ type: "load", target: printed });

	const { renderButton } = await promise;

	expect(renderButton("Buy")).toBe('<button class="button">Buy</button>');

	const stylesheets = document.head._children.filter(
		(element) => element._type === "link" && element.rel === "stylesheet"
	);

	expect(stylesheets).toHaveLength(1);
	expect(stylesheets[0]).toBe(printed);
});
