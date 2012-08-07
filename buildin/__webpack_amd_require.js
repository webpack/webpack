module.exports = function amdRequireFactory(req) {
	function amdRequire(requires, fn) {
		if(!fn) {
			// commonjs
			return req(requires);
		}
		return fn.apply(null, requires);
	}
	for(var name in req)
		amdRequire[name] = req[name];
	amdRequire.amd = amdRequireFactory.amd;
	return amdRequire;
}
amdRequireFactory.amd = {};