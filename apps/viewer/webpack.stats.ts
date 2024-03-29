import { BundleAnalyzerPlugin } from 'webpack-bundle-analyzer';
import { merge } from 'webpack-merge';

import common from './webpack.common';

// Config
export default async function stats() {
  return merge(await common(), {
    mode: 'production',
    devtool: 'source-map',
    plugins: [
      new BundleAnalyzerPlugin() as never
    ]
  });
}
