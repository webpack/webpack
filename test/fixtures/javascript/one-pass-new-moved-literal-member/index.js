// A literal moved to the name `new` reads a constructor off prints whole,
// the member reading it kept.
var made = {
	Maker: function () {
		console.log("made");
	}
};
new made.Maker();
var built = {
	Builder: function () {
		this.x = 1;
	}
};
console.log(new built.Builder().x);
var plain = {
	Plain: function () {
		return 1;
	}
};
console.log(typeof new plain.Plain());
