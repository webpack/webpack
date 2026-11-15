function f(x) {
	return [, `${x}`, "a"].join("-") + [`${x}`, 1].join() + [`${x}`, x + "b"].join();
}
function g(x) {
	return [`${x}`, String(x)].join("") + [`a`].join() + [`${x}`, -`${x}`].join();
}
console.log(f(1), g(2));
