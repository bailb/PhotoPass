App({
  onLaunch(options) {
    console.log('智能证件照小程序启动', options)
    
    // 设置全局错误处理
    this.setupErrorHandling()
    
    // 检查更新
    this.checkForUpdate()
  },

  onShow(options) {
    console.log('小程序显示', options)
  },

  onHide() {
    console.log('小程序隐藏')
  },

  onError(error) {
    console.error('小程序错误:', error)
    // 过滤掉已知的游客模式错误
    if (error.includes('webapi_getwxaasyncsecinfo:fail')) {
      console.log('忽略游客模式API错误')
      return
    }
  },

  // 设置全局错误处理
  setupErrorHandling() {
    // 重写console.error来过滤游客模式错误
    const originalError = console.error
    console.error = function(...args) {
      const errorMsg = args.join(' ')
      if (errorMsg.includes('webapi_getwxaasyncsecinfo:fail')) {
        console.log('已过滤游客模式API错误')
        return
      }
      originalError.apply(console, args)
    }
  },

  // 检查更新
  checkForUpdate() {
    if (wx.canIUse('getUpdateManager')) {
      const updateManager = wx.getUpdateManager()
      
      updateManager.onCheckForUpdate((res) => {
        console.log('检查更新结果:', res.hasUpdate)
      })

      updateManager.onUpdateReady(() => {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: (res) => {
            if (res.confirm) {
              updateManager.applyUpdate()
            }
          }
        })
      })

      updateManager.onUpdateFailed(() => {
        console.log('更新失败')
      })
    }
  },

  globalData: {
    userInfo: null,
    version: '1.0.0'
  }
})

