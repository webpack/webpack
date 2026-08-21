self.onmessage = async () => {
	const mid = await import("./mid");
	const loaded = await mid.load();

	postMessage(loaded.target);
};
