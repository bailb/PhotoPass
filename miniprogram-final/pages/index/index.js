Page({
  data: {
    imageUrl: '',
    generatedPhoto: '',
    generating: false,
    selectedSize: null,
    customWidth: '',
    customHeight: '',
    customUnit: 'px', // 自定义尺寸单位：px/inch/cm
    imageInfo: null,
    actualImageWidth: 0, // 照片实际显示宽度
    actualImageHeight: 0, // 照片实际显示高度
    imageOffsetX: 0, // 照片X偏移量
    imageOffsetY: 0, // 照片Y偏移量
    cropFrameWidth: 200,
    cropFrameHeight: 280,
    containerWidth: 500,
    containerHeight: 500,
    cropFrameX: 0, // 初始位置，会在选择尺寸后自动居中
    cropFrameY: 0, // 初始位置，会在选择尺寸后自动居中
    isDragging: false, // 是否正在拖拽
    startX: 0, // 拖拽开始X坐标
    startY: 0, // 拖拽开始Y坐标
    imageScale: 1.0, // 图片缩放比例
    imageScalePercent: 100, // 缩放百分比显示
    minScale: 0.5, // 最小缩放比例
    maxScale: 3.0, // 最大缩放比例
    scaleHandlePosition: 150, // 比例尺滑块位置（像素）
    isScaling: false, // 是否正在拖拽比例尺
    scaleStartX: 0, // 比例尺拖拽开始X坐标
    photoSizes: [
      { name: '1寸', width: 295, height: 413 },
      { name: '2寸', width: 413, height: 579 },
      { name: '3寸', width: 649, height: 991 },
      { name: '4寸', width: 1051, height: 1496 },
      { name: '5寸', width: 1500, height: 2102 },
      { name: '6寸', width: 1800, height: 2400 }
    ],
    canvasWidth: 0, // 🎯 修复：Canvas宽度
    canvasHeight: 0 // 🎯 修复：Canvas高度
  },

  onLoad() {
    console.log('智能证件照页面加载')
    
    // 初始化时检查权限状态
    this.checkPermissions()
  },

  // 检查权限状态
  checkPermissions() {
    // 使用try-catch包装，避免游客模式下的API错误
    try {
      wx.getSetting({
        success: (res) => {
          console.log('权限状态:', res.authSetting)
        },
        fail: (err) => {
          console.log('获取权限状态失败:', err)
          // 忽略这个错误，不影响功能使用
        }
      })
    } catch (error) {
      console.log('权限检查异常:', error)
      // 在游客模式下忽略此错误
    }
  },

  // 选择图片
  chooseImage() {
    wx.chooseImage({
      count: 1,
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFilePaths[0]
        this.setData({
          imageUrl: tempFilePath
        })
        wx.showToast({
          title: '图片上传成功',
          icon: 'success'
        })
      },
      fail: (err) => {
        console.error('选择图片失败:', err)
        wx.showToast({
          title: '选择图片失败',
          icon: 'error'
        })
      }
    })
  },

  // 图片加载完成
  onImageLoad(e) {
    console.log('图片加载完成:', e.detail)
    
    // 🎯 新增：计算照片实际显示尺寸（aspectFit模式）
    const imageInfo = e.detail
    const containerWidth = 500  // rpx单位 - 对应CSS中的图片显示宽度
    const containerHeight = 500  // rpx单位 - 对应CSS中的500rpx
    
    // 计算aspectFit模式下的实际显示尺寸
    const imageAspectRatio = imageInfo.width / imageInfo.height
    const containerAspectRatio = containerWidth / containerHeight
    
    let actualImageWidth, actualImageHeight, imageOffsetX, imageOffsetY
    
    if (imageAspectRatio > containerAspectRatio) {
      // 图片更宽，以容器宽度为准
      actualImageWidth = containerWidth
      actualImageHeight = containerWidth / imageAspectRatio
      imageOffsetX = 0
      imageOffsetY = (containerHeight - actualImageHeight) / 2
    } else {
      // 图片更高，以容器高度为准
      actualImageHeight = containerHeight
      actualImageWidth = containerHeight * imageAspectRatio
      imageOffsetX = (containerWidth - actualImageWidth) / 2
      imageOffsetY = 0
    }
    
    // 🎯 真机调试修复：确保图片尺寸不会超出容器
    actualImageWidth = Math.min(actualImageWidth, containerWidth)
    actualImageHeight = Math.min(actualImageHeight, containerHeight)
    
    // 🎯 真机调试修复：确保偏移量在合理范围内
    imageOffsetX = Math.max(0, Math.min(imageOffsetX, containerWidth - actualImageWidth))
    imageOffsetY = Math.max(0, Math.min(imageOffsetY, containerHeight - actualImageHeight))
    
    console.log('🎯 真机调试修复 - 图片尺寸计算:', {
      imageInfo: imageInfo,
      containerWidth: containerWidth,
      containerHeight: containerHeight,
      actualImageWidth: actualImageWidth,
      actualImageHeight: actualImageHeight,
      imageOffsetX: imageOffsetX,
      imageOffsetY: imageOffsetY
    })
    
    this.setData({
      imageInfo: imageInfo,
      actualImageWidth: actualImageWidth,
      actualImageHeight: actualImageHeight,
      imageOffsetX: imageOffsetX,
      imageOffsetY: imageOffsetY
    })
  },

  // 选择尺寸
  selectSize(e) {
    const size = e.currentTarget.dataset.size
    this.setData({
      selectedSize: size
    })
    
    // 动态调整裁剪框大小
    this.updateCropFrame(size)
    
    wx.showToast({
      title: `已锁定${size.name}比例`,
      icon: 'success'
    })
  },

  // 更新裁剪框大小和位置
  updateCropFrame(size) {
    // 使用与CSS一致的容器尺寸（rpx单位）
    // CSS: .cropper-image height: 500rpx, .cropper-container padding: 20rpx
    // .crop-frame 已经通过 top: 20rpx, left: 20rpx 和 calc(100% - 40rpx) 处理了padding
    // 所以这里使用图片的实际显示尺寸
    const containerWidth = 500  // rpx单位 - 图片显示宽度
    const containerHeight = 500  // rpx单位 - 图片显示高度
    
    // 计算裁剪框的显示尺寸（保持比例）
    const aspectRatio = size.width / size.height
    let frameWidth, frameHeight
    
    // 🎯 简化裁剪框尺寸计算：直接基于目标证件照尺寸的比例
    // 计算目标证件照在容器中的显示尺寸
    const targetAspectRatio = size.width / size.height
    const containerAspectRatio = containerWidth / containerHeight
    
    if (targetAspectRatio > containerAspectRatio) {
      // 目标证件照更宽，以容器宽度为准
      frameWidth = Math.min(300, containerWidth * 0.6)
      frameHeight = frameWidth / targetAspectRatio
    } else {
      // 目标证件照更高，以容器高度为准
      frameHeight = Math.min(300, containerHeight * 0.6)
      frameWidth = frameHeight * targetAspectRatio
    }
    
    // 确保裁剪框有最小尺寸
    frameWidth = Math.max(120, frameWidth)
    frameHeight = Math.max(120, frameHeight)
    
    
    // 🎯 强制居中：确保裁剪框在容器中心，并检查边界
    const initialX = (containerWidth - frameWidth) / 2
    const initialY = (containerHeight - frameHeight) / 2
    
    // 确保裁剪框不会超出容器边界
    const maxX = containerWidth - frameWidth
    const maxY = containerHeight - frameHeight
    const finalX = Math.max(0, Math.min(initialX, maxX))
    const finalY = Math.max(0, Math.min(initialY, maxY))
    
    console.log('🎯 居中计算:', {
      containerWidth, containerHeight,
      frameWidth, frameHeight,
      initialX, initialY,
      maxX, maxY,
      finalX, finalY
    })
    
    // 存储裁剪框的实际尺寸和位置，用于后续裁剪计算
    this.setData({
      cropFrameWidth: frameWidth,
      cropFrameHeight: frameHeight,
      containerWidth: containerWidth,
      containerHeight: containerHeight,
      cropFrameX: finalX,
      cropFrameY: finalY
    })
    
  },

  // 自定义宽度输入
  onCustomWidthInput(e) {
    this.setData({
      customWidth: e.detail.value
    })
  },

  // 自定义高度输入
  onCustomHeightInput(e) {
    this.setData({
      customHeight: e.detail.value
    })
  },

  // 自定义单位选择
  onCustomUnitChange(e) {
    const unitNames = ['像素', '英寸', '厘米']
    const unitValues = ['px', 'inch', 'cm']
    const selectedIndex = e.detail.value
    this.setData({
      customUnit: unitValues[selectedIndex]
    })
  },

  // 单位转换函数
  convertToPixels(value, unit) {
    const dpi = 300 // 标准打印DPI
    switch (unit) {
      case 'inch':
        return Math.round(value * dpi)
      case 'cm':
        return Math.round(value * dpi / 2.54) // 1英寸 = 2.54厘米
      case 'px':
      default:
        return value
    }
  },

  // 像素转换为指定单位
  convertFromPixels(value, unit) {
    const dpi = 300 // 标准打印DPI
    switch (unit) {
      case 'inch':
        return (value / dpi).toFixed(2)
      case 'cm':
        return (value * 2.54 / dpi).toFixed(2)
      case 'px':
      default:
        return value
    }
  },

  // 使用自定义尺寸
  useCustomSize() {
    const inputWidth = parseFloat(this.data.customWidth)
    const inputHeight = parseFloat(this.data.customHeight)
    const unit = this.data.customUnit
    
    if (!inputWidth || !inputHeight || inputWidth <= 0 || inputHeight <= 0) {
      wx.showToast({
        title: '请输入有效的长宽数值',
        icon: 'error'
      })
      return
    }
    
    // 🎯 转换单位到像素
    const width = this.convertToPixels(inputWidth, unit)
    const height = this.convertToPixels(inputHeight, unit)
    
    const customSize = { 
      name: `自定义 (${inputWidth}×${inputHeight}${unit})`, 
      width, 
      height 
    }
    
    // 🎯 添加调试信息
    console.log('自定义尺寸设置:', {
      inputWidth: inputWidth,
      inputHeight: inputHeight,
      unit: unit,
      convertedWidth: width,
      convertedHeight: height,
      customSize: customSize
    })
    
    this.setData({
      selectedSize: customSize
    })
    
    // 🎯 修复：设置自定义尺寸后需要更新裁剪框
    this.updateCropFrame(customSize)
    
    wx.showToast({
      title: `已锁定自定义比例 (${width}×${height}px)`,
      icon: 'success'
    })
  },

  // 生成证件照
  generatePhoto() {
    if (!this.data.imageUrl) {
      wx.showToast({
        title: '请先上传图片',
        icon: 'error'
      })
      return
    }

    if (!this.data.selectedSize) {
      wx.showToast({
        title: '请先选择尺寸',
        icon: 'error'
      })
      return
    }

    // 🎯 修复：保存当前图片状态，避免在生成过程中被重置
    const currentImageScale = this.data.imageScale
    const currentImageScalePercent = this.data.imageScalePercent
    const currentScaleHandlePosition = this.data.scaleHandlePosition

    console.log('🎯 生成前保存图片状态:', {
      imageScale: currentImageScale,
      imageScalePercent: currentImageScalePercent,
      scaleHandlePosition: currentScaleHandlePosition
    })

    this.setData({
      generating: true
    })

    // 使用Canvas进行真正的裁剪
    this.cropImage()
  },

  // 裁剪图片 - 完全重写算法，确保一致性，支持图片缩放
  cropImage() {
    const { selectedSize, imageInfo, cropFrameWidth, cropFrameHeight, cropFrameX, cropFrameY, imageScale } = this.data
    
    // 🎯 修复：确保Canvas有正确的尺寸后再创建上下文
    const canvasWidth = selectedSize.width
    const canvasHeight = selectedSize.height
    
    console.log('🎯 Canvas初始化:', {
      canvasWidth, canvasHeight,
      selectedSize: selectedSize
    })
    
    // 🎯 修复：先更新Canvas尺寸，再创建上下文
    this.setData({
      canvasWidth: canvasWidth,
      canvasHeight: canvasHeight
    })
    
    // 🎯 修复：使用nextTick确保尺寸更新完成
    wx.nextTick(() => {
      try {
        const ctx = wx.createCanvasContext('cropCanvas', this)
        console.log('🎯 Canvas上下文创建成功:', ctx)
        
        // 🎯 修复：添加延迟确保Canvas尺寸生效
        setTimeout(() => {
          this.performCrop(ctx, canvasWidth, canvasHeight)
        }, 100)
      } catch (error) {
        console.error('🎯 Canvas上下文创建失败:', error)
        wx.showToast({
          title: 'Canvas创建失败',
          icon: 'error'
        })
        this.setData({ generating: false })
      }
    })
  },

  // 🎯 修复：分离裁剪逻辑，确保Canvas已初始化
  performCrop(ctx, canvasWidth, canvasHeight) {
    const { selectedSize, imageInfo, cropFrameWidth, cropFrameHeight, cropFrameX, cropFrameY, imageScale } = this.data
    
    // 使用与CSS一致的容器尺寸
    const containerWidth = 500  // rpx单位 - 对应CSS中的图片显示宽度
    const containerHeight = 500  // 对应CSS中的500rpx
    
    if (!imageInfo) {
      wx.showToast({
        title: '图片信息获取失败',
        icon: 'error'
      })
      this.setData({ generating: false })
      return
    }

    if (!cropFrameWidth || !cropFrameHeight) {
      wx.showToast({
        title: '裁剪框信息获取失败',
        icon: 'error'
      })
      this.setData({ generating: false })
      return
    }

    const targetWidth = selectedSize.width
    const targetHeight = selectedSize.height
    
    // 🎯 添加调试信息
    console.log('裁剪图片尺寸信息:', {
      selectedSize: selectedSize,
      targetWidth: targetWidth,
      targetHeight: targetHeight
    })
    
    // 🎯 修复：Canvas尺寸已经在函数开头设置
    // canvasWidth 和 canvasHeight 已经在函数开头定义
    
    // 🎯 修复：重新计算图片的实际显示尺寸和位置
    const imageAspectRatio = imageInfo.width / imageInfo.height
    const containerAspectRatio = containerWidth / containerHeight
    
    let actualImageWidth, actualImageHeight, imageOffsetX, imageOffsetY
    
    if (imageAspectRatio > containerAspectRatio) {
      // 图片更宽，以容器宽度为准
      actualImageWidth = containerWidth * imageScale
      actualImageHeight = actualImageWidth / imageAspectRatio
      imageOffsetX = (containerWidth - actualImageWidth) / 2
      imageOffsetY = (containerHeight - actualImageHeight) / 2
    } else {
      // 图片更高，以容器高度为准
      actualImageHeight = containerHeight * imageScale
      actualImageWidth = actualImageHeight * imageAspectRatio
      imageOffsetX = (containerWidth - actualImageWidth) / 2
      imageOffsetY = (containerHeight - actualImageHeight) / 2
    }
    
    // 🎯 关键修复：裁剪框坐标转换
    // 裁剪框位置是相对于图片容器的，需要转换为相对于图片的坐标
    const cropRelativeX = cropFrameX - imageOffsetX
    const cropRelativeY = cropFrameY - imageOffsetY
    
    // 🎯 关键修复：计算裁剪区域在原始图片中的尺寸和位置
    const cropWidth = (cropFrameWidth / actualImageWidth) * imageInfo.width
    const cropHeight = (cropFrameHeight / actualImageHeight) * imageInfo.height
    const cropX = cropRelativeX / actualImageWidth * imageInfo.width
    const cropY = cropRelativeY / actualImageHeight * imageInfo.height
    
    // 边界检查
    const finalCropX = Math.max(0, Math.min(cropX, imageInfo.width - cropWidth))
    const finalCropY = Math.max(0, Math.min(cropY, imageInfo.height - cropHeight))
    const finalCropWidth = Math.min(cropWidth, imageInfo.width - finalCropX)
    const finalCropHeight = Math.min(cropHeight, imageInfo.height - finalCropY)
    
    // 🎯 添加调试信息
    console.log('🎯 裁剪计算详细信息:', {
      containerWidth, containerHeight,
      actualImageWidth, actualImageHeight,
      imageOffsetX, imageOffsetY,
      cropFrameX, cropFrameY, cropFrameWidth, cropFrameHeight,
      cropRelativeX, cropRelativeY,
      cropX, cropY, cropWidth, cropHeight,
      finalCropX, finalCropY, finalCropWidth, finalCropHeight,
      canvasWidth, canvasHeight,
      targetWidth, targetHeight
    })
    
    // 清空canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    
    // 🎯 修复：直接按照目标证件照尺寸绘制，不保持宽高比
    // 证件照需要严格按照目标尺寸输出
    console.log('🎯 Canvas绘制参数:', {
      canvasWidth, canvasHeight,
      finalCropX, finalCropY, finalCropWidth, finalCropHeight,
      targetWidth, targetHeight
    })
    
    // 绘制裁剪后的图片到Canvas，直接填充整个Canvas
    ctx.drawImage(
      this.data.imageUrl,
      finalCropX, finalCropY, finalCropWidth, finalCropHeight,
      0, 0, canvasWidth, canvasHeight
    )
    
    ctx.draw(false, () => {
      // 导出裁剪后的图片
      wx.canvasToTempFilePath({
        canvasId: 'cropCanvas',
        width: canvasWidth,
        height: canvasHeight,
        destWidth: targetWidth,
        destHeight: targetHeight,
        fileType: 'png',
        quality: 1.0,
        success: (res) => {
          // 🎯 修复：生成成功后恢复图片状态
          const currentImageScale = this.data.imageScale
          const currentImageScalePercent = this.data.imageScalePercent
          const currentScaleHandlePosition = this.data.scaleHandlePosition
          
          console.log('🎯 生成成功后恢复图片状态:', {
            imageScale: currentImageScale,
            imageScalePercent: currentImageScalePercent,
            scaleHandlePosition: currentScaleHandlePosition
          })
          
          this.setData({
            generatedPhoto: res.tempFilePath,
            generating: false,
            // 🎯 修复：确保图片缩放状态不被重置
            imageScale: currentImageScale,
            imageScalePercent: currentImageScalePercent,
            scaleHandlePosition: currentScaleHandlePosition
          })
          wx.showToast({
            title: `${selectedSize.name}证件照生成成功！`,
            icon: 'success'
          })
        },
        fail: (err) => {
          console.error('导出图片失败:', err)
          wx.showToast({
            title: '导出图片失败',
            icon: 'error'
          })
          // 🎯 修复：生成失败后也要恢复图片状态
          const currentImageScale = this.data.imageScale
          const currentImageScalePercent = this.data.imageScalePercent
          const currentScaleHandlePosition = this.data.scaleHandlePosition
          
          this.setData({ 
            generating: false,
            // 🎯 修复：确保图片缩放状态不被重置
            imageScale: currentImageScale,
            imageScalePercent: currentImageScalePercent,
            scaleHandlePosition: currentScaleHandlePosition
          })
        }
      }, this)
    })
  },

  // 重新生成照片
  regeneratePhoto() {
    this.generatePhoto()
  },

  // 保存到相册
  downloadPhoto() {
    if (!this.data.generatedPhoto) {
      wx.showToast({
        title: '请先生成照片',
        icon: 'error'
      })
      return
    }

    // 先检查权限，使用try-catch包装避免游客模式错误
    try {
      wx.getSetting({
        success: (res) => {
          if (res.authSetting['scope.writePhotosAlbum'] === false) {
            // 用户之前拒绝了权限，引导用户手动开启
            wx.showModal({
              title: '提示',
              content: '需要授权保存到相册，请在设置中开启权限',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  wx.openSetting({
                    success: (settingRes) => {
                      if (settingRes.authSetting['scope.writePhotosAlbum']) {
                        this.saveToAlbum()
                      }
                    }
                  })
                }
              }
            })
          } else {
            // 直接保存或请求权限
            this.saveToAlbum()
          }
        },
        fail: (err) => {
          console.log('获取权限设置失败:', err)
          // 在游客模式下直接尝试保存
          this.saveToAlbum()
        }
      })
    } catch (error) {
      console.log('权限检查异常:', error)
      // 在游客模式下直接尝试保存
      this.saveToAlbum()
    }
  },

  // 保存到相册的具体实现
  saveToAlbum() {
    wx.saveImageToPhotosAlbum({
      filePath: this.data.generatedPhoto,
      success: () => {
        wx.showToast({
          title: '照片保存成功！',
          icon: 'success'
        })
      },
      fail: (err) => {
        console.error('保存照片失败:', err)
        if (err.errMsg.includes('auth deny') || err.errMsg.includes('scope.writePhotosAlbum')) {
          wx.showModal({
            title: '提示',
            content: '需要授权保存到相册',
            success: (res) => {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
        } else {
          wx.showToast({
            title: '保存失败，请重试',
            icon: 'error'
          })
        }
      }
    })
  },

  // 触摸开始
  onTouchStart(e) {
    if (!this.data.selectedSize) return
    
    const touch = e.touches[0]
    this.setData({
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY
    })
  },

  // 触摸移动
  onTouchMove(e) {
    if (!this.data.isDragging || !this.data.selectedSize) return
    
    const touch = e.touches[0]
    const deltaX = touch.clientX - this.data.startX
    const deltaY = touch.clientY - this.data.startY
    
    
    // 计算新位置
    let newX = this.data.cropFrameX + deltaX
    let newY = this.data.cropFrameY + deltaY
    
    // 🎯 修复：边界检查应该基于照片的实际显示区域
    const { cropFrameWidth, cropFrameHeight, imageInfo, actualImageWidth, actualImageHeight, imageOffsetX, imageOffsetY } = this.data
    const containerWidth = 500  // 容器宽度
    const containerHeight = 500  // 容器高度
    
    // 照片的实际显示区域边界（不能超出容器）
    const imageLeft = Math.max(0, imageOffsetX)
    const imageRight = Math.min(containerWidth, imageOffsetX + actualImageWidth)
    const imageTop = Math.max(0, imageOffsetY)
    const imageBottom = Math.min(containerHeight, imageOffsetY + actualImageHeight)
    
    // 裁剪框不能超出照片的实际显示区域，也不能超出容器
    const minX = imageLeft
    const maxX = Math.min(imageRight - cropFrameWidth, containerWidth - cropFrameWidth) - 1  // 🎯 减去1像素确保不超出
    const minY = imageTop
    const maxY = Math.min(imageBottom - cropFrameHeight, containerHeight - cropFrameHeight) - 1  // 🎯 减去1像素确保不超出
    
    newX = Math.max(minX, Math.min(newX, maxX))
    newY = Math.max(minY, Math.min(newY, maxY))
    
    
    this.setData({
      cropFrameX: newX,
      cropFrameY: newY,
      startX: touch.clientX,
      startY: touch.clientY
    })
  },

  // 触摸结束
  onTouchEnd(e) {
    this.setData({
      isDragging: false
    })
  },

  // 测试按钮移动裁剪框
  moveCropFrame(e) {
    const direction = e.currentTarget.dataset.direction
    const step = 10 // 移动步长
    
    let newX = this.data.cropFrameX
    let newY = this.data.cropFrameY
    
    // 🎯 修复：边界检查应该基于照片的实际显示区域
    const { cropFrameWidth, cropFrameHeight, actualImageWidth, actualImageHeight, imageOffsetX, imageOffsetY } = this.data
    const containerWidth = 500  // 容器宽度
    const containerHeight = 500  // 容器高度
    
    // 照片的实际显示区域边界（不能超出容器）
    const imageLeft = Math.max(0, imageOffsetX)
    const imageRight = Math.min(containerWidth, imageOffsetX + actualImageWidth)
    const imageTop = Math.max(0, imageOffsetY)
    const imageBottom = Math.min(containerHeight, imageOffsetY + actualImageHeight)
    
    // 裁剪框不能超出照片的实际显示区域，也不能超出容器
    const minX = imageLeft
    const maxX = Math.min(imageRight - cropFrameWidth, containerWidth - cropFrameWidth) - 1  // 🎯 减去1像素确保不超出
    const minY = imageTop
    const maxY = Math.min(imageBottom - cropFrameHeight, containerHeight - cropFrameHeight) - 1  // 🎯 减去1像素确保不超出
    
    switch (direction) {
      case 'up':
        newY = Math.max(minY, newY - step)
        break
      case 'down':
        newY = Math.min(maxY, newY + step)
        break
      case 'left':
        newX = Math.max(minX, newX - step)
        break
      case 'right':
        newX = Math.min(maxX, newX + step)
        break
    }
    
    
    this.setData({
      cropFrameX: newX,
      cropFrameY: newY
    })
  },

  // 缩放图片
  scaleImage(e) {
    const action = e.currentTarget.dataset.action
    const step = 0.1 // 缩放步长
    
    let newScale = this.data.imageScale
    
    if (action === 'zoomIn') {
      newScale = Math.min(this.data.maxScale, newScale + step)
    } else if (action === 'zoomOut') {
      newScale = Math.max(this.data.minScale, newScale - step)
    } else if (action === 'reset') {
      newScale = 1.0
    }
    
    
    this.setData({
      imageScale: newScale,
      imageScalePercent: Math.round(newScale * 100)
    })
  },

  // 比例尺拖拽开始
  onScaleStart(e) {
    this.setData({
      isScaling: true,
      scaleStartX: e.touches[0].clientX
    })
  },

  // 比例尺拖拽移动
  onScaleMove(e) {
    if (!this.data.isScaling) return
    
    const touch = e.touches[0]
    const deltaX = touch.clientX - this.data.scaleStartX
    
    // 计算新的滑块位置（300px总长度，0-300px范围）
    let newPosition = this.data.scaleHandlePosition + deltaX
    newPosition = Math.max(0, Math.min(300, newPosition))
    
    // 转换为缩放比例（0.5-3.0）
    const scale = 0.5 + (newPosition / 300) * (3.0 - 0.5)
    const scalePercent = Math.round(scale * 100)
    
    
    this.setData({
      scaleHandlePosition: newPosition,
      imageScale: scale,
      imageScalePercent: scalePercent,
      scaleStartX: touch.clientX
    })
  },

  // 比例尺拖拽结束
  onScaleEnd(e) {
    this.setData({
      isScaling: false
    })
  },

  // 重置缩放
  resetScale() {
    this.setData({
      imageScale: 1.0,
      imageScalePercent: 100,
      scaleHandlePosition: 150 // 重置到中间位置
    })
    wx.showToast({
      title: '缩放已重置',
      icon: 'success'
    })
  },


  // 重置应用
  resetApp() {
    this.setData({
      imageUrl: '',
      generatedPhoto: '',
      generating: false,
      selectedSize: null,
      customWidth: '',
      customHeight: '',
      imageInfo: null,
      cropFrameX: 0,
      cropFrameY: 0,
      isDragging: false,
      imageScale: 1.0,
      imageScalePercent: 100,
      scaleHandlePosition: 150,
      isScaling: false
    })
    wx.showToast({
      title: '已重置',
      icon: 'success'
    })
  }
})
