f(() => {
	function first() {
		g(last);
	}
	function middle() {
		first(first);
	}
	function last() {
		middle();
	}
});
var modules = {
	0() {
		async function save() {
			if (valid) await confirm();
		}
		async function confirm() {
			if (ok) await save();
		}
		async function unused() {
			await save();
		}
	}
};
function load(id) {
	modules[id]();
}
load(0);
function f(callback) {
	callback();
	console.log("done");
}
function g(value) {
	console.log(typeof value);
}
