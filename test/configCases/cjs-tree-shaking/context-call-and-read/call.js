export const callMap = name =>
	import(`./context/${name}`).then(module => module.default.map(value => value.toUpperCase()));
