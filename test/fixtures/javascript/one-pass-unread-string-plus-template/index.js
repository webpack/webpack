// A string added to a template nobody reads runs what the template converts.
var value = {
	toString() {
		console.log("converted");
		return "value";
	}
};
function before() {
	"\r\rprefix" + `${value}`;
	`${value}` + "suffix";
	"wrapped" + `a${value}b${value}`;
	return "before";
}
// Read, it stays a string; a template converting nothing goes.
function read() {
	"plain" + `text`;
	return "read" + `${value}`;
}
console.log(before(), read());
