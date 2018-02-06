/* eslint-env node */
/* eslint-disable semi */
const postcss = require('postcss');
const Tokenizer = require('css-selector-tokenizer');
// const { extractICSS, createICSSRules } = require('icss-utils');
const genericNames = require('generic-names');
const fromPairs = require('lodash/fromPairs');
const camelCase = require('lodash/camelCase');

const plugin = 'postcss-icss-selectors';

const isSpacing = (node) => node.type === 'spacing' || node.type === 'operator';

const isModifier = (node) => {
  return node.type === 'pseudo-class' &&
        (node.name === 'local' || node.name === 'global');
};

const trimNodes = (nodes) => {
  const firstIndex = nodes.findIndex(node => node.type !== 'spacing');
  const lastIndex = nodes
    .slice()
    .reverse()
    .findIndex(node => node.type !== 'spacing');

  return nodes.slice(firstIndex, nodes.length - lastIndex);
};

function localizeNode (node, { mode, inside, getAlias }) {
  const newNodes = node.nodes.reduce((acc, n, index, nodes) => {
    switch (n.type) {
      case 'spacing':
        if (isModifier(nodes[index + 1])) {
          return [ ...acc, Object.assign({}, n, { value: '' }) ];
        }

        return [...acc, n];

      case 'operator':
        if (isModifier(nodes[index + 1])) {
          return [...acc, Object.assign({}, n, { after: '' })];
        }

        return [...acc, n];

      case 'pseudo-class':
        if (isModifier(n)) {
          if (inside) {
            throw Error(
              `A :${n.name} is not allowed inside of a :${inside}(...)`
            );
          }

          if (index !== 0 && !isSpacing(nodes[index - 1])) {
            throw Error(`Missing whitespace before :${n.name}`);
          }

          if (index !== nodes.length - 1 && !isSpacing(nodes[index + 1])) {
            throw Error(`Missing whitespace after :${n.name}`);
          }
          // set mode
          mode = n.name;

          return acc;
        }

        return [...acc, n];

      case 'nested-pseudo-class':
        if (n.name === 'local' || n.name === 'global') {
          if (inside) {
            throw Error(
              `A :${n.name}(...) is not allowed inside of a :${inside}(...)`
            );
          }
          return [
            ...acc,
            ...localizeNode(n.nodes[0], {
              mode: n.name,
              inside: n.name,
              getAlias
            }).nodes
          ];
        } else {
          return [
            ...acc,
            Object.assign({}, n, {
              nodes: localizeNode(n.nodes[0], { mode, inside, getAlias }).nodes
            })
          ];
        }

      case 'id':
      case 'class':
        if (mode === 'local') {
          return [...acc, Object.assign({}, n, { name: getAlias(n.name) })];
        }

        return [...acc, n];

      default:
        return [...acc, n];
    }
  }, []);

  return Object.assign({}, node, { nodes: trimNodes(newNodes) });
}

const localizeSelectors = (selectors, mode, getAlias) => {
  const node = Tokenizer.parse(selectors);

  return Tokenizer.stringify(
    Object.assign({}, node, {
      nodes: node.nodes.map(n => localizeNode(n, { mode, getAlias }))
    })
  );
};

const walkRules = (css, callback) => {
  css.walkRules(rule => {
    if (rule.parent.type !== 'atrule' || !/keyframes$/.test(rule.parent.name)) {
      callback(rule);
    }
  });
};

const flatten = (arr) => arr.reduce((acc, item) => [...acc, ...item], []);

const isRedeclared = (messages, name) => {
  return messages.find(msg => msg.type === 'icss-scoped' && msg.name === name);
};

const getValue = (messages, name) => {
  return messages.find(msg => msg.type === 'icss-value' && msg.value === name);
};

const getMessages = (aliases) => {
  // TODO(michael-ciniawsky)
  console.log(aliases);

  Object.keys(aliases)
    .map((name) => ({
      plugin,
      type: 'icss-scoped',
      name,
      value: aliases[name]
    }));
};

const getComposed = (name, messages, root) => [
  name,
  ...flatten(
    messages
      .filter(msg => msg.name === name && msg.value !== root)
      .map(msg => getComposed(msg.value, messages, root))
  )
];

const mapMessages = (messages, type) => {
  return fromPairs(
    messages
      .filter(msg => msg.type === type)
      .map((msg) => [ msg.name, msg.value ])
  );
}

// const composeAliases = (aliases, messages) =>
//   Object.keys(aliases).reduce(
//     (acc, name) =>
//       Object.assign({}, acc, {
//         [name]: getComposed(name, messages, name)
//           .map(value => aliases[value] || value)
//           .join(' ')
//       }),
//     {}
//   );

// const composeExports = (messages) => {
//   const composed = messages.filter((msg) => msg.type === 'icss-composed');
//
//   const values = mapMessages(messages, 'icss-value');
//   const scoped = mapMessages(messages, 'icss-scoped');
//
//   const aliases = Object.assign({}, scoped, values);
//
//   return composeAliases(aliases, composed);
// };

module.exports = postcss.plugin(plugin, (options = {}) => (css, result) => {
  const generateScopedName =
    options.generateScopedName ||
    genericNames('[name]__[local]---[hash:base64:5]');

  const input = (css && css.source && css.source.input) || {};

  const aliases = {};

  walkRules(css, (rule) => {
    const getAlias = (name) => {
      if (aliases[name]) {
        return aliases[name];
      }

      // icss-value contract
      const valueMsg = getValue(result.messages, name);

      if (valueMsg) {
        aliases[valueMsg.name] = name;

        return name;
      }

      const alias = generateScopedName(name, input.from, input.css);

      aliases[camelCase(name)] = alias;

      // icss-scoped contract
      if (isRedeclared(result.messages, name)) {
        result.warn(`'${name}' already declared`, { node: rule });
      }

      return alias;
    };

    try {
      rule.selector = localizeSelectors(
        rule.selector,
        options.mode === 'global' ? 'global' : 'local',
        getAlias
      );
    } catch (err) {
      throw rule.error(err.message);
    }
  });

  result.messages.push({
    type: 'dependency',
    name: 'CSS__EXPORT',
    plugin,
    selectors: aliases,
    export () {
      const selectors = Object.keys(this.selectors) || [];

      return selectors
        .map((name) => {
          return `export const ${name} = '${this.selectors[name]}';`;
        })
        .join('\n')
    }
  });
});
