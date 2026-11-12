// ES2015 binds a rest element to a name only; ES2016 to a pattern too.
var f = ([...a], [b]) => 0;
var g = ([...[c]]) => 0;
