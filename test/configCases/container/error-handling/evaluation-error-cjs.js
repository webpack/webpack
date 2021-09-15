export let error;
try {
	require("remote/module");
} catch (err) {
	error = err;
}
