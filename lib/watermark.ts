// 给图片加水印之后，返回带水印的图片资源
const watermarkImg = (url: string, text: string, callback: any) => {
  const img = new Image()
  img.onload = function () {
    let firstCanvas = document.createElement('canvas') as HTMLCanvasElement
    const firstCtx: any = firstCanvas.getContext('2d')
    firstCanvas.width = img.width // 旋转90度后宽度和高度交换
    firstCanvas.height = img.height // 旋转90度后宽度和高度交换

    // 绘制旋转后的图片
    firstCtx?.drawImage(img, 0, 0, firstCanvas.width, firstCanvas.height)


    firstCtx.font = '20px Arial'
    firstCtx.fillStyle = 'red'
    firstCtx.textAlign = 'center'

    // 在图片底部绘制文案
    firstCtx?.fillText(text, img.width * 0.5 ,  img.height * 0.98)

    let rotatedCanvas = document.createElement('canvas')
    const rotatedCtx = rotatedCanvas.getContext('2d')

    // 逆时针旋转90度
    rotatedCanvas.width = firstCanvas.height
    rotatedCanvas.height = firstCanvas.width
    rotatedCtx?.rotate(-Math.PI / 2)
    rotatedCtx?.drawImage(firstCanvas, -firstCanvas.width, 0)

    const dataSrc = rotatedCanvas.toDataURL("image/png")
    // 已经获取到带水印的图片资源，通过回调函数返回
    callback(dataSrc)

    // 销毁canvas资源
    firstCanvas = null
    rotatedCanvas = null
  }
  img.src = url
}