// let queued microtasks run so the script external's `loadScript` has appended
// its <script> tag before we look for it
const tick = () => new Promise(resolve => setTimeout(resolve, 0));

// the global object the bundle runs in
const global = (0, eval)("this");

/**
 * Defines `name` on the global's prototype chain, like an element with that `id`.
 * @param {string} name global name
 * @param {object} value the element
 * @returns {boolean} false where the global reports it as its own property
 */
const defineInherited = (name, value) => {
	Object.setPrototypeOf(global, { [name]: value });
	// WHY: `vm` contexts before Node.js 21 report an inherited property of the
	// global as its own, so the case can't be modeled there.
	return !Object.prototype.hasOwnProperty.call(global, name);
};

it("should load the script external even when a named element has its global name", async () => {
	if (!defineInherited("myGlobal", document.createElement("div"))) return;
	expect(typeof myGlobal).toBe("object");

	const promise = import("myExternal");
	await tick();

	// the element must not count as the already loaded script
	const script = document.head._children.find(
		child => child.nodeName === "SCRIPT" && child.src.endsWith("external.js")
	);
	expect(script).toBeDefined();

	// the script declares the global like `var myGlobal = ...` would
	global.myGlobal = { loaded: true };
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

it("should load a namespaced script external when its namespace is not an own property of the global", async () => {
	const form = { lib: document.createElement("input") };
	if (!defineInherited("myForm", form)) return;

	const promise = import("myFormExternal");
	await tick();

	const script = document.head._children.find(
		child => child.nodeName === "SCRIPT" && child.src.endsWith("form.js")
	);
	expect(script).toBeDefined();

	global.myForm = { lib: { loaded: true } };
	script.onload({ type: "load", target: script });

	const external = await promise;
	expect(external.loaded).toBe(true);
});

it("should take a script external declared with a top-level let as loaded", async () => {
	const promise = import("myLexicalExternal");
	await tick();

	const script = document.head._children.find(
		child => child.nodeName === "SCRIPT" && child.src.endsWith("lexical.js")
	);
	expect(script).toBeUndefined();

	const external = await promise;
	expect(external.loaded).toBe(true);
});
