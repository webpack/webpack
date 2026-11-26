function join(x) {
	const one = (value) => ["a", +x, "b"].join("");
	const none = () => ["c", +x, "d"].join("");
	return one(1) + none();
}
console.log(join(2));
