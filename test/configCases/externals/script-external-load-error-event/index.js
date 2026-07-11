// let queued microtasks run so the script external's `loadScript` has appended
// its <script> tag before we simulate the failure
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

it("should expose the original event on a failed script external load", async () => {
	const promise = import("myExternal");
	await tick();

	const script = document.head._children.find(
		child => child.nodeName === "SCRIPT" && child.onerror
	);
	expect(script).toBeDefined();

	// simulate the external script failing to load
	const errorEvent = { type: "error", target: script };
	script.onerror(errorEvent);

	await expect(promise).rejects.toMatchObject({
		name: "ScriptExternalLoadError",
		type: "error",
		request: "https://test.cases/path/external.js",
		// the new bit: developers can inspect the original DOM event
		event: errorEvent
	});
});
