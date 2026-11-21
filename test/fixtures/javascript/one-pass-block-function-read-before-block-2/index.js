var log=[];
function a(){var r=(function(){return typeof f})();{function f(){}}var s=(function(){return typeof f})();return r+s}
log.push(a());
function b(){var g=function(){return typeof f};var x=g();{function f(){}}return x+g()}
log.push(b());
function c(){var x=typeof f;while(true){function f(){}break}return x+typeof f}
log.push(c());
function d(){var x=typeof f;l:{function f(){}break l}return x+typeof f}
log.push(d());
function e(k){var x=typeof f;if(k){function f(){}}else{x+="e"}return x+typeof f}
log.push(e(1),e(0));
function h(){var x=typeof f;function inner(){return typeof f}{function f(){}}return x+inner()}
log.push(h());
function i(){var x=f;do{function f(){return 7}}while(0);return typeof x+typeof f}
log.push(i());
function j(){var x=typeof f;for(var q in {a:1}){function f(){}}return x+typeof f}
log.push(j());
function k(){var x=f===undefined;{function f(){}}return x+","+(f===undefined)}
log.push(k());
function m(){var x=!f;{function f(){}}return x+","+!f}
log.push(m());
function n(){var x=typeof f;if(1)function f(){}return x+typeof f}
log.push(n());
function o(){var x=typeof f;l:function f(){}return x+typeof f}
log.push(o());
function p(){var x=typeof f;{function f(){}}{function f(){return 1}}return x+typeof f}
log.push(p());
function q(){var x=typeof f;try{throw 0}catch(e){function f(){}}return x+typeof f}
log.push(q());
function r(){var x=typeof f;switch(0){default:{function f(){}}}return x+typeof f}
log.push(r());
function s(){var x=(0,function(){return f})();{function f(){}}return typeof x}
log.push(s());
function t(){var x=typeof f;(function(){})();{function f(){}}return x+typeof f}
log.push(t());
function u(){var x=f;var y=typeof x;{function f(){}}return y+typeof f}
log.push(u());
console.log(log.join("|"));
