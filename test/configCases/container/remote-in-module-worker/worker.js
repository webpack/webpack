onmessage = async event => {
	try {
		const { upper } =
			event.data === "scripted"
				? await import("scripted/module")
				: await import("remote/module");
		postMessage(`data: ${upper(event.data)}`);
	} catch (err) {
		postMessage(`error: ${err.message}`);
	}
};
