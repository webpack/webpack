var iterable = {
	[Symbol.iterator]: function () {
		global.cjsEffects.push("value-array-spread");
		return [][Symbol.iterator]();
	}
};
module.exports = [...iterable];
