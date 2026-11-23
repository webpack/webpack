// A declarator setting a name nothing reads to a literal runs nothing: one
// before it folds past it into what follows.
var n=0;function f(){return ++n}
function a(){var b=f(),c=4;return b}console.log(a(),a());
function d(){var b=f(),c=[1,{x:2}];return b+1}console.log(d());
function e(){var b=f(),c=4,g=f();return b+g}console.log(e());
function h(){var b=f(),c;return b}console.log(h());
function k(){let b=f(),c=4;return b}console.log(k());
function l(){var b=f(),c=4;eval("c");return b}console.log(l());
function m(){var b=f(),c=4;return function(){return b}}console.log(m()());
function o(){for(var b=f(),c=4;;)return b}console.log(o());
