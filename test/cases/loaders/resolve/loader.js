const path = require("path");
module.exports = function() {
	const resolve1 = this.getResolve();
	const resolve2 = this.getResolve({
		extensions: [".xyz", ".js"]
	});
	const resolve3 = this.getResolve({
		extensions: [".hee", "..."]
	});
	const resolve4 = this.getResolve({
		extensions: [".xyz", "..."]
	});
	const resolve5 = this.getResolve({
		extensions: ["...", ".xyz"]
	});
	return Promise.all([
		resolve1(__dirname, "./index"),
		resolve2(__dirname, "./index"),
		resolve3(__dirname, "./index"),
		resolve4(__dirname, "./index"),
		resolve5(__dirname, "./index")
	]).then(([one, two, three, four, five]) => {
		return `module.exports = ${JSON.stringify({
			one: path.basename(one),
			two: path.basename(two),
			three: path.basename(three),
			four: path.basename(four),
			five: path.basename(five)
		})}`;
	});
};
