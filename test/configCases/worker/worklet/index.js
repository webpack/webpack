// This is a pseudo-worklet, it is not a real worklet, but it is used to test the worker logic.
// Real worklets do not have this API.

it("should allow to create a paintWorklet worklet", async () => {
	let pseudoWorklet = await CSS.paintWorklet.addModule(new URL("./worklet.js", import.meta.url));

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
});

it("should allow to create a layoutWorklet worklet", async () => {
	let pseudoWorklet = await CSS.layoutWorklet.addModule(new URL("./worklet.js", import.meta.url));

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
});

it("should allow to create a animationWorklet worklet", async () => {
	let pseudoWorklet = await CSS.animationWorklet.addModule(new URL("./worklet.js", import.meta.url));

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
});

it("should allow to create a audioWorklet worklet", async () => {
	let context = new AudioContext();
	let pseudoWorklet = await context.audioWorklet.addModule(new URL("./worklet.js", import.meta.url));

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
});

it("should allow to create a paintWorklet worklet using '?.'", async () => {
	let pseudoWorklet = await CSS?.paintWorklet?.addModule(new URL("./worklet.js", import.meta.url));

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
});

it("should allow to create a audioWorklet worklet #2", async () => {
	let audioWorklet = (new AudioContext()).audioWorklet;
	let pseudoWorklet = await audioWorklet.addModule(new URL("./worklet.js", import.meta.url));

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
});

it("should allow to create a audioWorklet worklet #3", async () => {
	let context = {
		foo: {
			bar: new AudioContext()
		}
	};
	let pseudoWorklet = await context.foo.bar.audioWorklet.addModule(new URL("./worklet.js", import.meta.url));

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
});

it("should allow to create a audioWorklet worklet using '?.'", async () => {
	let context = new AudioContext();
	let pseudoWorklet = await context?.audioWorklet?.addModule(new URL("./worklet.js", import.meta.url));

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
});

it("should not create a audioWorklet worklet", async () => {
	let workletURL;

	const barContext = new class Foo {
		constructor() {
			this.audioWorklet = {
				addModule(url) {
					workletURL = url.toString();

					return undefined;
				}
			}
		}
	}

	await barContext.audioWorklet.addModule(new URL("./worklet-asset-1.js", import.meta.url));

	expect(workletURL).toContain("asset-");
});

it("should not create a audioWorklet worklet", async () => {
	let workletURL;

	const barContext = new class Foo {
		constructor() {
			this.unknownWorklet = {
				addModule(url) {
					workletURL = url.toString();

					return undefined;
				}
			}
		}
	}

	await barContext.unknownWorklet.addModule(new URL("./worklet-asset-2.js", import.meta.url));

	expect(workletURL).toContain("asset-");
});
