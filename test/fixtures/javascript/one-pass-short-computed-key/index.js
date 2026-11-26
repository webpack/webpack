const key = "longKeyName";
const short = "id";
var object = { longKeyName: 1, id: 2 };
console.log(object[key], object[short]);
object[key] = 3;
console.log(object?.[key], typeof object[key]);
delete object[key];
console.log(object[key]);
class Holder {
	static [key] = 4;
	read() {
		return Holder[key];
	}
}
console.log(new Holder().read());
function late() {
	return object[later];
}
try {
	late();
} catch (error) {
	console.log("dead zone");
}
const later = "longKeyName";
console.log(late());
