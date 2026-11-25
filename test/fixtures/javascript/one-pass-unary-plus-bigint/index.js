function product(a, b) {
	return 1 + +(a * b);
}
if (typeof BigInt === "function") {
	try {
		product(BigInt(2), {
			valueOf() {
				console.log("coerce");
				return BigInt(3);
			}
		});
	} catch (e) {
		console.log(e.name);
	}
}
console.log(product(2, 3));
function numericProduct(value) {
	return 1 + +(2 * value);
}
console.log(numericProduct(3));
