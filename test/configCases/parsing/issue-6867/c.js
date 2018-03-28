export default function foo() {
  foo = function() {} // this not working is currently a bug in webpack 😝
}
