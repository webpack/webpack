var buildModule = require("./buildModule");
var resolve = require("enhanced-resolve");


process.on("message", function(msg) {
	if(!msg) return process.send("ready");
	// setTimeout(function() {
	var id = msg[0];
	try {
		switch(msg[1]) {
		case "buildModule":
			var parameters = msg[2];
			buildModule(parameters, function(err, source, deps, cacheInfo, profile) {
				if(err) err = { message: err.message, stack: err.stack, _toString: err.toString() };
				process.send([id, err, source, deps, cacheInfo, profile]);
			});
			break;
		case "resolve":
			var context = msg[2];
			var module = msg[3];
			var options = msg[4];
			resolve(context, module, options, function(err, filename) {
				if(err) err = { message: err.message, stack: err.stack, _toString: err.toString() };
				process.send([id, err, filename]);
			})
			break;
		case "resolve.loaders":
			var context = msg[2];
			var loaders = msg[3];
			var options = msg[4];
			resolve.loaders(context, loaders, options, function(err, loaders) {
				if(err) err = { message: err.message, stack: err.stack, _toString: err.toString() };
				process.send([id, err, loaders]);
			})
			break;
		default: throw new Error("Worker msg type " + msg[1] + " is not supported");
		}
	} catch(e) {
		process.send([id, e]);
	}
	// }, 2000);
});
