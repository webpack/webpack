export let error;
try {
	require("remote/invalid");
} catch (err) {
	error = err;
}
