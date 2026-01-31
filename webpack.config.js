const webpack = require('webpack');

module.exports = {
  mode: 'development',

  entry: './index.js',

  plugins: [
    new webpack.experiments.schemes.VirtualUrlPlugin({
      echo: `export { default } from './example.js'`
    })
  ],

  module: {
    rules: [
      {
        test: /example\.js$/,
        use: ['./loader.js']
      }
    ]
  }
};
