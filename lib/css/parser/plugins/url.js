/* eslint-disable */
const postcss = require('postcss');
const valueParser = require('postcss-value-parser');

const walkUrls = (parsed, cb) => {
  parsed.walk((node) => {
    if (node.type === 'function' && node.value === 'url') {
      const content = node.nodes.length !== 0 && node.nodes[0].type === 'string'
        ? node.nodes[0].value
        : valueParser.stringify(node.nodes);

      if (content.trim().length !== 0) {
        cb(node, content);
      }

      // do not traverse inside url
      return false;
    }
  });
};

const mapUrls = (parsed, map) => {
  walkUrls(parsed, (node, url) => {
    node.nodes = [{ type: 'word', value: map(url) }];
  });
};

const filterUrls = (parsed, filter, options) => {
  const result = [];

  walkUrls(parsed, (node, url) => {
    if (filter(url, options)) {
      return false
    }

    return result.push(url);
  });

  return result;
};

const walkDeclsWithUrl = (css, filter, options) => {
  const result = [];

  css.walkDecls((decl) => {
    if (decl.value.includes('url(')) {
      const parsed = valueParser(decl.value);
      const values = filterUrls(parsed, filter, options);

      if (values.length) {
        result.push({
          decl,
          parsed,
          values,
        });
      }
    }
  });

  return result;
};

const URL = /^\w+:\/\//;

const filter = (url, options) => {
  if (URL.test(url)) {
    return true;
  }

  if (url.startsWith('//')) {
    return true;
  }

  if (url.startsWith('//')) {
    return true;
  }

  if (url.startsWith('#')) {
    return true;
  }

  if (url.startsWith('data:')) {
    return true;
  }

  if (options.url instanceof RegExp) {
    return options.url.test(url);
  }

  if (typeof options.url === 'function') {
    return options.url(url);
  }

  return false;
}

const flatten = arr => arr.reduce((acc, d) => [...acc, ...d], []);

const uniq = arr => arr.reduce(
  (acc, d) => (acc.indexOf(d) === -1 ? [...acc, d] : acc),
  [],
);

module.exports = postcss.plugin('postcss-icss-url', (options) => (css, result) => {
  const traversed = walkDeclsWithUrl(css, filter, options);
  const paths = uniq(flatten(traversed.map(item => item.values)));

  const aliases = {};

  paths.forEach((url, idx) => {
    // CSS Content Placeholder
    const alias = '${' + `CSS__URL__${idx}` + '}';

    aliases[url] = alias;

    result.messages.push({
      type: 'dependency',
      name: `CSS__URL__${idx}`,
      plugin: 'postcss-icss-url',
      url
    });
  });

  traversed.forEach((item) => {
    mapUrls(item.parsed, value => aliases[value]);

    item.decl.value = item.parsed.toString();
  });
});
