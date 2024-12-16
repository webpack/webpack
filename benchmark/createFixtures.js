const path = require('path');
const fs = require('fs');

// Ensure the 'fixtures' directory exists
const fixtures = path.resolve(__dirname, 'fixtures'); // Absolute path
try {
  fs.mkdirSync(fixtures, { recursive: true }); // Recursive to handle nested directories if needed
} catch (e) {
  // Ignore if the directory already exists
  if (e.code !== 'EEXIST') {
    throw e;
  }
}

// Function to generate a require string
function generateRequireString(conditional, suffix) {
  const prefixedSuffix = suffix ? `.${suffix}` : '';
  return `require(${JSON.stringify(`./${conditional}${prefixedSuffix}.js`)});`;
}

// Generate files with relative paths
for (let i = 0; i < 10000; i++) {
  const source = [];
  if (i > 8) source.push(generateRequireString((i / 8) | 0));
  if (i > 4) source.push(generateRequireString((i / 4) | 0));
  if (i > 2) source.push(generateRequireString((i / 2) | 0));
  if (i > 0) source.push(generateRequireString(i - 1));
  source.push('module.exports = ' + i + ';');
  fs.writeFileSync(path.resolve(fixtures, `${i}.js`), source.join('\n'), 'utf-8');
}

for (let i = 0; i < 10000; i++) {
  const source = [];
  source.push('require.ensure([], function(require) {');
  if (i > 8) source.push(generateRequireString((i / 8) | 0, 'async'));
  if (i > 4) source.push(generateRequireString((i / 4) | 0, 'async'));
  if (i > 2) source.push(generateRequireString((i / 2) | 0, 'async'));
  if (i > 0) source.push(generateRequireString(i - 1, 'async'));
  source.push('});');
  source.push('module.exports = ' + i + ';');
  fs.writeFileSync(
    path.resolve(fixtures, `${i}.async.js`),
    source.join('\n'),
    'utf-8'
  );
}

for (let i = 0; i < 100; i++) {
  const source = [];
  if (i > 8) source.push(generateRequireString((i / 8) | 0, 'big'));
  if (i > 4) source.push(generateRequireString((i / 4) | 0, 'big'));
  if (i > 2) source.push(generateRequireString((i / 2) | 0, 'big'));
  if (i > 0) source.push(generateRequireString(i - 1, 'big'));
  for (let j = 0; j < 300; j++) {
    source.push(
      'if(Math.random())hello.world();test.a.b.c.d();x(1,2,3,4);var a,b,c,d,e,f;'
    );
  }
  source.push('module.exports = ' + i + ';');
  fs.writeFileSync(
    path.resolve(fixtures, `${i}.big.js`),
    source.join('\n'),
    'utf-8'
  );
}
