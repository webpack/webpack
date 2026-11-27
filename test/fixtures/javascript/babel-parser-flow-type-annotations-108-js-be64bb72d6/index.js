var a : {| x: number, y: string |} = { x: 0, y: 'foo' };
var b : {| x: number, y: string, |} = { x: 0, y: 'foo' };
var c : {| |} = {};
var d : { a: {| x: number, y: string |}, b: boolean } = { a: { x: 0, y: 'foo' }, b: false };
var e : {| a: { x: number, y: string }, b: boolean |} = { a: { x: 0, y: 'foo' }, b: false };
