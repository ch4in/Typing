//axios域代理，解决axios跨域问题
module.exports = {
  devServer: {
    proxy: 'http://localhost:8888',
    // proxy: {
    //   '/': {
    //     // 目标 API 地址
    //     target: '',
    //     // 如果要代理 websockets
    //     ws: false,
    //     // 将主机标头的原点更改为目标URL
    //     changeOrigin: true
    //   }
    // }

  },
  pwa: {
    iconPaths: {
      favicon32: 'favicon.ico',
      favicon16: 'favicon.ico',
      appleTouchIcon: 'favicon.ico',
      maskIcon: 'favicon.ico',
      msTileImage: 'favicon.ico'
    }
  },
  assetsDir: 'static',
}
