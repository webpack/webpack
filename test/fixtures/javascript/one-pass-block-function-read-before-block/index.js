var log=[];
function a(){{function f(){return 1}}return f()}
log.push(a());
function b(){var r=typeof f;for(var i=0;i<2;i++){r+=typeof f;{function f(){}}}return r}
log.push(b());
function c(){var x=f;try{function f(){}}finally{}return [typeof x,typeof f].join()}
log.push(c());
function d(){var x=typeof f;switch(1){case 1:function f(){}}return x+typeof f}
log.push(d());
function e(){var x=(function(){return typeof f})();{function f(){}}return x+typeof f}
log.push(e());
var top1=typeof tf;{function tf(){}}log.push(top1+typeof tf);
function g(){function f(){return 2}var x=f();{function f(){return 3}}return x+f()}
log.push(g());
console.log(log.join("|"));
function f(){var b=typeof inner;{function inner(){}}return b+" "+typeof inner}
console.log(f());
function k(){var b=inner;{function inner(){}}return [b,typeof inner].join()}
console.log(k());
function h(c){var b=typeof inner;if(c){function inner(){}}return b+" "+typeof inner}
console.log(h(1),h(0));
