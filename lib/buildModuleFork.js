var buildModule = require("./buildModule");

process.on("message", function(arr) {
	var id = arr[0]
	var parameters = arr[1];
	try {
		buildModule(parameters, function(err, source, deps, cacheInfo, profile) {
			if(err) err = { message: err.message, stack: err.stack, _toString: err.toString() };
			process.send([id, err, source, deps, cacheInfo, profile]);
		});
	} catch(e) {
		process.send([id, e]);
	}
	process.send(null);
});
