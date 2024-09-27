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
  MainEle: any,
  // VNL文件轮廓的四条边上的移动点元素
  TopPointEle: any, // 上边控制点
  RightPointEle: any, // 右边控制点
  BootomPointEle: any, // 下边控制点
  LeftPointEle: any, // 左边控制点
  // VNL文件轮廓四个顶点元素
  LeftTopPointEle: any, // 左上角顶点元素
  RightTopPointEle: any, // 右上角顶点元素
  RightBottomPointEle: any, // 右下角顶点元素
  LeftBottomPointEle: any, // 左下角顶点元素
  // VNL文件轮廓四个顶点坐标文案元素
  LeftTopTextEle: any, // 左上角顶点坐标文字元素
  RightTopTextEle: any, // 右上角顶点坐标文字元素
  RightBottomTextEle: any, // 右下角顶点坐标文字元素
  LeftBottomTextEle: any, // 左下角顶点坐标文字元素
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
interface IAgvAnimateWith {
  LeftTop?: any;
  RightTop?: any;
  RightBottom?: any;
  LeftBottom?: any;
  MiddleTop?: any;
}
interface IAgvAnimateWithText {
  LeftTop?: string;
  RightTop?: string;
  RightBottom?: string;
  LeftBottom?: string;
  MiddleTop?: string;
}
interface IAgvEntry {
  unique: string;
  state?: number;
  model?: string;
  ratios?: any;
  taskType?: string;
  loading?: boolean;
  imgName?: string;
  imgSrc?: string;
  agvImgEle?: any;
  agvImgCloneEle?: any;
  animateSwitch?: IAgvAnimateSwitch;
  animateWith?: IAgvAnimateWith;
  animateWithText?: IAgvAnimateWithText;
  animateQueue?: any[];
  clickCallback?: any;
  destroy: any;
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
  key?: string; // 值为：x,y
  x: number;
  y: number;
  theta?: number;
}
/* 点 end */

/* 矩形点位 end */
interface IRectPoints {
  leftTop: IPoint
  rightTop: IPoint
  rightBottom: IPoint
  leftBottom: IPoint
}
/* 矩形点位 end */

/* 地图覆盖物 start */
interface IMark {
  movePath: string[] | string;
  ctrlPath: string[] | string;
  orderArea: IOrderArea[];
  ruleArea: IRuleArea[];
  truckArea: ITruckArea[];
  truckPark: ITruckPark[];
  parkStock: string[];
  parkTag: IParkTag[];
  parkInferTag: IParkTag[];
  pathwayPoint: IPoint[];
}
/* 地图覆盖物 end */

/** 类型定义 start **/
interface IRectRange {
  left: number;
  right: number;
  top: number;
  bottom: number;
}
interface IAreaDraw {
  color: string
  bgColor: string
  areaId: string
}
interface IEventCondition {
  parkStockScope: string[]; // 绑定库位有无货操作事件的库位ID
  parkStockImmediate: boolean; // 有无货事件是否立即执行
  parkSelectScope: string[]; // 绑定库位有无货操作事件的库位ID
  parkSelectImmediate: boolean; // 有无货事件是否立即执行
  pointSelectScope: IRectRange; // 点位选择区域
  areaDrawParam: IAreaDraw // 区域绘制参数
}
/** 类型定义 end **/

/** 背景图定义 start  */
interface IBackgroundImgArgs {
  resolution: number
  origin: number[]
  negate: number
}
/** 背景图定义 end  */
/** VNL地图数据 start  */
interface IMapData {
  vnlData: string
  rectangle: IOutline
  rectangleCustom?: IOutline
  bagroundImgUrl?: string
  backgroundImgArgs?: IBackgroundImgArgs
}
/** VNL地图数据 end  */

/** 元素渲染开关 start  */
interface ISwitchs {
  backgroundImg?: boolean // 是否渲染分区地图底图
  vnlOutline?: boolean // 是否渲染分区地图轮廓
  vnl?: boolean // 是否渲染分区地图
  text?: boolean // 是否渲染文字
  mark?: boolean // 是否渲染二维码
  line?: boolean // 是否渲染线条
  path?: boolean // 是否渲染路径
  park?: boolean // 是否渲染库位
  parkId?: boolean // 是否渲染库位编号
  point?: boolean // 是否渲染点位
}
/** 元素渲染开关 end  */

/** 事件开关 start  */
interface IEvents {
  panzoom?: boolean
  parkStock?: boolean
  parkSelect?: boolean
  pointSelect?: boolean
  areaDraw?: boolean
  mouseCoordiate?: boolean
  vnlOutlineMove?: boolean
}
/** 事件开关 end  */

export {
  IMark,
  IOutline,
  IAgvAnimateSwitch,
  IAgvAnimateWith,
  IAgvAnimateWithText,
  IAgvConfig,
  IAgvEntry,
  IOrderArea,
  IOutlineData,
  IOutlineEleData,
  IParkTag,
  IPoint,
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
}
