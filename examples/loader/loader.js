module.exports = function(contents, options, callback) {
	
	if(contents.length !== 1)
		throw new Error("loader takes exactly one file as parameter");
	
	if(callback) {
		// compile for web
		callback(null /* no error */, 
			"exports.answer = 42;\n" + 
			contents[0]);
	} else {
		// execute for node.js
		var Module = require("module");
		var m = new Module(options.request);
		m.exports.answer = 42;
		m._compile(contents[0], options.filename);
		return m.exports;
	}

}