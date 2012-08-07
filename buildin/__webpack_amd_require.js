function amdRequireFactory(req) {
	function amdRequire(chunk, requiresFn, fn) {
		if(!requiresFn) {
			// commonjs
			return req(chunk);
		}
		req.e(chunk, function() {
			var modules = requiresFn();
			if(fn)
				return fn.apply(null, modules);
		});
	}
	for(var name in req)
		amdRequire[name] = req[name];
	amdRequire.amd = amdRequireFactory.amd;
	return amdRequire;
}
amdRequireFactory.amd = {};
module.exports = amdRequireFactory;