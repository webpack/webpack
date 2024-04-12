let audioContext = null;

it("should allow to create a paintWorklet worklet", async () => {
	if (audioContext === null) {
		audioContext = new AudioContext();
	}

	let pseudoWorklet = await audioContext.audioWorklet.addModule(new URL("./worklet.js", import.meta.url));

	pseudoWorklet = new pseudoWorklet();

	expect(pseudoWorklet.url).not.toContain("asset-");

	pseudoWorklet.postMessage("ok");

	const result = await new Promise(resolve => {
		pseudoWorklet.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toBe("data: OK, thanks");

	await pseudoWorklet.terminate();
})
