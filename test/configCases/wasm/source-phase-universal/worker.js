self.onmessage = async event => {
	const { run } = await import("./module");
	postMessage(`data: ${run()}, thanks`);
};
