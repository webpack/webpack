it("should load a WebWorker using a TrustedScriptURL", async () => {
	const noop = i => i;
	const rules = {
		createScriptURL: noop
	};
	window.trustedTypes = {
		createPolicy: () => rules
	};
	const createScriptURLSpy = jest.spyOn(rules, "createScriptURL");
	const createPolicySpy = jest.spyOn(window.trustedTypes, "createPolicy");

	const worker = new Worker(new URL("./worker.js", import.meta.url), {
		type: "module"
	});
	expect(createScriptURLSpy.mock.calls[0][0].toString()).toContain("chunk");
	expect(createPolicySpy).toHaveBeenCalledWith("webpack", expect.anything());

	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toEqual("data: ok, thanks");
	await worker.terminate();
});

it("should use Trusted Types for loading modules inside worker", async () => {
	const worker = new Worker(new URL("./importingWorker.js", import.meta.url), {
		type: "module"
	});

	worker.postMessage("ok");
	const result = await new Promise(resolve => {
		worker.onmessage = event => {
			resolve(event.data);
		};
	});
	expect(result).toEqual({
		data: "OK",
		policyName: "webpack",
		scriptURL: expect.stringContaining("chunk")
	});
	await worker.terminate();
});
