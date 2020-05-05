export let error;
try {
	require("invalid/module");
} catch (err) {
	error = err;
}
