const variables = ['aaa', 'bbb', 'ccc', 'ddd'];
const modules = [{
	name: 'aaa',
	variables: ['aaa']
}, {
	name: 'bbbccc',
	variables: ['bbb', 'ccc']
}, {
	name: 'ddd',
	variables: []
}];

// build an array of regular expressions of expected errors
const regex = [];
modules.forEach(module => {
	variables.forEach(variable => {
		if (module.variables.indexOf(variable) === -1) {
			// the module doesn't include the env variable, an error is expected when requiring the variable
			regex.push([
				new RegExp(`(${module.name})`),
				new RegExp(`Can't resolve '${variable}'`),
			]);
		}
	});
});

module.exports = regex;
