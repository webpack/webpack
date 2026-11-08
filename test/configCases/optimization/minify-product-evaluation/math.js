// Sloppy parameters alias arguments; strict code would hide this regression.

/**
 * @param {number} value the left operand
 * @returns {number} the product
 */
function multiply(value) {
	return value * ((arguments[0] = 3) * 2);
}

/**
 * @param {number} value the left operand
 * @returns {number} the product
 */
function divide(value) {
	return value * ((arguments[0] = 6) / 2);
}

/**
 * @param {number} value the left operand
 * @returns {number} the product
 */
function remainder(value) {
	return value * ((arguments[0] = 5) % 3);
}

/**
 * @param {number} value the left operand
 * @returns {number} the product
 */
function throughAlias(value) {
	var values = arguments;
	return value * ((values[0] = 3) * 2);
}

/**
 * @param {number} value the left operand
 * @param {(values: IArguments) => number} mutate changes the parameter
 * @returns {number} the product
 */
function throughCall(value, mutate) {
	return value * (mutate(arguments) * 2);
}

/**
 * @param {number} value the left operand
 * @returns {number} the product
 */
function throughClosure(value) {
	var values = arguments;
	/** @returns {number} the updated parameter */
	function mutate() {
		return (values[0] = 3);
	}
	return value * (mutate() * 2);
}

module.exports = {
	multiply,
	divide,
	remainder,
	throughAlias,
	throughCall,
	throughClosure
};
