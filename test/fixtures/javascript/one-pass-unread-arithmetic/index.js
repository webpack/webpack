var text = "";
var count = 0;
function step() {
	count++;
	return count;
}
("f" & "f" && (text += "FAIL")) ^ 1;
("f" & "f" || (text += "PASS")) ^ 1;
(text += "!") * 2;
(step() | 0) + (step() & 1);
!step() + 1;
var object = {
	valueOf: function () {
		count += 10;
		return 1;
	}
};
object ^ 1;
console.log(text, count, object + 0);
