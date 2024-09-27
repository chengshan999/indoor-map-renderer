import Events from './Events'
import {
  IBackgroundImgArgs,
  IMapData,
  ISwitchs,
  IEvents,
} from "./Interface";

export default class Index extends Events {
  public render(
    contentDom: HTMLElement,
    mapData: IMapData,
    elements: ISwitchs = {},
    events: IEvents = {}
  ) {
    // 清除已渲染数据
    if (this._renderSwitch.completed) this.dispose()
    // 判断、接收参数
    // 容器和地图数据是必传项
    if (!contentDom || !mapData) return
    // 判断当前类是否有正在渲染的任务
    if (this.rendering) {
      // 如果有正在渲染的地图任务，则需要等渲染完成才能执行下一个
      this.needDoQueue.push(() => {
        this.render(contentDom, mapData, elements, events)
      })
      return
    }
    // 开始渲染
    this.rendering = true
    const _data = {
      vnlData: '',
      rectangle: { left: 0, right: 0, bottom: 0, top: 0, width: 0, height: 0 },
      rectangleCustom: null,
      bagroundImgUrl: '',
      backgroundImgArgs: { resolution: 0, origin: [0, 0, 0], negate: 1 },
    }
    Object.assign(_data, mapData)
    const renderEles = {
      backgroundImg: false, // 是否渲染分区地图底图
      vnlOutline: false, // 是否渲染分区地图轮廓
      vnl: true, // 是否渲染分区地图
      text: true, // 是否渲染文字
      mark: true, // 是否渲染二维码
      line: true, // 是否渲染线条
      path: true, // 是否渲染路径
      park: true, // 是否渲染库位
      parkId: true, // 是否渲染库位编号
      point: false, // 是否渲染点位
    }
    Object.assign(renderEles, elements)
    const bindEvents = {
      panzoom: true,
      parkStock: false,
    }
    Object.assign(bindEvents, events)

    // 赋值容器dom
    this.mapOriginData.contentDom = contentDom
    this.mapOriginData.rectangle = _data.rectangle
    this.mapOriginData.rectangleCustom = _data.rectangleCustom
    // 赋值底图数据
    this.backgroundImgData.url = _data.bagroundImgUrl
    this.backgroundImgData.args = _data.backgroundImgArgs
    // 赋值需要开启的事件
    this._eventSwitch.panzoom = bindEvents.panzoom
    // 赋值渲染内容的开关
    this._renderSwitch.backgroundImg = renderEles.backgroundImg
    this._renderSwitch.vnlOutline = renderEles.vnlOutline
    this._renderSwitch.vnl = renderEles.vnl
    this._renderSwitch.text = renderEles.text
    this._renderSwitch.mark = renderEles.mark
    this._renderSwitch.line = renderEles.line
    this._renderSwitch.path = renderEles.path
    this._renderSwitch.park = renderEles.park
    this._renderSwitch.parkId = renderEles.parkId
    this._renderSwitch.point = renderEles.point
    // 增加渲染完成后的回调内容
    // 赋值地图原始json数据
    this.mapOriginData.originData = _data.vnlData
    // 判断是否有VNL渲染，没有：直接标识数据准备完成，有：等vnl数据分类完成会自动表述数据准备完成
    if (!this.renderSwitch.vnl) this.renderSwitch.dataReady = true
  }


  /**
   * 获取当前视口中心点数据
   * @returns
   */
  public getViewportCenter() {
    const currentTransform = this.panzoom.getTransform()
    // {"x": 197.5191850094826,"y": 0,"scale": 1}

    // 获取SVG的缩放级别和平移偏移
    const currentScale = currentTransform.scale;

    // 获取视口容器元素
    const viewportContainer = this.mapOriginData.contentDom

    // 获取视口容器的宽度和高度
    const viewportWidth = viewportContainer.clientWidth;
    const viewportHeight = viewportContainer.clientHeight;

    // 计算SVG中心点在SVG坐标系中的坐标
    const svgCenterX = (viewportWidth / 2 - currentTransform.x) / currentScale;
    const svgCenterY = (viewportHeight / 2 - currentTransform.y) / currentScale;
    // 计算出显示在容器视口的画布的bound
    const currentViewBound = {
      cx: svgCenterX, // 中心点的X值
      cy: svgCenterY // 中心点的Y值
    }
    return currentViewBound
  }
  /**
   * 以当前地图中心点放大
   */
  public zoomIn() {
    const centerPoint = this.getViewportCenter()
    // 单次放大到原来的1.5倍
    this.panzoom.smoothZoom(centerPoint.cx, centerPoint.cy, 1.5)
  }
  /**
   * 以当前地图中心点缩小
   */
  public zoomOut() {
    const centerPoint = this.getViewportCenter()
    // 单次缩小到原来的0.5倍
    this.panzoom.smoothZoom(centerPoint.cx, centerPoint.cy, 0.75)
  }

  /**
   * 根据agv编号，定位AGV位置，把其移动到视口中央
   * @param agvNo 
   */
  public targetAgv(agvNo: string) {
    if (agvNo && this.agvConfig.hasOwnProperty(agvNo)) {
      // 有这个编号的AGV才作为
      const agvEntry = this.agvConfig[agvNo]
      if (agvEntry.animateQueue?.length) {
        const point = agvEntry.animateQueue[0]
        const needMoveX = this.getMapCoordiateX(point.x)
        const needMoveY = this.getMapCoordiateY(point.y)
        if (this.isInMap(needMoveX, needMoveY)) {
          this.smoothMoveTo(needMoveX, needMoveY)
        } else {
          console.log('车辆位置：', needMoveX, '/', needMoveY, ',不在地图范围内')
        }
      }
    }
  }
  /**
   * 移动到地图坐标处
   * @param mapX 地图的x坐标
   * @param mapY 地图的y坐标
   */
  private smoothMoveTo(mapX: number, mapY: number) {
    const leftTopX = this.viewBoxParams.value[0]
    const leftTopY = this.viewBoxParams.value[1]
    const svgWith = this.viewBoxParams.value[2]
    const svgHeight = this.viewBoxParams.value[3]
    const centerX = leftTopX + svgWith / 2
    const centerY = leftTopY + svgHeight / 2

    // 获取初始画布宽高
    const initWidth = this.paperStatus.width
    const initHeight = this.paperStatus.height

    // 获取当前画图移动的Transform
    const currentTransform = this.panzoom.getTransform()

    // SVG的尺寸转换为画布尺寸后，按照画布scale缩放后，为需要移动的距离
    const offsetX = ((-(mapX - centerX) * initWidth) / svgWith) * currentTransform.scale
    const offsetY = ((-(mapY - centerY) * initHeight) / svgHeight) * currentTransform.scale

    // 获取当前缩放后的宽高
    const currentWidth = currentTransform.scale * initWidth
    const currentHeight = currentTransform.scale * initHeight
    // 当前地图容器视口的宽高
    const windowWidth = this.mapOriginData.contentDom.offsetWidth
    const windowHeight = this.mapOriginData.contentDom.offsetHeight
    
    // 计算需要移动的X和Y的数值
    const needMoveX = offsetX + (windowWidth - currentWidth) / 2
    const needMoveY = offsetY + (windowHeight - currentHeight) / 2
    // 动画效果移动
    if (!this.isNumber(needMoveX) || !this.isNumber(needMoveY)) return console.log('needMoveX-needMoveY', needMoveX, needMoveY)
    this.panzoom.smoothMoveTo(needMoveX, needMoveY)
  }
  /**
   * 地图坐标是否在地图上
   * @param x AGV地图的x坐标
   * @param y AGV地图的y坐标
   * @return boolean
   */
  private isInMap(mapX: number, mapY: number) {
    if (!this.isNumber(mapX) || !this.isNumber(mapY)) return false

    // 获取左上和右下坐标
    let leftTopX = this.viewBoxParams.value[0]
    let leftTopY = this.viewBoxParams.value[1]
    let svgWith = this.viewBoxParams.value[2]
    let svgHeight = this.viewBoxParams.value[3]
    let rightBottomX = leftTopX + svgWith
    let rightBottomY = leftTopY + svgHeight

    // 判断是否在范围
    if (mapX < leftTopX || mapX > rightBottomX || mapY < leftTopY || mapY > rightBottomY) {
      return false
    }
    return true
  }
}
