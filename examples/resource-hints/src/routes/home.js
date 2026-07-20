// Basic JS-only entry — no URL-referenced assets.
// Uses `import()` for a code-split settings route so there's a real vendor
// / async chunk for the resource-hint machinery to hint about.
async function loadSettings() {
	const mod = await import("./settings.js");
	return mod.default;
}

console.log("home", loadSettings);
