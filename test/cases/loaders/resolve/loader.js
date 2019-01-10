const path = require("path");
module.exports = function() {
	const resolve1 = this.getResolve();
	const resolve2 = this.getResolve({
		extensions: [".xyz", ".js"]
	});
	return Promise.all([
		resolve1(__dirname, "./index"),
		resolve2(__dirname, "./index")
	]).then(([one, two]) => {
		return `module.exports = ${JSON.stringify({
			one: path.basename(one),
			two: path.basename(two),
		})}`;
	});
};
