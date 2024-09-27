import * as PIXI from 'pixi.js'
/* 轮廓 start */
interface IOutline {
  width: number;
  height: number;
  left: number;
  right: number;
  bottom: number;
  top: number;
}
interface IOutlineData {
  vnlElement: IOutline;
  vnlOutline: IOutline;
  backgroundImg: IOutline;
  drawOutline: IOutline;
}
interface IOutlineEleData {
  // 轮廓元素
  MainEle: any;
  // VNL文件轮廓的四条边上的移动点元素
  TopPointEle: any; // 上边控制点
  RightPointEle: any; // 右边控制点
  BootomPointEle: any; // 下边控制点
  LeftPointEle: any; // 左边控制点
  // VNL文件轮廓四个顶点元素
  LeftTopPointEle: any; // 左上角顶点元素
  RightTopPointEle: any; // 右上角顶点元素
  RightBottomPointEle: any; // 右下角顶点元素
  LeftBottomPointEle: any; // 左下角顶点元素
  // VNL文件轮廓四个顶点坐标文案元素
  LeftTopTextEle: any; // 左上角顶点坐标文字元素
  RightTopTextEle: any; // 右上角顶点坐标文字元素
  RightBottomTextEle: any; // 右下角顶点坐标文字元素
  LeftBottomTextEle: any; // 左下角顶点坐标文字元素
}
/* 轮廓 end */

/* agv动画代理类型定义 start */
interface IAgvAnimateSwitch {
  LeftTop?: boolean;
  RightTop?: boolean;
  RightBottom?: boolean;
  LeftBottom?: boolean;
  MiddleTop?: boolean;
}
interface IAgvEntry {
  unique: string;
  agvConfig?: any;
  model?: string;
  agvTexture?: PIXI.Texture;
  state?: number;
  charging?: boolean;
  loading?: boolean;
  serial?: string;
  serialText?: PIXI.Text;
  taskType?: string;
  animateContainer: PIXI.Container,
  animateQueue?: any[];
  clickCallback?: any;
  destroy: any;
  anchorOnce?: IPoint;
}
interface IAgvConfig {
  [key: string]: IAgvEntry;
}
/* agv动画代理类型定义 end */

/* 区域数据类型定义 start */
interface IOrderArea {
  x: number; // 矩形左上点坐标x
  y: number; // 矩形左上点坐标y
  width: number; // 矩形宽
  height: number; // 矩形高
  color: string; // 主颜色
  text?: string; // 描述文案
  bgColor?: string; // 背景颜色
}
interface IRuleArea {
  uuid: string; // 唯一ID
  coordinatesStr: string; // 区域规则坐标数据，格式：右下点x,y;左下点x,y;左上点x,y;右上点x,y
  no?: number | string; // 编号
  key?: string; // 识别区域规则类型key
  title?: string; // 区域规则类型
  desc?: string; // 区域规则描述或名称
  color?: string; // 主体颜色
  borderColor?: string; // 边框颜色
  bgColor?: string; // 背景颜色
  fontColor?: string; // 字体颜色
}
interface ITruckArea {
  x: number; // 箱柜左上点坐标x
  y: number; // 箱柜左上点坐标y
  width: number; // 箱柜宽
  length: number; // 箱柜长
  theta: number; // 箱柜角度
}
/* 区域数据类型定义 end */

/* 货柜车动态库位数据类型定义 start */
interface ITruckPark {
  parkId: string;
  x: number; // 库位中心点X
  y: number; // 库位中心点Y
  theta: number; // 库位角度,-180~180
}
/* 货柜车动态库位数据类型定义 end */

/* 库位编号 start */
interface IParkTag {
  parkId: string;
  tag: string;
}
/* 库位编号 end */

/* 点 start */
interface IPoint {
  id?: string | number // 点位ID，用于打点等
  key?: string; // 值为：x,y
  x: number;
  y: number;
  theta?: number;
  type?: IPointTypeEnum;
  pathId?: string;
}
/**
 * 点位类型
 */
enum IPointTypeEnum {
  unknow = "",
  start = "start",
  end = "end",
  close = "close",
  pathway = "pathway",
}
type IPointType = IPointTypeEnum
/* 点 end */

/* 矩形点位 end */
interface IRectPoints {
  leftTop: IPoint;
  rightTop: IPoint;
  rightBottom: IPoint;
  leftBottom: IPoint;
}
/* 矩形点位 end */

/** 临时库位 start **/
interface ITempPark {
  id: string,
  x: number,
  y: number,
  pi: number,
  l?: number,
  w?: number,
}
/** 临时库位 end **/

/* 地图覆盖物 start */
interface IMark {
  movePath: string[] | string;
  assistPath: string[] | string;
  ctrlPath: string[] | string;
  railway: string;
  regressTag: string | IPoint;
  orderArea: IOrderArea[];
  ruleArea: IRuleArea[];
  truckArea: ITruckArea[];
  truckPark: ITruckPark[];
  parkStock: string[];
  parkNumTag: IParkTag[];
  parkInferTag: IParkTag[];
  pathwayPoint: IPoint;
  pathwayPoints: IPoint[];
  startPoint: IPoint;
  endPoint: IPoint;
  selectPark: string;
  selectParks: string[];
  tempPark: ITempPark;
}
/* 地图覆盖物 end */

/* 绘制覆盖物 start */
interface IDraw {
  dots: IPoint[];
  lines: ILineData[]
}
/* 绘制覆盖物 end */

/** 类型定义 start **/
interface IRectRange {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
interface IAreaDraw {
  color: string;
  bgColor: string;
  areaId: string;
}
interface IEventCondition {
  addParkEventIds?: string[], // 补添加当前库位事件正在生效的库位ID
  removeParkEventIds?: string[], // 补解除当前库位事件正在生效的库位ID
  parkEventIds: string[], // 当前库位事件正在生效的库位ID
  parkStockScope: string[]; // 绑定库位有无货操作事件的库位ID
  parkStockMultiple: boolean; // 是否开启库位有无货多选
  parkStockImmediate: boolean; // 有无货事件是否立即执行
  parkSelectScope: string[]; // 绑定库位有无货操作事件的库位ID
  parkSelectMultiple: boolean; // 是否开启库位多选
  parkSelectImmediate: boolean; // 有无货事件是否立即执行
  pointSelectScope: IRectRange; // 点位选择区域
  areaDrawParam: IAreaDraw; // 区域绘制参数
}
/** 类型定义 end **/

/** 背景图定义 start  */
interface IBackgroundImgArgs {
  resolution: number;
  origin: number[];
  negate: number;
}
/** 背景图定义 end  */
/** VNL地图数据 start  */
interface IMapData {
  vnlData?: string;
  rectangle?: IOutline;
  rectangleCustom?: IOutline;
  parkPathValidate?: boolean | string;
  bagroundImgUrl?: string;
  backgroundImgArgs?: IBackgroundImgArgs;
}
/** VNL地图数据 end  */

/** 元素渲染开关 start  */
interface ISwitchs {
  backgroundImg?: boolean; // 是否渲染分区地图底图
  vnlOutline?: boolean; // 是否渲染分区地图轮廓
  vnl?: boolean; // 是否渲染分区地图
  text?: boolean; // 是否渲染文字
  mark?: boolean; // 是否渲染二维码
  line?: boolean; // 是否渲染线条
  path?: boolean; // 是否渲染路径
  park?: boolean; // 是否渲染库位
  parkId?: boolean; // 是否渲染库位编号
  point?: boolean; // 是否渲染点位
  origin?: boolean; // 是否渲染原点坐标轴
}
/** 元素渲染开关 end  */

/** 事件开关 start  */
interface IEvents {
  pan?: boolean;
  zoom?: boolean;
  parkStock?: boolean;
  parkSelect?: boolean;
  pointSelect?: boolean;
  areaDraw?: boolean;
  mouseCoordiate?: boolean;
  vnlOutlineMove?: boolean;
}
/** 事件开关 end  */

/** 元素过滤开关 start  */
interface IParkFilter {
  mode?: string[];
  type?: string[];
  information?: string[];
}
interface ILayerFilter {
  current: number;
  parkMaxNum?: number;
}
interface IFilter {
  parkClassify?: IParkFilter;
  parkMode?: string[];
  parkType?: string[];
  parkInformation?: string[];
  parkLayer?: ILayerFilter;
  layer?: number;
  layerMaxNum?: number;
  backgroundImg?: boolean;
  vnlOutline?: boolean;
  origin?: boolean;
  text?: boolean;
  mark?: boolean;
  line?: boolean;
  path?: boolean;
  point?: boolean;
  park?: boolean;
  parkId?: boolean;
}
/** 元素过滤开关 end  */

/** 库位渲染数据 start  */
interface IGraphicsDrawData {
  action: string
  method: string
  params: any
}
interface IParkData {
  id: string | number // 原始库位ID
  parkId?: string // 字串类型的库位ID
  x: number // 库位中心点坐标X值
  y: number // 库位中心点坐标Y值
  w: number // 库位宽
  l: number // 库位深（又称为长）
  /**
   * 外部系统用
   * π值的库位朝向，坐标系如下：
   *               π/2
   *                |
   *                |
   * π/-π——— ———— ——— ———— ————→X  0
   *                |
   *                |
   *                ↓
   *                Y -π/2
   */
  pi: number
  /**
   * 外部系统用
   * 角度值的库位朝向，坐标系如下
   *               90度
   *                |
   *                |
   * 180度-180度——— ———— ———→X  0度
   *                |
   *                |
   *                ↓
   *                Y -90度
   */
  theta?: number
  /**
   * PIXI内部用的
   * π值旋转朝向，坐标系如下：
   *              3π/2
   *                |
   *                |
   *  π ——— ———— ——— ———— ————→X  0/2π
   *                |
   *                |
   *                ↓
   *                Y π/2
   */
  rotate?: number
  type?: string // ['L', 'P', 'C'] 库位类型：取放货库位、停车库位、充电库位，默认为'L'
  mode?: string // ['1', '2', '4'] 多向库位：单向、双向、四向，默认为'1'
  truckId?: string | number // 如果是货车库位，则需要传入货车ID，为0则默认不是货车库位
  isTruck?: boolean // 是否是货车库位
  halfL?: number // l的一半
  halfW?: number // w的一半
  color?: string | number // 库位颜色，16进制或字串类型
  textureData?: IGraphicsDrawData[] // 渲染纹理数据
  typeTag?: string // 库位类型标签名，用于找到此图片资源
  backPathIds?: string // 绑定的倒车路径ID，多个时用英文逗号分隔
  parkLayers?: number[] // 当前库位所在层数，多个时用英文逗号分隔
  tX?: number // 库位中心点周围的四个标识位置坐标，上-X
  tY?: number // 库位中心点周围的四个标识位置坐标，上-Y
  bX?: number // 库位中心点周围的四个标识位置坐标，下-X
  bY?: number // 库位中心点周围的四个标识位置坐标，下-Y
  lX?: number // 库位中心点周围的四个标识位置坐标，左-X
  lY?: number // 库位中心点周围的四个标识位置坐标，左-Y
  rX?: number // 库位中心点周围的四个标识位置坐标，右-X
  rY?: number // 库位中心点周围的四个标识位置坐标，右-Y
}
/** 库位渲染数据 end  */

interface INumToId {
  num: number | string
  id: number | string
}

/**
 * 线段数据
 */
interface ILineData {
  id?: string
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  cx?: number,
  cy?: number,
  radius: number,
  radiusPi?: number, // 0~π
  radiusAngle?: number, // 0~180度
  num?: string,
}

interface IRenderOptions {
  cache?: boolean;
}

export type {
  IMark,
  IDraw,
  IOutline,
  IAgvAnimateSwitch,
  IAgvConfig,
  IAgvEntry,
  IOrderArea,
  IOutlineData,
  IOutlineEleData,
  IParkTag,
  IPoint,
  IPointType,
  IRectPoints,
  IRuleArea,
  ITruckArea,
  ITruckPark,
  IRectRange,
  IAreaDraw,
  IEventCondition,
  IBackgroundImgArgs,
  IMapData,
  ISwitchs,
  IEvents,
  IFilter,
  IParkFilter,
  ILayerFilter,
  ITempPark,
  IGraphicsDrawData,
  IParkData,
  INumToId,
  ILineData,
  IRenderOptions
};
export { IPointTypeEnum };