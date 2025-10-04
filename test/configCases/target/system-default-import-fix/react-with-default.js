// Mock React module that HAS a default property
// This simulates ES6 modules with default exports
const React = {
	Component: function Component() {},
	Fragment: Symbol("react.fragment"),
	Profiler: Symbol("react.profiler"),
	useEffect: function useEffect(callback, deps) {
		return callback();
	},
	useState: function useState(initial) {
		return [initial, function() {}];
	},
	createElement: function createElement(type, props, ...children) {
		return { type, props, children };
	}
};

// Export with default property (ES6 module format)
module.exports = React;
module.exports.default = React;
module.exports.useEffect = React.useEffect;
module.exports.Component = React.Component;
module.exports.Fragment = React.Fragment;
module.exports.Profiler = React.Profiler;
module.exports.useState = React.useState;
module.exports.createElement = React.createElement;
