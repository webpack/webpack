export let error;
try {
	await import("remote/invalid");
} catch (err) {
	error = err;
}
