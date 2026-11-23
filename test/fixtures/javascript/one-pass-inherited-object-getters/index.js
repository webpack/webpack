Object.defineProperty(Object.prototype, "x", {
	configurable: true,
	get: function () {
		console.log("got inherited");
	}
});
const plain = {};
plain.x;
const quiet = { a: 1 };
var unread = quiet.a;
delete Object.prototype.x;
console.log("end");
