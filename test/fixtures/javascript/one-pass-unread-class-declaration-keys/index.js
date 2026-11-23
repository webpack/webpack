var log = [];
function key(name) {
	log.push(name);
	return name;
}
try {
	class Thrown {
		[key("method")]() {
			return null;
		}
		get [missing()]() {
			return null;
		}
	}
} catch (e) {
	log.push(e.name);
}
{
	class Kept {
		[key("a")]() {}
		static [key("b")]() {}
	}
}
try {
	class Later {
		[read()]() {}
	}
	function read() {
		return typeof Later;
	}
} catch (e) {
	log.push("dead zone");
}
var counter = 0;
class Counted {
	[counter++]() {}
	[key({ toString: function () { return "c"; } })]() {}
}
console.log(log.join(), counter);
