export default function () {
	var x = null;
	x ??= true;
	x &&= true;
	x ||= false;
	return x;
}
