self.onmessage = async event => {
	const { foo } = await import("./style.modules.css");
	const { bar } = await import("./style2.modules.css");
	const { baz } = await import("./style3.modules.css");

	postMessage(`data: ${foo} ${bar} ${baz}, thanks`);
};
