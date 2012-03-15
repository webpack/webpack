exports.fork = exports.exec =
exports.execFile = exports.spawn =
function() {
	throw new Error("child_process is not availibe in browser");
}