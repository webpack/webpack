onmessage = async event => {
	const { sum } = await import("./module");
	const protocol = self.location.protocol;
	parentPort.postMessage(`data: ${sum(1, 2)}, protocol: ${protocol}, thanks`);
};

