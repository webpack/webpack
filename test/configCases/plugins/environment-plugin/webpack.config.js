var EnvironmentPlugin = require("../../../../lib/EnvironmentPlugin");
process.env.AAA = "aaa";
process.env.BBB = "bbb";
process.env.CCC = "ccc";
module.exports = [{
	name: "aaa",
	module: { unknownContextRegExp: /$^/, unknownContextCritical: false },
	plugins: [
		new EnvironmentPlugin("AAA")
	]
}, {
	name: "bbbccc",
	module: { unknownContextRegExp: /$^/, unknownContextCritical: false },
	plugins: [
		new EnvironmentPlugin("BBB", "CCC")
	]
}, {
	name: "ddd",
	module: { unknownContextRegExp: /$^/, unknownContextCritical: false },
	plugins: [
		new EnvironmentPlugin("DDD")
	]
}];
