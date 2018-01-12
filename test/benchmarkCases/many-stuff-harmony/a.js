module.exports = function() {
	let str = "";
	let sum = ["1"];
	const query = +this.query.substr(1);
	for(let i = 0; i < query; i++) {
		str += `import b${i} from "./b?${Math.floor(i/2)}!";\n`;
		sum.push(`b${i}`);
	}
	str += "export default " + sum.join(" + ");
	return str;
}
