function work() {
	console.log("work");
}
function f() {
	{
		work();
	}
	return 1;
}
console.log(f());
