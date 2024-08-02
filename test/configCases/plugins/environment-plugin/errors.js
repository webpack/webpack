const variables = [
	"aaa",
	"bbb",
	"ccc",
	"ddd",
	"eee",
	"fff",
	"ggg",
	"hhh",
	"iii"
];
const modules = [
	{
		name: "aaa",
		variables: ["aaa"]
	},
	{
		name: "bbbccc",
		variables: ["bbb", "ccc"]
	},
	{
		name: "ddd",
		variables: [],
		allowedErrors: [
			[{ compilerPath: /ddd/ }, /DDD environment variable is undefined./]
		]
	},
	{
		name: "eeefff",
		variables: ["eee", "fff"]
	},
	{
		name: "ggghhh",
		variables: ["ggg", "hhh"]
	},
	{
		name: "iii",
		variables: ["iii"]
	}
];

// build an array of regular expressions of expected errors
const regex = [];
for (const module of modules) {
	for (const variable of variables) {
		if (!module.variables.includes(variable)) {
			// the module doesn't include the env variable, an error is expected when requiring the variable
			regex.push([
				{ compilerPath: new RegExp(`${module.name}`) },
				new RegExp(`Can't resolve '${variable}'`)
			]);
		}
	}

	if (module.allowedErrors) {
		regex.push(...module.allowedErrors);
	}
}

module.exports = regex;
