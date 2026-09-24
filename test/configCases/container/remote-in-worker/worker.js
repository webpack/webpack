onmessage = async event => {
	try {
		const { upper } =
			event.data === "missing"
				? await import("missing/module")
				: await import("remote/module");
		postMessage(`data: ${upper(event.data)}`);
	} catch (err) {
		postMessage(`error: ${err.name} ${err.type}`);
	}
};
