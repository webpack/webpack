module.exports = function load(name) {
	return import(`./files/${name}.txt`);
};
