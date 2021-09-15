export let error;
try {
	await import("invalid/module");
} catch (err) {
	error = err;
}
