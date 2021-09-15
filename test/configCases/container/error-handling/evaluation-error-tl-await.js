export let error;
try {
	await import("remote/module");
} catch (err) {
	error = err;
}
