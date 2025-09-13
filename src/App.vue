<template>
  <div id="app">
    <!-- 顶部导航 -->
    <div class="header">
      <div class="header-content">
        <div class="logo">
          <div class="logo-icon">📸</div>
          <div class="logo-text">
            <h1>智能证件照</h1>
            <p>专业级照片裁剪工具</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <!-- 上传区域 -->
      <div class="upload-section" v-if="!imageUrl">
        <div class="upload-card">
          <div class="upload-icon">📁</div>
          <h2>上传您的照片</h2>
          <p>支持 JPG、PNG 格式，最大 10MB</p>
          <el-upload
            class="upload-demo"
            drag
            :auto-upload="false"
            :on-change="handleFileChange"
            accept="image/jpeg,image/png"
            :show-file-list="false"
          >
            <div class="upload-area">
              <div class="upload-icon-large">⬆️</div>
              <div class="upload-text">
                <strong>拖拽文件到此处</strong>
                <span>或点击选择文件</span>
              </div>
            </div>
          </el-upload>
        </div>
      </div>

      <!-- 裁剪区域 -->
      <div class="cropper-section" v-if="imageUrl">
        <div class="cropper-card">
          <div class="card-header">
            <h2>📐 调整裁剪区域</h2>
            <p>拖拽边框调整裁剪区域，确保人像居中</p>
            <div class="keyboard-hint">
              <span class="hint-icon">⌨️</span>
              <span>使用方向键移动裁剪框，Shift+方向键快速移动</span>
            </div>
          </div>
          
          <div class="main-workspace">
            <!-- 左侧：图片区域 -->
            <div class="image-area">
              <div class="cropper-container">
                <div class="cropper-wrapper">
                  <img ref="cropperImage" :src="imageUrl" alt="待裁剪图片" />
                </div>
              </div>
              
              <!-- 预览区域 -->
              <div class="preview-section" v-if="generatedPhoto">
                <div class="preview-image">
                  <img :src="generatedPhoto" alt="生成的证件照" />
                  <div class="image-overlay">
                    <div class="overlay-content">
                      <div class="quality-badge">高清</div>
                      <div class="format-badge">PNG</div>
                    </div>
                  </div>
                </div>
                <div class="preview-actions">
                  <el-button type="primary" @click="downloadPhoto" class="download-btn">
                    <el-icon><download /></el-icon>
                    下载照片
                  </el-button>
                  <el-button @click="regeneratePhoto" class="regenerate-btn">
                    <el-icon><refresh /></el-icon>
                    重新生成
                  </el-button>
                </div>
              </div>
            </div>

            <!-- 右侧：控制面板 -->
            <div class="control-panel">
              <div class="size-selection">
                <h3>选择证件照尺寸</h3>
                <div v-if="selectedSize" class="selected-size-info">
                  <div class="selected-badge">
                    <span class="selected-icon">🔒</span>
                    <span>已锁定 {{ selectedSize.name }} 比例</span>
                  </div>
                  <div class="size-info">
                    {{ selectedSize.width }}×{{ selectedSize.height }}px
                  </div>
                </div>
                <div class="size-buttons">
                  <el-button 
                    v-for="size in photoSizes" 
                    :key="size.name"
                    @click="selectSize(size)"
                    :type="selectedSize && selectedSize.name === size.name ? 'primary' : 'default'"
                    class="size-btn"
                  >
                    {{ size.name }}
                  </el-button>
                </div>
                
                <!-- 自定义尺寸 -->
                <div class="custom-size-section">
                  <h4>自定义尺寸</h4>
                  <div class="custom-inputs">
                    <el-input
                      v-model="customWidth"
                      placeholder="宽度(px)"
                      type="number"
                      class="custom-input"
                    />
                    <span class="input-separator">×</span>
                    <el-input
                      v-model="customHeight"
                      placeholder="高度(px)"
                      type="number"
                      class="custom-input"
                    />
                  </div>
                  <el-button 
                    @click="useCustomSize"
                    :type="selectedSize && selectedSize.name === '自定义' ? 'primary' : 'default'"
                    class="custom-btn"
                  >
                    使用自定义
                  </el-button>
                </div>
                
                <!-- 生成按钮 -->
                <div class="generate-section">
                  <el-button 
                    type="success"
                    size="large"
                    @click="generatePhoto"
                    :loading="generating"
                    :disabled="!selectedSize"
                    class="generate-btn"
                  >
                    <el-icon><camera /></el-icon>
                    生成证件照
                  </el-button>
                </div>
              </div>

              <!-- 操作按钮 -->
              <div class="action-section">
                <el-button @click="resetApp" class="reset-btn">
                  <el-icon><refresh-left /></el-icon>
                  重新上传
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Download, Loading, Refresh, RefreshLeft, Camera } from '@element-plus/icons-vue'
import Cropper from 'cropperjs'

export default {
  name: 'App',
  components: {
    UploadFilled,
    Download,
    Loading,
    Refresh,
    RefreshLeft,
    Camera
  },
  setup() {
    const imageUrl = ref('')
    const cropperImage = ref(null)
    const cropper = ref(null)
    const generatedPhoto = ref('')
    const generating = ref(false)
    const currentSize = ref(null)
    const selectedSize = ref(null)
    const customWidth = ref('')
    const customHeight = ref('')
    const isCropperActive = ref(false)

    // 证件照尺寸配置
    const photoSizes = ref([
      { name: '1寸', width: 295, height: 413, icon: '🆔', desc: '身份证照' },
      { name: '2寸', width: 413, height: 579, icon: '📋', desc: '简历照片' },
      { name: '3寸', width: 649, height: 991, icon: '📄', desc: '证件照' },
      { name: '4寸', width: 1051, height: 1496, icon: '📑', desc: '大尺寸' },
      { name: '5寸', width: 1500, height: 2102, icon: '📊', desc: '海报照' },
      { name: '6寸', width: 1800, height: 2400, icon: '🖼️', desc: '相框照' },
      { name: '7寸', width: 2102, height: 1500, icon: '🎨', desc: '艺术照' }
    ])

    // 处理文件上传
    const handleFileChange = (file) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        imageUrl.value = e.target.result
        nextTick(() => {
          initCropper()
        })
      }
      reader.readAsDataURL(file.raw)
    }

    // 初始化裁剪器
    const initCropper = () => {
      if (cropperImage.value) {
        cropper.value = new Cropper(cropperImage.value, {
          aspectRatio: NaN, // 初始自由比例
          viewMode: 1, // 限制裁剪框不超过图片边界
          dragMode: 'move',
          autoCropArea: 0.8,
          restore: false,
          guides: true,
          center: true,
          highlight: false,
          cropBoxMovable: true,
          cropBoxResizable: true,
          toggleDragModeOnDblclick: false,
          background: false,
          modal: true,
          scalable: true,
          zoomable: true,
          rotatable: true,
          checkCrossOrigin: false,
          checkOrientation: false,
          responsive: true,
          minCropBoxWidth: 50,
          minCropBoxHeight: 50,
          cropstart: () => {
            // 裁剪开始
            isCropperActive.value = true
          },
          cropmove: () => {
            // 裁剪移动
          },
          cropend: () => {
            // 裁剪结束
            isCropperActive.value = false
          },
          ready: () => {
            // 裁剪器准备就绪
            isCropperActive.value = true
          }
        })
      }
    }

    // 设置裁剪框比例
    const setCropAspectRatio = (size) => {
      if (cropper.value) {
        const aspectRatio = size.width / size.height
        cropper.value.setAspectRatio(aspectRatio)
        selectedSize.value = size
        ElMessage.success(`已锁定 ${size.name} 比例，只能移动位置`)
      }
    }

    // 键盘事件处理 - 移动裁剪框
    const handleKeydown = (event) => {
      if (!cropper.value || !isCropperActive.value) return
      
      const step = event.shiftKey ? 10 : 1 // Shift键加速移动
      let moved = false
      
      switch (event.key) {
        case 'ArrowUp':
          event.preventDefault()
          // 向上移动裁剪框
          const currentData = cropper.value.getData()
          cropper.value.setData({
            x: currentData.x,
            y: Math.max(0, currentData.y - step)
          })
          moved = true
          break
        case 'ArrowDown':
          event.preventDefault()
          // 向下移动裁剪框
          const currentDataDown = cropper.value.getData()
          const containerData = cropper.value.getContainerData()
          cropper.value.setData({
            x: currentDataDown.x,
            y: Math.min(containerData.height - currentDataDown.height, currentDataDown.y + step)
          })
          moved = true
          break
        case 'ArrowLeft':
          event.preventDefault()
          // 向左移动裁剪框
          const currentDataLeft = cropper.value.getData()
          cropper.value.setData({
            x: Math.max(0, currentDataLeft.x - step),
            y: currentDataLeft.y
          })
          moved = true
          break
        case 'ArrowRight':
          event.preventDefault()
          // 向右移动裁剪框
          const currentDataRight = cropper.value.getData()
          const containerDataRight = cropper.value.getContainerData()
          cropper.value.setData({
            x: Math.min(containerDataRight.width - currentDataRight.width, currentDataRight.x + step),
            y: currentDataRight.y
          })
          moved = true
          break
      }
      
      if (moved) {
        // 可选：显示微调提示
        // ElMessage.info(`裁剪框移动: ${event.key.replace('Arrow', '')} ${step}px`)
      }
    }

    // 选择尺寸（只锁定比例，不生成）
    const selectSize = (size) => {
      if (!cropper.value) {
        ElMessage.error('请先上传图片')
        return
      }
      setCropAspectRatio(size)
    }

    // 使用自定义尺寸
    const useCustomSize = () => {
      if (!cropper.value) {
        ElMessage.error('请先上传图片')
        return
      }
      
      const width = parseInt(customWidth.value)
      const height = parseInt(customHeight.value)
      
      if (!width || !height || width <= 0 || height <= 0) {
        ElMessage.error('请输入有效的长宽数值')
        return
      }
      
      const customSize = { name: '自定义', width, height }
      setCropAspectRatio(customSize)
    }

    // 生成证件照
    const generatePhoto = async () => {
      if (!cropper.value) {
        ElMessage.error('请先上传图片')
        return
      }

      if (!selectedSize.value) {
        ElMessage.error('请先选择尺寸')
        return
      }

      generating.value = true
      currentSize.value = selectedSize.value
      
      try {
        // 使用 Cropper.js 的内置方法获取裁剪后的 canvas
        const canvas = cropper.value.getCroppedCanvas({
          width: selectedSize.value.width,
          height: selectedSize.value.height,
          imageSmoothingEnabled: true,
          imageSmoothingQuality: 'high',
          fillColor: '#ffffff', // 白色背景填充
          maxWidth: selectedSize.value.width,
          maxHeight: selectedSize.value.height,
          minWidth: selectedSize.value.width,
          minHeight: selectedSize.value.height
        })

        if (canvas) {
          // 确保canvas尺寸完全正确
          const finalCanvas = document.createElement('canvas')
          const finalCtx = finalCanvas.getContext('2d')
          
          // 设置精确的目标尺寸
          finalCanvas.width = selectedSize.value.width
          finalCanvas.height = selectedSize.value.height
          
          // 启用高质量渲染
          finalCtx.imageSmoothingEnabled = true
          finalCtx.imageSmoothingQuality = 'high'
          
          // 绘制到最终canvas
          finalCtx.drawImage(canvas, 0, 0, selectedSize.value.width, selectedSize.value.height)
          
          // 转换为base64，确保质量
          generatedPhoto.value = finalCanvas.toDataURL('image/png', 1.0)
          ElMessage.success(`${selectedSize.value.name}证件照生成成功！`)
        } else {
          ElMessage.error('生成失败，请重试')
        }
        
      } catch (error) {
        console.error('生成照片失败:', error)
        ElMessage.error('生成失败，请重试')
      } finally {
        generating.value = false
      }
    }

    // 重新生成照片
    const regeneratePhoto = () => {
      generatePhoto()
    }

    // 下载照片
    const downloadPhoto = () => {
      if (!generatedPhoto.value) {
        ElMessage.error('请先生成照片')
        return
      }

      // 确保使用与预览完全相同的图片数据
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d')
      const img = new Image()
      
      img.onload = () => {
        // 设置canvas尺寸为预览图片的尺寸
        canvas.width = img.width
        canvas.height = img.height
        
        // 绘制图片到canvas
        ctx.drawImage(img, 0, 0)
        
        // 转换为blob并下载
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob)
            const link = document.createElement('a')
            link.download = `证件照_${selectedSize.value ? selectedSize.value.name : '自定义'}_${new Date().getTime()}.png`
            link.href = url
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            URL.revokeObjectURL(url)
            
            ElMessage.success('照片下载成功！')
          } else {
            ElMessage.error('下载失败，请重试')
          }
        }, 'image/png', 1.0)
      }
      
      img.onerror = () => {
        ElMessage.error('图片加载失败，请重新生成')
      }
      
      // 使用预览图片的base64数据
      img.src = generatedPhoto.value
    }

    // 重置应用
    const resetApp = () => {
      if (cropper.value) {
        cropper.value.destroy()
        cropper.value = null
      }
      imageUrl.value = ''
      generatedPhoto.value = ''
      generating.value = false
      currentSize.value = null
      selectedSize.value = null
      customWidth.value = ''
      customHeight.value = ''
    }

    // 生命周期钩子
    onMounted(() => {
      document.addEventListener('keydown', handleKeydown)
    })

    onUnmounted(() => {
      document.removeEventListener('keydown', handleKeydown)
    })

    return {
      imageUrl,
      cropperImage,
      generatedPhoto,
      generating,
      photoSizes,
      selectedSize,
      customWidth,
      customHeight,
      handleFileChange,
      selectSize,
      useCustomSize,
      generatePhoto,
      regeneratePhoto,
      downloadPhoto,
      resetApp
    }
  }
}
</script>

<style scoped>
/* 全局样式 */
#app {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  background-attachment: fixed;
}

/* 顶部导航 */
.header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 8px 20px;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo-icon {
  font-size: 1.5rem;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-text h1 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea, #764ba2);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.logo-text p {
  margin: 0;
  color: #666;
  font-size: 0.8rem;
  font-weight: 400;
}

/* 主内容区域 */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 20px;
}

/* 上传区域 */
.upload-section {
  display: flex;
  justify-content: center;
  margin: 30px 0;
}

.upload-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px 30px;
  text-align: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  max-width: 600px;
  width: 100%;
}

.upload-icon {
  font-size: 3rem;
  margin-bottom: 15px;
}

.upload-card h2 {
  margin: 0 0 8px 0;
  font-size: 1.6rem;
  font-weight: 600;
  color: #333;
}

.upload-card p {
  margin: 0 0 20px 0;
  color: #666;
  font-size: 1rem;
}

.upload-demo {
  width: 100%;
}

.upload-area {
  padding: 30px 20px;
  border: 3px dashed #e0e0e0;
  border-radius: 16px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.upload-area:hover {
  border-color: #667eea;
  background: rgba(102, 126, 234, 0.05);
}

.upload-icon-large {
  font-size: 2.5rem;
  margin-bottom: 15px;
}

.upload-text strong {
  display: block;
  font-size: 1.1rem;
  color: #333;
  margin-bottom: 6px;
}

.upload-text span {
  color: #666;
  font-size: 0.9rem;
}

/* 裁剪区域 */
.cropper-section {
  margin: 40px 0;
}

.cropper-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(20px);
  border-radius: 24px;
  padding: 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
}

.card-header {
  text-align: center;
  margin-bottom: 40px;
}

.card-header h2 {
  margin: 0 0 10px 0;
  font-size: 1.8rem;
  font-weight: 600;
  color: #333;
}

.card-header p {
  margin: 0 0 8px 0;
  color: #666;
  font-size: 1rem;
}

.keyboard-hint {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(102, 126, 234, 0.1);
  border: 1px solid rgba(102, 126, 234, 0.2);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 0.85rem;
  color: #667eea;
  margin-top: 8px;
}

.hint-icon {
  font-size: 1rem;
}

/* 主工作区 */
.main-workspace {
  display: flex;
  gap: 30px;
  align-items: flex-start;
}

/* 左侧图片区域 */
.image-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.cropper-container {
  display: flex;
  justify-content: center;
}

.cropper-wrapper {
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
  max-width: 100%;
}

.cropper-wrapper img {
  max-width: 100%;
  max-height: 500px;
  display: block;
}

/* 预览区域 */
.preview-section {
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  border: 2px solid #e8ecf7;
}

.preview-image {
  position: relative;
  display: inline-block;
  margin-bottom: 20px;
}

.preview-image img {
  max-width: 250px;
  max-height: 350px;
  border-radius: 12px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.15);
  border: 3px solid #667eea;
}

.image-overlay {
  position: absolute;
  top: 12px;
  right: 12px;
}

.overlay-content {
  display: flex;
  gap: 8px;
}

.quality-badge, .format-badge {
  background: rgba(102, 126, 234, 0.9);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.7rem;
  font-weight: 600;
}

.preview-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  flex-wrap: wrap;
}

.download-btn {
  background: linear-gradient(135deg, #667eea, #764ba2);
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 600;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.download-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.4);
}

.regenerate-btn {
  border-radius: 8px;
  padding: 8px 16px;
  font-weight: 600;
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.regenerate-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* 右侧控制面板 */
.control-panel {
  width: 280px;
  background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
  border-radius: 16px;
  padding: 24px;
  border: 2px solid #e8ecf7;
  position: sticky;
  top: 20px;
}

.size-selection h3 {
  margin: 0 0 20px 0;
  font-size: 1.2rem;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.selected-size-info {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 20px;
  text-align: center;
}

.selected-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 600;
  margin-bottom: 8px;
}

.selected-icon {
  font-size: 1.2rem;
}

.size-info {
  font-size: 0.9rem;
  opacity: 0.9;
  font-family: 'Monaco', 'Menlo', monospace;
}

.size-buttons {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.size-btn {
  width: 100%;
  padding: 12px 16px;
  font-weight: 600;
  border-radius: 8px;
  transition: all 0.3s ease;
  background: white;
  border: 2px solid #e8ecf7;
  color: #333;
}

.size-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

/* 自定义尺寸区域 */
.custom-size-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e8ecf7;
}

.custom-size-section h4 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
  text-align: center;
}

.custom-inputs {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.custom-input {
  flex: 1;
}

.input-separator {
  font-weight: 600;
  color: #666;
  font-size: 1.1rem;
}

.custom-btn {
  width: 100%;
  border-radius: 8px;
  padding: 10px 16px;
  font-weight: 600;
  transition: all 0.3s ease;
  background: white;
  border: 2px solid #e8ecf7;
  color: #333;
}

.custom-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.2);
  border-color: #667eea;
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

/* 生成按钮区域 */
.generate-section {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #e8ecf7;
}

.generate-btn {
  width: 100%;
  border-radius: 12px;
  padding: 14px 20px;
  font-weight: 600;
  font-size: 1.1rem;
  transition: all 0.3s ease;
  background: linear-gradient(135deg, #52c41a, #73d13d);
  border: none;
  color: white;
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(82, 196, 26, 0.4);
}

.generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

/* 操作按钮 */
.action-section {
  margin-top: 30px;
  text-align: center;
}

.reset-btn {
  width: 100%;
  border-radius: 8px;
  padding: 12px 16px;
  font-weight: 600;
  transition: all 0.3s ease;
  background: #f5f5f5;
  border: 2px solid #e0e0e0;
  color: #666;
}

.reset-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  background: #e0e0e0;
  border-color: #ccc;
}

/* Cropper.js 样式覆盖 */
:deep(.cropper-container) {
  border-radius: 16px;
  overflow: hidden;
}

:deep(.cropper-crop-box) {
  border: 3px dashed #667eea !important;
  border-radius: 8px;
}

:deep(.cropper-view-box) {
  border: 3px dashed #667eea !important;
  border-radius: 8px;
}

:deep(.cropper-face) {
  background-color: rgba(102, 126, 234, 0.1) !important;
}

:deep(.cropper-line) {
  background-color: #667eea !important;
  opacity: 0.8;
}

:deep(.cropper-point) {
  background-color: #667eea !important;
  border: 3px solid white !important;
  border-radius: 50% !important;
  width: 12px !important;
  height: 12px !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

:deep(.cropper-point.point-se) {
  cursor: se-resize;
}

:deep(.cropper-point.point-sw) {
  cursor: sw-resize;
}

:deep(.cropper-point.point-nw) {
  cursor: nw-resize;
}

:deep(.cropper-point.point-ne) {
  cursor: ne-resize;
}

:deep(.cropper-point.point-n) {
  cursor: n-resize;
}

:deep(.cropper-point.point-s) {
  cursor: s-resize;
}

:deep(.cropper-point.point-w) {
  cursor: w-resize;
}

:deep(.cropper-point.point-e) {
  cursor: e-resize;
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .main-workspace {
    flex-direction: column;
    gap: 20px;
  }
  
  .control-panel {
    width: 100%;
    position: static;
  }
  
  .size-buttons {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 12px;
  }
  
  .size-btn {
    width: auto;
  }
}

@media (max-width: 768px) {
  .logo {
    flex-direction: column;
    text-align: center;
    gap: 10px;
  }
  
  .logo-text h1 {
    font-size: 2rem;
  }
  
  .main-content {
    padding: 20px 10px;
  }
  
  .upload-card {
    padding: 40px 20px;
  }
  
  .cropper-card {
    padding: 20px;
  }
  
  .main-workspace {
    gap: 15px;
  }
  
  .image-area {
    gap: 15px;
  }
  
  .preview-section {
    padding: 15px;
  }
  
  .preview-image img {
    max-width: 200px;
    max-height: 280px;
  }
  
  .preview-actions {
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }
  
  .download-btn, .regenerate-btn {
    width: 180px;
  }
  
  .control-panel {
    padding: 20px;
  }
  
  .size-buttons {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 480px) {
  .size-buttons {
    grid-template-columns: 1fr;
  }
  
  .preview-image img {
    max-width: 180px;
    max-height: 250px;
  }
  
  .cropper-wrapper img {
    max-height: 400px;
  }
}
</style>
