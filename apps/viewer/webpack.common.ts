import CopyWebpackPlugin from 'copy-webpack-plugin';
import ForkTsCheckerWebpackPlugin from 'fork-ts-checker-webpack-plugin';
import HTMLWebpackPlugin from 'html-webpack-plugin';
import path from 'path';
import webpack from 'webpack';

// Config
export default async function common(): Promise<webpack.Configuration> {
  return {
    entry: {
      main: './src/index'
    },
    output: {
      clean: true,
      publicPath: '/ants/',
      filename: '[name].[contenthash].js',
      path: path.resolve(__dirname, 'dist'),
      assetModuleFilename: 'assets/[hash][ext][query]'
    },
    optimization: {
      runtimeChunk: 'single',
      moduleIds: 'deterministic',
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name(module: webpack.Module) {
              if (module.identifier().match(/[\\/](@aws|amazon)/)) {
                return 'aws.vendors';
              }

              if (module.identifier().match(/[\\/](@mui|@emotion)/)) {
                return 'mui.vendors';
              }

              return 'vendors';
            },
            chunks: 'all',
          },
        },
      },
    },
    performance: {
      maxAssetSize: 500000,
      maxEntrypointSize: 1000000,
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx|ts|tsx)$/,
          exclude: /node_modules/,
          use: 'swc-loader',
        },
        {
          test: /\.(png|jpe?g|gif)$/i,
          type: 'asset'
        }
      ],
    },
    resolve: {
      extensions: ['.js', '.jsx', '.ts', '.tsx'],
      // fallback: {
      //   buffer: require.resolve('buffer/'),
      //   url: require.resolve('url/'),
      // }
    },
    plugins: [
      new HTMLWebpackPlugin({
        template: path.resolve(__dirname, 'public', 'index.html'),
        filename: 'index.html',
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: '**',
            context: path.resolve(__dirname, 'public'),
            globOptions: { ignore: ['**/public/index.html'] }
          },
        ]
      }),
      new ForkTsCheckerWebpackPlugin()
    ],
  };
}
