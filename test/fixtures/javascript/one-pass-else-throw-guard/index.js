function a(t){if(t)console.log("a");else throw new Error("e"+t);console.log("b")}
try{a(1);a(0)}catch(e){console.log(e.message)}
function b(t){if(t===1){console.log("c");console.log("d")}else return 5;return 6}console.log(b(1),b(2));
function c(t){for(var i=0;i<3;i++){if(i!==t)console.log("i",i);else return i}return -1}console.log(c(1));
function d(t){if(t)var x=1;else return 7;return x}console.log(d(1),d(0));
function e(t){if(t){function z(){return 1}console.log(z())}else throw 0;return 3}console.log(e(1));
function*g(t){if(t)yield 1;else return 9;yield 2}console.log([...g(1)],[...g(0)]);
var o={get v(){console.log("get");return 1}};function h(){if(o.v)console.log("y");else throw 1}h();
function k(t){l:{if(t)console.log("k");else throw 2;console.log("k2")}}k(1);
