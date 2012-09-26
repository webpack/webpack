var buildModule = require("./buildModule");
var resolve = require("enhanced-resolve");

var registers = {};
function applyRegister(arr) {
	var regMapping = arr.splice(2, 1)[0];
	var regName = arr[1];
	if(regMapping) {
		var reg = registers[regName];
		for(var i = 0; i < regMapping.length; i++) {
			if(regMapping[i])
				arr[i+2] = reg[i];
		}
	}
	registers[regName] = arr.slice(2);
	for(var i = 2; i < arr.length; i++)
		arr[i] = JSON.parse(arr[i]);
}

process.on("message", function(msg) {
	if(!msg) return process.send("ready");
	// setTimeout(function() {
	var id = msg[0];
	try {
		applyRegister(msg);
		switch(msg[1]) {
		case "buildModule":
			var context = msg[2],
				filenameWithLoaders = msg[3],
				preLoaders = msg[4],
				loaders = msg[5],
				postLoaders = msg[6],
				filename = msg[7],
				options = msg[8];
			buildModule(context, filenameWithLoaders,
					preLoaders, loaders, postLoaders,
					filename,
					options, function(err, source, deps, cacheInfo, profile) {
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
