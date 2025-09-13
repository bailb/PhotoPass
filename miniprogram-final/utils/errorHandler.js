// 错误处理工具
class ErrorHandler {
  constructor() {
    this.setupGlobalErrorHandling()
  }

  // 设置全局错误处理
  setupGlobalErrorHandling() {
    // 重写console.error来过滤游客模式错误
    const originalError = console.error
    console.error = function(...args) {
      const errorMsg = args.join(' ')
      
      // 过滤掉已知的游客模式错误
      if (this.isTouristModeError(errorMsg)) {
        console.log('已过滤游客模式API错误:', errorMsg)
        return
      }
      
      originalError.apply(console, args)
    }.bind(this)
  }

  // 判断是否为游客模式错误
  isTouristModeError(errorMsg) {
    const touristModeErrors = [
      'webapi_getwxaasyncsecinfo:fail',
      'webapi_getwxasyncsecinfo:fail',
      'SystemError (appServiceSDKScriptError)',
      '游客模式下，调用 wx.operateWXData 是受限的'
    ]
    
    return touristModeErrors.some(error => errorMsg.includes(error))
  }

  // 安全调用微信API
  safeCallWxAPI(apiName, options = {}) {
    return new Promise((resolve, reject) => {
      try {
        if (!wx[apiName]) {
          reject(new Error(`API ${apiName} 不存在`))
          return
        }

        const originalSuccess = options.success
        const originalFail = options.fail

        options.success = (res) => {
          console.log(`${apiName} 调用成功:`, res)
          if (originalSuccess) originalSuccess(res)
          resolve(res)
        }

        options.fail = (err) => {
          if (this.isTouristModeError(err.errMsg || err)) {
            console.log(`忽略游客模式错误: ${apiName}`, err)
            resolve({ isTouristMode: true, error: err })
            return
          }
          
          console.error(`${apiName} 调用失败:`, err)
          if (originalFail) originalFail(err)
          reject(err)
        }

        wx[apiName](options)
      } catch (error) {
        console.error(`${apiName} 调用异常:`, error)
        reject(error)
      }
    })
  }

  // 安全获取设置
  safeGetSetting() {
    return this.safeCallWxAPI('getSetting')
  }

  // 安全保存图片到相册
  safeSaveImageToPhotosAlbum(filePath) {
    return this.safeCallWxAPI('saveImageToPhotosAlbum', {
      filePath: filePath
    })
  }

  // 安全选择图片
  safeChooseImage(options = {}) {
    return this.safeCallWxAPI('chooseImage', {
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      ...options
    })
  }
}

// 创建全局实例
const errorHandler = new ErrorHandler()

module.exports = errorHandler
