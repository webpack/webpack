module.exports = {
	findBundle(i) {
		return i === 0 ? "./main.js" : "./module/main.mjs";
	}
};
