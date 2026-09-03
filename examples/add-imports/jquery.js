// A vendor library that a script expects on a global.
module.exports = function $(selector) {
	return `element(${selector})`;
};
