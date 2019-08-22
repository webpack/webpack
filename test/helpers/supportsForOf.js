module.exports = function supportDefaultAssignment() {
	try {
		var f = eval("(function f() { for(var x of ['ok', 'fail']) return x; })");
		return f() === "ok";
	} catch (e) {
		return false;
	}
};
