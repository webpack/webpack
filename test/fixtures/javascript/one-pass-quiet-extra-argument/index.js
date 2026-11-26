var count = 1;
function report() {
	console.log("report");
}
function run() {
	report(count);
}
run();
run();
function warn() {
	console.log("warn");
}
function late() {
	try {
		warn(later);
	} catch (error) {
		console.log("dead zone");
	}
}
late();
let later = 2;
late();
function counted() {
	console.log(arguments.length);
}
function pass() {
	counted(count);
}
pass();
pass();
