module.exports = function supportDefaultAssignment() {
	try {
		const f = eval("(function f() { for(var x of ['ok', 'fail']) return x; })");
		return f() === "ok";
	} catch (_err) {
		return false;
	}
};
