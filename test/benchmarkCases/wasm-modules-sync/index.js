async function load() {
	const mod = await import("././generated/module.js");

	return mod;
}

const mod = await load();

export { mod };
