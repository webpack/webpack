// What `new` makes hands its constructor out as `constructor`, to be called
// again with other arguments, so a constant passed stays a parameter.
function run() {
	function Point(value) {
		this.value = value;
	}
	var first = new Point(1);
	console.log(first.value, new first.constructor(2).value);
	var Box = function (value) {
		this.value = value;
	};
	console.log(new new Box(3).constructor(4).value);
	// A parameter nothing reads still goes, constructed again or not.
	var Unread = function (unused) {
		this.value = 6;
	};
	console.log(new new Unread(7).constructor().value);
	// Unread, its `this` handed out reaches it again; a store hands out nothing.
	var kept = [];
	new (function (value) {
		this.value = value;
		kept.push(this);
	})(8);
	console.log(new kept[0].constructor(9).value);
	var saved;
	new (function (value) {
		saved = () => this;
		this.value = value;
	})(10);
	console.log(new (saved().constructor)(11).value);
	new (function (value) {
		this.value = value;
		console.log(value + 1);
	})(5);
	// A compound store reads the member first, which may hand `this` out.
	var toString = Function.prototype.toString;
	var Constructor;
	Function.prototype.toString = function () {
		Constructor = this;
		return "";
	};
	new (function (value) {
		this.constructor += value;
		console.log(value);
	})(12);
	Function.prototype.toString = toString;
	new Constructor(13);
}
run();
