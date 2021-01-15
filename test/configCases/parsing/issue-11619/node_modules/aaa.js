const fn = (a, b) => {
	if(a === fn && b === fn) return "ok";
	return "fail";
};
module.exports = fn;
