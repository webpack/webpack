module.exports = function load(name) {
	return require(`./files/${name}.txt`);
};
