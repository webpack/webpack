var log=[];
var t1=typeof tf1;{function tf1(){}}log.push(t1+typeof tf1);
var t2=tf2;if(1){function tf2(){}}log.push(typeof t2+typeof tf2);
var t3=typeof tf3;for(var z=0;z<1;z++){function tf3(){}}log.push(t3+typeof tf3);
var t4=typeof tf4;try{function tf4(){}}catch(e){}log.push(t4+typeof tf4);
var t5=typeof tf5;l5:{function tf5(){}}log.push(t5+typeof tf5);
var t6=(function(){return typeof tf6})();{function tf6(){}}log.push(t6+typeof tf6);
function w(){return typeof tf7}var t7=w();{function tf7(){}}log.push(t7+w());
console.log(log.join("|"));
function f(){var b=typeof inner;{function inner(){}}return b+" "+typeof inner}
console.log(f());
function zz(){if(0){function a(){}}return typeof a}
console.log(zz());
function y(){var v=typeof q;if(0){function q(){}}return v+typeof q}
console.log(y());
function x(){"use strict";var v=typeof q;{function q(){}}return v+typeof q}
console.log(x());
