self.onmessage = async ({ data }) => {
	try {
		if (data !== "compute") throw new Error("expected compute message");
		self.postMessage(42);
	} catch (e) {
		self.postMessage("error: " + e.stack);
	}
};
