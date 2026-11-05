// let queued microtasks run so the script external's `loadScript` has appended
// its <script> tag before we look for it
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

it("should load the script external even when a named element has its global name", async () => {
	// `<div id="myGlobal">` in the page: named access on the Window object makes
	// the bare identifier resolve to the element through the global object's
	// prototype chain (the WindowProperties object), without the global object
	// gaining an own property of that name
	Object.setPrototypeOf(globalThis, {
		myGlobal: document.createElement("div")
	});
	expect(typeof myGlobal).toBe("object");
	expect(Object.prototype.hasOwnProperty.call(globalThis, "myGlobal")).toBe(
		false
	);

	const promise = import("myExternal");
	await tick();

	// the element must not count as the already loaded script
	const script = document.head._children.find(
		child => child.nodeName === "SCRIPT" && child.onload
	);
	expect(script).toBeDefined();
	expect(script.src).toBe("https://test.cases/path/external.js");

	// the script declares the global like `var myGlobal = ...` would
	globalThis.myGlobal = { loaded: true };
	script.onload({ type: "load", target: script });

	const external = await promise;
	expect(external.loaded).toBe(true);
});

it("should load a namespaced script external when its namespace is not defined yet", async () => {
	const promise = import("myNamespacedExternal");
	await tick();

	const script = document.head._children.find(
		child => child.nodeName === "SCRIPT" && child.src.endsWith("namespaced.js")
	);
	expect(script).toBeDefined();
	script.onload({ type: "load", target: script });
	await expect(promise).rejects.toMatchObject({
		name: "ScriptExternalLoadError"
	});
});

it("should load a namespaced script external even when a form has the namespace name", async () => {
	// `<form id="myForm"><input name="lib"></form>` in the page: the control
	// is an own property of the form, but the form isn't one of the global object
	const form = { lib: document.createElement("input") };
	Object.setPrototypeOf(globalThis, { myForm: form });
	expect(Object.prototype.hasOwnProperty.call(myForm, "lib")).toBe(true);

	const promise = import("myFormExternal");
	await tick();

	// the form's control must not count as the already loaded script
	const script = document.head._children.find(
		child => child.nodeName === "SCRIPT" && child.src.endsWith("form.js")
	);
	expect(script).toBeDefined();

	globalThis.myForm = { lib: { loaded: true } };
	script.onload({ type: "load", target: script });

	const external = await promise;
	expect(external.loaded).toBe(true);
});
