async function run(worklet) {
	const factory = worklet.registrations.get("test");
	expect(typeof factory).toBe("function");
	return factory("ok");
}

it("should register an audioWorklet processor (CSS.paintWorklet call syntax)", async () => {
	await CSS.paintWorklet.addModule(new URL("./worklet.js", import.meta.url));
	expect(await run(CSS.paintWorklet)).toBe("OK/DONE");
});

it("should register a processor via *context.audioWorklet syntax", async () => {
	const context = new AudioContext();
	await context.audioWorklet.addModule(new URL("./worklet.js", import.meta.url));
	expect(await run(context.audioWorklet)).toBe("OK/DONE");
});

it("should register a processor via a bare *audioWorklet variable", async () => {
	const audioWorklet = new AudioContext().audioWorklet;
	await audioWorklet.addModule(new URL("./worklet.js", import.meta.url));
	expect(await run(audioWorklet)).toBe("OK/DONE");
});

it("should register a processor via optional chaining", async () => {
	const context = new AudioContext();
	await context?.audioWorklet?.addModule(new URL("./worklet.js", import.meta.url));
	expect(await run(context.audioWorklet)).toBe("OK/DONE");
});

it("should not treat an unmatched receiver as a worklet", async () => {
	let workletURL;
	const barContext = {
		unknownWorklet: {
			addModule(url) {
				workletURL = url.toString();
				return Promise.resolve();
			}
		}
	};
	await barContext.unknownWorklet.addModule(
		new URL("./worklet-asset.js", import.meta.url)
	);
	expect(workletURL).toContain("asset-");
});
