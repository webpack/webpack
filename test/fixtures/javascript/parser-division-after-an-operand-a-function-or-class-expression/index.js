var c = 1, x = 2;
c ? 1 : function () {}
/x/1;
c ? 1 : class {}
/x/1;
async function f() {
	await function () {}
	/x/1;
	await class {}
	/x/1;
}
function* g() {
	yield function () {}
	/x/1;
	yield class {}
	/x/1;
}
