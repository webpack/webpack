export function add() {
	var sum = 0, i = 0, args = arguments, l = args.length;
	while (i < l) {
		sum += args[i++];
	}
	return sum;
}

export function multiply() {
	var product = 1, i = 0, args = arguments, l = args.length;
	while (i < l) {
		product *= args[i++];
	}
	return product;
}

export function list() {
	return Array.from(arguments);
}
