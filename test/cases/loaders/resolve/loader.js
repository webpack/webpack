const path = require("path");
module.exports = async function() {
	const resolve1 = this.getResolve();
	const resolve2 = this.getResolve({
		extensions: [".xyz", ".js"]
	});
	return `module.exports = ${JSON.stringify({
		one: path.basename(await resolve1(__dirname, "./index")),
		two: path.basename(await resolve2(__dirname, "./index")),
	})}`;
};
