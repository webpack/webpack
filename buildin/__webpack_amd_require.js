module.exports = function(req) {
	function amdRequire(requires, fn) {
		if(!fn) {
			// commonjs
			return req(requires);
		}
		return fn.apply(null, requires);
	}
	for(var name in req)
		amdRequire[name] = req[name];
	amdRequire.amd = true;
	return amdRequire;
}