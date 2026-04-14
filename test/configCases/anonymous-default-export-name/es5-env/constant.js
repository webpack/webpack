// Mirrors d3-interpolate/src/constant.js which triggered the regression
// in https://github.com/webpack/webpack/issues/20793
export default (x) => () => x;
