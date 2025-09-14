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
    scaleHandlePosition: 150, // 比例尺滑块位置（像素）- 300px轨道的正中间
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
    canvasHeight: 0, // 🎯 修复：Canvas高度
    // 🎯 新增：图片拖拽相关变量
    imagePositionX: 0, // 图片X位置偏移
    imagePositionY: 0, // 图片Y位置偏移
    isImageDragging: false, // 是否正在拖拽图片
    imageDragStartX: 0, // 图片拖拽开始X坐标
    imageDragStartY: 0, // 图片拖拽开始Y坐标
    // 🎯 新增：自定义尺寸折叠状态
    showCustomSize: false // 是否显示自定义尺寸内容
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
    const { selectedSize, imageInfo, cropFrameWidth, cropFrameHeight, cropFrameX, cropFrameY, imageScale, imagePositionX, imagePositionY } = this.data
    
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
      imageOffsetX = (containerWidth - actualImageWidth) / 2 + imagePositionX
      imageOffsetY = (containerHeight - actualImageHeight) / 2 + imagePositionY
    } else {
      // 图片更高，以容器高度为准
      actualImageHeight = containerHeight * imageScale
      actualImageWidth = actualImageHeight * imageAspectRatio
      imageOffsetX = (containerWidth - actualImageWidth) / 2 + imagePositionX
      imageOffsetY = (containerHeight - actualImageHeight) / 2 + imagePositionY
    }
    
    // 🎯 关键修复：裁剪框坐标转换
    // 裁剪框位置是相对于图片容器的，需要转换为相对于图片的坐标
    // 考虑图片的缩放和移动变换
    const cropRelativeX = cropFrameX - imageOffsetX
    const cropRelativeY = cropFrameY - imageOffsetY
    
    console.log('🎯 图片移动后的坐标计算:', {
      imagePositionX, imagePositionY,
      imageOffsetX, imageOffsetY,
      cropFrameX, cropFrameY,
      cropRelativeX, cropRelativeY,
      actualImageWidth, actualImageHeight
    })
    
    // 🎯 修复：真机偏差修复 - 添加设备像素比补偿
    const systemInfo = wx.getSystemInfoSync()
    const devicePixelRatio = systemInfo.pixelRatio || 1
    const screenWidth = systemInfo.screenWidth
    const rpxToPx = screenWidth / 750 // rpx转px的转换比例
    
    console.log('🎯 设备信息:', {
      devicePixelRatio,
      screenWidth,
      rpxToPx,
      systemInfo
    })
    
    // 🎯 关键修复：计算裁剪区域在原始图片中的尺寸和位置
    // 需要考虑图片的缩放比例和设备像素比
    const cropWidth = (cropFrameWidth / actualImageWidth) * imageInfo.width
    const cropHeight = (cropFrameHeight / actualImageHeight) * imageInfo.height
    const cropX = cropRelativeX / actualImageWidth * imageInfo.width
    const cropY = cropRelativeY / actualImageHeight * imageInfo.height
    
    // 🎯 修复：真机偏差补偿 - 更精确的补偿算法
    // 根据设备类型和像素比进行精确补偿
    let deviceOffsetY = 0
    let deviceOffsetX = 0
    
    // 🎯 基于像素比的精确补偿
    if (devicePixelRatio >= 3) {
      // 超高分辨率设备（如iPhone 6 Plus等）
      deviceOffsetY = 1.5  // 增加补偿
      deviceOffsetX = 0.5   // 添加左右补偿
    } else if (devicePixelRatio >= 2.5) {
      // 高分辨率设备（如iPhone X等）
      deviceOffsetY = 1.2
      deviceOffsetX = 0.3
    } else if (devicePixelRatio >= 2) {
      // 高分辨率设备（如iPhone 6等）
      deviceOffsetY = 0.8  // 增加补偿
      deviceOffsetX = 0.2  // 添加左右补偿
    } else if (devicePixelRatio >= 1.5) {
      // 中等分辨率设备
      deviceOffsetY = 0.3
      deviceOffsetX = 0.1
    } else {
      // 低分辨率设备
      deviceOffsetY = 0.1
      deviceOffsetX = 0
    }
    
    // 🎯 根据设备型号进行特殊补偿
    const model = systemInfo.model || ''
    if (model.includes('iPhone')) {
      deviceOffsetY += 0.3 // iPhone设备额外补偿
      deviceOffsetX += 0.1 // iPhone设备左右补偿
    } else if (model.includes('iPad')) {
      deviceOffsetY += 0.2 // iPad设备额外补偿
      deviceOffsetX += 0.1 // iPad设备左右补偿
    } else if (model.includes('Android')) {
      deviceOffsetY += 0.1 // Android设备补偿
      deviceOffsetX += 0.05 // Android设备左右补偿
    }
    
    // 🎯 根据屏幕尺寸进行额外补偿
    const screenHeight = systemInfo.screenHeight || 0
    if (screenHeight > 2000) {
      // 大屏设备
      deviceOffsetY += 0.2
      deviceOffsetX += 0.1
    }
    
    // 🎯 动态补偿：基于裁剪框位置进行微调
    // 如果裁剪框在图片的上半部分，增加向下补偿
    if (cropFrameY < containerHeight / 2) {
      deviceOffsetY += 0.2
    }
    // 如果裁剪框在图片的左半部分，增加向右补偿
    if (cropFrameX < containerWidth / 2) {
      deviceOffsetX += 0.1
    }
    
    // 🎯 基于图片缩放比例的补偿
    if (imageScale > 1.5) {
      // 图片放大时，需要减少补偿
      deviceOffsetY *= 0.8
      deviceOffsetX *= 0.8
    } else if (imageScale < 0.8) {
      // 图片缩小时，需要增加补偿
      deviceOffsetY *= 1.2
      deviceOffsetX *= 1.2
    }
    
    // 🎯 修复：图片移动后的特殊补偿
    // 当图片被移动后，需要额外的补偿来抵消移动带来的偏差
    let moveCompensationY = 0
    let moveCompensationX = 0
    
    // 根据图片移动方向进行补偿
    if (imagePositionY > 0) {
      // 图片向下移动，裁剪框需要向上补偿
      moveCompensationY = -imagePositionY * 0.3
    } else if (imagePositionY < 0) {
      // 图片向上移动，裁剪框需要向下补偿
      moveCompensationY = -imagePositionY * 0.3
    }
    
    if (imagePositionX > 0) {
      // 图片向右移动，裁剪框需要向左补偿
      moveCompensationX = -imagePositionX * 0.3
    } else if (imagePositionX < 0) {
      // 图片向左移动，裁剪框需要向右补偿
      moveCompensationX = -imagePositionX * 0.3
    }
    
    // 🎯 根据移动距离调整补偿强度
    const moveDistance = Math.sqrt(imagePositionX * imagePositionX + imagePositionY * imagePositionY)
    if (moveDistance > 50) {
      // 移动距离较大时，增加补偿
      moveCompensationY *= 1.2
      moveCompensationX *= 1.2
    }
    
    console.log('🎯 图片移动补偿:', {
      imagePositionX, imagePositionY,
      moveCompensationX, moveCompensationY,
      moveDistance
    })
    
    // 应用移动补偿
    deviceOffsetY += moveCompensationY
    deviceOffsetX += moveCompensationX
    
    const adjustedCropX = cropX + deviceOffsetX
    const adjustedCropY = cropY + deviceOffsetY
    
    console.log('🎯 裁剪计算详细信息（包含变换）:', {
      containerWidth, containerHeight,
      actualImageWidth, actualImageHeight,
      imageOffsetX, imageOffsetY,
      imagePositionX, imagePositionY,
      imageScale,
      cropFrameX, cropFrameY, cropFrameWidth, cropFrameHeight,
      cropRelativeX, cropRelativeY,
      cropX, cropY, cropWidth, cropHeight,
      deviceOffsetX, deviceOffsetY, adjustedCropX, adjustedCropY,
      devicePixelRatio, model, screenHeight,
      finalCropX: adjustedCropX, finalCropY: adjustedCropY, finalCropWidth: cropWidth, finalCropHeight: cropHeight
    })
    
    // 🎯 修复：边界检查，确保裁剪区域在图片范围内
    const finalCropX = Math.max(0, Math.min(adjustedCropX, imageInfo.width - cropWidth))
    const finalCropY = Math.max(0, Math.min(adjustedCropY, imageInfo.height - cropHeight))
    const finalCropWidth = Math.min(cropWidth, imageInfo.width - finalCropX)
    const finalCropHeight = Math.min(cropHeight, imageInfo.height - finalCropY)
    
    console.log('🎯 最终裁剪参数:', {
      finalCropX, finalCropY, finalCropWidth, finalCropHeight,
      imageInfo: { width: imageInfo.width, height: imageInfo.height },
      canvasWidth, canvasHeight
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
    
    // 🎯 修复：真机Canvas绘制补偿
    // 添加Canvas绘制的微调偏移，确保真机上的绘制精度
    let canvasOffsetX = 0
    let canvasOffsetY = 0
    
    // 🎯 基于设备像素比的Canvas补偿
    if (devicePixelRatio >= 3) {
      canvasOffsetX = 0.3
      canvasOffsetY = 0.8
    } else if (devicePixelRatio >= 2.5) {
      canvasOffsetX = 0.2
      canvasOffsetY = 0.6
    } else if (devicePixelRatio >= 2) {
      canvasOffsetX = 0.1
      canvasOffsetY = 0.4
    } else if (devicePixelRatio >= 1.5) {
      canvasOffsetX = 0.05
      canvasOffsetY = 0.2
    } else {
      canvasOffsetX = 0
      canvasOffsetY = 0.1
    }
    
    // 🎯 根据设备型号进行Canvas补偿
    if (model.includes('iPhone')) {
      canvasOffsetX += 0.1
      canvasOffsetY += 0.2
    } else if (model.includes('iPad')) {
      canvasOffsetX += 0.05
      canvasOffsetY += 0.1
    }
    
    // 🎯 修复：图片移动后的Canvas补偿
    // 当图片被移动后，Canvas绘制也需要相应的补偿
    let canvasMoveCompensationX = 0
    let canvasMoveCompensationY = 0
    
    // 根据图片移动方向调整Canvas绘制位置
    if (imagePositionY !== 0) {
      canvasMoveCompensationY = imagePositionY * 0.1 // 移动补偿
    }
    if (imagePositionX !== 0) {
      canvasMoveCompensationX = imagePositionX * 0.1 // 移动补偿
    }
    
    // 应用Canvas移动补偿
    canvasOffsetX += canvasMoveCompensationX
    canvasOffsetY += canvasMoveCompensationY
    
    console.log('🎯 Canvas绘制补偿:', {
      canvasOffsetX, canvasOffsetY,
      canvasMoveCompensationX, canvasMoveCompensationY,
      devicePixelRatio,
      finalCropX, finalCropY, finalCropWidth, finalCropHeight,
      canvasWidth, canvasHeight
    })
    
    // 绘制裁剪后的图片到Canvas，直接填充整个Canvas
    ctx.drawImage(
      this.data.imageUrl,
      finalCropX, finalCropY, finalCropWidth, finalCropHeight,
      canvasOffsetX, canvasOffsetY, canvasWidth, canvasHeight
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
          console.log('🎯 证件照生成成功:', res.tempFilePath)
          
          this.setData({
            generatedPhoto: res.tempFilePath,
            generating: false,
            // 🎯 优化：生成证件照后重置图片变换状态，因为生成的图片已经是最终尺寸
            imageScale: 1.0,
            imageScalePercent: 100,
            scaleHandlePosition: 150,
            imagePositionX: 0,
            imagePositionY: 0
          })
          
          // 🎯 简化：生成证件照后直接显示
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
          this.setData({ 
            generating: false
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
    const { cropFrameWidth, cropFrameHeight, imageInfo, actualImageWidth, actualImageHeight, imageOffsetX, imageOffsetY, imageScale, imagePositionX, imagePositionY } = this.data
    const containerWidth = 500  // 容器宽度
    const containerHeight = 500  // 容器高度
    
    // 🎯 修复：重新计算图片的实际显示区域，考虑缩放和移动
    const imageAspectRatio = imageInfo.width / imageInfo.height
    const containerAspectRatio = containerWidth / containerHeight
    
    let currentActualImageWidth, currentActualImageHeight, currentImageOffsetX, currentImageOffsetY
    
    if (imageAspectRatio > containerAspectRatio) {
      // 图片更宽，以容器宽度为准
      currentActualImageWidth = containerWidth * imageScale
      currentActualImageHeight = currentActualImageWidth / imageAspectRatio
      currentImageOffsetX = (containerWidth - currentActualImageWidth) / 2 + imagePositionX
      currentImageOffsetY = (containerHeight - currentActualImageHeight) / 2 + imagePositionY
    } else {
      // 图片更高，以容器高度为准
      currentActualImageHeight = containerHeight * imageScale
      currentActualImageWidth = currentActualImageHeight * imageAspectRatio
      currentImageOffsetX = (containerWidth - currentActualImageWidth) / 2 + imagePositionX
      currentImageOffsetY = (containerHeight - currentActualImageHeight) / 2 + imagePositionY
    }
    
    // 照片的实际显示区域边界（不能超出容器）
    const imageLeft = Math.max(0, currentImageOffsetX)
    const imageRight = Math.min(containerWidth, currentImageOffsetX + currentActualImageWidth)
    const imageTop = Math.max(0, currentImageOffsetY)
    const imageBottom = Math.min(containerHeight, currentImageOffsetY + currentActualImageHeight)
    
    // 裁剪框不能超出照片的实际显示区域，也不能超出容器
    const minX = imageLeft
    const maxX = Math.min(imageRight - cropFrameWidth, containerWidth - cropFrameWidth) - 1  // 🎯 减去1像素确保不超出
    const minY = imageTop
    const maxY = Math.min(imageBottom - cropFrameHeight, containerHeight - cropFrameHeight) - 1  // 🎯 减去1像素确保不超出
    
    newX = Math.max(minX, Math.min(newX, maxX))
    newY = Math.max(minY, Math.min(newY, maxY))
    
    console.log('🎯 裁剪框边界检查:', {
      imageScale, imagePositionX, imagePositionY,
      currentActualImageWidth, currentActualImageHeight,
      currentImageOffsetX, currentImageOffsetY,
      imageLeft, imageRight, imageTop, imageBottom,
      minX, maxX, minY, maxY,
      cropFrameWidth, cropFrameHeight,
      newX, newY
    })
    
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

  // 🎯 修改：移动图片功能
  moveImage(e) {
    const direction = e.currentTarget.dataset.direction
    const step = 10 // 移动步长
    
    let newImageX = this.data.imagePositionX
    let newImageY = this.data.imagePositionY
    
    // 🎯 边界检查：确保图片不会移出容器太远
    const maxOffset = 200 // 最大偏移量
    
    switch (direction) {
      case 'up':
        newImageY = Math.max(-maxOffset, newImageY - step)
        break
      case 'down':
        newImageY = Math.min(maxOffset, newImageY + step)
        break
      case 'left':
        newImageX = Math.max(-maxOffset, newImageX - step)
        break
      case 'right':
        newImageX = Math.min(maxOffset, newImageX + step)
        break
    }
    
    this.setData({
      imagePositionX: newImageX,
      imagePositionY: newImageY
    })
    
    console.log('🎯 图片移动:', {
      direction: direction,
      newImageX: newImageX,
      newImageY: newImageY
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


  // 🎯 新增：图片拖拽开始
  onImageTouchStart(e) {
    if (!this.data.imageUrl) return
    
    const touch = e.touches[0]
    this.setData({
      isImageDragging: true,
      imageDragStartX: touch.clientX,
      imageDragStartY: touch.clientY
    })
  },

  // 🎯 新增：图片拖拽移动
  onImageTouchMove(e) {
    if (!this.data.isImageDragging || !this.data.imageUrl) return
    
    const touch = e.touches[0]
    const deltaX = touch.clientX - this.data.imageDragStartX
    const deltaY = touch.clientY - this.data.imageDragStartY
    
    // 计算新的图片位置
    let newImageX = this.data.imagePositionX + deltaX
    let newImageY = this.data.imagePositionY + deltaY
    
    // 🎯 边界检查：确保图片不会移出容器太远
    const containerWidth = 500
    const containerHeight = 500
    const maxOffset = 200 // 最大偏移量
    
    newImageX = Math.max(-maxOffset, Math.min(newImageX, maxOffset))
    newImageY = Math.max(-maxOffset, Math.min(newImageY, maxOffset))
    
    this.setData({
      imagePositionX: newImageX,
      imagePositionY: newImageY,
      imageDragStartX: touch.clientX,
      imageDragStartY: touch.clientY
    })
  },

  // 🎯 新增：图片拖拽结束
  onImageTouchEnd(e) {
    this.setData({
      isImageDragging: false
    })
  },

  // 🎯 新增：重置图片位置
  resetImagePosition() {
    this.setData({
      imagePositionX: 0,
      imagePositionY: 0
    })
    wx.showToast({
      title: '图片位置已重置',
      icon: 'success'
    })
  },

  // 🎯 新增：切换自定义尺寸折叠状态
  toggleCustomSize() {
    this.setData({
      showCustomSize: !this.data.showCustomSize
    })
  },

  // 🎯 新增：返回原始图片
  backToOriginal() {
    this.setData({
      generatedPhoto: ''
    })
    wx.showToast({
      title: '已返回原图',
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
      isScaling: false,
      // 🎯 新增：重置图片位置
      imagePositionX: 0,
      imagePositionY: 0,
      isImageDragging: false,
      // 🎯 新增：重置自定义尺寸折叠状态
      showCustomSize: false
    })
    wx.showToast({
      title: '已重置',
      icon: 'success'
    })
  }
})
