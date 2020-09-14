onmessage = async event => {
	const { upper } = await import("./module");
	postMessage(`data: ${upper(event.data)}, thanks`);
};
