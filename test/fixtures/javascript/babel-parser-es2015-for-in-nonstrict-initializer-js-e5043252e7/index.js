  var effects = 0;
  var iterations = 0;
  var stored;
  for (var a = (++effects, -1) in stored = a, {a: 0, b: 1, c: 2}) {
    ++iterations;
  }
