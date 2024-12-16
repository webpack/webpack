 const webpack = require('../');
const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');

webpack(
  {
    context: __dirname,
    entry: './createBenchmark/entry.js',
    output: {
      path: __dirname,
      filename: 'benchmark-bundle.js',
    },
    target: 'node',
    node: {
      __dirname: false,
    },
    optimization: {
      moduleIds: 'named',
      minimize: true, // Enable minimization
      minimizer: [
        new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: true, // Example option to remove console.log
            },
            format: {
              comments: false, // Remove comments
            },
          },
          extractComments: false, // Prevent generation of license files
        }),
      ],
    },
    plugins: [
      new webpack.IgnorePlugin(/^(fsevents|terser)$/),
      new webpack.NormalModuleReplacementPlugin(
        /^.\/loadLoader$/,
        path.resolve(__dirname, './createBenchmark/loadLoader')
      ),
    ],
  },
  (err, stats) => {
    if (err) {
      console.error(err);
      return;
    }
    console.log(stats.toString());
  }
);
