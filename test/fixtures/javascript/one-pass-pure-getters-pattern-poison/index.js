try {
	const { arguments: a = 0 } = () => {};
} catch (e) {
	console.log("arguments throws");
}
try {
	const { caller } = class {};
} catch (e) {
	console.log("caller throws");
}
function take({ arguments: unused, kept }) {
	console.log(kept);
}
try {
	take(() => {});
} catch (e) {
	console.log("parameter throws");
}
