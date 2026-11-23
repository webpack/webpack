var count = 0;
var holder = {
	get x() {
		count++;
		return 1;
	}
};
function run() {
	return ++count;
}
typeof void run();
typeof !holder.x;
typeof typeof run();
-void holder.x;
typeof void (function () {
	console.log("called", count);
})();
log(), typeof void run();
function log() {
	console.log("log", count);
}
try {
	typeof void undeclaredName;
} catch (e) {
	console.log(e.name);
}
typeof undeclaredToo;
console.log(count, typeof void run(), count);
