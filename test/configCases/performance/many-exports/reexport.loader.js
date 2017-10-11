module.exports = function() {
	var str = "import * as i from \"./file.loader.js!\";\n";
	str += "var sum = 0;\n";
	for(var i = 0; i < 1000; i++) {
		str += `sum += i.a${i};\n`;
	}
	str += "export default sum;\n";
	return str;
}
