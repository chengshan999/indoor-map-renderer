import * as PIXI from "pixi.js";
import ProxyManage from "./7ProxyManage";
import { IBackgroundImgArgs, IMapData, ISwitchs, IEvents, IPoint, IRenderOptions } from "./Interface";
export * from "./Interface";
import AGV_IMGS from "../images/agvBase64";

export default class Index extends ProxyManage {
  /**
   * 构造函数
   */
  constructor() {
    super()
  }

  /**
   * 存储初始数据
   */
  private baseData: IMapData
  private elementSwitch: ISwitchs
  private bindSwitch: IEvents
  /**
   * 主渲染方法
   * @param contentDom
   * @param mapData
   * @param elementSwitch
   * @param eventSwitch
   * @returns
   */
  public render(
    contentDom: HTMLElement,
    mapData: IMapData,
    elementSwitch: ISwitchs = {},
    eventSwitch: IEvents = {},
    options: IRenderOptions = {}
  ) {
    this.setRenderOptions(options)
    // 判断、接收参数
    // 容器和地图数据是必传项
    if (!contentDom || !mapData) return;
    // 判断当前类是否有正在渲染的任务
    if (this.rendering && this.app) {
      // 如果有正在渲染的地图任务，立刻结束
      this.app.stop();
    }
    console.log('mapRenderVersion', this.version)
    contentDom.style.overflow = 'hidden'
    // 赋值容器dom
    this.contentDom = contentDom;
    this.addLoadingAnimation()

    // 初始化所有数据
    this.initialize()
    // 清理现有数据，初始化相关数据
    this.dispose();

    // 开始渲染
    this.renderSwitch.completed = false;
    this.rendering = true;

    // 处理初始数据
    const _data = {
      vnlData: {},
      rectangle: { left: 0, right: 0, bottom: 0, top: 0, width: 0, height: 0 },
      rectangleCustom: null,
      parkPathValidate: false,
      bagroundImgUrl: "",
      backgroundImgArgs: { resolution: 0, origin: [0, 0, 0], negate: 1 },
    };
    Object.assign(_data, mapData);
    this.baseData = _data

    const renderEles = {
      backgroundImg: false, // 是否渲染分区地图底图
      vnlOutline: false, // 是否渲染分区地图轮廓
      vnl: true, // 是否渲染分区地图
      text: false, // 是否渲染文字
      mark: false, // 是否渲染二维码
      line: false, // 是否渲染线条
      path: true, // 是否渲染路径
      park: true, // 是否渲染库位
      parkId: true, // 是否渲染库位编号
      point: false, // 是否渲染点位
    };
    Object.assign(renderEles, elementSwitch);
    this.elementSwitch = renderEles

    const bindEvents = {
      pan: true,
      zoom: true,
    };
    Object.assign(bindEvents, eventSwitch);
    this.bindSwitch = bindEvents

    // 赋值基本参数
    this.assignBaseData()
  }

  /**
   * 赋值基础值
   * @param baseData
   * @param renderSwitch
   * @param eventSwitch
   */
  private assignBaseData() {
    const baseData = this.baseData
    const renderSwitch = this.elementSwitch
    const eventSwitch = this.bindSwitch
    // 赋值VNL矩形
    this.mapOriginData.rectangle = baseData.rectangle;
    if (baseData.rectangleCustom) {
      this.mapOriginData.rectangleCustom = baseData.rectangleCustom;
    } else {
      this.mapOriginData.rectangleCustom = baseData.rectangle
    }
    if (baseData.parkPathValidate) {
      this._parkPathValidate = baseData.parkPathValidate
    }
    // 赋值底图数据
    this._backgroundImgData.url = baseData.bagroundImgUrl;
    this._backgroundImgData.args = baseData.backgroundImgArgs;
    // 赋值需要开启的事件
    Object.keys(eventSwitch).forEach((key: string) => {
      this._eventSwitch[key as keyof typeof this._eventSwitch] =
      eventSwitch[key as keyof typeof eventSwitch];
    });
    // 赋值渲染内容的开关
    Object.assign(this._renderSwitch, renderSwitch)
    Object.assign(this._renderShowStatus, renderSwitch)
    Object.assign(this._renderFilter, renderSwitch)
    // 增加渲染完成后的回调内容
    // 赋值地图原始json对象数据
    this.mapOriginData.originData = baseData.vnlData;
    // 判断是否有VNL渲染，没有：直接标识数据准备完成，有：等vnl数据分类完成会自动表述数据准备完成
    if (!this._renderSwitch.vnl && !this.mapOriginData.originData) this.renderSwitch.dataReady = true;
  }

  private setRenderOptions(options: IRenderOptions) {
    this.isCache = options?.cache ?? this.isCache
  }

  /**
   * 刷新渲染，即根据现有数据重新渲染
   */
  public refresh() {
    if (!this.contentDom || !(this.contentDom instanceof HTMLElement)) return
    if (this.rendering && this.app) {
      // 如果有正在渲染的地图任务，立刻结束
      this.app.stop();
    }
    this.addLoadingAnimation()
    // 初始化所有数据
    this.initialize()
    // 清理现有数据，初始化相关数据
    this.dispose();

    // 开始渲染
    this.renderSwitch.completed = false;
    this.rendering = true;

    // 赋值基本参数
    this.assignBaseData()
  }

  /**
   * 开启/关闭抗锯齿
   */
  set antialias(_antialias: boolean) {
    this._antialias = _antialias
    this.refresh()
  }
  /**
   * 获取是否开启了抗锯齿
   */
  get antialias(): boolean {
    return this._antialias
  }

  /**
   * 根据agv编号，定位AGV位置，把其移动到视口中央
   * @param agvNo
   */
  public targetAgv(agvNo: string) {
    if (agvNo && this.agvConfig.hasOwnProperty(agvNo)) {
      // 有这个编号的AGV才作为
      const agvEntry = this.agvConfig[agvNo]
      const agvContainer = agvEntry.animateContainer
      this.panCoordinateToCenter(agvContainer.x, agvContainer.y)
    }
  }

  /**
   * 根据AGV编号获取当前AGV对应型号的图标资源
   * @param agvNo
   * @returns string base64
   */
  public getCurrentAgvImg(agvNo: string) {
    return AGV_IMGS['agv']
  }


  /**
   * 移动指定点位到视口中央
   * @param point
   */
  public targetPoint(point: IPoint) {
    if (!point || !point.hasOwnProperty('x') || !point.hasOwnProperty('y')) return
    if (!this.isNumber(point.x) || !this.isNumber(point.y)) return
    this.panCoordinateToCenter(point.x, point.y)
  }


  /**
   * 设置AGV图标等这些标识图层是否浮起来
   * @param isFloat
   */
  public setCoversFloat(isFloat: boolean = false) {
    if (isFloat) {
      this.elementConfig.covers.zIndex.container = this.elementConfig.covers.zIndex.float
      this.elementRendered.covers.container.zIndex = this.elementConfig.covers.zIndex.float
    } else {
      this.elementConfig.covers.zIndex.container = this.elementConfig.covers.zIndex.normal
      this.elementRendered.covers.container.zIndex = this.elementConfig.covers.zIndex.normal
    }
  }

  /**
   * 根据库位ID获取该库位的倒车路径
   * @param parkId
   * @returns string 多个路径ID用英文逗号分隔
   */
  public getParkBackPaths(parkId: string) {
    parkId = this.getBaseParkId(parkId)
    if (parkId && this.elementRendered.Park.mapObj.data.has(parkId)) {
      const parkData = this.elementRendered.Park.mapObj.data.get(parkId)
      return parkData?.backPathIds
    }
    return ''
  }

  /**
   * 根据路径ID获取路径终点数据
   * @param pathId string
   * @returns null | IPoint 真实坐标数据
   */
  public getPathEndPoint(pathId: string) {
    if (pathId && this.elementRendered.AGVPath.mapObj.data.has(pathId)) {
      const pathData = this.elementRendered.AGVPath.mapObj.data.get(pathId)
      return {
        x: this.getRealCoordiateX(pathData.x2),
        y: this.getRealCoordiateY(pathData.y2),
        pathId
      }
    }
    return null
  }

  /**
   * 获取库位倒车路径的终点
   * 多项库位时，如果都是指向同一个点，则只返回该点。否则返回null
   * @param parkId
   * @returns null | IPoint
   */
  public getParkBackPoint(parkId: string) {
    parkId = this.getBaseParkId(parkId)
    const pathIds = this.getParkBackPaths(parkId)
    if (pathIds) {
      const pathIdArr = pathIds.split(',')
      const pointArr = pathIdArr.map(pathId => this.getPathEndPoint(pathId)).filter(item => !!item)
      if (pointArr.length === 1) {
        return pointArr[0]
      }
      if (pointArr.length > 1) {
        // 比对是否有重复的点
        const pointKeyArr = pointArr.map((point: IPoint) => `${point.x},${point.y}`)
        const pointKeyArrUnique = Array.from(new Set(pointKeyArr))
        if (pointKeyArrUnique.length === 1) {
          return pointArr[0]
        }
      }
    }
    return null
  }

  /**
   * 获取库位倒车路径的终点
   * 返回数组
   * @param parkId
   * @returns IPoint[]
   */
  public getParkBackPoints(parkId: string) {
    parkId = this.getBaseParkId(parkId)
    const pathIds = this.getParkBackPaths(parkId)
    if (pathIds) {
      const pathIdArr = pathIds.split(',')
      const pointArr = pathIdArr.map(pathId => this.getPathEndPoint(pathId)).filter(item => !!item)
      return pointArr
    }
    return []
  }

  /**
   * 获取指定库位ID的库位类型
   * @param parkId
   * @returns
   */
  public getParkType(parkId: string) {
    parkId = String(parkId)
    parkId = this.getBaseParkId(parkId)
    if (parkId && this.elementRendered.Park.mapObj.data.has(parkId)) {
      const parkData = this.elementRendered.Park.mapObj.data.get(parkId)
      // 获取库位映射关系
      let parkTypeReflect = this._elementKeyReflect.ParkType
      const parkTypeReflectArr = Object.entries(parkTypeReflect).map(([key, value]) => [value, key])
      parkTypeReflect = Object.fromEntries(parkTypeReflectArr)
      return parkTypeReflect[parkData?.type] || ''
    }
    return ''
  }
  /**
   * 获取指定库位ID的库位模式
   * @param parkId
   * @returns
   */
  public getParkMode(parkId: string) {
    parkId = String(parkId)
    parkId = this.getBaseParkId(parkId)
    if (parkId && this.elementRendered.Park.mapObj.data.has(parkId)) {
      const parkData = this.elementRendered.Park.mapObj.data.get(parkId)
      // 获取库位映射关系
      let parkModeReflect = this._elementKeyReflect.ParkMode
      const parkModeReflectArr = Object.entries(parkModeReflect).map(([key, value]) => [value, key])
      parkModeReflect = Object.fromEntries(parkModeReflectArr)
      return parkModeReflect[parkData?.mode] || ''
    }
    return ''
  }

  /**
   * 获取指定路径ID的进出路线数据
   * @param pathId
   * @returns
   */
  public getPathInformation(pathId: string) {
    pathId = String(pathId)
    if (pathId && this.elementRendered.AGVPath.mapObj.data.has(pathId)) {
      const pathData = this.elementRendered.AGVPath.mapObj.data.get(pathId)
      return pathData.information || ''
    }
    return ''
  }

  /**
   * 移动指定的规则区域到视口
   * @param areaId
   */
  public targetRuleArea(areaId: string) {
    if (areaId && this.elementRendered.ruleArea.mapObj.area.has(areaId)) {
      const areaContainer = this.elementRendered.ruleArea.mapObj.area.get(areaId)
      const areaBound: PIXI.Bounds = areaContainer.getBounds()
      const cx = (areaBound.minX + areaBound.maxX) / 2
      const cy = (areaBound.minY + areaBound.maxY) / 2
      this.panCoordinateToCenter(cx, cy)
    }
  }

  /**
   * 获取背景图片范围
   * @returns
   */
  public getBackgroundImgBounds() {
    if (this._renderSwitch.backgroundImg && this._backgroundImgData.url) {
      return {
        left: this.getRealCoordiateX(this._backgroundImgData.rectangle.left),
        right: this.getRealCoordiateX(this._backgroundImgData.rectangle.right),
        top: this.getRealCoordiateY(this._backgroundImgData.rectangle.top),
        bottom: this.getRealCoordiateY(this._backgroundImgData.rectangle.bottom),
      }
    }
    return null
  }
  /**
   * 获取VNL轮廓范围
   * @returns
   */
  public getVnlOutlineBounds() {
    return {
      left: this.getRealCoordiateX(this._outlineData.vnlElement.left),
      right: this.getRealCoordiateX(this._outlineData.vnlElement.right),
      top: this.getRealCoordiateY(this._outlineData.vnlElement.top),
      bottom: this.getRealCoordiateY(this._outlineData.vnlElement.bottom),
    }
  }
}
