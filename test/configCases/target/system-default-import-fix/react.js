// Mock React module that doesn't have a default property
// This simulates how React is typically exported in SystemJS environments
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

// Export named exports (SystemJS style - no default property)
module.exports = React;
module.exports.useEffect = React.useEffect;
module.exports.Component = React.Component;
module.exports.Fragment = React.Fragment;
module.exports.Profiler = React.Profiler;
module.exports.useState = React.useState;
module.exports.createElement = React.createElement;
