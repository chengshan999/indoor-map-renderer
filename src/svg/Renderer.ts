import Raphael from "raphael";
import Panzoom from "panzoom";
import {
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
} from "./Interface";
import { DEFAULTS, VNST } from "../images/agvBase64";
import PARK_TAGS from "../images/parkBase64";
import TRUCK_HEADER from "../images/truckBase64";

/**
 * 当前地图的坐标系：
 *              -y
 *              |
 *              |
 * -x ——— ———— —————————————→ +x
 *              |
 *              |
 *              ↓
 *              + Y
 *
 *
 * 涉及的坐标系，如下：
 * 用关键字：[pi, theta, rotate, angle] 指代
 *
 * @value pi 的坐标系
 *               π/2
 *                |
 *                |
 * π/-π——— ———— ——— ———— ————→X  0
 *                |
 *                |
 *                ↓
 *                Y -π/2
 *
 * @value theta 的坐标系
 *               90度
 *                |
 *                |
 * 180度-180度——— ———— ———→X  0度
 *                |
 *                |
 *                ↓
 *                Y -90度
 *
 * @value rotate 的坐标系
 *              270
 *                |
 *                |
 * 180 ——— ———— ——— ———— ————→X  0/360
 *                |
 *                |
 *                ↓
 *                Y 90
 * @value angle
 *              90度
 *              |
 *              |
 * 0度/360度——— ———— ———→X  180度
 *              |
 *              |
 *              ↓
 *              Y 270度
 */

export default class Renderer {
  /**
   * Raphael创建的canvas画图对象
   */
  protected paper = null as any;
  /**
   * 缩放画布panzoom对象
   */
  protected panzoom = null as any;
  /**
   * 渲染内容范围的开关
   * 掌管地图初次渲染时是否渲染此项数据的元素
   */
  private _renderSwitchInit = {
    backgroundImg: false, // 是否渲染分区地图底图
    vnlOutline: false, // 是否渲染分区地图轮廓
    vnl: false, // 是否渲染分区地图
    text: false, // 是否渲染文字
    mark: false, // 是否渲染二维码
    line: false, // 是否渲染线条
    path: false, // 是否渲染路径
    park: false, // 是否渲染库位
    parkId: false, // 是否渲染库位编号
    point: false, // 是否渲染点位
    dataReady: false, // 数据是否准备好
    completed: false, // 渲染完成
  };
  protected rendering: boolean = false; // 是否正在渲染
  protected _renderSwitch = Object.assign({}, this._renderSwitchInit);
  protected renderSwitch = new Proxy(this._renderSwitch, {
    set: (obj: any, prop, value) => {
      obj[prop] = value;
      switch (prop) {
        case "dataReady":
          if (value) this.setCoordinateData();
          break;
        case "completed":
          if (value) this.renderCompleteCallback();
          break;
      }
      return true;
    },
  });
  /**
   * 元素渲染配置数据
   */
  protected elementConfig = {
    Text: {
      // 文本
      color: {
        default: "#EB2829",
        selected: "#EB2829",
      },
      size: {
        space: 10,
      },
    },
    LineShape: {
      // 直线
      color: {
        default: "#CCCCCC",
        selected: "#1D4AD4",
      },
    },
    Mark: {
      // 二维码
      color: {
        default: "#CCCCCC",
        selected: "#1D4AD4",
        fill: "#FEF263",
      },
    },
    AGVPath: {
      // 行车路线
      typeList: ["move", "control", "assist"], // 目前支持的标识路径类型
      color: {
        // 颜色
        default: "#CCCCCC", // #FFD900 #FEF263
        forward: "#32CD32", // #00FA9A #2E8B57 #00FF00 #7CFC00 #228B22 #006400 #32CD32
        back: "#EB2829",
        control: "#ED7B00",
      },
      width: {
        // 宽度
        default: 1,
        forward: 4,
        back: 4,
        assist: 2,
        control: 8,
      },
      opacity: {
        // 透明度，0~1，1不透明
        default: 1,
        forward: 0.6,
        back: 0.6,
        assist: 0.5,
        control: 1,
      },
      arrow: {
        // 路径箭头风格，Possible : types-width-length
        // types: classic, block, open, oval, diamond, none
        // width: wide, narrow, midium
        // length: long, short, midium
        forward: "block-midium-long",
        back: "block-midium-long",
        assist: "block-midium-long",
        control: "block-midium-short",
      },
      dasharray: {
        // string [“”, “-”, “.”, “-.”, “-..”, “. ”, “- ”, “--”, “- .”, “--.”, “--..”]
        forward: "-",
        back: "-",
        control: "",
      },
      mode: {
        // 当前路径数据形式
        control: "", // array/string
      },
    },
    AGVPathPoint: {
      // 路径节点
      size: {
        r: 10,
      },
      color: {
        // 颜色
        default: "#1D4AD4",
        fill: "#FFFFFF", // transparent
        candidate: "#EB2829",
      },
      width: {
        // 宽度
        default: 1,
      },
      opacity: {
        // 透明度，0~1，1不透明
        default: 0.5,
        fill: 0.1,
      },
    },
    Park: {
      // 库位
      color: {
        // 颜色
        default: "#6A91E6",
        fill: "transparent",
        candidate: "#EB2829",
        selected: "#EB2829",
        parking: "#ED7B00",
        charging: "#08B562",
        truck: "#262626", // '#A3C6FF',
      },
      dasharray: {
        default: "none",
        truck: "- ",
        FourDirection: ".", // [“”, “-”, “.”, “-.”, “-..”, “. ”, “- ”, “--”, “- .”, “--.”, “--..”]
      },
      width: {
        // 宽度
        default: 2,
        selected: 3,
      },
      path: {
        // svg图标path
        // 停车图标
        parking:
          "M6,3.63797881e-12 C9.3137085,3.63797881e-12 12,2.6862915 12,6 C12,9.3137085 9.3137085,12 6,12 C2.6862915,12 1.13851326e-13,9.3137085 1.14054232e-13,6 C1.14257138e-13,2.6862915 2.6862915,3.63797881e-12 6,3.63797881e-12 Z M6,0.5 C2.96243388,0.5 0.5,2.96243388 0.5,6 C0.5,9.03756612 2.96243388,11.5 6,11.5 C9.03756612,11.5 11.5,9.03756612 11.5,6 C11.5,2.96243388 9.03756612,0.5 6,0.5 Z M4.90625,3.42019099 C6.26041667,3.44102433 6.94791667,4.12852433 6.96875,5.48269099 L6.96875,6.38894099 L9.40625,6.38894099 L9.40625,7.45144099 L2.9375,7.45144099 L2.9375,5.57644099 C2.97916667,4.18060766 3.63541667,3.46185766 4.90625,3.42019099 Z M4.90625,4.51394099 C4.28125,4.51394099 3.96875,4.83685766 3.96875,5.48269099 L3.96875,6.38894099 L5.90625,6.38894099 L5.90625,5.48269099 C5.92708333,4.81602433 5.59375,4.49310766 4.90625,4.51394099 Z",
        // 电池图标
        battery:
          "M11.4021739,1 C11.7323444,1 12,1.32920209 12,1.73529412 L12,10.2647059 C12,10.6707979 11.7323444,11 11.4021739,11 L1.35869565,11 C1.16059342,11 1,10.8024787 1,10.5588235 L1,8 L2.4492936e-16,7 L3.6739404e-16,5 L1,4 L1,1.44117645 C1,1.19752125 1.16059337,1 1.35869565,1 L11.4021739,1 Z M11.4021739,1.5 L1.5,1.5 L1.5,4.20710678 L0.5,5.207 L0.5,6.794 L1.5,7.79289322 L1.5,10.5 L11.4021739,10.5 C11.4250302,10.5 11.4739251,10.4454842 11.4925688,10.3468199 L11.5,10.2647059 L11.5,1.73529412 C11.5,1.61520354 11.4556763,1.53666965 11.4233188,1.51005972 L11.4021739,1.5 Z M6.42776271,3.91059596 L6.51752511,3.925941 L9.62656242,6.65029933 C9.87123014,6.88238922 9.62656242,7.03949338 9.62656242,7.03949338 L9.62656242,7.03949338 L6.78787622,7.03949338 L6.78787622,8.07734417 C6.72028845,8.17152913 6.51752515,8.07734417 6.51752515,8.07734417 L6.51752515,8.07734417 L3.27331231,5.22325451 C3.25709124,4.89892614 3.54366337,4.96379181 3.54366337,4.96379181 L3.54366337,4.96379181 L6.24717404,4.96379181 L6.24717404,3.92594103 C6.33569554,3.90292344 6.42900375,3.90292344 6.51752511,3.925941 Z",
      },
      rotateMode: {
        // 库位角度值模式
        // 库位默认角度值模式
        default: "pi", // [pi, theta, rotate]
        truck: "theta",
      },
    },
    ParkId: {
      // 库位编号
      color: {
        // 颜色
        default: "#000000",
        fill: "#000000",
      },
    },
    Agv: {
      demarcate: false, // 是否标定模式
    },
    Truck: {
      color: {
        default: "#505050", // #84E0BD
      },
      width: {
        default: 2,
      },
    },
    Area: {
      color: {
        border: "#505050",
        bg: "#505050",
      },
      width: {
        default: 2,
      },
      mapKeySuffix: {
        rule: {
          main: "",
          noBg: "_noBg",
          noText: "_noText",
          title: "_title",
          desc: "_desc",
        },
      },
    },
  };
  /**
   * 记录当前这次渲染，已渲染的元素集合
   */
  private _elementRenderedInit = {
    Text: {
      // 文本
      set: [] as any,
    },
    LineShape: {
      // 直线
      set: [] as any,
    },
    Mark: {
      // 二维码
      set: [] as any,
    },
    AGVPath: {
      // 行车路线
      set: [] as any,
      map: new Map(),
      objObj: {
        information: {} as any, // 根据information字段分类的路径
      },
      mapObj: {
        // 实时渲染类型的路径
        selected: new Map(),
        control: new Map(),
        assist: new Map(),
      },
    },
    AGVPathPoint: {
      // 路径节点
      set: [] as any,
      map: new Map(),
      setObj: {
        candidate: [] as any, // 候选点标识
      },
    },
    Park: {
      // 库位元素
      set: [] as any,
      objObj: {
        information: {} as any, // 根据information字段分类的库位
      },
      setObj: {
        SingleDirection: [] as any,
        DualDirection: [] as any,
        FourDirection: [] as any,
        Normal: [] as any,
        AGVPark: [] as any,
        ChargingPark: [] as any,
        candidate: [] as any, // 候选库位标识
      },
      mapObj: {
        render: new Map(), // 可见的元素
        event: new Map(), // 不可见的事件元素
        selected: new Map(), // 选中的元素
        SingleDirection: new Map(),
        DualDirection: new Map(),
        FourDirection: new Map(),
        Normal: new Map(),
        AGVPark: new Map(),
        ChargingPark: new Map(),
        stock: new Map(), // 有货物的库位
        tag: new Map(), // 库位编号
        inferTag: new Map(), // 库位推导状态
      },
    },
    ParkId: {
      // 库位编号
      set: [] as any,
      map: new Map(),
    },
    candidateRange: {
      // 候选框
      // 涉及多个元素选择时出现的选择范围虚框
      set: [] as any,
    },
    area: {
      setObj: {
        order: [] as any,
        truck: [] as any,
      },
      mapObj: {
        rule: new Map(),
      },
      objObj: {
        draw: {} as IOutlineEleData,
      },
    },
    pathwayPoint: {
      set: [] as any,
    },
  };
  protected elementRendered = Object.assign({}, this._elementRenderedInit);
  /**
   * elementRendered对象初始化操作，需要在this.paper生成之后
   */
  private elementRenderedInit() {
    for (const key in this.elementRendered) {
      const elementRenderedObj = this.elementRendered[key];
      for (const key1 in elementRenderedObj) {
        switch (key1) {
          case "set":
            elementRenderedObj[key1] = this.paper?.set();
            break;
          case "map":
            elementRenderedObj[key1] = new Map();
            break;
          case "setObj":
            if (typeof elementRenderedObj[key1] === "object") {
              for (const key2 in elementRenderedObj[key1]) {
                elementRenderedObj[key1][key2] = this.paper?.set();
              }
            }
            break;
          case "mapObj":
            if (typeof elementRenderedObj[key1] === "object") {
              for (const key2 in elementRenderedObj[key1]) {
                elementRenderedObj[key1][key2] = new Map();
              }
            }
            break;
          case "objObj":
            if (typeof elementRenderedObj[key1] === "object") {
              for (const key2 in elementRenderedObj[key1]) {
                elementRenderedObj[key1][key2] = {};
              }
            }
            break;
        }
      }
    }
  }
  // 事件回调占位，在事件类中会被重写
  protected eventCallback = () => {};
  // 渲染完成后需要去做的执行列表
  protected needDoQueue: any[] = [];
  // 渲染完成后的回调
  protected renderCompleteCallback() {
    // 触发库位过滤展示
    Object.keys(this._renderFilter).forEach((key: string) => {
      if (this._renderFilterInit[key] !== this._renderFilter[key]) {
        // 新渲染后，当前值跟默认初始值不同时，才需要触发处理
        this.renderFilter[key] = this._renderFilter[key];
      }
    });
    // 重新渲染覆盖物
    Object.keys(this._markerRendered).forEach((key: string) => {
      this.markerRendered[key] = this._markerRendered[key];
    });
    // 重新创建AGV元素及其动画代理
    Object.keys(this._agvConfig).forEach((key: string) => {
      this._agvConfig[key].destroy();
      this.agvConfig[key] = this._agvConfig[key];
    });
    // 处理事件回调
    this.eventCallback && this.eventCallback();
    // 执行待处理列表
    const len = this.needDoQueue.length;
    for (let i = 0; i < len; i++) {
      const func = this.needDoQueue.shift();
      func && func();
    }
  }

  /**
   * 坐标数据存储
   * 元素值： { left, right, bottom, top } || null
   */
  private _outlineDataInit: IOutlineData = {
    vnlElement: {
      left: 0,
      right: 0,
      bottom: 0,
      top: 0,
      width: 0,
      height: 0,
    } as IOutline, // VNL地图元素真实轮廓范围坐标数据
    vnlOutline: {
      left: 0,
      right: 0,
      bottom: 0,
      top: 0,
      width: 0,
      height: 0,
    } as IOutline, // VNL地图轮廓范围坐标数据
    backgroundImg: {
      left: 0,
      right: 0,
      bottom: 0,
      top: 0,
      width: 0,
      height: 0,
    } as IOutline, // 底图坐标范围
    drawOutline: {
      left: 0,
      right: 0,
      bottom: 0,
      top: 0,
      width: 0,
      height: 0,
    } as IOutline, // 绘制的轮廓数据
  };
  protected _outlineData: IOutlineData = JSON.parse(
    JSON.stringify(this._outlineDataInit)
  );
  public outlineData: IOutlineData = new Proxy(this._outlineData, {
    set: (target: any, prop: string, value: IOutline) => {
      // vnlOutline需要创建赋值监听，vnlElement和backgroundImg暂时为只读
      switch (prop) {
        case "vnlOutline":
          target[prop] = this.createOutlineProxy(value, this.vnlOutlineData);
          break;
        case "drawOutline":
          target[prop] = this.createOutlineProxy(
            value,
            this.elementRendered.area.objObj.draw
          );
          break;
        default:
          target[prop] = value;
          break;
      }
      return true;
    },
  });
  /**
   * 已渲染元素的过滤器，控制元素展示/隐藏
   */
  private _renderFilterInit = {
    parkClassify: {
      // 库位分类过滤
      mode: [], // SingleDirection/DualDirection/FourDirection
      type: [], // Normal/AGVPark/ChargingPark
      information: [], // default/其他自定义的4个长度字符值
    },
    layer: {
      current: 1, // 当前库位层级
      parkMaxNum: 100000, // 单层库位数量极值
    },
    backgroundImg: true, // 是否显示分区地图底图
    vnlOutline: true, // 是否显示分区地图轮廓
    text: true, // 是否显示文字
    mark: true, // 是否显示二维码
    line: true, // 是否显示线条
    path: true, // 是否显示路径
    park: true, // 是否显示库位
    parkId: true, // 是否显示库位编号
    point: true, // 是否显示点位
  };
  private _renderFilter = JSON.parse(JSON.stringify(this._renderFilterInit));
  public renderFilter = new Proxy(this._renderFilter, {
    set: (obj: any, prop, value) => {
      // 跟初始状态不同，则需要处理
      obj[prop] = value;
      if (this._renderSwitch.completed) {
        switch (prop) {
          case "parkClassify":
            this.filterParks();
            break;
          case "layer":
            if (!(obj["layer"].current === 1 && value["current"] === 1)) {
              // 不是第一层，才需要处理库位ID
              this.filterParkId();
            }
            break;
          case "backgroundImg":
            if (value) {
              this.backgroundImgData.element.show();
            } else {
              this.backgroundImgData.element.hide();
            }
            break;
          case "vnlOutline":
            if (value) {
              for (const name in this.vnlOutlineData) {
                this.vnlOutlineData[name]?.show();
              }
            } else {
              for (const name in this.vnlOutlineData) {
                this.vnlOutlineData[name]?.hide();
              }
            }
            break;
          case "text":
            if (value) {
              this.elementRendered.Text.set.show();
            } else {
              this.elementRendered.Text.set.hide();
            }
            break;
          case "mark":
            if (value) {
              this.elementRendered.Mark.set.show();
            } else {
              this.elementRendered.Mark.set.hide();
            }
            break;
          case "line":
            if (value) {
              this.elementRendered.LineShape.set.show();
            } else {
              this.elementRendered.LineShape.set.hide();
            }
            break;
          case "path":
            if (value) {
              this.elementRendered.AGVPath.set.show();
            } else {
              this.elementRendered.AGVPath.set.hide();
            }
            break;
          case "park":
            if (value) {
              this.elementRendered.Park.set.show();
            } else {
              this.elementRendered.Park.set.hide();
            }
            break;
          case "parkId":
            if (value) {
              this.elementRendered.ParkId.set.show();
            } else {
              this.elementRendered.ParkId.set.hide();
            }
            break;
          case "point":
            if (value) {
              this.elementRendered.AGVPathPoint.set.show();
            } else {
              this.elementRendered.AGVPathPoint.set.hide();
            }
            break;
        }
      }
      return true;
    },
  });
  /**
   * 地图上的标识物渲染
   */
  // 覆盖物渲染条件
  private _markerRenderedCondition = {
    truckParkMode: "" as string, // [pi, theta, rotate] 货柜车动态库位的角度模式设置
  };
  public markerRenderedCondition = new Proxy(this._markerRenderedCondition, {
    set: (obj: any, prop, value) => {
      obj[prop] = value;
      switch (prop) {
        case "truckParkMode":
          this.elementConfig.Park.rotateMode.truck = value;
          break;
      }
      return true;
    },
  });
  // 覆盖物渲染数据
  private _markerRenderedInit: IMark = {
    movePath: [] as string[] | string, // 形式路径
    ctrlPath: [] as string[] | string, // 控制路径
    orderArea: [] as IOrderArea[], // 订单区域
    ruleArea: [] as IRuleArea[], // 规则区域
    truckArea: [] as ITruckArea[], // 货柜车区域
    truckPark: [] as ITruckPark[], // 货柜车动态库位
    parkStock: [] as string[], // 有货的库位
    parkTag: [] as IParkTag[], // 库位序号标记
    parkInferTag: [] as IParkTag[], // 库位推断状态标记
    pathwayPoint: [] as IPoint[], // 途经点
  };
  protected _markerRendered = Object.assign({}, this._markerRenderedInit);
  public markerRendered: IMark = new Proxy(this._markerRendered, {
    set: (obj: any, prop, value) => {
      obj[prop] = value;
      let toDo = () => {};
      switch (prop) {
        case "movePath":
          toDo = () => {
            this.renderAGVPathByTypeBatch("move", value);
          };
          break;
        case "ctrlPath":
          toDo = () => {
            this.renderAGVPathByTypeBatch("control", value);
          };
          break;
        case "orderArea":
          toDo = () => {
            this.renderOrderAreas(value);
          };
          break;
        case "ruleArea":
          toDo = () => {
            this.renderRuleAreas(value);
          };
          break;
        case "truckArea":
          toDo = () => {
            this.renderTruckAreas(value);
          };
          break;
        case "truckPark":
          toDo = () => {
            this.renderTruckParks(value);
          };
          break;
        case "parkStock":
          toDo = () => {
            this.renderParksStock(value);
          };
          break;
        case "parkTag":
          toDo = () => {
            this.renderParksTag(value);
          };
          break;
        case "parkInferTag":
          toDo = () => {
            this.renderParksInferTag(value);
          };
          break;
        case "pathwayPoint":
          toDo = () => {
            this.renderPathwayPoints(value);
          };
          break;
      }
      if (this._renderSwitch.completed) {
        // 渲染完成状态，直接渲染
        toDo();
      }
      return true;
    },
  });
  /**
   * agv图标数据 Object
   * Object 的 key: AGV的编号或唯一标识
   * Object 的 value: <Proxy>{
   *  unique String: AGV的编号或唯一标识, 必填 require
   *  state String | Number: AGV状态,
   *  model String: AGV型号,
   *  taskType String: 任务类型,
   *  loading Boolean: 当前车上是否有货
   *  animateSwitch IAgvAnimateSwitch: AGV周围的附属动画区域是否开启
   *  AgvAnimateWithText IAgvAnimateWithText: AGV周围的附属动画区域元素的文案，通过此项来修改文案
   *  animateQueue Proxy: 代理模式存储AGV移动坐标数据的数组，数组元素为{ x, y , speed, theta, timestamp }
   *  clickCallback: () => {}, // 点击AGV图标的回调事件
   *  destroy: () => {}, // 销毁当前AGV代理资源的方法
   * } 的 Proxy
   */
  private _agvConfig: IAgvConfig = {};
  public agvConfig: IAgvConfig = new Proxy(this._agvConfig, {
    set: (target: any, prop: any, value: IAgvEntry) => {
      if (typeof prop === "string" && prop) {
        const doCreate = () => {
          // 判断当前队列是否已经这个编号
          this.destroyAgvAnimationEntry(target, prop, value);
          // 新建对应编号的AGV动画实例
          const entry = this.createAgvAnimationEntry(target, prop, value);
          target[prop] = entry;
        };
        if (this._renderSwitch.completed) {
          doCreate();
        } else {
          if (target.hasOwnProperty(prop)) {
            target[prop].destroy();
            delete target[prop];
          }
        }
      }
      return true;
    },
    get: (target, prop, receiver) => {
      switch (prop) {
        case "clear":
          // 销毁所有动画实例资源
          Object.keys(target).forEach((key: string) => {
            target[key].destroy();
            target[key] = {};
            delete target[key];
          });
          break;
      }
      return target[prop];
    },
  });

  /**
   * 预置配置数据，一般不动态修改
   * 地图数据单位缩放倍数，地图数据单位为m，展示需要展示mm
   */
  protected _unitZoom = 100;
  // 根据AGV坐标系值换取地图坐标系值-X
  public getMapCoordiateX(x: number) {
    return x * this._unitZoom;
  }
  // 根据AGV坐标系值换取地图坐标系值-Y
  public getMapCoordiateY(y: number) {
    return y * -this._unitZoom;
  }
  // 根据地图坐标系值换取AGV坐标系值-X
  public getRealCoordiateX(x: number) {
    return this.mathRound(x / this._unitZoom, 4);
  }
  // 根据地图坐标系值换取AGV坐标系值-Y
  public getRealCoordiateY(y: number) {
    return this.mathRound(y / -this._unitZoom, 4);
  }

  /**
   * 地图原始数据
   * contentDom HTMLElement 地图所在的dom容器
   * originData 后端传来的原始vnl地图数据,json: 需要渲染的地图源数据，当前版本为JSON对象的字串
   * rectangle: 地图范围数据
   * rectangleCustom?: 地图自定义范围数据
   */
  private _mapOriginDataInit = {
    contentDom: null as HTMLElement, // 地图容器DOM
    originData: "",
    rectangle: { left: 0, right: 0, bottom: 0, top: 0, width: 0, height: 0 },
    rectangleCustom: null,
  };
  private _mapOriginData = Object.assign({}, this._mapOriginDataInit);
  protected mapOriginData = new Proxy(this._mapOriginData, {
    set: (obj: any, prop, value) => {
      switch (prop) {
        case "contentDom":
          obj[prop] = value;
          if (value instanceof HTMLElement) {
            value.style.height = "100%";
            value.style.width = "100%";
            value.style.overflow = "hidden";
            value.style.backgroundColor = "#f5f5f5";
          }
          break;
        case "originData":
          obj[prop] = value;
          if (value && typeof value === "string") {
            const _data = JSON.parse(value, (key: any, value: any) => {
              if (this._elementRenderSuppot.includes(key)) {
                const items = new Map();
                if (Array.isArray(value)) {
                  // 数组形式，即多条数据
                  value.forEach((item: any) => {
                    items.set(item["@ObjectId"], item);
                  });
                } else if (typeof value === "object") {
                  // 只有个对象，默认只有一条数据
                  items.set(value["@ObjectId"], value);
                }
                (this.mapClassifyData[
                  key as keyof typeof this.mapClassifyData
                ] as any) = items;
              }
              return value;
            });
            // 设置数据已经准备好
            this.renderSwitch.dataReady = true;
            return _data;
          }
          break;
        case "rectangle":
          if (value) {
            // VNL范围扩大
            const space = this._unitZoom * 4;
            obj[prop] = {
              left: this.getMapCoordiateX(value.left) - space,
              right: this.getMapCoordiateX(value.right) + space,
              bottom: this.getMapCoordiateX(value.bottom) + space,
              top: this.getMapCoordiateX(value.top) - space,
              width: value.width * this._unitZoom + 2 * space,
              height: value.height * this._unitZoom + 2 * space,
            };
          }
          break;
        case "rectangleCustom":
          if (value) {
            obj[prop] = {
              left: this.getMapCoordiateX(value.left),
              right: this.getMapCoordiateX(value.right),
              bottom: this.getMapCoordiateX(value.bottom),
              top: this.getMapCoordiateX(value.top),
              width: value.width * this._unitZoom,
              height: value.height * this._unitZoom,
            };
          }
          break;
      }
      return true;
    },
  });

  /**
   * 预置配置数据，一般不动态修改
   * 本库支持渲染的元素类型
   */
  private _elementRenderSuppot: string[] = [
    // 支持渲染的元素
    "Text", // 文本
    "LineShape", // 直线
    "Mark", // 二维码点
    "AGVPath", // 行车路线
    "Park", // 库位， 库位ID文字和库位一起渲染，ParkIdText
    "AGVPathPoint", // 路径节点
  ];
  /**
   * 源数据分类后的json数据
   */
  private _mapClassifyDataInit = {
    AGVPath: new Map(), // 行车路线
    AGVPathPoint: new Map(), // 行车路线开始和结束节点元素
    Park: new Map(), // 库位元素
    ParkId: new Map(), // 库位的Id展示，text元素，暂无用处
    Mark: new Map(), // 二维码方块元素
    LineShape: new Map(), // 直线元素
    Text: new Map(), // 文本元素
  };
  protected mapClassifyData = new Proxy(this._mapClassifyDataInit, {
    get: (target: any, prop: string, receiver) => {
      switch (prop) {
        case "clear":
          // 初始化
          Object.keys(target).forEach((key: string) => {
            target[key] = new Map();
          });
          break;
      }
      return target[prop];
    },
  });
  /**
   * 记录当前这次渲染，已渲染的元素名称
   */
  protected elementNamesRendered: string[] = [];

  /**
   * 底图相关数据
   */
  private _backgroundImgDataInit = {
    url: "", // 背景图片URL
    // 背景底图参数，resolution:分辨率缩放比例，origin: 左下角源点坐标，negate: '0'是白底,'1'是黑底
    args: { resolution: 0, origin: [0, 0, 0], negate: 1 },
    // 底图是否是黑底
    blackBase: true,
    // 处理后的底图实例
    entry: null as HTMLImageElement,
    // 实际渲染出来的地图元素
    element: null,
  };
  protected backgroundImgData = JSON.parse(
    JSON.stringify(this._backgroundImgDataInit)
  );

  // 设置视口参数
  private setCoordinateData() {
    // 根据VNL文件与底图文件的渲染与否，来判断视口范围和VNL文件的轮廓坐标
    if (this._renderSwitch.vnl && this._renderSwitch.dataReady) {
      // 需要渲染VNL文件
      this._outlineData.vnlElement = this.mapOriginData.rectangle;
      if (this.mapOriginData.rectangleCustom) {
        this.outlineData.vnlOutline = this.mapOriginData.rectangleCustom;
      } else {
        this.outlineData.vnlOutline = this.mapOriginData.rectangle;
      }
      if (this._renderSwitch.backgroundImg && this.backgroundImgData.url) {
        // 同时需要渲染底图文件
        this.getBackgroundImgRange((rectangle: any) => {
          // 如果不是只有底图，还有VNL地图，
          // 则不止需要配置视口范围
          // 还需要配置VNL地图的轮廓信息
          // ps:有底图则底图大小为视口范围，无视口则VNL底图轮廓为视口范围
          this.outlineData.backgroundImg = rectangle;

          // 既有底图又有VNL文件，校验VNL轮廓，使其不超过底图范围
          if (this._outlineData.vnlOutline.left < rectangle.left)
            this._outlineData.vnlOutline.left = rectangle.left;
          if (this._outlineData.vnlOutline.top < rectangle.top)
            this._outlineData.vnlOutline.top = rectangle.top;
          if (this._outlineData.vnlOutline.right > rectangle.right)
            this._outlineData.vnlOutline.right = rectangle.right;
          if (this._outlineData.vnlOutline.bottom > rectangle.bottom)
            this._outlineData.vnlOutline.bottom = rectangle.bottom;

          this.viewBoxParams.value = [
            rectangle.x,
            rectangle.y,
            rectangle.width,
            rectangle.height,
            true, // 图像实际大小自适应画布，居中
          ];
        });
      } else {
        // 不需要渲染底图文件
        this.viewBoxParams.value = [
          this._outlineData.vnlOutline.left,
          this._outlineData.vnlOutline.top,
          this._outlineData.vnlOutline.width,
          this._outlineData.vnlOutline.height,
          true, // 图像实际大小自适应画布，居中
        ];
      }
    } else {
      // 不需要渲染VNL文件
      if (this._renderSwitch.backgroundImg && this.backgroundImgData.url) {
        // 只需要渲染底图文件
        this.getBackgroundImgRange((rectangle: any) => {
          // 如果不是只有底图，还有VNL地图，
          // 则不止需要配置视口范围
          // 还需要配置VNL地图的轮廓信息
          // ps:有底图则底图大小为视口范围，无视口则VNL底图轮廓为视口范围
          this.outlineData.backgroundImg = rectangle;
          this.outlineData.vnlOutline = rectangle;
          this.viewBoxParams.value = [
            rectangle.x,
            rectangle.y,
            rectangle.width,
            rectangle.height,
            true, // 图像实际大小自适应画布，居中
          ];
        });
      } else {
        // 也不需要渲染底图文件
        // 参数有问题，啥都不用渲染了
        return;
      }
    }
  }
  // 获取背景图片范围
  private getBackgroundImgRange(callback: any = undefined) {
    const backgroundImg = new Image();

    backgroundImg.onload = () => {
      // 图片分辨率宽高
      const backgroundImgWidth = backgroundImg.width;
      const backgroundImgHeight = backgroundImg.height;
      const resolution = this.backgroundImgData.args?.resolution || 1;
      const origin = this.backgroundImgData.args?.origin || [0, 0, 0];
      // 底图坐标数据
      const backgroundImgCoordinateWidth =
        backgroundImgWidth * resolution * this._unitZoom;
      const backgroundImgCoordinateHeight =
        backgroundImgHeight * resolution * this._unitZoom;
      const backgroundImgLeftBottomCoordinateX = this.getMapCoordiateX(
        origin[0] || 0
      );
      const backgroundImgLeftBottomCoordinateY = this.getMapCoordiateY(
        origin[1] || 0
      );
      const backgroundImgLeftTopCoordinateX =
        backgroundImgLeftBottomCoordinateX;
      const backgroundImgLeftTopCoordinateY =
        backgroundImgLeftBottomCoordinateY - backgroundImgCoordinateHeight;
      const rectangle = {
        x: backgroundImgLeftTopCoordinateX,
        y: backgroundImgLeftTopCoordinateY,
        width: backgroundImgCoordinateWidth,
        height: backgroundImgCoordinateHeight,
        left: backgroundImgLeftTopCoordinateX,
        top: backgroundImgLeftTopCoordinateY,
        right:
          backgroundImgLeftBottomCoordinateX + backgroundImgCoordinateWidth,
        bottom: backgroundImgLeftBottomCoordinateY,
      };
      // console.log("图片分辨率宽高", backgroundImg.src, backgroundImgWidth, backgroundImgHeight, resolution, origin)
      // console.log("图片坐标数据", backgroundImgCoordinateWidth, backgroundImgCoordinateHeight, rectangle)

      this.backgroundImgData.blackBase =
        this.backgroundImgData.args?.negate == 1 ? true : false;
      /* // 创建一个Canvas元素，判断底图颜色
      const canvas = document.createElement('canvas');
      canvas.width = backgroundImg.width;
      canvas.height = backgroundImg.height;

      // 将图片绘制到Canvas上
      const context = canvas.getContext('2d')
      context?.drawImage(backgroundImg, 0, 0)

      // 获取图片像素数据
      const imageData = context?.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData?.data || []

      let blackPixels = 0;
      let whitePixels = 0;

      // 遍历像素数据
      for (let i = 0; i < pixels.length; i += 4) {
        const red = pixels[i];
        const green = pixels[i + 1];
        const blue = pixels[i + 2];

        // 判断像素颜色是否接近黑色或白色
        if (red < 50 && green < 50 && blue < 50) {
          blackPixels++;
        } else if (red > 200 && green > 200 && blue > 200) {
          whitePixels++;
        }
      }

      // 判断黑色像素和白色像素数量，以确定背景色
      if (blackPixels > whitePixels) {
        this.isBackgroundImgBlackBase = true
        // console.log('图片背景是黑色');
      } else {
        this.isBackgroundImgBlackBase = false
        // console.log('图片背景是白色');
      } */

      // 执行回调
      callback && callback(rectangle);
    };
    backgroundImg.crossOrigin = ""; // 防止服务器端图片地址跨域报错
    backgroundImg.src = this.backgroundImgData.url + "&salt=" + Math.random();
    this.backgroundImgData.entry = backgroundImg;
  }

  /**
   * 创建 VnlOutline 轮廓赋值代理
   * 处理轮廓元素跟随数值移动
   */
  private createOutlineProxy(
    vnlOutlineData: IOutline,
    outlineEleData: IOutlineEleData
  ) {
    return new Proxy(vnlOutlineData, {
      set: (target: any, prop: string, value: number) => {
        // 先赋值当前数据
        target[prop] = value;
        switch (prop) {
          case "left":
            target["width"] = target["right"] - target["left"];
            break;
          case "right":
            target["width"] = target["right"] - target["left"];
            break;
          case "bottom":
            target["height"] = target["top"] - target["bottom"];
            break;
          case "top":
            target["height"] = target["top"] - target["bottom"];
            break;
        }
        this.setOutlineCoordinate(prop, value, outlineEleData);
        return true;
      },
    });
  }
  /**
   * 设置轮廓元素新位置
   */
  private setOutlineCoordinate(
    position: string,
    value: number,
    outlineEleData: IOutlineEleData
  ) {
    if (this.vnlOutlineData?.MainEle) {
      const correctX = this.getMapCoordiateX(value);
      const correctY = this.getMapCoordiateY(value);
      // 有轮廓元素才处理
      const _data: IRectPoints = outlineEleData.MainEle?.data();
      switch (position) {
        case "left":
          _data.leftTop.x = correctX;
          _data.leftBottom.x = correctX;
          /* 边点 */
          // 移动上边点
          outlineEleData.TopPointEle?.attr({
            cx: (_data?.leftTop.x + _data?.rightTop.x) / 2,
            cy: _data.leftTop.y,
          });
          // 移动下边点
          outlineEleData.BootomPointEle?.attr({
            cx: (_data.leftBottom.x + _data?.rightBottom.x) / 2,
            cy: _data?.rightBottom.y,
          });
          // 移动左边点
          outlineEleData.LeftPointEle?.attr({
            cx: _data?.leftTop.x,
            cy: (_data?.leftTop.y + _data?.leftBottom.y) / 2,
          });
          /* 角点 */
          // 移动左上角点
          outlineEleData.LeftTopPointEle?.attr({
            cx: _data?.leftTop.x,
            cy: _data.leftTop.y,
          });
          this.updateOutlineCoordinateText(
            "leftTop",
            outlineEleData.LeftTopTextEle,
            _data?.leftTop.x,
            _data?.leftTop.y
          );
          // 移动左下角点
          outlineEleData.LeftBottomPointEle?.attr({
            cx: _data?.leftBottom.x,
            cy: _data?.leftBottom.y,
          });
          this.updateOutlineCoordinateText(
            "leftBottom",
            outlineEleData.LeftBottomTextEle,
            _data?.leftBottom.x,
            _data?.leftBottom.y
          );
          break;
        case "right":
          _data.rightTop.x = correctX;
          _data.rightBottom.x = correctX;
          /* 边点 */
          // 移动上边点
          outlineEleData.TopPointEle?.attr({
            cx: (_data?.leftTop.x + _data?.rightTop.x) / 2,
            cy: _data.leftTop.y,
          });
          // 移动下边点
          outlineEleData.BootomPointEle?.attr({
            cx: (_data.leftBottom.x + _data?.rightBottom.x) / 2,
            cy: _data?.rightBottom.y,
          });
          // 移动右边点
          outlineEleData.RightPointEle?.attr({
            cx: _data.rightTop.x,
            cy: (_data?.rightTop.y + _data?.rightBottom.y) / 2,
          });
          /* 角点 */
          // 移动右上角点
          outlineEleData.RightTopPointEle?.attr({
            cx: _data?.rightTop.x,
            cy: _data?.rightTop.y,
          });
          this.updateOutlineCoordinateText(
            "rightTop",
            outlineEleData.RightTopTextEle,
            _data?.rightTop.x,
            _data?.rightTop.y
          );
          // 移动右下角点
          outlineEleData.RightBottomPointEle?.attr({
            cx: _data?.rightBottom.x,
            cy: _data?.rightBottom.y,
          });
          this.updateOutlineCoordinateText(
            "rightBottom",
            outlineEleData.RightBottomTextEle,
            _data?.rightBottom.x,
            _data?.rightBottom.y
          );
          break;
        case "bottom":
          _data.leftBottom.y = correctY;
          _data.rightBottom.y = correctY;
          /* 边点 */
          // 移动左边点
          outlineEleData.LeftPointEle?.attr({
            cx: _data?.leftTop.x,
            cy: (_data?.leftTop.y + _data?.leftBottom.y) / 2,
          });
          // 移动右边点
          outlineEleData.RightPointEle?.attr({
            cx: _data.rightTop.x,
            cy: (_data?.rightTop.y + _data?.rightBottom.y) / 2,
          });
          // 移动下边点
          outlineEleData.BootomPointEle?.attr({
            cx: (_data.leftBottom.x + _data?.rightBottom.x) / 2,
            cy: _data?.rightBottom.y,
          });
          /* 角点 */
          // 移动左下角点
          outlineEleData.LeftBottomPointEle?.attr({
            cx: _data?.leftBottom.x,
            cy: _data?.leftBottom.y,
          });
          this.updateOutlineCoordinateText(
            "leftBottom",
            outlineEleData.LeftBottomTextEle,
            _data?.leftBottom.x,
            _data?.leftBottom.y
          );
          // 移动右下角点
          outlineEleData.RightBottomPointEle?.attr({
            cx: _data?.rightBottom.x,
            cy: _data?.rightBottom.y,
          });
          this.updateOutlineCoordinateText(
            "rightBottom",
            outlineEleData.RightBottomTextEle,
            _data?.rightBottom.x,
            _data?.rightBottom.y
          );
          break;
        case "top":
          _data.leftTop.y = correctY;
          _data.rightTop.y = correctY;
          /* 边点 */
          // 移动左边点
          outlineEleData.LeftPointEle?.attr({
            cx: _data?.leftTop.x,
            cy: (_data?.leftTop.y + _data?.leftBottom.y) / 2,
          });
          // 移动右边点
          outlineEleData.RightPointEle?.attr({
            cx: _data.rightTop.x,
            cy: (_data?.rightTop.y + _data?.rightBottom.y) / 2,
          });
          // 移动上边点
          outlineEleData.TopPointEle?.attr({
            cx: (_data?.leftTop.x + _data?.rightTop.x) / 2,
            cy: _data.leftTop.y,
          });
          /* 边点 */
          // 移动左上角点
          outlineEleData.LeftTopPointEle?.attr({
            cx: _data?.leftTop.x,
            cy: _data.leftTop.y,
          });
          this.updateOutlineCoordinateText(
            "leftTop",
            outlineEleData.LeftTopTextEle,
            _data?.leftTop.x,
            _data?.leftTop.y
          );
          // 移动右上角点
          outlineEleData.RightTopPointEle?.attr({
            cx: _data?.rightTop.x,
            cy: _data?.rightTop.y,
          });
          this.updateOutlineCoordinateText(
            "rightTop",
            outlineEleData.RightTopTextEle,
            _data?.rightTop.x,
            _data?.rightTop.y
          );
          break;
      }
      outlineEleData.MainEle?.attr({
        x: _data.leftTop.x,
        y: _data.leftTop.y,
        width: Math.abs(_data.rightTop.x - _data.leftTop.x),
        height: Math.abs(_data.leftBottom.y - _data.leftTop.y),
      }).data(_data);
    }
  }

  /**
   * 画布内容初始坐标、内容长和宽等数据 [x, y, width, height]
   */
  private _viewBoxParams = {
    value: [] as any[],
  };
  protected viewBoxParams = new Proxy(this._viewBoxParams, {
    set: (obj: any, prop, value) => {
      obj[prop] = value;
      if (prop === "value" && Array.isArray(value)) {
        const windowWidth = this.mapOriginData.contentDom.offsetWidth;
        const windowHeight = this.mapOriginData.contentDom.offsetHeight;
        const windowRatio = windowWidth / windowHeight;
        let svgWidth = value[2];
        let svgHeight = value[3];
        if (this._renderSwitch.vnl) {
          svgWidth = this._outlineData.vnlElement.width;
          svgHeight = this._outlineData.vnlElement.height;
        }
        const svgRatio = svgWidth / svgHeight;
        if (windowRatio >= svgRatio) {
          // 视口宽高比大于地图宽高比
          this.paperStatus.width = (windowHeight * svgWidth) / svgHeight;
          this.paperStatus.height = windowHeight;
        } else {
          // 视口宽高比小于地图宽高比
          this.paperStatus.width = windowWidth;
          this.paperStatus.height = (windowWidth * svgHeight) / svgWidth;
        }
        // 创建画布
        this.paper = Raphael(
          this.mapOriginData.contentDom,
          this.paperStatus.width,
          this.paperStatus.height
        );
        this.paper?.setViewBox(...value);
        if (this.paper?.canvas) this.paper.canvas.style.cursor = "grab";
        if (this.paper?.canvas)
          this.paper.canvas.style.border = "1px solid rgba(192, 192, 192, 0.3)";
        // if (this.paper.canvas) this.paper.canvas.style.boxShadow = '5px 5px rgba(192, 192, 192, 0.2)'
        // 初始化元素集合
        this.elementRenderedInit();

        /** 4 创建panzoom缩放画图对象 **/
        // this.panzoomInitialZoom = panzoomInitialZoom // 设置初始缩放值
        this.panzoomStatus.initX = (windowWidth - this.paperStatus.width) / 2;
        this.panzoomStatus.initY = (windowHeight - this.paperStatus.height) / 2;

        // debugger
        this.panzoom = Panzoom(this.paper?.canvas, {
          smoothScroll: false,
          initialX: this.panzoomStatus.initX, // 初始X值，默认为0
          initialY: this.panzoomStatus.initY, // 初始Y值，默认为0
          initialZoom: this.panzoomStatus.initZoom, // 初始缩放，默认为1
          // transformOrigin: { x: 0.5, y: 0.5 }, // 如果配置了，则覆盖默认的 鼠标位置为缩放中心点位置
          // bounds: true, // 防止画图移动出容器
          // boundsPadding: 0.1, // boundsPadding的默认值为0.05
          zoomDoubleClickSpeed: 1, // 设置1，效果同禁用鼠标双击事件
          beforeMouseDown: (e) => {
            const shouldIgnore = e.altKey;
            return shouldIgnore;
          },
        });
        this.panzoom?.moveTo(
          this.panzoomStatus.initX,
          this.panzoomStatus.initY
        );
        this.paperStatus.ready = true;
      }
      return true;
    },
  });

  /**
   * 画布数据
   */
  private _paperStatusInit = {
    width: 500,
    height: 500,
    ready: false,
  };
  private _paperStatus = Object.assign({}, this._paperStatusInit);
  protected paperStatus = new Proxy(this._paperStatus, {
    set: (obj: any, prop, value) => {
      obj[prop] = value;
      if (prop === "ready" && value) {
        // 画布已经准备好，开始渲染元素
        this.renderManage();
      }
      return true;
    },
  });

  /**
   * panzoom缩放数据
   */
  private _panzoomStatusInit = {
    initZoom: 1, // panzoom 初始缩放值
    initX: 0, // panzoom 初始X值，默认为0
    initY: 0, // panzoom 初始Y值，默认为0
  };
  protected panzoomStatus = Object.assign({}, this._panzoomStatusInit);

  /**
   * 根据库位的模式、类型、information筛选展示/隐藏库位
   * @param params
   * {
   *    mode: Array string[] SingleDirection/DualDirection/FourDirection
   *    type: Array string[] Normal/AGVPark/ChargingPark
   *    information: Array string[]
   * }
   */
  private filterParks() {
    // 必须已渲染完成
    if (!this._renderSwitch.completed) return;
    const filters = { mode: [], type: [], information: [] };
    Object.assign(filters, this._renderFilter.park);
    if (
      (filters.mode && Array.isArray(filters.mode) && filters.mode.length) ||
      (filters.type && Array.isArray(filters.type) && filters.type.length) ||
      (filters.information &&
        Array.isArray(filters.information) &&
        filters.information.length)
    ) {
      // 有至少一个过滤条件，需要过滤库位，则执行过滤
      let modeParkIds: string[] | undefined = undefined;
      let typeParkIds: string[] | undefined = undefined;
      let informationParkIds: string[] | undefined = undefined;
      let sum: string[] = [];
      if (filters.mode && Array.isArray(filters.mode) && filters.mode.length) {
        modeParkIds = [];
        // 有过滤条件，按照过滤条件过滤
        filters.mode.forEach((mode: string) => {
          let temp;
          switch (mode) {
            case "SingleDirection":
              temp = Array.from(
                this.elementRendered.Park.mapObj.SingleDirection.keys()
              );
              modeParkIds = modeParkIds?.concat(temp);
              sum = sum.concat(temp);
              break;
            case "DualDirection":
              temp = Array.from(
                this.elementRendered.Park.mapObj.DualDirection.keys()
              );
              modeParkIds = modeParkIds?.concat(temp);
              sum = sum.concat(temp);
              break;
            case "FourDirection":
              temp = Array.from(
                this.elementRendered.Park.mapObj.FourDirection.keys()
              );
              modeParkIds = modeParkIds?.concat(temp);
              sum = sum.concat(temp);
              break;
          }
        });
      }
      if (filters.type && Array.isArray(filters.type) && filters.type.length) {
        typeParkIds = [];
        // 有过滤条件，按照过滤条件过滤
        filters.type.forEach((type: string) => {
          let temp;
          switch (type) {
            case "Normal":
              temp = Array.from(this.elementRendered.Park.mapObj.Normal.keys());
              typeParkIds = typeParkIds?.concat(temp);
              sum = sum.concat(temp);
              break;
            case "AGVPark":
              temp = Array.from(
                this.elementRendered.Park.mapObj.AGVPark.keys()
              );
              typeParkIds = typeParkIds?.concat(temp);
              sum = sum.concat(temp);
              break;
            case "ChargingPark":
              temp = Array.from(
                this.elementRendered.Park.mapObj.ChargingPark.keys()
              );
              typeParkIds = typeParkIds?.concat(temp);
              sum = sum.concat(temp);
              break;
          }
        });
      }
      // 收集进出路线相关数据
      const parkIdToInformationsMap: any = {};
      // 清除上一次标注的进出路线
      this.removeAGVPathByType("move");
      if (
        filters.information &&
        Array.isArray(filters.information) &&
        filters.information.length
      ) {
        informationParkIds = [];
        // 有过滤条件，按照过滤条件过滤
        filters.information.forEach((info: string) => {
          if (
            this.elementRendered.Park.objObj.information?.hasOwnProperty(info)
          ) {
            const temp = Array.from(
              this.elementRendered.Park.objObj.information[info]?.keys()
            );
            informationParkIds = informationParkIds?.concat(temp);
            sum = sum.concat(temp);
            informationParkIds?.forEach((id: string) => {
              if (parkIdToInformationsMap?.hasOwnProperty(id)) {
                parkIdToInformationsMap[id].push(info);
              } else {
                parkIdToInformationsMap[id] = [info];
              }
            });
          }
        });
      }
      // 并集去重
      sum = Array.from(new Set(sum));
      // 获取交集
      const intersection = sum.filter((s: string) => {
        if (
          modeParkIds &&
          Array.isArray(modeParkIds) &&
          !modeParkIds.includes(s)
        )
          return false;
        if (
          typeParkIds &&
          Array.isArray(typeParkIds) &&
          !typeParkIds.includes(s)
        )
          return false;
        if (
          informationParkIds &&
          informationParkIds.length &&
          !informationParkIds.includes(s)
        )
          return false;
        return true;
      });
      // 先全部隐藏
      this.elementRendered.Park.setObj.Normal?.hide();
      this.elementRendered.Park.setObj.AGVPark?.hide();
      this.elementRendered.Park.setObj.ChargingPark?.hide();
      // 再展示交集内的库位
      intersection.forEach((parkId: string) => {
        if (this.elementRendered.Park.mapObj.render.has(parkId)) {
          const currentParkEle =
            this.elementRendered.Park.mapObj.render.get(parkId);
          currentParkEle?.show();
          // 如有进出路线条件，则展示进出路线标识
          if (
            Object.keys(parkIdToInformationsMap).length &&
            parkIdToInformationsMap.hasOwnProperty(parkId)
          ) {
            const infoArr = parkIdToInformationsMap[parkId];
            infoArr.forEach((info: string) => {
              if (
                this.elementRendered.Park.objObj.information[info]?.has(parkId)
              ) {
                const pathId =
                  this.elementRendered.Park.objObj.information[info]?.get(
                    parkId
                  );
                if (this.elementRendered.AGVPath.map.has(pathId)) {
                  const _pathData =
                    this.elementRendered.AGVPath.map.get(pathId);
                  // 渲染候选指示路径
                  this.renderAGVPathByType("move", _pathData);
                }
              }
            });
          }
        }
        if (this.elementRendered.Park.mapObj.event.has(parkId)) {
          this.elementRendered.Park.mapObj.event.get(parkId)?.show();
        }
        if (this.elementRendered.ParkId.map.has(parkId)) {
          this.elementRendered.ParkId.map.get(parkId)?.show();
        }
      });
    } else {
      // 不过滤库位，则显示全部库位
      this.elementRendered.Park.set?.show();
    }
  }

  /**
   * 库位层级变动引起的库位ID文案变动
   * @returns
   */
  private filterParkId() {
    if (!this._renderSwitch.completed) return;
    if (!this._renderSwitch.parkId) return;
    const filters = { current: 1, parkMaxNum: 100000 };
    Object.assign(filters, this._renderFilter.layer);
    this.elementRendered.ParkId.set.forEach((el: any) => {
      el.attr({
        text: this.formatLayerParkNo(
          el.data("id"),
          filters.current,
          filters.parkMaxNum
        ),
      });
    });
  }
  /**
   * 计算给定第一层库位编号指定层数的新库位编号
   * @param parkNumber 第一层的库位编号
   * @param parkLayerNum 指定层数
   * @param parkCountExtreme 单层编号极值
   * @returns 新库位编号
   */
  public formatLayerParkNo(
    parkNumber: number | string,
    parkLayerNum: number,
    parkCountExtreme: number
  ) {
    return Number(parkNumber) + (parkLayerNum - 1) * parkCountExtreme;
  }

  /**
   * 把AGV行驶字串转化为路径数据
   * @param agvPath String B;1,0.585,3.532,-90;2,1.185,2.932,0;1,2.415,2.932,0;
   * @returns
   */
  public formatAgvPath(agvPath: string = "") {
    if (!agvPath) return [];
    // 判断是否是合法的坐标字串
    const isCoordinateStr = (str: string) => {
      if (str && typeof str === "string") {
        return str.split(",").length === 4;
      }
      return false;
    };
    // 判断是否是合法的行驶方向标识
    const isDirectionStr = (str: string) => {
      if (str && typeof str === "string") {
        return str.length === 1 && ["F", "B"].includes(str.toUpperCase());
      }
      return false;
    };
    let directionTag = "F"; // F或者B
    let isForward = true;
    const agvPathArr = agvPath.split(";").filter((str: string) => str);
    const pathDataArr: any[] = [];
    agvPathArr.forEach((str: string, index: number) => {
      if (isCoordinateStr(str)) {
        // 坐标字串：1,0.585,3.532,-90
        const coordinateDataArr = str.split(",");
        const currentPathData = {
          x1: this.getMapCoordiateX(Number(coordinateDataArr[1])),
          y1: this.getMapCoordiateY(Number(coordinateDataArr[2])),
          f: isForward,
          id: "",
          x2: 0,
          y2: 0,
          r: 0,
        };
        const nextStr = agvPathArr[index + 1] || "";
        // 判断是否还有下一项，且下一项是坐标字串
        if (nextStr && isCoordinateStr(nextStr)) {
          const nextCoordinateDataArr = nextStr.split(",");
          currentPathData.id = directionTag + ";" + str + ";" + nextStr + ";";
          currentPathData.x2 = this.getMapCoordiateX(
            Number(nextCoordinateDataArr[1])
          );
          currentPathData.y2 = this.getMapCoordiateY(
            Number(nextCoordinateDataArr[2])
          );
          // 计算两个圆形切线的角度
          const t1 = Number(coordinateDataArr[3]);
          const t2 = Number(nextCoordinateDataArr[3]);
          const a1 = this.thetaToAngle(t1);
          const a2 = this.thetaToAngle(t2);
          const a12 = a2 - a1;
          if (Math.abs(a12) <= 1) {
            // 直线
            currentPathData.r = 0;
          } else {
            // 曲线
            const sinA = Math.abs(a12 / 2);
            // 顺时针旋转小于0，逆时针旋转大于0
            let tag = -1;
            const sign1 = Math.sign(t1);
            const sign2 = Math.sign(t2);
            const t12 = t2 - t1;
            if (sign1 === sign2 || sign1 === 0 || sign2 === 2) {
              // 同号
              tag = t12 < 0 ? -1 : 1;
            } else {
              // 异号
              if (Math.abs(t2 - t1) >= 180) {
                // 优弧
                tag = t12 > 0 ? -1 : 1;
              } else {
                // 劣弧
                tag = t12 > 0 ? 1 : -1;
              }
            }
            currentPathData.r =
              (tag *
                (Math.sqrt(
                  Math.pow(currentPathData.x2 - currentPathData.x1, 2) +
                    Math.pow(currentPathData.y2 - currentPathData.y1, 2)
                ) /
                  2)) /
              Math.sin(Math.PI * (sinA / 180));
          }
          // 收集路径数据
          pathDataArr.push(currentPathData);
        }
      } else if (isDirectionStr(str)) {
        // 判断是否是前进或后退标识
        // 行驶方向标识：F/B
        directionTag = str.toUpperCase();
        isForward = directionTag === "F";
      } else {
        // 非预期字串，无法解析
        console.log(
          "非预期AGV字串，无法解析！当前字串：",
          str,
          "。全量字串：",
          agvPath
        );
      }
    });
    return pathDataArr;
  }

  // 销毁单个实例
  private destroyAgvAnimationEntry(target: any, prop: any, value: any) {
    // 判断当前队列是否已经这个编号
    if (target?.hasOwnProperty(prop)) {
      // 已经存在，销毁原AGV实例代理的所有资源，重新创建
      target[prop].destroy();
      target[prop] = {};
      delete target[prop];
    }
  }
  // 创建实例
  private createAgvAnimationEntry(target: any, prop: any, value: any) {
    if (!this._renderSwitch.completed) return;
    if (!prop) return;
    const unique = prop;
    // 定义初始target对象
    let model = value?.model;
    if (!this._agvModelList.includes(model)) {
      // 不支持的车型图标就置为默认车型
      model = "default";
    }
    const state = value?.state ? value.state : 0;
    const loading = value?.loading ? value.loading : false;

    // return new URL(`./images/agv/${mode}/${name}.png`, import.meta.url).href
    const getImageSource = (mode: string, name: string) => {
      let base64Source = "";
      switch (mode) {
        case "vnst":
          base64Source = VNST[name];
          break;
        default:
          base64Source = DEFAULTS[name];
          break;
      }
      return base64Source;
    };
    // 获取AGV图片的名称
    const getImgName = (state: number, loading: boolean) => {
      let name = this._agvStateMap[state] || "normal";
      if (state == 3) {
        // 自动运行时，需要判断当前车是否有货
        if (loading) {
          name = "mission_normal_freight";
        } else {
          name = "mission_normal";
        }
      } else {
        if (loading && name === "normal") {
          name = "normal_freight";
        }
      }

      return this._agvStateImgs[name];
    };
    // 异步加载图片
    const loadImgSync = (url: string, callback: any) => {
      const img = new Image();
      img.onload = function () {
        callback(img.src);
      };
      img.src = url;
    };
    // 创建AGV图片元素
    const createImgEle = () => {
      const imgSource = getImageSource(model, getImgName(state, loading));
      const ele = this.paper.image(
        imgSource,
        0,
        0,
        2 * this._unitZoom,
        2 * this._unitZoom
      );
      ele.hide();
      ele.data({
        ratios: this._agvModelIndentRatios[model],
      });
      return ele;
    };
    // 更新AGV图片元素的路径
    const updateImgEle = (agvEntry: IAgvEntry, ratios: any = null) => {
      const imgSource = getImageSource(
        agvEntry.model || "",
        agvEntry.imgName || ""
      );
      loadImgSync(imgSource, (src: string) => {
        agvEntry["agvImgEle"].attr({ src: src });
      });
      if (ratios) {
        agvEntry["agvImgEle"].data({
          ratios: agvEntry["ratios"],
        });
      }
    };
    // 创建跟随动画实例
    let _animateSwitch = {};
    const _animateWith = {};
    const _animateWithText = {};
    if (value.hasOwnProperty("animateSwitch")) {
      _animateSwitch = value.animateSwitch;
      Object.keys(_animateSwitch).forEach((key: string) => {
        if (_animateSwitch[key]) {
          let textEle = this.createAgvInfoText(key, unique);
          if (textEle) {
            _animateWith[key] = textEle;
            _animateWithText[key] = "";
          }
        }
      });
    }

    // 实例目标
    const _agvEntryTarget: IAgvEntry = {
      unique: unique, // AGV编号，唯一标识
      model: model, // AGV型号
      ratios: this._agvModelIndentRatios[model],
      state: state, // AGV状态
      taskType: "", // 任务类型
      loading: loading, // 当前车上是否有货
      imgName: getImgName(state, loading), // AGV图标名称，由state和taskType决定其值
      imgSrc: "", // AGV图标完整的SRC地址
      agvImgEle: createImgEle(), // AGV图标SVG元素
      agvImgCloneEle: createImgEle(), // AGV图标SVG元素-克隆元素
      animateSwitch: _animateSwitch, //Proxy:IAgvAnimateSwitch 跟随动画开关
      animateWith: _animateWith, //Object:IAgvAnimateWith 跟随动画元素
      animateWithText: _animateWithText, //Proxy:IAgvAnimateWithText 跟随动画元素的文案
      animateQueue: [] as any, // AGV动画的点位坐标
      clickCallback: () => {}, // 点击AGV图标的回调事件
      destroy: () => {}, // 销毁当前AGV代理资源的方法
    };
    // 定义AGV图标点击事件
    if (value.clickCallback) {
      _agvEntryTarget.clickCallback = value.clickCallback;
      const agvEleClickEvent = () => {
        _agvEntryTarget.clickCallback(unique);
      };
      _agvEntryTarget.agvImgEle.attr({ cursor: "pointer" });
      _agvEntryTarget.agvImgEle.click(agvEleClickEvent);
      _agvEntryTarget.agvImgEle.touchstart(agvEleClickEvent);
    }
    // 实例回调
    const _agvEntryHandle = {
      set: (obj: any, prop: any, value: any) => {
        switch (prop) {
          case "model":
            if (obj[prop] !== value) {
              // 新设置的值不同于旧的值才触发
              if (!this._agvModelList.includes(value)) {
                // 不支持的车型图标就置为默认车型
                value = "default";
              }
              obj[prop] = value;
              obj["ratios"] = this._agvModelIndentRatios[value];
              updateImgEle(obj, obj["ratios"]);
            }
            break;
          case "state":
            if (obj[prop] !== value) {
              // 新设置的值不同于旧的值才触发
              obj[prop] = value;
              obj["imgName"] = getImgName(value, obj["loading"]);
              updateImgEle(obj);
            }
            break;
          case "taskType":
            if (obj[prop] !== value) {
              // 新设置的值不同于旧的值才触发
              obj[prop] = value;
              // 任务状态暂时不影响车辆图标
            }
            break;
          case "loading":
            if (obj[prop] !== value) {
              // 新设置的值不同于旧的值才触发
              obj[prop] = value;
              obj["imgName"] = getImgName(obj["state"], value);
              updateImgEle(obj);
            }
            break;
        }
        return true;
      },
    };
    // 实体代理
    const targetProxy = Proxy.revocable(_agvEntryTarget, _agvEntryHandle);
    /* targetProxy.proxy.model = model
    targetProxy.proxy.state = state
    targetProxy.proxy.loading = loading */
    // 定义跟随元素是否展示
    const animateSwitchProxy = Proxy.revocable(_animateSwitch, {
      set: (target: any, prop: any, value: any) => {
        if (value) {
          // 开启，展示元素、定位元素
          if (!_animateSwitch.hasOwnProperty(prop)) {
            // 无此元素，需要新建
            let textEle = this.createAgvInfoText(prop, unique);
            if (textEle) _animateWith[prop] = textEle;
          }
        } else {
          // 关闭，隐藏元素
          if (_animateSwitch.hasOwnProperty(prop)) {
            // 有此元素了
            this.triggerAgvInfoText(prop, _animateSwitch[prop], false);
          }
        }
        return true;
      },
    });
    _agvEntryTarget.animateSwitch = animateSwitchProxy.proxy;
    // 定义跟随元素文案内容更新代理
    const animateWithTextProxy = Proxy.revocable(_animateWithText, {
      set: (target: any, prop: any, value: any) => {
        if (
          _animateSwitch.hasOwnProperty(prop) &&
          _animateSwitch[prop] &&
          _animateSwitch.hasOwnProperty(prop)
        ) {
          this.updateAgvInfoText(
            prop,
            _animateSwitch[prop],
            value,
            _agvEntryTarget.agvImgEle
          );
        }
        return true;
      },
    });
    _agvEntryTarget.animateWithText = animateWithTextProxy.proxy;
    // 定义AGV动画代理
    const animateProxy = this.createAnimateProxy(_agvEntryTarget);
    _agvEntryTarget.animateQueue = animateProxy.proxy;
    // 创建销毁代理的方法
    _agvEntryTarget.destroy = () => {
      target[prop] = _agvEntryTarget;
      _agvEntryTarget.animateQueue = [];
      targetProxy.revoke();
      animateSwitchProxy.revoke();
      animateWithTextProxy.revoke();
      animateProxy.revoke();
    };
    return targetProxy.proxy;
  }
  // 创建信息块文案
  private createAgvInfoText(key: string, text: string) {
    const createInfoBox = () => {
      const textSpaceSize = this.elementConfig.Text.size.space;
      // 创建文字背景区块
      let backgroundBoxEle = this.paper
        .rect(
          -textSpaceSize,
          -textSpaceSize,
          textSpaceSize * 2,
          textSpaceSize * 2
        )
        .attr({
          stroke: "#A3C6FF",
          fill: "#F2F8FF",
          // 'stroke-opacity': 0.5,
          // 'fill-opacity': 0.5
        });
      // 创建文字
      let textEle = this.paper.text(0, 0, "").attr({
        "text-anchor": "start",
        "stroke-width": 0.2,
        stroke: "#000000 ",
        fill: "#000000 ",
        // 'stroke-opacity': 0.5,
        // 'fill-opacity': 0.5
      });
      let backgroundBoxId = backgroundBoxEle.id;
      backgroundBoxEle.hide();
      textEle.data("backgroundBoxId", backgroundBoxId).hide();
      return textEle;
    };

    let textEle = null;
    switch (key) {
      case "MiddleTop":
        textEle = this.paper
          .text(0, 0, text)
          .attr({
            // 'text-anchor': 'middle',
            "font-size": 30,
            "font-weight": "bold",
            // 'stroke-width': 0.2,
            stroke: "#EB2829",
            fill: "#EB2829",
          })
          .hide();
        break;
      case "LeftTop":
        textEle = createInfoBox();
        break;
      case "RightTop":
        textEle = createInfoBox();
        break;
      case "RightBottom":
        textEle = createInfoBox();
        break;
      case "LeftBottom":
        textEle = createInfoBox();
        break;
    }
    return textEle;
  }
  // 更新AGV信息块文案
  private updateAgvInfoText(
    key: string,
    textEle: any,
    text: string,
    mainEle: any
  ) {
    // 定位文字元素
    textEle.attr({ text: text });
    this.setSingleEleAround(key, textEle, mainEle);
  }
  // 展示/隐藏AGV周围的信息块
  private triggerAgvInfoText(key: string, textEle: any, show: boolean) {
    const textEleArr: any[] = [];
    switch (key) {
      case "MiddleTop":
        textEleArr.push(textEle);
        break;
      case "LeftTop":
        textEleArr.push(textEle);
        const bgEleLeftTop = this.paper.getById(
          textEle.data("backgroundBoxId")
        );
        if (bgEleLeftTop) textEleArr.push(bgEleLeftTop);
        break;
      case "RightTop":
        textEleArr.push(textEle);
        const bgEleRightTop = this.paper.getById(
          textEle.data("backgroundBoxId")
        );
        if (bgEleRightTop) textEleArr.push(bgEleRightTop);
        break;
      case "RightBottom":
        textEleArr.push(textEle);
        const bgEleRightBottom = this.paper.getById(
          textEle.data("backgroundBoxId")
        );
        if (bgEleRightBottom) textEleArr.push(bgEleRightBottom);
        break;
      case "LeftBottom":
        textEleArr.push(textEle);
        const bgEleLeftBottom = this.paper.getById(
          textEle.data("backgroundBoxId")
        );
        if (bgEleLeftBottom) textEleArr.push(bgEleLeftBottom);
        break;
    }
    if (show) {
      textEleArr.forEach((ele: any) => {
        ele.show();
      });
    } else {
      textEleArr.forEach((ele: any) => {
        ele.hide();
      });
    }
  }
  // 创建动画代理
  private createAnimateProxy(agvEntry: IAgvEntry) {
    let isMoving = false;
    const agvEle = agvEntry.agvImgEle;
    const movingPoints: any[] = [];
    const handler: any = {
      set: (target: any, prop: any, value: any) => {
        if (prop === "length") {
          // 数组形式的object，set第二步才后设置长度
          if (target.length === value) {
            // 值的个数增加了，再设置数组length
            // 如果target.length 和 value不相等，表示新点位值被抛弃了，未被采用。重复点位值导致的
            target.length = value;
            // 有被采用的点后，才开始判断是否要开始新的动画
            if (this._renderSwitch.completed && !isMoving && value >= 1) {
              // 有新点位被加进来后，车辆不在动画中且点位数量至少有一个，就开启动画
              loop();
            }
          }
        } else {
          // 数组形式的object，set第一步先设置值
          // 去重功能，如果是重复的点位则返回null
          const point = removeDuplicationData(value, target);
          if (point) target[prop] = point;
        }
        // set不论怎么处理都必须返回true，否则报错
        return true;
        // return Reflect.set(obj, prop, value)
      },
    };
    const proxyRevocable = Proxy.revocable(movingPoints, handler);
    // 动画循环
    const loop = () => {
      // 展示AGV图标
      agvEle.show();
      agvEntry.animateWith?.MiddleTop?.show();
      isMoving = true;
      if (this.elementConfig.Agv.demarcate) {
        // 标定模式，直接单点运动
        if (movingPoints.length >= 2 && movingPoints.length <= 3) {
          let onePoint = movingPoints.shift();
          onePoint = Object.assign({}, onePoint);
          this.rotateBy1PointBatch(agvEntry, onePoint, () => {
            loop();
          });
        } else if (movingPoints.length > 3) {
          // 积累超过4条动画了，需要纠错更新最新位置数据
          // 仅保留最后一个数据
          movingPoints.splice(-1);
          loop();
        } else if (movingPoints.length === 1) {
          // 只有一个点则把车放在该点
          let onePoint = movingPoints[0];
          onePoint = Object.assign({}, onePoint);
          this.rotateBy1PointBatch(agvEntry, onePoint, () => {
            // 判断在定位当前点的时候，是否有新的点进来
            if (movingPoints.length > 1) {
              // 大于1个点位，有新点进来了
              loop();
            } else {
              // 依然小于等于一个点，没有新点进来，则标记动画结束
              isMoving = false;
            }
          });
        }
      } else {
        // 非标定模式
        if (movingPoints.length >= 2 && movingPoints.length <= 3) {
          // 需要运行的路径点位至少有2个，则开启动画效果
          // 弹出第一个点数据
          let startPoint = movingPoints.shift();
          // 拷贝第二个点数据
          let endPoint = movingPoints[0];
          startPoint = Object.assign({}, startPoint);
          endPoint = Object.assign({}, endPoint);
          agvEle.stop();
          this.animateBy2PointBatch(agvEntry, startPoint, endPoint, () => {
            loop();
          });
        } else if (movingPoints.length > 3) {
          // 积累超过4条动画了，需要纠错更新最新位置数据
          // 仅保留最后一个数据
          movingPoints.splice(-1);
          loop();
        } else if (movingPoints.length === 1) {
          // 只有一个点则把车放在该点
          let onePoint = movingPoints[0];
          onePoint = Object.assign({}, onePoint);
          agvEle.stop();
          this.transformBy1PointBatch(agvEntry, onePoint, () => {
            // 判断在定位当前点的时候，是否有新的点进来
            if (movingPoints.length > 1) {
              // 大于1个点位，有新点进来了
              loop();
            } else {
              // 依然小于等于一个点，没有新点进来，则标记动画结束
              isMoving = false;
            }
          });
        }
      }
    };
    // 去重重复数据
    const removeDuplicationData = (message: any, target: any[]) => {
      const { x, y, theta } = message || { x: 0, y: 0, theta: 0 };
      const timestamp = Date.parse(message.timestamp) || "";
      // 获取最新接到的点
      const point = {
        x: x,
        y: y,
        theta: theta,
        timestamp: timestamp,
      };

      // 判断最近两次点位是否一致，除去重复的点
      const currentData = Object.assign([], target);
      if (currentData.length >= 1) {
        // 获取已存的最后一个点
        let lastPoint = target[currentData.length - 1];
        // 两个点都非空
        lastPoint = Object.assign({}, lastPoint);
        lastPoint.x = Number(Number.parseFloat(lastPoint.x).toFixed(3));
        lastPoint.y = Number(Number.parseFloat(lastPoint.y).toFixed(3));
        lastPoint.theta = Number(Number.parseFloat(lastPoint.theta).toFixed(3));
        const tempPoint = Object.assign({}, point);
        tempPoint.x = Number(Number.parseFloat(tempPoint.x).toFixed(3));
        tempPoint.y = Number(Number.parseFloat(tempPoint.y).toFixed(3));
        tempPoint.theta = Number(Number.parseFloat(tempPoint.theta).toFixed(3));

        if (
          !(
            lastPoint.x === tempPoint.x &&
            lastPoint.y === tempPoint.y &&
            lastPoint.theta === tempPoint.theta
          )
        ) {
          // 不同的点，才加入队列
          // 重复的点位不处理
          // 判断坐标是否大于9万，大于九万为标定模式
          if (Math.abs(point.x) >= 90000 || Math.abs(point.y) >= 90000) {
            this.elementConfig.Agv.demarcate = true;
          } else {
            this.elementConfig.Agv.demarcate = false;
          }
          return point;
        }
      } else {
        // 第一个非空的点加入队列
        // 判断坐标是否大于9万，大于九万为标定模式
        if (Math.abs(point.x) >= 90000 || Math.abs(point.y) >= 90000) {
          this.elementConfig.Agv.demarcate = true;
        } else {
          this.elementConfig.Agv.demarcate = false;
        }
        return point;
      }
      return null;
    };
    return proxyRevocable;
  }

  /**
   * 预置配置数据，一般不动态修改
   * 可支持的AGV图标集合，适用于不同状态
   */
  private _agvStateImgs: any = {
    // 已经存在的AGV图标文件名
    abnormal: "abnormal", // 异常
    charging: "charging", // 充电中
    fault: "fault", // 故障中
    offline: "offline", // 掉线
    shutdown: "shutdown", // 关机
    manual: "manual_mode", // 手动模式
    normal: "normal_no_freight", // 正常、无货
    normal_freight: "normal_has_freight", // 正常、有货
    mission_normal: "mission_normal_no_freight", // 有任务、正常、无货
    mission_normal_freight: "mission_normal_has_freight", // 有任务、正常、有货物
  };
  private _agvStateMap: any = {
    0: "normal", // 未知 Unknown = 0,
    1: "normal", // 初始化 Prepare = 1,
    2: "normal", // 待命 StandBy = 2,
    3: "mission_normal", // 自动运行 Auto = 3,
    4: "normal", // 定位矫正 Adjust = 4,
    5: "manual", // 手动状态 Manual = 5,
    6: "abnormal", // 异常 Breakdown = 6,
    7: "normal", // 休眠 Sleep = 7,
    8: "shutdown", // 关机 Halt = 8，
    9: "normal", // 开机自检状态 PowerOnSelfVerify = 9,
    10: "normal", // 手工自检 ManualSelfVerify = 10
  };

  /**
   * 预置配置数据，一般不动态修改
   * 可支持的独有车辆图标的agv型号
   */
  private _agvModelList = ["default", "vnst"];

  /**
   * 预置配置数据，一般不动态修改
   * agv不同型号的中心点数据
   */
  private _agvModelIndentRatios: any = {
    vnst: {
      // st车以货叉终点中心为图标中心点
      width: 0.35,
      height: 0.5,
    },
    default: {
      // 默认以AGV图标中心为中心点
      width: 0.5,
      height: 0.5,
    },
  };

  /**
   * vnl轮廓数据
   */
  private _vnlOutlineDataInit: IOutlineEleData = {
    // 轮廓元素
    MainEle: null,
    // VNL文件轮廓的四条边上的移动点元素
    TopPointEle: null, // 上边控制点
    RightPointEle: null, // 右边控制点
    BootomPointEle: null, // 下边控制点
    LeftPointEle: null, // 左边控制点
    // VNL文件轮廓四个顶点元素
    LeftTopPointEle: null, // 左上角顶点元素
    RightTopPointEle: null, // 右上角顶点元素
    RightBottomPointEle: null, // 右下角顶点元素
    LeftBottomPointEle: null, // 左下角顶点元素
    // VNL文件轮廓四个顶点坐标文案元素
    LeftTopTextEle: null, // 左上角顶点坐标文字元素
    RightTopTextEle: null, // 右上角顶点坐标文字元素
    RightBottomTextEle: null, // 右下角顶点坐标文字元素
    LeftBottomTextEle: null, // 左下角顶点坐标文字元素
  };
  protected vnlOutlineData: IOutlineEleData = JSON.parse(
    JSON.stringify(this._vnlOutlineDataInit)
  );

  /**********************************************************
   * 常驻渲染元素 start
   */

  /**
   * 底图 start
   */
  // 渲染底图
  private renderBackgroundImg() {
    if (this._renderSwitch.backgroundImg && this.backgroundImgData.entry) {
      this.backgroundImgData.element = this.paper?.image(
        this.backgroundImgData.entry.src,
        this.viewBoxParams.value[0],
        this.viewBoxParams.value[1],
        this.viewBoxParams.value[2],
        this.viewBoxParams.value[3]
      );
      if (this.backgroundImgData.blackBase) {
        // 颜色反转
        const ele: HTMLElement = this.backgroundImgData.element?.node;
        ele.style.filter = "invert(100%)";
      }
      // 透明度调高
      this.backgroundImgData.element?.attr("opacity", 0.1)?.toBack();
    }
  }
  // 清除底图
  private cancelBackgroundImg() {
    this.backgroundImgData.element && this.backgroundImgData.element?.remove();
  }
  /**
   * 底图 end
   */

  /**
   * 轮廓元素 start
   */
  // 渲染VNL轮廓
  private renderVnlOutline() {
    if (this._renderSwitch.vnlOutline) {
      const _AreaEle = this.renderAreaRect({
        ltx: this._outlineData.vnlOutline.left, // 左上坐标X
        lty: this._outlineData.vnlOutline.top, // 左上坐标Y
        rtx: this._outlineData.vnlOutline.right, // 右上坐标X
        rty: this._outlineData.vnlOutline.top, // 右上坐标Y
        rbx: this._outlineData.vnlOutline.right, // 右下坐标X
        rby: this._outlineData.vnlOutline.bottom, // 右下坐标Y
        lbx: this._outlineData.vnlOutline.left, // 左下坐标X
        lby: this._outlineData.vnlOutline.bottom, // 左下坐标Y
      });
      if (!_AreaEle) return;
      Object.keys(_AreaEle).forEach((key: string) => {
        this.vnlOutlineData[key as keyof typeof this.vnlOutlineData] =
          _AreaEle[key as keyof typeof _AreaEle];
      });
    }
  }
  /**
   * 更新VNL轮廓顶点坐标文案内容和位置
   * @param position string 点坐标位置 leftTop/rightTop/rightBottom/leftBottom
   * @param x 坐标的X值
   * @param y 坐标的Y值
   * x和y都传入才会改动位置
   * @returns
   */
  /* protected updateVnlFileOutlineCoordinateText(
    position: string,
    x: number | undefined = undefined,
    y: number | undefined = undefined
  ) {
    if (!position) return;
    switch (position) {
      case "leftTop":
        this.updateOutlineCoordinateText(
          position,
          this.vnlOutlineData.LeftTopTextEle,
          x,
          y
        );
        break;
      case "rightTop":
        this.updateOutlineCoordinateText(
          position,
          this.vnlOutlineData.RightTopTextEle,
          x,
          y
        );
        break;
      case "rightBottom":
        this.updateOutlineCoordinateText(
          position,
          this.vnlOutlineData.RightBottomTextEle,
          x,
          y
        );
        break;
      case "leftBottom":
        this.updateOutlineCoordinateText(
          position,
          this.vnlOutlineData.LeftBottomTextEle,
          x,
          y
        );
        break;
    }
  } */
  /**
   * 更新一个文字元素的坐标
   * @param position 该元素所处的位置
   * @param ele 元素
   * @param x 坐标x
   * @param y 坐标y
   * @returns
   */
  protected updateOutlineCoordinateText(
    position: string,
    ele: any,
    x: number | undefined = undefined,
    y: number | undefined = undefined
  ) {
    if (!position || !ele) return;
    if (x !== undefined && y !== undefined) {
      ele.attr({
        x,
        y,
        text: this.getCoordinateTextStr(x, y),
      });
    }
    const CoordinateTextEleBox = ele.getBBox();
    switch (position) {
      case "leftTop":
        ele.attr({
          x: CoordinateTextEleBox.cx - CoordinateTextEleBox.width / 2,
          y: CoordinateTextEleBox.cy - CoordinateTextEleBox.height,
        });
        break;
      case "rightTop":
        ele.attr({
          x: CoordinateTextEleBox.cx + CoordinateTextEleBox.width / 2,
          y: CoordinateTextEleBox.cy - CoordinateTextEleBox.height,
        });
        break;
      case "rightBottom":
        ele.attr({
          x: CoordinateTextEleBox.cx + CoordinateTextEleBox.width / 2,
          y: CoordinateTextEleBox.cy + CoordinateTextEleBox.height,
        });
        break;
      case "leftBottom":
        ele.attr({
          x: CoordinateTextEleBox.cx - CoordinateTextEleBox.width / 2,
          y: CoordinateTextEleBox.cy + CoordinateTextEleBox.height,
        });
        break;
    }
  }
  // 渲染区域矩形
  protected renderAreaRect(param: any): IOutlineEleData {
    const {
      ltx, // 左上坐标X
      lty, // 左上坐标Y
      rtx, // 右上坐标X
      rty, // 右上坐标Y
      rbx, // 右下坐标X
      rby, // 右下坐标Y
      lbx, // 左下坐标X
      lby, // 左下坐标Y
      pointRadius, // 顶点半径
      borderSize, // 边粗细
      textSize, // 字体大小
      mainColor, // 主题颜色
      bgColor, // 背景颜色
    } = Object.assign(
      {
        pointRadius: 8,
        borderSize: 4,
        textSize: 2,
        mainColor: "#ED7B00",
        bgColor: "",
      },
      param
    );

    // 判断必要数据是否传入
    if (
      ltx === undefined ||
      lty === undefined ||
      rtx === undefined ||
      rty === undefined ||
      rbx === undefined ||
      rby === undefined ||
      lbx === undefined ||
      lby === undefined
    )
      return;

    // 四个顶点坐标
    const leftTopCoordiate = {
      x: ltx,
      y: lty,
    };
    const rightTopCoordiate = {
      x: rtx,
      y: rty,
    };
    const rightBottomCoordiate = {
      x: rbx,
      y: rby,
    };
    const leftBottomCoordiate = {
      x: lbx,
      y: lby,
    };

    // 计算矩形宽高
    const width = rightBottomCoordiate.x - leftTopCoordiate.x;
    const height = rightBottomCoordiate.y - leftTopCoordiate.y;
    // 1 生成矩形主元素
    const OutlineMainEle = this.paper
      ?.rect(leftTopCoordiate.x, leftTopCoordiate.y, width, height)
      .attr({
        "stroke-width": borderSize,
        stroke: mainColor,
      });
    if (bgColor) OutlineMainEle.attr({ fill: bgColor, "fill-opacity": 0.5 });
    OutlineMainEle.data({
      leftTop: leftTopCoordiate,
      rightTop: rightTopCoordiate,
      rightBottom: rightBottomCoordiate,
      leftBottom: leftBottomCoordiate,
    });

    // 2 上边移动点
    const OutlineTopPointEle = this.paper
      ?.circle(
        (leftTopCoordiate.x + rightTopCoordiate.x) / 2,
        leftTopCoordiate.y,
        pointRadius
      )
      .attr({
        "stroke-width": 1,
        stroke: mainColor,
        fill: mainColor,
      });
    // 3 右边移动点
    const OutlineRightPointEle = this.paper
      ?.circle(
        rightTopCoordiate.x,
        (rightTopCoordiate.y + rightBottomCoordiate.y) / 2,
        pointRadius
      )
      .attr({
        "stroke-width": 1,
        stroke: mainColor,
        fill: mainColor,
      });
    // 4 下边移动点
    const OutlineBootomPointEle = this.paper
      ?.circle(
        (rightBottomCoordiate.x + leftBottomCoordiate.x) / 2,
        rightBottomCoordiate.y,
        pointRadius
      )
      .attr({
        "stroke-width": 1,
        stroke: mainColor,
        fill: mainColor,
      });
    // 5 左边移动点
    const OutlineLeftPointEle = this.paper
      ?.circle(
        leftBottomCoordiate.x,
        (leftBottomCoordiate.y + leftTopCoordiate.y) / 2,
        pointRadius
      )
      .attr({
        "stroke-width": 1,
        stroke: mainColor,
        fill: mainColor,
      });

    // VNL文件轮廓四个顶点
    const coordinateTextSize: number = textSize * this._unitZoom;
    const coordinateTextStyle = {
      "font-size": coordinateTextSize,
      "font-weight": "bold",
      stroke: mainColor,
      fill: mainColor,
    };
    // 6 左上角顶点元素
    const OutlineLeftTopPointEle = this.paper
      ?.circle(leftTopCoordiate.x, leftTopCoordiate.y, pointRadius)
      .attr({
        "stroke-width": 1,
        stroke: mainColor,
        fill: mainColor,
      });
    // 7 左上角顶点坐标文案元素
    const leftTopCoordinateText = this.getCoordinateTextStr(
      leftTopCoordiate.x,
      leftTopCoordiate.y
    );
    const OutlineLeftTopCoordinateTextEle = this.paper
      ?.text(leftTopCoordiate.x, leftTopCoordiate.y, leftTopCoordinateText)
      .attr(coordinateTextStyle);
    this.updateOutlineCoordinateText(
      "leftTop",
      OutlineLeftTopCoordinateTextEle
    );

    // 8 右上角顶点元素
    const OutlineRightTopPointEle = this.paper
      ?.circle(rightTopCoordiate.x, rightTopCoordiate.y, pointRadius)
      .attr({
        "stroke-width": 1,
        stroke: mainColor,
        fill: mainColor,
      });
    // 9 右上角顶点坐标文案元素
    const rightTopCoordinateText = this.getCoordinateTextStr(
      rightTopCoordiate.x,
      rightTopCoordiate.y
    );
    const OutlineRightTopCoordinateTextEle = this.paper
      ?.text(rightTopCoordiate.x, rightTopCoordiate.y, rightTopCoordinateText)
      .attr(coordinateTextStyle);
    this.updateOutlineCoordinateText(
      "rightTop",
      OutlineRightTopCoordinateTextEle
    );

    // 10 右下角顶点元素
    const OutlineRightBottomPointEle = this.paper
      ?.circle(rightBottomCoordiate.x, rightBottomCoordiate.y, pointRadius)
      .attr({
        "stroke-width": 1,
        stroke: mainColor,
        fill: mainColor,
      });
    // 11 右下角顶点坐标文案元素
    const rightBottomCoordinateText = this.getCoordinateTextStr(
      rightBottomCoordiate.x,
      rightBottomCoordiate.y
    );
    const OutlineRightBottomCoordinateTextEle = this.paper
      ?.text(
        rightBottomCoordiate.x,
        rightBottomCoordiate.y,
        rightBottomCoordinateText
      )
      .attr(coordinateTextStyle);
    this.updateOutlineCoordinateText(
      "rightBottom",
      OutlineRightBottomCoordinateTextEle
    );

    // 12 左下角顶点元素
    const OutlineLeftBottomPointEle = this.paper
      ?.circle(leftBottomCoordiate.x, leftBottomCoordiate.y, pointRadius)
      .attr({
        "stroke-width": 1,
        stroke: mainColor,
        fill: mainColor,
      });
    // 13 左下角顶点坐标文案元素
    const leftBottomCoordinateText = this.getCoordinateTextStr(
      leftBottomCoordiate.x,
      leftBottomCoordiate.y
    );
    const OutlineLeftBottomCoordinateTextEle = this.paper
      ?.text(
        leftBottomCoordiate.x,
        leftBottomCoordiate.y,
        leftBottomCoordinateText
      )
      .attr(coordinateTextStyle);
    this.updateOutlineCoordinateText(
      "leftBottom",
      OutlineLeftBottomCoordinateTextEle
    );

    return {
      MainEle: OutlineMainEle,
      TopPointEle: OutlineTopPointEle,
      RightPointEle: OutlineRightPointEle,
      BootomPointEle: OutlineBootomPointEle,
      LeftPointEle: OutlineLeftPointEle,
      LeftTopPointEle: OutlineLeftTopPointEle,
      LeftTopTextEle: OutlineLeftTopCoordinateTextEle,
      RightTopPointEle: OutlineRightTopPointEle,
      RightTopTextEle: OutlineRightTopCoordinateTextEle,
      RightBottomPointEle: OutlineRightBottomPointEle,
      RightBottomTextEle: OutlineRightBottomCoordinateTextEle,
      LeftBottomPointEle: OutlineLeftBottomPointEle,
      LeftBottomTextEle: OutlineLeftBottomCoordinateTextEle,
    } as IOutlineEleData;
  }
  /**
   * 轮廓元素 end
   */

  /**
   * 渲染地图元素 start
   */
  private renderVnlElements(callback: any = undefined) {
    if (this._renderSwitch.vnl) {
      // 记录需要渲染的元素列表
      this.elementNamesRendered = this._elementRenderSuppot.filter(
        (name: string) => {
          switch (name) {
            case "Text":
              return this._renderSwitch.text;
            case "Mark":
              return this._renderSwitch.mark;
            case "LineShape":
              return this._renderSwitch.line;
            case "AGVPath":
              return this._renderSwitch.path;
            case "Park":
              return this._renderSwitch.park;
            case "AGVPathPoint":
              return this._renderSwitch.point;
            default:
              return false;
          }
        }
      );
      this.renderQueue(this.elementNamesRendered, callback);
    }
  }
  // 排队、分步、无间隙渲染地图大量元素
  private renderQueue(eleNameArr: string[], callback: any = undefined) {
    if (eleNameArr.length > 0) {
      let offset: number = 0;
      const pageSize: number = 1000;
      const eleName: string = eleNameArr.shift() as string;
      const JSONArr = Array.from(
        this.mapClassifyData[
          eleName as keyof typeof this.mapClassifyData
        ].values()
      );
      const renderMethod = this[`${eleName}RenderBatch` as keyof Renderer];
      if (renderMethod) {
        // 此元素的渲染方法存在才执行
        // console.time(eleName)
        // 处理特殊元素：【路径元素】
        if (["AGVPath"].includes(eleName)) {
          // 'Park'
          // 路径元素不能分布渲染，需要对数据进行整体处理
          renderMethod(JSONArr);
          window.requestAnimationFrame(() => {
            // 继续渲染下一个
            this.renderQueue(eleNameArr, callback);
          });
        } else {
          const total = JSONArr.length; // 总条数
          let loopNo = 0;
          const loop = () => {
            const needNum = offset + pageSize; // 需要截取到的数据位置
            const food = JSONArr.slice(offset, needNum);
            renderMethod(food);
            offset = needNum;
            if (offset <= total) {
              loopNo = window.requestAnimationFrame(loop);
            } else {
              // console.timeEnd(eleName)
              window.cancelAnimationFrame(loopNo);
              // 当前元素已执行完成，继续渲染下一个
              this.renderQueue(eleNameArr, callback);
            }
          };
          loop();
        }
      } else {
        // 当前元素名不可用，继续渲染下一个
        this.renderQueue(eleNameArr, callback);
      }
    } else {
      // 队列任务结束，执行回调，如果有
      callback && callback();
    }
  }
  /**
   * 渲染地图元素 start
   */
  private renderManage() {
    this.renderSwitch.completed = false;
    // 渲染底图
    this.renderBackgroundImg();
    // 渲染地图轮廓
    this.renderVnlOutline();
    // 渲染地图元素
    if (this._renderSwitch.vnl) {
      // 如果还需要渲染VNL元素，为异步渲染，在VNL元素渲染完成后再标记渲染完成
      this.renderVnlElements(() => {
        // 队列渲染完成
        this.renderSwitch.completed = true;
        this.rendering = false;
      });
    } else {
      // 如果不需要渲染VNL元素，则为同步渲染，直接标记渲染完成
      this.renderSwitch.completed = true;
      this.rendering = false;
    }
  }

  /*
   * 渲染 Text start
   */
  private TextRenderBatch = (TextJSONArr: any[]) => {
    TextJSONArr.forEach((text) => {
      const id = text["@ObjectId"],
        angle = Number(text["@Angle"]),
        x = this.getMapCoordiateX(Number(text.Position["@X"])),
        y = this.getMapCoordiateY(Number(text.Position["@Y"])),
        size = (Number(text["@Size"]) * this._unitZoom) / 100 / 5,
        txt = text["@String"],
        color = text["@Color"] ? "#" + Number(text["@Color"]).toString(16) : "";

      this.renderText(id, x, y, txt, size, color, angle, text);
    });
  };
  /**
   * @id 当前线路唯一ID
   * @x 开始点X坐标
   * @y 开始点Y坐标
   * @txt 需要展示的字串
   * @size 字串大小
   * @color 字串颜色
   * @angle 字串角度
   * @textData 原始数据
   */
  private renderText(
    id: string,
    x: number,
    y: number,
    txt: string,
    size: number,
    color: string,
    angle: number,
    textData: any
  ) {
    const _data = { id, x, y, txt, size, color, angle, ...textData };
    if (!color) color = this.elementConfig.Text.color.default;
    const text = this.paper?.text(x, y, txt).attr({
      "font-size": size,
      stroke: color,
      fill: color,
    });
    text.rotate(angle, x, y);
    text.data(_data);
    this.elementRendered.Text.set.push(text);
  }
  /*
   * 渲染 Text end
   */
  /*
   * 渲染 Line start
   */
  private LineShapeRenderBatch = (LineShapeJSONArr: any[]) => {
    LineShapeJSONArr.forEach((LineShape) => {
      const id = LineShape["@ObjectId"],
        x1 = this.getMapCoordiateX(Number(LineShape.Start["@X"])),
        y1 = this.getMapCoordiateY(Number(LineShape.Start["@Y"])),
        x2 = this.getMapCoordiateX(Number(LineShape.End["@X"])),
        y2 = this.getMapCoordiateY(Number(LineShape.End["@Y"]));

      this.renderLineShape(id, x1, y1, x2, y2, LineShape);
    });
  };
  /**
   * @id 当前线路唯一ID
   * @x1 开始点X坐标
   * @y1 开始点Y坐标
   * @x2 结束点X坐标
   * @y2 结束点Y坐标
   * @LineShapeData 原始数据
   */
  private renderLineShape(
    id: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    LineShapeData: any
  ) {
    const _data = { id, x1, y1, x2, y2, ...LineShapeData };
    const LineShape = this.paper
      ?.path(Raphael.format("M{0},{1} L{2},{3}"), x1, y1, x2, y2)
      .attr({
        "stroke-width": 1,
        stroke: this.elementConfig.LineShape.color.default,
      })
      .data(_data);
    this.elementRendered.LineShape.set.push(LineShape);
  }
  /*
   * 渲染 Line end
   */
  /*
   * 渲染 Mark start
   * @Mark:[
   * {
        "@ObjectId":"1","@Groups":"","@Angle":"90","@MarkHeight":"2.93","@MarkSize":"470","@TMarkSize":"23.50",
        "Position":{"@X":"0","@Y":"0","@TX":"0.00","@TY":"-0.00"}
      },
      ...
   * ]
   */
  private MarkRenderBatch = (MarkJSONArr: any[]) => {
    MarkJSONArr.forEach((mark) => {
      const id = mark["@ObjectId"],
        x = this.getMapCoordiateX(Number(mark.Position["@X"])),
        y = this.getMapCoordiateY(Number(mark.Position["@Y"])),
        size = Number(mark["@MarkSize"]) * this._unitZoom,
        angle = Number(mark["@Angle"]),
        height = Number(mark["@MarkHeight"]),
        startPoint = {
          x: x - size / 2.0,
          y: y - size / 2.0,
        },
        secondPoint = {
          x: x - size / 2.0,
          y: y + size / 2.0,
        },
        thirdPoint = {
          x: x + size / 2.0,
          y: y + size / 2.0,
        },
        fourthPoint = {
          x: x + size / 2.0,
          y: y - size / 2.0,
        };

      this.renderMark(
        id,
        x,
        y,
        size,
        startPoint,
        secondPoint,
        thirdPoint,
        fourthPoint,
        angle,
        height,
        mark
      );
    });
  };
  /**
   * 渲染二维码位置
   * @id 二维码位置唯一ID
   * @x 正方形中心点X坐标
   * @y 正方形中心点Y坐标
   * @size 正方形宽度或高度
   * @startPoint 正方形开始点X/Y坐标
   * @secondPoint 正方形第二个点X/Y坐标
   * @thirdPoint 正方形第三个点X/Y坐标
   * @fourthPoint 正方形第四个点X/Y坐标
   * @angle 二维码朝向
   * @height 二维码高度
   * @markData 原始数据
   */
  private renderMark(
    id: string,
    x: number,
    y: number,
    size: number,
    startPoint: any,
    secondPoint: any,
    thirdPoint: any,
    fourthPoint: any,
    angle: number,
    height: number,
    markData: any
  ) {
    const _data = {
      id,
      x,
      y,
      size,
      startPoint,
      secondPoint,
      thirdPoint,
      fourthPoint,
      angle,
      height,
      ...markData,
    };
    const MarkEle = this.paper
      .path(
        Raphael.format(
          "M{0},{1} L{2},{3} L{4},{5} L{6},{7} Z M{8},{9} L{10},{11}",
          startPoint.x,
          startPoint.y,
          secondPoint.x,
          secondPoint.y,
          thirdPoint.x,
          thirdPoint.y,
          fourthPoint.x,
          fourthPoint.y,
          startPoint.x,
          y,
          x + size,
          y
        )
      )
      .attr({
        "stroke-width": 1,
        stroke: this.elementConfig.Mark.color.default,
        fill: this.elementConfig.Mark.color.fill,
      })
      .transform("r" + -angle + "," + x + "," + y)
      .data(_data);

    this.elementRendered.Mark.set.push(MarkEle);
  }
  /*
   * 渲染 Mark end
   */

  /*
   * 渲染 AGVPath start
   */
  /**
   * 获取当前这段路径的绘制字串
   * @param pathData 路径数据参数
   * @returns
   */
  private getPathRenderStr = (pathData: any) => {
    const { id, x1, y1, x2, y2, r, f } = pathData;
    let pathStr: string = "";
    if (r == 0) {
      // 没有弧度，则为直线
      pathStr = Raphael.format("M{0},{1}L{2},{3}", x1, y1, x2, y2);
    } else {
      // 有弧度为弧线
      pathStr = Raphael.format(
        "M{0},{1} A{2},{3} {4} {5} {6} {7},{8}",
        x1,
        y1,
        Math.abs(r),
        Math.abs(r),
        this.raphaelAngle(x1, y1, x2, y2),
        0,
        r > 0 ? 0 : 1,
        x2,
        y2
      );
    }
    return pathStr;
  };
  /**
  * 根据行车线路数据渲染行车路线
  * @AGVPath:[
      {"@ObjectId":"1","@Groups":"","@BackParkId":"","@Forward":"false","@LateralMove":"False","@LateralAngle":"0",
        "PathItems":[
          {"@X":"20.271","@Y":"6.344","@R":"0","@TX":"1013.55","@TY":"-317.20","@TR":"0.00"},
          {"@X":"21.771","@Y":"7.844","@R":"1.5","@TX":"1088.55","@TY":"-392.20","@TR":"75.00"}
        ]
      },...
    ]
  * */
  private AGVPathRenderBatch = (AGVPathJSONArr: any[]) => {
    // 每次重新渲染路径之后，要清空路径节点数据，重新组装
    const pathStrSet: Set<string> = new Set();
    const pointMap: Map<string, any> = new Map();
    const w = this.elementConfig.AGVPathPoint.size.r;
    const h = this.elementConfig.AGVPathPoint.size.r;
    AGVPathJSONArr.forEach((path) => {
      const startPoint = path.PathItems[0], // 当前线路开始点
        endPoint = path.PathItems[1]; // 当前线路结束点
      const id = path["@ObjectId"], // 当前线路唯一ID
        x1 = this.getMapCoordiateX(Number(startPoint["@X"])), // 开始点X坐标
        y1 = this.getMapCoordiateY(Number(startPoint["@Y"])), // 开始点Y坐标
        x2 = this.getMapCoordiateX(Number(endPoint["@X"])), // 结束点X坐标
        y2 = this.getMapCoordiateY(Number(endPoint["@Y"])), // 结束点Y坐标
        information = path["@Information"], // information
        r = Number(endPoint["@R"]) * this._unitZoom, // 当前线路半径
        f = path["@Forward"] == "true"; // 线路朝向是正向还是反向

      // 存储全量路径数据
      const _pathData = {
        id,
        x1,
        y1,
        x2,
        y2,
        information,
        r,
        f,
        selected: false,
        ...path,
      };
      this.elementRendered.AGVPath.map.set(String(id), _pathData);
      // 根据information字段分类存储
      let info = "default";
      if (information) {
        info = information;
      }
      // 非默认值，才需要添加
      if (
        !this.elementRendered.AGVPath.objObj.information.hasOwnProperty(info)
      ) {
        // 首个值
        this.elementRendered.AGVPath.objObj.information[info] = new Map();
      }
      this.elementRendered.AGVPath.objObj.information[info].set(
        String(id),
        _pathData
      );
      // 保存当前information信息关联的库位ID
      const parkId = _pathData["@BackParkId"];
      if (parkId) {
        if (
          !this.elementRendered.Park.objObj.information.hasOwnProperty(info)
        ) {
          // 首个值
          this.elementRendered.Park.objObj.information[info] = new Map();
        }
        this.elementRendered.Park.objObj.information[info].set(
          String(parkId),
          String(id)
        );
      }
      // 存储实际绘制出的路径PATH元素的绘制字串
      pathStrSet.add(this.getPathRenderStr(_pathData));
      // 存储去重后的路径点数据
      const startPointData = {
        x: x1,
        y: y1,
        sx: x1 - w / 2,
        sy: y1 - h / 2,
        w,
        h,
        f,
        selected: false,
        ...path,
        ...path.PathItems[0],
      };
      pointMap.set(`${x1},${y1}`, startPointData);
      const endPointData = {
        x: x2,
        y: y2,
        sx: x2 - w / 2,
        sy: y2 - h / 2,
        w,
        h,
        f,
        selected: false,
        ...path,
        ...path.PathItems[1],
      };
      pointMap.set(`${x2},${y2}`, endPointData);
    });
    // 保存去重后行驶路径上的可选点坐标
    this.mapClassifyData.AGVPathPoint = pointMap;
    // 渲染全量路径数据
    this.renderAGVPathInOneLine(Array.from(pathStrSet));
  };
  /**
   * 根据行驶路径的所有path字串，绘制出一根path元素
   * @param pathStrArr
   * @returns
   */
  private renderAGVPathInOneLine = (pathStrArr: string[]) => {
    if (!pathStrArr.length) return;
    const pathStr: string = pathStrArr.join(" ");
    const pathEle = this.paper.path(pathStr).attr({
      "stroke-width": 1,
      stroke: this.elementConfig.AGVPath.color.default,
    });
    this.elementRendered.AGVPath.set.push(pathEle);
  };
  /**
   *
   * @param type 需要渲染的路径类型：
   *              move    行驶路径(带方向)
   *              control 控制路径
   *              assist  辅助路径
   * @param pathNos 路径编号/AGV行驶字串
   */
  private renderAGVPathByTypeBatch(type: string, pathParam: string[] | string) {
    // 传入了不支持的类型不作为
    if (!this.elementConfig.AGVPath.typeList.includes(type)) return;

    let currentPaths: string[] = [];
    let currentMap = new Map();
    let AGVPathAttrF = {};
    let AGVPathAttrB = {};
    switch (type) {
      case "move": // 移动路径
        currentPaths = Array.from(
          this.elementRendered.AGVPath.mapObj.selected.keys()
        );
        currentMap = this.elementRendered.AGVPath.mapObj.selected;
        AGVPathAttrF = {
          stroke: this.elementConfig.AGVPath.color.forward,
          "stroke-width": this.elementConfig.AGVPath.width.forward,
          "stroke-opacity": this.elementConfig.AGVPath.opacity.forward,
          "stroke-dasharray": this.elementConfig.AGVPath.dasharray.forward,
          "arrow-end": this.elementConfig.AGVPath.arrow.forward,
          opacity: this.elementConfig.AGVPath.opacity.forward,
        };
        AGVPathAttrB = {
          stroke: this.elementConfig.AGVPath.color.back,
          "stroke-width": this.elementConfig.AGVPath.width.back,
          "stroke-opacity": this.elementConfig.AGVPath.opacity.back,
          "stroke-dasharray": this.elementConfig.AGVPath.dasharray.back,
          "arrow-end": this.elementConfig.AGVPath.arrow.back,
          opacity: this.elementConfig.AGVPath.opacity.back,
        };
        break;
      case "control": // 控制路径
        currentPaths = Array.from(
          this.elementRendered.AGVPath.mapObj.control.keys()
        );
        currentMap = this.elementRendered.AGVPath.mapObj.control;
        AGVPathAttrF = {
          stroke: this.elementConfig.AGVPath.color.forward,
          "stroke-width": this.elementConfig.AGVPath.width.control,
          "stroke-opacity": this.elementConfig.AGVPath.opacity.control,
          "stroke-dasharray": this.elementConfig.AGVPath.dasharray.control,
          "arrow-end": this.elementConfig.AGVPath.arrow.control,
          opacity: this.elementConfig.AGVPath.opacity.control,
        };
        AGVPathAttrB = {
          stroke: this.elementConfig.AGVPath.color.back,
          "stroke-width": this.elementConfig.AGVPath.width.control,
          "stroke-opacity": this.elementConfig.AGVPath.opacity.control,
          "stroke-dasharray": this.elementConfig.AGVPath.dasharray.control,
          "arrow-end": this.elementConfig.AGVPath.arrow.control,
          opacity: this.elementConfig.AGVPath.opacity.control,
        };
        break;
      case "assist": // 辅助路径
        currentPaths = Array.from(
          this.elementRendered.AGVPath.mapObj.assist.keys()
        );
        currentMap = this.elementRendered.AGVPath.mapObj.assist;
        AGVPathAttrF = {
          stroke: this.elementConfig.AGVPath.color.forward,
          "stroke-width": this.elementConfig.AGVPath.width.assist,
          "stroke-opacity": this.elementConfig.AGVPath.opacity.assist,
          "arrow-end": this.elementConfig.AGVPath.arrow.assist,
          opacity: this.elementConfig.AGVPath.opacity.assist,
        };
        AGVPathAttrB = {
          stroke: this.elementConfig.AGVPath.color.back,
          "stroke-width": this.elementConfig.AGVPath.width.assist,
          "stroke-opacity": this.elementConfig.AGVPath.opacity.assist,
          "arrow-end": this.elementConfig.AGVPath.arrow.assist,
          opacity: this.elementConfig.AGVPath.opacity.assist,
        };
        break;
    }

    // 处理路径数据
    let pathIds: string[] = [];
    let pathDataMap = new Map();
    let mode = "";
    if (Array.isArray(pathParam)) {
      mode = "array";
      // 路径ID模式
      pathIds = pathParam.map((pathId: any) => String(pathId));
      pathDataMap = this.elementRendered.AGVPath.map;
    } else if (typeof pathParam === "string") {
      mode = "string";
      // agvPath模式
      const pathDataArr = this.formatAgvPath(pathParam);
      pathIds = pathDataArr.map((item) => item.id);
      pathDataMap = new Map(pathDataArr.map((item) => [item.id, item]));
    }

    // 创建路径元素
    const createPathEle = (no: string) => {
      if (pathDataMap.has(no)) {
        const pathData = pathDataMap.get(no);
        try {
          const { id, x1, y1, x2, y2, r, f } = pathData;
          const AGVPathAttr = f ? AGVPathAttrF : AGVPathAttrB;
          let AGVPathEle = null;
          if (r == 0) {
            // 没有弧度，则为直线
            AGVPathEle = this.paper
              .path(Raphael.format("M{0},{1}L{2},{3}", x1, y1, x2, y2))
              .attr(AGVPathAttr)
              .data(pathData);
          } else {
            // 有弧度为弧线
            AGVPathEle = this.paper
              .path(
                Raphael.format(
                  "M{0},{1} A{2},{3} {4} {5} {6} {7},{8}",
                  x1,
                  y1,
                  Math.abs(r),
                  Math.abs(r),
                  this.raphaelAngle(x1, y1, x2, y2),
                  0,
                  r > 0 ? 0 : 1,
                  x2,
                  y2
                )
              )
              .attr(AGVPathAttr)
              .data(pathData);
          }
          if (currentMap.has(no)) {
            currentMap.get(no).remove();
            currentMap.delete(no);
          }
          currentMap.set(no, AGVPathEle);
        } catch (e) {
          console.log("error", e, pathData);
        }
      }
    };
    // 判断路劲数据类型是否变更
    if (this.elementConfig.AGVPath.mode.control !== mode) {
      // 路径数据类型变更了，直接清空上次渲染，强制渲染新内容
      currentMap.forEach((ele: any) => {
        ele?.remove();
      });
      currentMap?.clear();
      // 重新渲染
      pathIds.forEach((no: string) => {
        createPathEle(no);
      });
    } else {
      // 存量交集计算

      // 计算需要删除的路径数据
      const needDeletePaths = currentPaths.filter(
        (no: string) => !pathIds.includes(no)
      );
      // 计算需要增加的路径数据
      const needRenderPaths = pathIds.filter(
        (no: string) => !currentPaths.includes(no)
      );
      // 处理需要删除的数据
      needDeletePaths.forEach((no: string) => {
        if (currentMap.has(no)) {
          currentMap.get(no).remove();
          currentMap.delete(no);
        }
      });
      // 处理需要增加的路径数据
      needRenderPaths.forEach((no: string) => {
        createPathEle(no);
      });
    }
    this.elementConfig.AGVPath.mode.control = mode;
  }
  /**
   *
   * @param pathData 全量行驶路径数据
   * @param type 需要渲染的路径类型：
   *              move    行驶路径(带方向)
   *              control 控制路径
   *              assist  辅助路径
   */
  private renderAGVPathByType(type: string, pathData: any) {
    // 传入了不支持的类型不作为
    if (!this.elementConfig.AGVPath.typeList.includes(type)) return;
    // 参数
    const { id, x1, y1, x2, y2, r, f } = pathData;
    let AGVPathAttr: any = {
      stroke: this.elementConfig.AGVPath.color.default,
      "stroke-width": this.elementConfig.AGVPath.width.default,
      "stroke-opacity": this.elementConfig.AGVPath.opacity.default,
      opacity: this.elementConfig.AGVPath.opacity.default,
    };
    switch (type) {
      case "move": // 移动路径
        if (f) {
          AGVPathAttr = {
            stroke: this.elementConfig.AGVPath.color.forward,
            "stroke-width": this.elementConfig.AGVPath.width.forward,
            "stroke-opacity": this.elementConfig.AGVPath.opacity.forward,
            "arrow-end": this.elementConfig.AGVPath.arrow.forward,
            opacity: this.elementConfig.AGVPath.opacity.forward,
          };
        } else {
          AGVPathAttr = {
            stroke: this.elementConfig.AGVPath.color.back,
            "stroke-width": this.elementConfig.AGVPath.width.back,
            "stroke-opacity": this.elementConfig.AGVPath.opacity.back,
            "arrow-end": this.elementConfig.AGVPath.arrow.back,
            opacity: this.elementConfig.AGVPath.opacity.back,
          };
        }
        break;
      case "control": // 控制路径
        AGVPathAttr = {
          stroke: this.elementConfig.AGVPath.color.control,
          "stroke-width": this.elementConfig.AGVPath.width.control,
          "stroke-opacity": this.elementConfig.AGVPath.opacity.control,
        };
        break;
      case "assist": // 辅助路径
        if (f) {
          AGVPathAttr = {
            stroke: this.elementConfig.AGVPath.color.forward,
            "stroke-width": this.elementConfig.AGVPath.width.assist,
            "stroke-opacity": this.elementConfig.AGVPath.opacity.assist,
            "arrow-end": this.elementConfig.AGVPath.arrow.assist,
            opacity: this.elementConfig.AGVPath.opacity.assist,
          };
        } else {
          AGVPathAttr = {
            stroke: this.elementConfig.AGVPath.color.back,
            "stroke-width": this.elementConfig.AGVPath.width.assist,
            "stroke-opacity": this.elementConfig.AGVPath.opacity.assist,
            "arrow-end": this.elementConfig.AGVPath.arrow.assist,
            opacity: this.elementConfig.AGVPath.opacity.assist,
          };
        }
        break;
    }

    let AGVPathEle = null;
    if (r == 0) {
      // 没有弧度，则为直线
      AGVPathEle = this.paper
        .path(Raphael.format("M{0},{1}L{2},{3}", x1, y1, x2, y2))
        .attr(AGVPathAttr)
        .data(pathData);
    } else {
      // 有弧度为弧线
      AGVPathEle = this.paper
        .path(
          Raphael.format(
            "M{0},{1} A{2},{3} {4} {5} {6} {7},{8}",
            x1,
            y1,
            Math.abs(r),
            Math.abs(r),
            this.raphaelAngle(x1, y1, x2, y2),
            0,
            r > 0 ? 0 : 1,
            x2,
            y2
          )
        )
        .attr(AGVPathAttr)
        .data(pathData);
    }
    switch (type) {
      case "move": // 移动路径
        if (this.elementRendered.AGVPath.mapObj.selected.has(id)) {
          this.elementRendered.AGVPath.mapObj.selected.get(id).remove();
        }
        this.elementRendered.AGVPath.mapObj.selected.set(id, AGVPathEle);
        break;
      case "control": // 控制路径
        if (this.elementRendered.AGVPath.mapObj.control.has(id)) {
          this.elementRendered.AGVPath.mapObj.control.get(id).remove();
        }
        this.elementRendered.AGVPath.mapObj.control.set(id, AGVPathEle);
        break;
      case "assist": // 辅助路径
        if (this.elementRendered.AGVPath.mapObj.assist.has(id)) {
          this.elementRendered.AGVPath.mapObj.assist.get(id).remove();
        }
        this.elementRendered.AGVPath.mapObj.assist.set(id, AGVPathEle);
        break;
    }
  }
  /**
   * 删除渲染的标识性路径
   * @param type 需要渲染的路径类型：
   *              move    行驶路径(带方向)
   *              control 控制路径
   *              assist  辅助路径
   * @param pathNos  路径编号
   */
  private removeAGVPathByType(type: string, pathNos: string[] = []) {
    // 传入了不支持的类型不作为
    if (!this.elementConfig.AGVPath.typeList.includes(type)) return;
    let AGVPathMap = new Map();
    switch (type) {
      case "move": // 移动路径
        AGVPathMap = this.elementRendered.AGVPath.mapObj.selected;
        break;
      case "control": // 控制路径
        AGVPathMap = this.elementRendered.AGVPath.mapObj.control;
        break;
      case "assist": // 辅助路径
        AGVPathMap = this.elementRendered.AGVPath.mapObj.assist;
        break;
    }
    // 传入了路径编号则只删除指定的渲染标识元素
    // 否则全部删除
    if (pathNos.length) {
      pathNos.forEach((pathNo: string) => {
        if (AGVPathMap.has(pathNo)) {
          AGVPathMap.get(pathNo).remove();
          AGVPathMap.delete(pathNo);
        }
      });
    } else {
      AGVPathMap.forEach((ele: any) => {
        ele.remove();
      });
      AGVPathMap.clear();
    }
  }
  /*
   * 渲染 AGVPath end
   */

  /*
   * 渲染 AGVPathPoint start
   */
  /* *
   *根据存储的节点数据渲染行车路径开始结束节点
   * @AGVPathPointJSONArr:[{id,x1,y1,x2,y2},...]
   * @id 当前线路唯一ID
   * @x1 开始点X坐标
   * @y1 开始点Y坐标
   * @x2 结束点X坐标
   * @y2 结束点Y坐标
   */
  private AGVPathPointRenderBatch = (AGVPathPointJSONArr: string[]) => {
    // 设置属性值
    const _attr = {
      "stroke-width": this.elementConfig.AGVPathPoint.width.default,
      stroke: this.elementConfig.AGVPathPoint.color.default,
      fill: this.elementConfig.AGVPathPoint.color.fill, //'transparent'
      "stroke-opacity": this.elementConfig.AGVPathPoint.opacity.default,
      "fill-opacity": this.elementConfig.AGVPathPoint.opacity.fill,
    };
    // 创建点元素
    AGVPathPointJSONArr.forEach((pointData: any) => {
      const AGVPathPointStartEle = this.paper.rect(
        pointData.sx,
        pointData.sy,
        pointData.w,
        pointData.h
      );
      AGVPathPointStartEle?.attr(_attr);
      AGVPathPointStartEle?.data(pointData);
      const coordinate = `${pointData.x},${pointData.y}`;
      this.elementRendered.AGVPathPoint.set.push(AGVPathPointStartEle);
      this.elementRendered.AGVPathPoint.map.set(
        coordinate,
        AGVPathPointStartEle
      );
    });
  };
  /**
   * 渲染，标识候选点位
   * @param point {x:'', y:''}
   */
  protected signCandidatePoint(point: IPoint) {
    this.clearCandidatePoint();
    if (point) {
      const x = this.getMapCoordiateX(point.x);
      const y = this.getMapCoordiateY(point.y);
      const magnificationSelectedPoint = this.paper?.rect(
        x - this.elementConfig.AGVPathPoint.size.r / 2,
        y - this.elementConfig.AGVPathPoint.size.r / 2,
        this.elementConfig.AGVPathPoint.size.r,
        this.elementConfig.AGVPathPoint.size.r
      );
      magnificationSelectedPoint?.attr({
        "stroke-width": this.elementConfig.AGVPathPoint.width.default,
        stroke: this.elementConfig.AGVPathPoint.color.candidate,
        fill: this.elementConfig.AGVPathPoint.color.candidate,
      });
      this.elementRendered.AGVPathPoint.setObj.candidate.push(
        magnificationSelectedPoint
      );
    }
  }
  protected clearCandidatePoint() {
    this.elementRendered.AGVPathPoint.setObj.candidate.remove();
    this.elementRendered.AGVPathPoint.setObj.candidate.clear();
  }
  /*
   * 渲染 AGVPathPoint end
   */

  /*
   * 渲染 Park start
   */
  /*
  * 根据库位数据渲染库位
  *@Park:[
    {
      "@ObjectId":"11070","@Groups":"","@Angle":"1.5707963267949","@BackParkId":"","@Width":"1.2","@Length":"1","@Mode":"SingleDirection","@ParkType":"Normal","@TLength":"50.00","@TWidth":"60.00",
      "Position":{"@X":"24.621","@Y":"8.536","@TX":"1231.05","@TY":"-426.80"},
      "path":{"@ObjectId":"0","@Groups":"","@BackParkIds":"",
        "PathItems":[
          {"@X":"0","@Y":"0","@R":"0","@TX":"0.00","@TY":"-0.00","@TR":"0.00"},
          {"@X":"0","@Y":"0","@R":"0","@TX":"0.00","@TY":"-0.00","@TR":"0.00"}
        ]
      },
      "pathendpt":{"@X":"13.41","@Y":"13.669","@TX":"670.50","@TY":"-683.45"},
      "Name":"","StoreName":"","ShowParkText":"False","StorageLine":null,"ImageNames":null,
      "ClosedPathPoint":{"@X":"24.521","@Y":"8.641","@TX":"1226.05","@TY":"-432.05"}
    },
    ...
  ]
  * @ParkType:  普通库位 Normal/停车库位 AGVPark/充电库位 ChargingPark
  * @Mode:  单向库位 SingleDirection/双向库位 DualDirection/四向库位 FourDirection
  *
  * 默认库位朝向，如下图，然后再根据angle旋转
  * ————————
  * |
  * ————————
  * 当前这个朝向是angle=0
  */
  private ParkRenderBatch = (ParkJSONArr: any[]) => {
    ParkJSONArr.forEach((park: any) => {
      const mode = park["@Mode"], // SingleDirection/DualDirection/FourDirection
        type = park["@ParkType"], // Normal/AGVPark/ChargingPark
        angle = Number(park["@Angle"]),
        id = park["@ObjectId"],
        x = this.getMapCoordiateX(Number(park.Position["@X"])),
        y = this.getMapCoordiateY(Number(park.Position["@Y"])),
        w = Number(park["@Width"]) * this._unitZoom,
        l = Number(park["@Length"]) * this._unitZoom,
        r = this.piToRotate(angle), // -((180.0 / 3.14) * angle)
        truckId = Number(park["@TruckID"]);

      const _parkData = { id, x, y, w, l, angle, r, type, mode, park, truckId };

      // 存储/渲染库位ID数据
      this.mapClassifyData.ParkId.set(id, _parkData);
      // 渲染库位ID文案
      const renderParkTextEle = this.renderParkIdText(_parkData);

      // 先按照分类区分收集库位数据
      const _data = this.getParkRenderData(
        id,
        x,
        y,
        w,
        l,
        angle,
        r,
        type,
        mode,
        truckId,
        park
      );
      // renderAttr
      _data.selected = false;
      const renderParkEle = this.paper.path(_data.renderPath);
      renderParkEle?.attr(_data.renderAttr).data(_data);
      const eventParkEle = this.paper.path(_data.eventPath);
      eventParkEle?.attr(_data.eventAttr).data(_data);

      // 渲染库位渲染元素
      this.elementRendered.Park.mapObj.render.set(id, renderParkEle);
      // 渲染库位事件元素
      this.elementRendered.Park.mapObj.event.set(id, eventParkEle);

      // 预存储不同type的库位元素
      this.elementRendered.Park.set.push(renderParkTextEle);
      this.elementRendered.Park.set.push(renderParkEle);
      this.elementRendered.Park.set.push(eventParkEle);
      switch (type) {
        case "Normal":
          this.elementRendered.Park.setObj.Normal.push(renderParkTextEle);
          this.elementRendered.Park.setObj.Normal.push(renderParkEle);
          this.elementRendered.Park.setObj.Normal.push(eventParkEle);

          this.elementRendered.Park.mapObj.Normal.set(id, {
            renderEle: renderParkEle,
            renderTextEle: renderParkTextEle,
            enevtEle: eventParkEle,
          });
          break;
        case "AGVPark":
          this.elementRendered.Park.setObj.AGVPark.push(renderParkTextEle);
          this.elementRendered.Park.setObj.AGVPark.push(renderParkEle);
          this.elementRendered.Park.setObj.AGVPark.push(eventParkEle);

          this.elementRendered.Park.mapObj.AGVPark.set(id, {
            renderEle: renderParkEle,
            renderTextEle: renderParkTextEle,
            enevtEle: eventParkEle,
          });
          break;
        case "ChargingPark":
          this.elementRendered.Park.setObj.ChargingPark.push(renderParkTextEle);
          this.elementRendered.Park.setObj.ChargingPark.push(renderParkEle);
          this.elementRendered.Park.setObj.ChargingPark.push(eventParkEle);

          this.elementRendered.Park.mapObj.ChargingPark.set(id, {
            renderEle: renderParkEle,
            renderTextEle: renderParkTextEle,
            enevtEle: eventParkEle,
          });
          break;
      }
      // 预存储不同mode的库位元素
      switch (mode) {
        case "SingleDirection":
          this.elementRendered.Park.setObj.SingleDirection.push(
            renderParkTextEle
          );
          this.elementRendered.Park.setObj.SingleDirection.push(renderParkEle);
          this.elementRendered.Park.setObj.SingleDirection.push(eventParkEle);

          this.elementRendered.Park.mapObj.SingleDirection.set(id, {
            renderEle: renderParkEle,
            renderTextEle: renderParkTextEle,
            enevtEle: eventParkEle,
          });
          break;
        case "DualDirection":
          this.elementRendered.Park.setObj.DualDirection.push(
            renderParkTextEle
          );
          this.elementRendered.Park.setObj.DualDirection.push(renderParkEle);
          this.elementRendered.Park.setObj.DualDirection.push(eventParkEle);

          this.elementRendered.Park.mapObj.DualDirection.set(id, {
            renderEle: renderParkEle,
            renderTextEle: renderParkTextEle,
            enevtEle: eventParkEle,
          });
          break;
        case "FourDirection":
          this.elementRendered.Park.setObj.FourDirection.push(
            renderParkTextEle
          );
          this.elementRendered.Park.setObj.FourDirection.push(renderParkEle);
          this.elementRendered.Park.setObj.FourDirection.push(eventParkEle);

          this.elementRendered.Park.mapObj.FourDirection.set(id, {
            renderEle: renderParkEle,
            renderTextEle: renderParkTextEle,
            enevtEle: eventParkEle,
          });
          break;
      }
    });
  };

  /**
   * 生成旋转后的库位path字串等数据
   * @param id
   * @param x
   * @param y
   * @param w
   * @param l
   * @param angle
   * @param r
   * @param type
   * @param mod
   * @param parkData
   * @returns 返回所有入参，以及以下transform后的数据：
   *  { ......, renderPath, renderAttr, rangePoints, eventPath  }
   *  renderPath 库位渲染用的path字串
   *  renderAttr 库位渲染用的path属性
   *  rangePoints 渲染库位区域的范围四顶点坐标
   *  eventPath 绑定库位点击事件的元素
   */
  private getParkRenderData = (
    id: string,
    x: number,
    y: number,
    w: number,
    l: number,
    angle: number,
    r: number,
    type: string,
    mode: string,
    truckId: number,
    parkData: any
  ) => {
    // 初始化数据
    const _data = {
      id,
      x,
      y,
      w,
      l,
      angle,
      r,
      type,
      mode,
      truckId,
      ...parkData,
      parkData,
    };
    // 定义共用数据
    const halfL = l / 2;
    const halfW = w / 2;
    const parkInitRectPoints: any[] = [
      { x: x + halfL, y: y - halfW }, // 右上点
      { x: x - halfL, y: y - halfW }, // 左上点
      { x: x - halfL, y: y + halfW }, // 左下点
      { x: x + halfL, y: y + halfW }, // 右下点
    ];
    const iconCx = x - halfL;
    const iconCy = y;
    let _iconData: any = null;
    let _transformPathData: any = null;
    let _initPath: string = "";
    let _attr: any = {
      // 库位默认样式
      "stroke-width": this.elementConfig.Park.width.default,
      "stroke-dasharray": this.elementConfig.Park.dasharray.default,
      stroke: this.elementConfig.Park.color.default, // 普通库位默认颜色
      fill: this.elementConfig.Park.color.fill,
    };
    if (truckId) {
      _attr["stroke-dasharray"] = this.elementConfig.Park.dasharray.truck;
      _attr["stroke"] = this.elementConfig.Park.color.truck;
    }
    const _tagPosition = {
      x: parkInitRectPoints[1].x,
      y: parkInitRectPoints[1].y,
    };
    // 判断库位模式
    switch (mode) {
      case "SingleDirection": // 单向库位
        _iconData = this.getParkStyleByType(type, iconCx, iconCy);
        if (_iconData) {
          // 包含图标
          _initPath =
            Raphael.format(
              "M{0},{1} L{2},{3} M{4},{5} L{6},{7} M{8},{9} L{10},{11} M{12},{13} L{14},{15}",
              parkInitRectPoints[0].x,
              parkInitRectPoints[0].y,
              parkInitRectPoints[1].x,
              parkInitRectPoints[1].y,
              parkInitRectPoints[1].x,
              parkInitRectPoints[1].y,
              iconCx,
              iconCy - _iconData.iconRange.height / 2,
              iconCx,
              iconCy + _iconData.iconRange.height / 2,
              parkInitRectPoints[2].x,
              parkInitRectPoints[2].y,
              parkInitRectPoints[2].x,
              parkInitRectPoints[2].y,
              parkInitRectPoints[3].x,
              parkInitRectPoints[3].y
            ) +
            " " +
            _iconData.iconPath;
          _attr = _iconData.attr;
        } else {
          _initPath = Raphael.format(
            "M{0},{1} L{2},{3} M{4},{5} L{6},{7} M{8},{9} L{10},{11}",
            parkInitRectPoints[0].x,
            parkInitRectPoints[0].y,
            parkInitRectPoints[1].x,
            parkInitRectPoints[1].y,
            parkInitRectPoints[1].x,
            parkInitRectPoints[1].y,
            parkInitRectPoints[2].x,
            parkInitRectPoints[2].y,
            parkInitRectPoints[2].x,
            parkInitRectPoints[2].y,
            parkInitRectPoints[3].x,
            parkInitRectPoints[3].y
          );
        }
        _transformPathData = this.getRotatedRectanglePathData(
          _initPath,
          x,
          y,
          angle,
          l,
          w
        );
        break;
      case "DualDirection": // 双向库位
        _iconData = this.getParkStyleByType(type, iconCx, iconCy);
        if (_iconData) {
          // 包含库位图标
          _initPath =
            Raphael.format(
              "M{0},{1} L{2},{3} M{4},{5} L{6},{7}",
              parkInitRectPoints[0].x,
              parkInitRectPoints[0].y,
              parkInitRectPoints[1].x,
              parkInitRectPoints[1].y,
              parkInitRectPoints[2].x,
              parkInitRectPoints[2].y,
              parkInitRectPoints[3].x,
              parkInitRectPoints[3].y
            ) +
            " " +
            _iconData.iconPath;
          _attr = _iconData.attr;
        } else {
          _initPath = Raphael.format(
            "M{0},{1} L{2},{3} M{4},{5} L{6},{7}",
            parkInitRectPoints[0].x,
            parkInitRectPoints[0].y,
            parkInitRectPoints[1].x,
            parkInitRectPoints[1].y,
            parkInitRectPoints[2].x,
            parkInitRectPoints[2].y,
            parkInitRectPoints[3].x,
            parkInitRectPoints[3].y
          );
        }
        _transformPathData = this.getRotatedRectanglePathData(
          _initPath,
          x,
          y,
          angle,
          l,
          w
        );
        break;
      case "FourDirection": // 四向库位
        const offsetX = l * 0.1;
        const offsetY = w * 0.1;
        const expandRectPoints: any[] = [
          { x: x + halfL + offsetX, y: y - halfW - offsetY }, // 右上点
          { x: x - halfL - offsetX, y: y - halfW - offsetY }, // 左上点
          { x: x - halfL - offsetX, y: y + halfW + offsetY }, // 左下点
          { x: x + halfL + offsetX, y: y + halfW + offsetY }, // 右下点
        ];
        _iconData = this.getParkStyleByType(type, iconCx, iconCy);
        if (_iconData) {
          // 包含图标
          _initPath =
            Raphael.format(
              "M{0},{1} L{2},{3} M{4},{5} L{6},{7} M{8},{9} L{10},{11} M{12},{13} L{14},{15} M{16},{17} L{18},{19}",
              expandRectPoints[0].x,
              parkInitRectPoints[0].y,
              expandRectPoints[1].x,
              parkInitRectPoints[1].y,
              parkInitRectPoints[1].x,
              expandRectPoints[1].y,
              iconCx,
              iconCy - _iconData.iconRange.height / 2,
              iconCx,
              iconCy + _iconData.iconRange.height / 2,
              parkInitRectPoints[2].x,
              expandRectPoints[2].y,
              expandRectPoints[2].x,
              parkInitRectPoints[2].y,
              expandRectPoints[3].x,
              parkInitRectPoints[3].y,
              parkInitRectPoints[3].x,
              expandRectPoints[3].y,
              parkInitRectPoints[0].x,
              expandRectPoints[0].y
            ) +
            " " +
            _iconData.iconPath;
          _attr = _iconData.attr;
        } else {
          _initPath = Raphael.format(
            "M{0},{1} L{2},{3} M{4},{5} L{6},{7} M{8},{9} L{10},{11} M{12},{13} L{14},{15}",
            expandRectPoints[0].x,
            parkInitRectPoints[0].y,
            expandRectPoints[1].x,
            parkInitRectPoints[1].y,
            parkInitRectPoints[1].x,
            expandRectPoints[1].y,
            parkInitRectPoints[2].x,
            expandRectPoints[2].y,
            expandRectPoints[2].x,
            parkInitRectPoints[2].y,
            expandRectPoints[3].x,
            parkInitRectPoints[3].y,
            parkInitRectPoints[3].x,
            expandRectPoints[3].y,
            parkInitRectPoints[0].x,
            expandRectPoints[0].y
          );
        }
        _attr["stroke-dasharray"] =
          this.elementConfig.Park.dasharray.FourDirection;
        _transformPathData = this.getRotatedRectanglePathData(
          _initPath,
          x,
          y,
          angle,
          l * 1.2,
          w * 1.2
        );
        break;
      default:
        break;
    }
    _data.renderPath = _transformPathData?.path;
    _data.renderAttr = _attr;
    _data.eventAttr = {
      "stroke-width": 1,
      "stroke-dasharray": "none",
      stroke: "transparent",
      fill: "transparent",
    };
    _data.rangePoints = _transformPathData?.points;
    _data.eventPath = Raphael.format(
      "M{0},{1} L{2},{3} L{4},{5} L{6},{7} Z",
      _transformPathData?.points[0].x,
      _transformPathData?.points[0].y,
      _transformPathData?.points[1].x,
      _transformPathData?.points[1].y,
      _transformPathData?.points[2].x,
      _transformPathData?.points[2].y,
      _transformPathData?.points[3].x,
      _transformPathData?.points[3].y
    );
    _data.tagPosition = _tagPosition;
    return _data;
  };

  /**
   * 以坐标(cx, cy)为中心点旋转path
   * @param path 原始path字串
   * @param cx 中心点x
   * @param cy 中心点y
   * @param angleDegrees 旋转角度
   * @param width 原始path的宽
   * @param height 原始path的高
   * @returns {path, points}
   * path 旋转后的path
   * points 旋转后的四个顶点
   */
  private getRotatedRectanglePathData = (
    svgPath: string,
    cx: number,
    cy: number,
    angleDegrees: number,
    width: number,
    height: number
  ) => {
    if (!svgPath) return;
    // 处理三角函数相关参数
    const angleRadians = -angleDegrees;
    const cosA = Math.cos(angleRadians);
    const sinA = Math.sin(angleRadians);

    // 生成正则匹配数据（数组形式）
    const pathCommands: string[] =
      svgPath.match(
        /[a-df-zA-DF-Z]+|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?,[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?|[\s]+/g
      ) || [];
    const translatedPathCommands: string[] = pathCommands.map(
      (commond: any) => {
        if (commond && commond.includes(",")) {
          // 坐标数据
          const coordiateArr = commond.split(",");
          const x = parseFloat(coordiateArr[0]);
          const y = parseFloat(coordiateArr[1]);
          if (!isNaN(x) && !isNaN(y)) {
            // 计算旋转后的坐标
            const xDiffRotated = x - cx;
            const yDiffRotated = y - cy;
            const xNew = cx + xDiffRotated * cosA - yDiffRotated * sinA;
            const yNew = cy + xDiffRotated * sinA + yDiffRotated * cosA;
            commond = xNew + "," + yNew;
          }
        }
        return commond;
      }
    );
    // 把匹配旋转后的坐标数据数组拼接为string
    const translatedSVGPath = translatedPathCommands.join("");

    // 计算旋转后的四个顶点
    const xDiff = width / 2;
    const yDiff = height / 2;
    // 旋转前的四个点坐标
    const unrotatedPoints: any[] = [
      { x: cx + xDiff, y: cy - yDiff }, // 右上点
      { x: cx - xDiff, y: cy - yDiff }, // 左上点
      { x: cx - xDiff, y: cy + yDiff }, // 左下点
      { x: cx + xDiff, y: cy + yDiff }, // 右下点
    ];
    // 旋转后的四个点坐标
    const rotatedPoints: any[] = unrotatedPoints.map((point) => {
      const xDiffRotated = point.x - cx;
      const yDiffRotated = point.y - cy;
      const xNew = cx + xDiffRotated * cosA - yDiffRotated * sinA;
      const yNew = cy + xDiffRotated * sinA + yDiffRotated * cosA;
      return { x: xNew, y: yNew };
    });

    return {
      path: translatedSVGPath,
      points: rotatedPoints,
    };
  };
  /**
   * 重置库位样式
   * @param parkEle 库位元素
   */
  protected signParkDefault(parkId: string) {
    if (parkId && this.elementRendered.Park.mapObj.selected.has(parkId)) {
      this.elementRendered.Park.mapObj.selected.get(parkId)?.remove();
      this.elementRendered.Park.mapObj.selected.delete(parkId);
    }
  }
  /**
   * 设置库位选中样式
   * @param parkEle
   */
  protected signParkSelect(parkId: string) {
    // 如果已经被选中了则不作为
    if (!parkId || this.elementRendered.Park.mapObj.selected.has(parkId))
      return;
    if (this.elementRendered.Park.mapObj.render.has(parkId)) {
      const _data = this.elementRendered.Park.mapObj.render.get(parkId)?.data();
      if (!_data) return;
      const selectedPark = this.paper.path(_data?.renderPath);
      selectedPark
        .attr({
          // 库位选中样式
          "stroke-width": this.elementConfig.Park.width.selected,
          "stroke-dasharray": this.elementConfig.Park.dasharray.default,
          stroke: this.elementConfig.Park.color.selected,
          fill: this.elementConfig.Park.color.fill,
        })
        .data(_data);
      this.elementRendered.Park.mapObj.selected.set(parkId, selectedPark);
    }
  }
  /**
   * 根据库位类型，返回这个类型的库位需要携带渲染的图标以及库位颜色
   * @param type 库位类型
   * @param cx 携带图标的中心点X
   * @param cy 携带图标的中心点Y
   * @returns undefined|object{path: string, left: number, top: number, right: nubmer, bottom: number, cx: number, cy: number, stroke: string}
   */
  private getParkStyleByType(type: string, cx: number, cy: number) {
    let _iconObj: any = null;
    // 判断库位类型
    switch (type) {
      case "Normal":
        break;
      case "AGVPark":
        _iconObj = this.translateSVGPathToCenter(
          this.elementConfig.Park.path.parking,
          cx,
          cy,
          "all"
        );
        _iconObj.attr = {
          "stroke-width": this.elementConfig.Park.width.default,
          "stroke-dasharray": this.elementConfig.Park.dasharray.default,
          stroke: this.elementConfig.Park.color.parking, // 停车库位默认颜色
          fill: this.elementConfig.Park.color.fill,
        };
        break;
      case "ChargingPark":
        _iconObj = this.translateSVGPathToCenter(
          this.elementConfig.Park.path.battery,
          cx,
          cy,
          "all"
        );
        _iconObj.attr = {
          "stroke-width": this.elementConfig.Park.width.default,
          "stroke-dasharray": this.elementConfig.Park.dasharray.default,
          stroke: this.elementConfig.Park.color.charging, // 充电库位默认颜色
          fill: this.elementConfig.Park.color.fill,
        };
        break;
    }
    return _iconObj;
  }

  /**
   * 传入path字串及需要移动到的目标坐标中心点
   * 返回移动后的新坐标位置字串
   * @param svgPath string path字串
   * @param centerX number X坐标
   * @param centerY number Y坐标
   * @param type string 数据返回类型： path类型直接返回path字串，all类型返回包含所有数据的对象{path: string, left: number, top: number, right: nubmer, bottom: number}
   * @returns string path字串 或者 object {path: string, left: number, top: number, right: nubmer, bottom: number}
   */
  private translateSVGPathToCenter(
    svgPath: string,
    centerX: number,
    centerY: number,
    type: string = "path"
  ) {
    /* const pathCommands: string[] =
      svgPath.match(/[a-df-zA-DF-Z]+|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?|[\s,]+/g) || [] */
    const pathCommands: string[] =
      svgPath.match(
        /[a-df-zA-DF-Z]+|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?,[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?|[\s]+/g
      ) || [];
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    // 获取上下左右极值
    for (const command of pathCommands) {
      if (command && command.includes(",")) {
        // 坐标数据
        const coordiateArr = command.split(",");
        const x = parseFloat(coordiateArr[0]);
        const y = parseFloat(coordiateArr[1]);
        if (!isNaN(x) && !isNaN(y)) {
          minX = Math.min(minX, x);
          maxX = Math.max(maxX, x);
          minY = Math.min(minY, y);
          maxY = Math.max(maxY, y);
        }
      }
    }
    // 根据极值，算出当前icon的中心点
    const originalCenterX = (minX + maxX) / 2;
    const originalCenterY = (minY + maxY) / 2;
    // 算出初始中心点和目标重点的偏移值
    const translateX = centerX - originalCenterX;
    const translateY = centerY - originalCenterY;

    // 使用偏移值计算所有绘制坐标偏移后的坐标
    const translatedPathCommands: string[] = pathCommands.map(
      (command: any, index) => {
        if (command && command.includes(",")) {
          // 坐标数据
          const coordiateArr = command.split(",");
          let x = parseFloat(coordiateArr[0]);
          let y = parseFloat(coordiateArr[1]);
          if (!isNaN(x) && !isNaN(y)) {
            x = x + translateX;
            y = y + translateY;
            command = x + "," + y;
          }
        }
        return command;
      }
    );

    // path字串数组转string
    const translatedSVGPath = translatedPathCommands.join("");

    // 判断是直接返回平移后的path字串
    // 还是返回全量描述数据
    if (type === "path") {
      return translatedSVGPath;
    } else {
      return {
        iconPath: translatedSVGPath,
        iconRange: {
          left: minX,
          top: minY,
          right: maxX,
          bottom: maxY,
          width: maxX - minX,
          height: maxY - minY,
          cx: centerX,
          cy: centerY,
        },
      };
    }
  }
  /**
   * 渲染，标识候选库位
   * @param parkNumber string
   */
  private signCandidatePark(parkNumber: any) {
    if (parkNumber) {
      if (this.elementRendered.Park.mapObj.event.has(String(parkNumber))) {
        const ele = this.elementRendered.Park.mapObj.event.get(
          String(parkNumber)
        );
        const _data = ele.data();
        const bbox = ele.getBBox();
        /* let { id, x, y, w, l, r, mod } = _data
        let path = Raphael.format(
          'M{0},{1} L{2},{3} L{4},{5} L{6},{7}',
          x + 1 + l / 2,
          y + 1 - w / 2,
          x - l / 2,
          y - w / 2,
          x - l / 2,
          y + w / 2,
          x + l / 2,
          y + w / 2
        ) */
        const magnificationSelectedPark = this.paper?.rect(
          bbox.x + 2,
          bbox.y + 2,
          bbox.width - 4,
          bbox.height - 4
        );
        // .transform('r' + r)
        magnificationSelectedPark
          ?.attr({
            stroke: this.elementConfig.Park.color.candidate,
            fill: this.elementConfig.Park.color.candidate,
          })
          ?.data(_data)
          ?.toBack();
        this.elementRendered.Park.setObj.candidate.push(
          magnificationSelectedPark
        );
      }
    } else {
      this.clearCandidatePark();
    }
  }
  /**
   * 清除候选标识库位符号
   */
  private clearCandidatePark() {
    this.elementRendered.Park.setObj.candidate.remove();
  }

  /**
   * 单个渲染库位编号text元素
   * @param id 库位编号
   * @param x 库位中心点X
   * @param y 库位中心点Y
   * @param w 库位宽度
   * @param l 库位高度
   * @param r 库位角度
   * @param mod 库位模式：矩形FourDirection|U型SingleDirection
   * @param parkData 库位原始数据
   */
  private renderParkIdText = (_data: any) => {
    const { id, x, y, w, l, angle, r, type, mod } = _data;
    // ParkIdTextSet
    const parkIdText = this.paper.text(0, 0, id);
    parkIdText
      ?.attr({
        "text-anchor": "middle",
        stroke: this.elementConfig.ParkId.color.default,
        fill: this.elementConfig.ParkId.color.fill,
        "font-size": 20,
        // 'font-weight': 'none',
        // 'stroke-width': 1,
        // 'stroke-opacity': 0.5,
        // 'fill-opacity': 0.5
      })
      .data(_data);
    parkIdText?.node.setAttribute("transform", `translate(${x}, ${y})`);
    // 禁止文本被选中造成其他事件终端
    const idTextDom = parkIdText?.node;
    idTextDom?.style.setProperty("user-select", "none");
    idTextDom?.style.setProperty("-moz-user-select", "none");
    idTextDom?.style.setProperty("-webkit-user-select", "none");
    idTextDom?.style.setProperty("-ms-user-select", "none");
    idTextDom?.style.setProperty("-khtml-user-select", "none");
    this.elementRendered.ParkId.set.push(parkIdText);
    this.elementRendered.ParkId.map.set(String(id), parkIdText);
    return parkIdText;
  };
  /*
   * 渲染 Park end
   */

  /***********************************************************
   * 常驻渲染元素 end
   */

  /***********************************************************
   * 动态渲染元素 start
   */
  // 渲染库位标记
  private renderParksTag(parkTag: IParkTag[], forceRender: boolean = false) {
    let currentParkIds: string[] = Array.from(
      this.elementRendered.Park.mapObj.tag.keys()
    );
    const _bgKeySuffix = "_bg";
    const createNewTag = (item: IParkTag) => {
      const parkId = item.parkId;
      const tag = String(item.tag);
      if (this.elementRendered.Park.mapObj.render.has(parkId)) {
        // 有这个库位才需要处理
        /* if (this.elementRendered.Park.mapObj.tag.has(parkId)) {
            // 已存在，更新图标
            const _tagEle = this.elementRendered.Park.mapObj.tag.get(parkId)
            if (_tagEle.data('tag') !== tag) {
              // 标记类型不相等，更新文案
              _tagEle.attr({
                text: tag
              })
            }
          } else { */
        // 不存在该元素，需要新建
        const _data = this.elementRendered.Park.mapObj.render
          .get(parkId)
          .getBBox();
        // x,y,x2,y2,width,height,cx,cy
        const bgEle = this.paper.rect(0, 0, 20, 20, 10).attr({
          stroke: "#FFFFFF",
          // 'stroke-opacity': 0.8,
          fill: "#EB2829",
          // 'fill-opacity': 0.8
        });
        const textX = _data.cx + _data.width * 0.3;
        const textY = _data.y + 15;
        const textEle = this.paper.text(textX, textY, item.tag).attr({
          "font-size": 20,
          stroke: "#FFFFFF",
          "stroke-width": 0.5,
          fill: "#FFFFFF",
        });
        const textBBox = textEle.getBBox();
        bgEle.attr({
          x: textBBox.x - 8,
          y: textBBox.y - 4,
          width: textBBox.width + 16,
          height: textBBox.height + 8,
        });
        this.elementRendered.Park.mapObj.tag.set(parkId, textEle);
        this.elementRendered.Park.mapObj.tag.set(parkId + _bgKeySuffix, bgEle);
        // }
      }
    };
    if (forceRender) {
      // 强制重新渲染
      this.elementRendered.Park.mapObj.tag.forEach((ele: any) => {
        ele?.remove();
      });
      this.elementRendered.Park.mapObj.tag.clear();
      parkTag.forEach((item: IParkTag) => {
        createNewTag(item);
      });
    } else {
      // 对存量进行比对，只对差集进行渲染/删除
      let newParkIds: string[] = parkTag.map((item: IParkTag) =>
        String(item.parkId)
      );
      // 需要删除的
      const needDeleteIds: string[] = currentParkIds.filter(
        (id: string) => !newParkIds.includes(id)
      );
      // 执行删除
      needDeleteIds.forEach((parkId: string) => {
        if (this.elementRendered.Park.mapObj.tag.has(parkId)) {
          this.elementRendered.Park.mapObj.tag.get(parkId).remove();
          this.elementRendered.Park.mapObj.tag.delete(parkId);
          const bgParkId = parkId + _bgKeySuffix;
          this.elementRendered.Park.mapObj.tag.get(bgParkId).remove();
          this.elementRendered.Park.mapObj.tag.delete(bgParkId);
        }
      });

      // 对存留标签进行新增/更新
      parkTag.forEach((item: IParkTag) => {
        createNewTag(item);
      });
    }
  }

  // 渲染推断标记
  private renderParksInferTag(
    parkTag: IParkTag[],
    forceRender: boolean = false
  ) {
    let currentParkIds: string[] = Array.from(
      this.elementRendered.Park.mapObj.inferTag.keys()
    );
    const createNewTag = (item: IParkTag) => {
      const parkId = String(item.parkId);
      const tag = String(item.tag);
      let source = "";
      switch (tag) {
        case "1": // success
          source = PARK_TAGS["ok-tag"];
          break;
        case "2": // fail
          source = PARK_TAGS["warn-tag"];
          break;
      }
      if (this.elementRendered.Park.mapObj.inferTag.has(parkId)) {
        // 已存在判断类型是否正确
        const _tagEle = this.elementRendered.Park.mapObj.inferTag.get(parkId);
        if (_tagEle.data("tag") !== tag) {
          // 标记类型不相等，更新图片资源
          _tagEle.attr({
            src: source,
          });
        }
      } else {
        // 不存在该元素，需要新建
        if (this.elementRendered.Park.mapObj.render.has(parkId)) {
          const _data = this.elementRendered.Park.mapObj.render
            .get(parkId)
            .getBBox();
          const l = 0.3 * this._unitZoom;
          const w = 0.3 * this._unitZoom;
          const parkTag = this.paper.image(
            source,
            _data.x - l / 2,
            _data.y - w / 2,
            l,
            w
          );
          parkTag.data("tag", tag);
          this.elementRendered.Park.mapObj.inferTag.set(parkId, parkTag);
        }
      }
    };

    // 判断是否需要强制刷新
    if (forceRender) {
      // 强制重新渲染
      this.elementRendered.Park.mapObj.inferTag.forEach((ele: any) => {
        ele?.remove();
      });
      this.elementRendered.Park.mapObj.inferTag.clear();
      parkTag.forEach((item: IParkTag) => {
        createNewTag(item);
      });
    } else {
      // 对存量进行比对，只对差集进行渲染/删除
      let newParkIds: string[] = parkTag.map((item: IParkTag) =>
        String(item.parkId)
      );
      // 需要删除的
      const needDeleteIds: string[] = currentParkIds.filter(
        (id: string) => !newParkIds.includes(id)
      );
      // 执行删除
      needDeleteIds.forEach((parkId: string) => {
        if (this.elementRendered.Park.mapObj.inferTag.has(parkId)) {
          this.elementRendered.Park.mapObj.inferTag.get(parkId).remove();
          this.elementRendered.Park.mapObj.inferTag.delete(parkId);
        }
      });

      // 对存留标签进行新增/更新
      parkTag.forEach((item: IParkTag) => {
        createNewTag(item);
      });
    }
  }

  // 渲染库位中有货物
  private renderParksStock(parkIds: string[], forceRender: boolean = false) {
    if (forceRender) {
      // 强制全部重新渲染
      this.elementRendered.Park.mapObj.stock.forEach((ele: any) => {
        ele?.remove();
      });
      this.elementRendered.Park.mapObj.stock.clear();
      parkIds.forEach((id: string) => {
        this.signParkStock(id);
      });
    } else {
      // 只渲染/删除差集
      const hasFullParkIds = Array.from(
        this.elementRendered.Park.mapObj.stock.keys()
      );
      // 计算有货变无货的库位
      const emptyParkIds = hasFullParkIds.filter(
        (id: string) => !parkIds.includes(id)
      );
      // 计算无货变有货的库位
      const fullParkIds = parkIds.filter(
        (id: string) => !hasFullParkIds.includes(id)
      );
      // 标识有货变无货的库位
      emptyParkIds.forEach((id: string) => {
        this.signParkEmpty(id);
      });
      // 标识无货变有货的库位
      fullParkIds.forEach((id: string) => {
        this.signParkStock(id);
      });
    }
  }
  /**
   * 根据库位ID标记单个库位有货
   * @param parkId
   */
  protected signParkStock(parkId: string) {
    if (this.elementRendered.Park.mapObj.render.has(parkId)) {
      if (this.elementRendered.Park.mapObj.stock.has(parkId)) {
        // 如果已经存在，则删除重新生成
        this.elementRendered.Park.mapObj.stock.get(parkId).remove();
      }
      const _data = this.elementRendered.Park.mapObj.render.get(parkId).data();
      // id, x, y, w, l, angle, r, type, mode
      const space = 10;
      const x = _data.x - _data.l / 2;
      const y = _data.y - _data.w / 2 + space;
      const width = _data.l;
      const height = _data.w - 2 * space;
      const parkFullEle = this.paper.rect(x, y, width, height).attr({
        stroke: "#1DD4CD",
        // 'stroke-opacity': 0.8,
        fill: "#1DD4CD",
        // 'fill-opacity': 0.8
      });
      parkFullEle.transform("r" + _data.r);
      parkFullEle.toBack();
      this.elementRendered.Park.mapObj.stock.set(parkId, parkFullEle);
    }
  }
  /**
   * 根据库位ID标记单个库位无货
   * @param parkId
   */
  protected signParkEmpty(parkId: string) {
    if (this.elementRendered.Park.mapObj.stock.has(parkId)) {
      this.elementRendered.Park.mapObj.stock.get(parkId).remove();
      this.elementRendered.Park.mapObj.stock.delete(parkId);
    }
  }

  // 渲染订单选中区域
  private renderOrderAreas(areas: IOrderArea[]) {
    // 先清理存量数据
    this.elementRendered.area.setObj.order.remove();
    this.elementRendered.area.setObj.order.clear();
    // 再重新渲染区域数据
    areas.forEach((area: IOrderArea) => {
      const x = this.getMapCoordiateX(area.x);
      const y = this.getMapCoordiateY(area.y);
      const width = area.width * this._unitZoom;
      const height = area.height * this._unitZoom;
      const areaEle = this.paper.rect(x, y, width, height).attr({
        stroke: area.color,
        "stroke-width": 4,
        "stroke-dasharray": "- ",
        fill: area.bgColor,
        "fill-opacity": 0.1,
      });
      const textEle = this.paper.text(x + width / 2, y - 30, area.text).attr({
        "font-size": 30,
        stroke: area.color,
        fill: area.color,
      });
      areaEle.toBack();
      this.elementRendered.area.setObj.order.push(areaEle);
      this.elementRendered.area.setObj.order.push(textEle);
    });
  }

  // 渲染规则区域
  private renderRuleAreas(areas: IRuleArea[] = []) {
    let color = "#E5E5E5";
    let borderColor = "#E5E5E5";
    let bgColor = "#F5F5F5";
    let fontColor = "#8C8C8C";

    // 清空现有规则数据，重新渲染
    this.elementRendered.area.mapObj.rule.forEach((ele: any) => {
      ele?.remove();
    });
    this.elementRendered.area.mapObj.rule.clear();

    // 重新渲染
    areas.forEach((area: IRuleArea) => {
      // 判断是否有坐标数据
      const coordinatesStr = area?.coordinatesStr || "";
      let coordinatesArr: any[] = coordinatesStr.split(";");
      coordinatesArr = coordinatesArr
        .map((coordinate: string) => {
          const arr = coordinate.split(",");
          if (arr.length >= 2) {
            return {
              x: this.getMapCoordiateX(Number(arr[0])),
              y: this.getMapCoordiateY(Number(arr[1])),
            };
          }
          return null;
        })
        .filter((obj: any) => obj);
      if (Array.isArray(coordinatesArr) && coordinatesArr.length === 4) {
        // 定义预制数据
        let textSpaceSize = 10; // 留白区域大小
        let textFontWidth = 16; // 单个文案文字宽度
        let textFontHeight = 16; // 单个文案文字行高
        const noAndtitleSpace = 16; // 编号和标题之间的空白大小
        const titleAndNameSpace = 10; // 标题和名称之间的留白高度
        let singFontPerRow = false;
        // 处理颜色
        color = area?.color || color;
        borderColor = area?.borderColor || borderColor;
        bgColor = area?.bgColor || bgColor;
        fontColor = area?.fontColor || fontColor;
        // 处理区域宽高
        const width = coordinatesArr[0].x - coordinatesArr[2].x;
        const height = coordinatesArr[0].y - coordinatesArr[2].y;

        // 基本的坐标数据完整，可以渲染区域
        // 区域矩形元素，数量 1
        const areaEle = this.paper
          .rect(coordinatesArr[2].x, coordinatesArr[2].y, width, height)
          .attr({
            stroke: borderColor,
            fill: bgColor,
            "fill-opacity": 0.5,
          });

        // 标识换行规则，处理文案留白
        if (width >= 2 * textSpaceSize + noAndtitleSpace + 3 * textFontWidth) {
          // 区域宽度够放下编号和标题，则标题不用另起一行
          // 文字高都为16，宽：单个汉字占16左右的范围，数字占用半个
          singFontPerRow = false;
        } else {
          // 区域宽度够放不下编号和标题，则标题、名称需要另起一行
          textSpaceSize = (width - textFontWidth) / 2;
          singFontPerRow = true;
        }
        // 计算实际文案可占用宽度、高度
        const textWidth = width - 2 * textSpaceSize;
        const textHeight = height - 2 * textSpaceSize;

        // 区域编号元素，数量 2
        const noText = area?.no || 0;
        const noX = coordinatesArr[2].x + textSpaceSize + textFontWidth / 2;
        const noY = coordinatesArr[2].y + textSpaceSize + textFontHeight / 2;
        const noBgEle = this.paper.circle(noX, noY, textFontWidth * 0.75).attr({
          stroke: color,
          fill: color,
        });
        const noTextEle = this.paper.text(noX, noY, noText).attr({
          "stroke-width": 0.2,
          stroke: "#FFFFFF",
          fill: "#FFFFFF ",
        });

        // 区域标题，文字元素，数量 1
        let titleText = area?.title || "unknown";
        const titleTextNum = titleText.length;
        const titleEle = this.paper.text(0, 0, titleText).attr({
          "stroke-width": 1,
          stroke: color,
          fill: color,
          title: titleText,
        });
        let titleEleBBox = titleEle.getBBox();

        // 区域描述/名称，文字元素，数量 1
        let descText = area?.desc || "";
        const descTextNum = descText.length;
        const descEle = this.paper.text(0, 0, descText).attr({
          "stroke-width": 0.2,
          stroke: fontColor,
          fill: fontColor,
          title: descText,
        });
        let descEleBBox = titleEle.getBBox();

        // 处理文案换行问题
        if (singFontPerRow) {
          // 一行单个文字模式
          // 查看剩余空间还够多少个字
          let residueNum = Math.floor(
            (textHeight - textFontHeight - titleAndNameSpace) / textFontHeight
          );
          // 先处理标题
          if (residueNum >= titleTextNum) {
            // 能包含，直接逐字换行
            // 处理标题部分
            titleText = titleText.split("").join("\n");
            titleEle.attr({ text: titleText });
            titleEleBBox = titleEle.getBBox();
            const titleX =
              coordinatesArr[2].x + textSpaceSize + textFontWidth / 2;
            const titleY =
              coordinatesArr[2].y +
              textSpaceSize +
              textFontHeight +
              titleAndNameSpace +
              titleEleBBox.height / 2;
            titleEle.attr({
              x: titleX,
              y: titleY,
            });

            // 处理名称部分
            residueNum = residueNum - titleTextNum;
            if (residueNum >= descTextNum) {
              // 够
              descText = descText.split("").join("\n");
            } else {
              // 不够
              // 多减一个字，放省略号
              residueNum--;
              descText = descText.substring(0, residueNum);
              descText = descText.split("").join("\n") + "\n…";
            }
            descEle.attr({ text: descText });
            descEleBBox = descEle.getBBox();
            const descX =
              coordinatesArr[2].x + textSpaceSize + textFontWidth / 2;
            const descY =
              coordinatesArr[2].y +
              textSpaceSize +
              textFontHeight +
              titleAndNameSpace * 2 +
              titleEleBBox.height +
              descEleBBox.height / 2;
            descEle.attr({
              x: descX,
              y: descY,
            });
          } else {
            // 高度已经不够用了，多余的字要省略，名称部分的文案也不需要展示了
            // 多减一个字，放省略号
            residueNum--;
            titleText = titleText.substring(0, residueNum);
            titleText = titleText.split("").join("\n") + "\n…";
            titleEle.attr({ text: titleText });
            titleEleBBox = titleEle.getBBox();
            const titleX =
              coordinatesArr[2].x + textSpaceSize + textFontWidth / 2;
            const titleY =
              coordinatesArr[2].y +
              textSpaceSize +
              textFontHeight +
              titleAndNameSpace +
              titleEleBBox.height / 2;
            titleEle.attr({
              x: titleX,
              y: titleY,
            });
          }
        } else {
          // 一行多字模式
          // 处理第一行放置标题的问题
          let firstRowResidueSize = textWidth - textFontWidth - noAndtitleSpace;
          titleEleBBox = titleEle.getBBox();
          if (firstRowResidueSize >= titleEleBBox.width) {
            // 第一行能放下所有标题，直接放
            // 处理标题放在当前这次if判断之后
          } else {
            // 第一行放不下所有标题
            // 单行容纳的字符数
            const singleRowPerFontNum = Math.floor(
              firstRowResidueSize / textFontWidth
            );
            // 名称文案需要的行数
            const titleNeedRowCount = Math.ceil(
              titleTextNum / singleRowPerFontNum
            );
            // 剩余空间能放下的行数
            const titleSesidueRowCount = Math.floor(
              textHeight / textFontHeight
            );
            // 判断剩余行数是否足够
            if (titleNeedRowCount > titleSesidueRowCount) {
              // 行数不够用，只渲染标题就行了，不用渲染名称了
              let tempText = "";
              for (let i = 0; i < titleSesidueRowCount; i++) {
                if (i === titleSesidueRowCount - 1) {
                  tempText += "…";
                } else {
                  tempText +=
                    titleText.substring(
                      i * singleRowPerFontNum,
                      (i + 1) * singleRowPerFontNum
                    ) + "\n";
                }
              }
              titleText = tempText;
            } else {
              // 行数够用，再考虑名称的事
              let tempText = "";
              for (let i = 0; i < titleNeedRowCount; i++) {
                tempText +=
                  titleText.substring(
                    i * singleRowPerFontNum,
                    (i + 1) * singleRowPerFontNum
                  ) + "\n";
              }
              titleText = tempText;
            }
          }
          titleEle.attr({ text: titleText });
          titleEleBBox = titleEle.getBBox();
          // 处理标题
          const titleX =
            coordinatesArr[2].x +
            textSpaceSize +
            textFontWidth +
            noAndtitleSpace +
            titleEleBBox.width / 2;
          const titleY =
            coordinatesArr[2].y + textSpaceSize + textFontHeight / 2;
          titleEle.attr({
            x: titleX,
            y: titleY,
          });
          // 标题已经处理完了，处理名称
          // 判断是否能放下名称
          let residueHeight = textHeight - titleEleBBox.height;
          let residueRows = Math.floor(residueHeight / textFontHeight);
          if (residueRows) {
            // 还剩余至少一行空间
            // 判断放完名称是否需要换行
            descEleBBox = descEle.getBBox();
            if (descEleBBox.width > firstRowResidueSize) {
              // 需要换行
              // 单行容纳的字符数
              const singleRowPerFontNum = Math.floor(
                firstRowResidueSize / textFontWidth
              );
              // 名称文案需要的行数
              const descNeedRowCount = Math.ceil(
                descTextNum / singleRowPerFontNum
              );
              // 剩余空间能放下的行数
              const descSesidueRowCount = Math.floor(
                (textHeight - titleEleBBox.height - titleAndNameSpace) /
                  textFontHeight
              );
              // 判断剩余行数是否足够
              if (descNeedRowCount > descSesidueRowCount) {
                // 行数不够用
                let tempText = "";
                for (let i = 0; i < descSesidueRowCount; i++) {
                  if (i === descSesidueRowCount - 1) {
                    tempText += "…";
                  } else {
                    tempText +=
                      descText.substring(
                        i * singleRowPerFontNum,
                        (i + 1) * singleRowPerFontNum
                      ) + "\n";
                  }
                }
                descText = tempText;
              } else {
                // 行数够用
                let tempText = "";
                for (let i = 0; i < descNeedRowCount; i++) {
                  tempText +=
                    descText.substring(
                      i * singleRowPerFontNum,
                      (i + 1) * singleRowPerFontNum
                    ) + "\n";
                }
                descText = tempText;
              }
            } else {
              // 不需要换行
              // 直接渲染，不需要修改文案内容
            }
          } else {
            // 没有空间放名称了
            // 直接渲染省略号
            descText = "…";
          }
          descEle.attr({ text: descText });
          descEleBBox = descEle.getBBox();
          const descX =
            coordinatesArr[2].x +
            textSpaceSize +
            textFontWidth +
            noAndtitleSpace +
            descEleBBox.width / 2;
          const descY =
            coordinatesArr[2].y +
            textSpaceSize +
            titleEleBBox.height +
            titleAndNameSpace +
            descEleBBox.height / 2;
          descEle.attr({
            x: descX,
            y: descY,
          });
        }

        // 保存每个区域的所有元素
        const uuid = area?.uuid;
        this.elementRendered.area.mapObj.rule.set(uuid, areaEle);
        this.elementRendered.area.mapObj.rule.set(
          uuid + this.elementConfig.Area.mapKeySuffix.rule.noBg,
          noBgEle
        );
        this.elementRendered.area.mapObj.rule.set(
          uuid + this.elementConfig.Area.mapKeySuffix.rule.noText,
          noTextEle
        );
        this.elementRendered.area.mapObj.rule.set(
          uuid + this.elementConfig.Area.mapKeySuffix.rule.title,
          titleEle
        );
        this.elementRendered.area.mapObj.rule.set(
          uuid + this.elementConfig.Area.mapKeySuffix.rule.desc,
          descEle
        );

        // area?.uuid
        // areaEle,
        // noBgEle,
        // noTextEle,
        // titleEle,
        // descEle,
        // data: area,
      }
    });
  }

  // 渲染货柜车
  private renderTruckAreas(areas: ITruckArea[]) {
    // 清空现有规则数据，重新渲染
    this.elementRendered.area.setObj.truck.remove();
    this.elementRendered.area.setObj.truck.clear();

    if (areas.length) {
      // 渲染新货柜车信息
      areas.forEach((area: ITruckArea) => {
        area.x = this.getMapCoordiateX(area.x);
        area.y = this.getMapCoordiateY(area.y);
        area.length = this.getMapCoordiateX(area.length);
        area.width = this.getMapCoordiateX(area.width);
        const radians = area.theta;
        const leftTopPoint = {
          x: area.x,
          y: area.y,
        };
        const rightTopPoint = {
          x: area.x + area.length * Math.cos(radians),
          y: area.y - area.length * Math.sin(radians),
        };
        const rightBottomPoint = {
          x:
            area.x +
            area.length * Math.cos(radians) +
            area.width * Math.sin(radians),
          y:
            area.y -
            area.length * Math.sin(radians) +
            area.width * Math.cos(radians),
        };
        const leftBottomPoint = {
          x: area.x + area.width * Math.sin(radians),
          y: area.y + area.width * Math.cos(radians),
        };
        const rectLine = Raphael.format(
          "M{0},{1} L{2},{3} M{4},{5} L{6},{7} M{8},{9} L{10},{11} M{12},{13} L{14},{15} M{16},{17} L{18},{19}",
          leftTopPoint.x,
          leftTopPoint.y,
          rightTopPoint.x,
          rightTopPoint.y,
          rightTopPoint.x,
          rightTopPoint.y,
          rightBottomPoint.x,
          rightBottomPoint.y,
          rightBottomPoint.x,
          rightBottomPoint.y,
          leftBottomPoint.x,
          leftBottomPoint.y,
          leftBottomPoint.x,
          leftBottomPoint.y,
          leftTopPoint.x,
          leftTopPoint.y
        );
        const rectLineEle = this.paper.path(rectLine);
        rectLineEle.attr({
          stroke: this.elementConfig.Truck.color.default,
          "stroke-width": this.elementConfig.Truck.width.default,
        });
        const truckHeader = this.paper.image(
          TRUCK_HEADER["truck"],
          rightTopPoint.x,
          rightTopPoint.y,
          area.width,
          area.width
        );
        const deg = this.piToRotate(area.theta);
        truckHeader.rotate(deg, rightTopPoint.x, rightTopPoint.y);
        this.elementRendered.area.setObj.truck.push(rectLineEle);
        this.elementRendered.area.setObj.truck.push(truckHeader);
      });
    }
  }

  // 货柜车动态库位
  private renderTruckParks(truckParks: ITruckPark[]) {
    let getTheta: any = () => {};
    let getRotate: any = () => {};
    if (this.elementConfig.Park.rotateMode.truck) {
      switch (this.elementConfig.Park.rotateMode.truck) {
        case "pi":
          getTheta = (a: number) => {
            return a;
          };
          getRotate = this.piToRotate;
          break;
        case "theta":
          getTheta = this.thetaToPi;
          getRotate = this.thetaToRotate;
          break;
        case "rotate":
          getTheta = this.rotateToPi;
          getRotate = (a: number) => {
            return a;
          };
          break;
        default:
          getTheta = (a: number) => {
            return a;
          };
          getRotate = this.piToRotate;
          break;
      }
    }
    if (truckParks.length) {
      // 有数据需要处理
      const parkIdArr: string[] = [];
      truckParks.forEach((item: ITruckPark) => {
        const truckPark = Object.assign({}, item);
        truckPark.x = this.getMapCoordiateX(truckPark.x);
        truckPark.y = this.getMapCoordiateY(truckPark.y);
        const parkId = truckPark.parkId;
        if (parkId && this.elementRendered.Park.mapObj.render.has(parkId)) {
          parkIdArr.push(parkId);
          const eleRender = this.elementRendered.Park.mapObj.render.get(parkId);
          let _data = eleRender.data();
          const angle = getTheta(truckPark.theta);
          const r = getRotate(truckPark.theta);
          const _newData = this.getParkRenderData(
            parkId,
            truckPark.x,
            truckPark.y,
            _data.w,
            _data.l,
            angle,
            r,
            _data.type,
            _data.mode,
            _data.truckId,
            _data.parkData
          );
          eleRender
            .attr({
              path: _newData.renderPath,
            })
            .attr(_newData.renderAttr)
            .data(_newData);
          if (this.elementRendered.Park.mapObj.event.has(parkId)) {
            const eleEvent = this.elementRendered.Park.mapObj.event.get(parkId);
            eleEvent
              .attr({
                path: _newData.eventPath,
              })
              .attr(_newData.eventAttr)
              .data(_newData);
          }
          // 处理库位编号
          if (this.elementRendered.ParkId.map.has(parkId)) {
            const parkIdText = this.elementRendered.ParkId.map.get(parkId);
            parkIdText?.node.setAttribute(
              "transform",
              `translate(${_newData.x}, ${_newData.y})`
            );
          }
        }
      });

      // 库位如果有移动，则需要更新库位上的覆盖物位置
      if (parkIdArr.length) {
        this.refreashParkMarks(parkIdArr);
      }
    }
  }

  // 刷新库位覆盖物
  private refreashParkMarks(parkIds: string[]) {
    // 处理 库位有无货状态
    if (
      this._markerRendered.parkStock &&
      this._markerRendered.parkStock.length
    ) {
      const tempIdArr = this._markerRendered.parkStock;
      // 判断是否有交集
      const intersectionParkIdArr = parkIds.filter((id: string) =>
        tempIdArr.includes(id)
      );
      if (intersectionParkIdArr && intersectionParkIdArr.length) {
        // 对有货物标识的库位进行标识刷新
        intersectionParkIdArr.forEach((parkId: string) => {
          this.signParkStock(parkId);
        });
      }
    }
    // 处理 库位序号标记
    if (this._markerRendered.parkTag && this._markerRendered.parkTag.length) {
      const tempIdArr = this._markerRendered.parkTag.map(
        (tag: IParkTag) => tag.parkId
      );
      // 判断是否有交集
      const intersectionParkIdArr = parkIds.filter((id: string) =>
        tempIdArr.includes(id)
      );
      if (intersectionParkIdArr && intersectionParkIdArr.length) {
        this.renderParksTag(this._markerRendered.parkTag, true);
      }
    }
    // 处理 库位推断状态标记
    if (
      this._markerRendered.parkInferTag &&
      this._markerRendered.parkInferTag.length
    ) {
      const tempIdArr = this._markerRendered.parkInferTag.map(
        (tag: IParkTag) => tag.parkId
      );
      // 判断是否有交集
      const intersectionParkIdArr = parkIds.filter((id: string) =>
        tempIdArr.includes(id)
      );
      if (intersectionParkIdArr && intersectionParkIdArr.length) {
        this.renderParksInferTag(this._markerRendered.parkInferTag, true);
      }
    }
  }

  // 途经点数据
  private renderPathwayPoints(points: IPoint[]) {
    // 先清理现有途经点元素，重新生成
    this.elementRendered.pathwayPoint.set.remove();
    this.elementRendered.pathwayPoint.set.clear();
    // 渲染新数据
    if (points.length) {
      // 有途经点数据，处理标记
      // 新增途经点元素
      const pathwayPointSideLen = 10;
      points.forEach((point: any, index: number) => {
        let x = this.getMapCoordiateX(point?.x);
        let y = this.getMapCoordiateY(point?.y);
        let num = ++index;
        // let text = '途径' + num

        let disX = x;
        let disY = y - (8 + pathwayPointSideLen);
        let backgroundBoxEle = this.paper?.circle(disX, disY, 8).attr({
          stroke: "#ED7B00",
          fill: "#ED7B00",
          // 'stroke-opacity': 0.5,
          // 'fill-opacity': 0.5
        });
        let textEle = this.paper?.text(0, 0, num).attr({
          "text-anchor": "middle",
          "stroke-width": 0.2,
          stroke: "#ffffff ",
          fill: "#ffffff ",
        });
        textEle.node.setAttribute("transform", `translate(${disX}, ${disY})`);
        let backgroundEleId = backgroundBoxEle?.id;
        textEle?.data({ x, y, backgroundEleId: backgroundEleId });
        this.elementRendered.pathwayPoint.set.push(backgroundBoxEle);
        this.elementRendered.pathwayPoint.set.push(textEle);
      });
    }
  }

  /**
   * 渲染候选元素范围框，矩形
   * @param x 左上点x
   * @param y 左上点y
   * @param w 宽
   * @param h 高
   */
  protected renderCandidateRange(x: number, y: number, w: number, h: number) {
    this.clearCandidateRange();
    const magnificationSelectedRangRect = this.paper?.rect(x, y, w, h);
    magnificationSelectedRangRect?.attr({
      stroke: "#EB2829",
      "stroke-dasharray": "-",
    });
    this.elementRendered.candidateRange.set.push(magnificationSelectedRangRect);
  }
  protected clearCandidateRange() {
    this.elementRendered.candidateRange.set.remove();
    this.elementRendered.candidateRange.set.clear();
  }

  /**
   * agv动画 start
   */
  // 批量元素动画，以主元素为主，其他副元素围绕并跟随主元素一起动画
  private animateBy2PointBatch(
    agvEntry: IAgvEntry,
    startPoint: any,
    endPoint: any,
    callback: any
  ) {
    // 画布不存在或者主元素不存在则不执行
    const mainEle = agvEntry.agvImgEle;
    if (!mainEle) return;
    // 判断开始和结束点是否是同一个点
    if (startPoint.x === endPoint.x && startPoint.y === endPoint.y) {
      // 前后两个点是同一个点
      // 判断前后两个点的角度是否相同
      if (startPoint.theta === endPoint.theta) {
        // 角度也一样，则直接进行下一步
        callback();
        return;
      }
      // 角度不一样，则也需要进行转向动画
    }
    // translate和rotate会在上一次已经移动或旋转的基础上再移动或旋转

    // 计算起点到结束点所需时间，单位：毫秒
    let time = Number(endPoint.timestamp) - Number(startPoint.timestamp);
    time = isNaN(time) ? 0 : Math.abs(time);
    // 如果两条数据间隔时间超过1秒钟，不再进行动画，直接到最新位置
    if (time > 1000 || time === 0) {
      // 直接显示在结束点位
      this.transformBy1PointBatch(agvEntry, endPoint, callback);
      // 位置更新后直接回调进行下一步
      // callback()
      return;
    } else {
      // 动画时间小于等于1秒，需要缩短五分之二的计算时间
      time = (time * 95) / 100;
    }

    // 点位真实坐标转换为地图坐标
    // AGV在地图上原始坐标
    startPoint.x = this.getMapCoordiateX(startPoint.x);
    startPoint.y = this.getMapCoordiateY(startPoint.y);
    endPoint.x = this.getMapCoordiateX(endPoint.x);
    endPoint.y = this.getMapCoordiateY(endPoint.y);

    // 而transform会一直在初始状态的基础上进行移动或旋转
    const currentAttr = mainEle.attr();
    if (!currentAttr) return;
    const mainWidth = currentAttr.width || 0;
    const mainHeight = currentAttr.height || 0;
    const IndentRatio = mainEle.data("ratios");
    const xOffset = -mainWidth * IndentRatio.width;
    const yOffset = -mainHeight * IndentRatio.height;

    // 根据AGV型号身位校准后的偏移坐标
    const startPointCorrect = {
      x: startPoint.x + xOffset,
      y: startPoint.y + yOffset,
    };
    const endPointCorrect = {
      x: endPoint.x + xOffset,
      y: endPoint.y + yOffset,
    };

    const angle1: number = this.piToRotate(startPoint.theta);
    const angle2: number = this.piToRotate(endPoint.theta);
    let mainAnimation: any = null;

    // 获取transform后的元素中心点
    // transform1的BBOX
    let cloneBBox1: any = undefined;
    // transform2的BBOX
    let cloneBBox2: any = undefined;

    // 处理临界值动画问题，如：当从350+度转到10度左右的小角度转向时，要平滑处理，否则动画会旋转近360度
    if (angle1 <= 360 && angle1 >= 270 && angle2 >= 0 && angle2 <= 90) {
      // 右侧，X轴上方往下方转动
      const transformStr1 = Raphael.format(
        "R{0},{1},{2}",
        angle1,
        startPoint.x,
        startPoint.y
      );
      const transformStr2 = Raphael.format(
        "R{0},{1},{2}",
        360 + angle2,
        endPoint.x,
        endPoint.y
      );
      const animateParam: any = {
        "0%": {
          x: startPointCorrect.x,
          y: startPointCorrect.y,
          transform: transformStr1,
        },
        "100%": {
          x: endPointCorrect.x,
          y: endPointCorrect.y,
          transform: transformStr2,
        },
      };
      cloneBBox1 = agvEntry.agvImgCloneEle
        ?.attr({
          x: startPointCorrect.x,
          y: startPointCorrect.y,
          transform: transformStr1,
        })
        .getBBox();
      cloneBBox2 = agvEntry.agvImgCloneEle
        ?.attr({
          x: endPointCorrect.x,
          y: endPointCorrect.y,
          transform: transformStr2,
        })
        .getBBox();

      // 预定义主动画
      mainAnimation = Raphael.animation(animateParam, time, "linear", () => {
        // 重新定位transform中的R
        mainEle.attr({
          transform: Raphael.format(
            "R{0},{1},{2}",
            angle2,
            endPoint.x,
            endPoint.y
          ),
        });
        callback();
      });
    } else if (angle2 <= 360 && angle2 >= 270 && angle1 >= 0 && angle1 <= 90) {
      // 右侧，X轴下方往上方转动
      mainEle.attr({
        transform: Raphael.format(
          "R{0},{1},{2}",
          360 + angle1,
          startPoint.x,
          startPoint.y
        ),
      });
      const transformStr1 = Raphael.format(
        "R{0},{1},{2}",
        360 + angle1,
        startPoint.x,
        startPoint.y
      );
      const transformStr2 = Raphael.format(
        "R{0},{1},{2}",
        angle2,
        endPoint.x,
        endPoint.y
      );
      const animateParam: any = {
        "0%": {
          x: startPointCorrect.x,
          y: startPointCorrect.y,
          transform: transformStr1,
        },
        "100%": {
          x: endPointCorrect.x,
          y: endPointCorrect.y,
          transform: transformStr2,
        },
      };
      cloneBBox1 = agvEntry.agvImgCloneEle
        ?.attr({
          x: startPointCorrect.x,
          y: startPointCorrect.y,
          transform: transformStr1,
        })
        .getBBox();
      cloneBBox2 = agvEntry.agvImgCloneEle
        ?.attr({
          x: endPointCorrect.x,
          y: endPointCorrect.y,
          transform: transformStr2,
        })
        .getBBox();

      // 预定义主动画
      mainAnimation = Raphael.animation(animateParam, time, "linear", callback);
    } else {
      // 常规操作
      const transformStr1 = Raphael.format(
        "R{0},{1},{2}",
        angle1,
        startPoint.x,
        startPoint.y
      );
      const transformStr2 = Raphael.format(
        "R{0},{1},{2}",
        angle2,
        endPoint.x,
        endPoint.y
      );
      const animateParam: any = {
        "0%": {
          x: startPointCorrect.x,
          y: startPointCorrect.y,
          transform: transformStr1,
        },
        "100%": {
          x: endPointCorrect.x,
          y: endPointCorrect.y,
          transform: transformStr2,
        },
      };
      cloneBBox1 = agvEntry.agvImgCloneEle
        ?.attr({
          x: startPointCorrect.x,
          y: startPointCorrect.y,
          transform: transformStr1,
        })
        .getBBox();
      cloneBBox2 = agvEntry.agvImgCloneEle
        ?.attr({
          x: endPointCorrect.x,
          y: endPointCorrect.y,
          transform: transformStr2,
        })
        .getBBox();

      // 预定义主动画
      mainAnimation = Raphael.animation(animateParam, time, "linear", callback);
    }

    // 判断是否有跟随物
    const animateSwitchObj = agvEntry.animateSwitch || {};
    const openedKeys = Object.keys(animateSwitchObj).filter(
      (key: string) => animateSwitchObj[key]
    );
    if (openedKeys.length) {
      let textSpaceSize = this.elementConfig.Text.size.space;
      // 信息块相对的中心点坐标
      let startRelativeCenterPoint = {
        x: startPoint.x,
        y: startPoint.y,
      };
      if (cloneBBox1) {
        startRelativeCenterPoint.x = cloneBBox1.cx;
        startRelativeCenterPoint.y = cloneBBox1.cy;
      }
      let endRelativeCenterPoint = {
        x: endPoint.x,
        y: endPoint.y,
      };
      if (cloneBBox2) {
        endRelativeCenterPoint.x = cloneBBox2.cx;
        endRelativeCenterPoint.y = cloneBBox2.cy;
      }
      // 宽高的一半
      let helfWidth = mainWidth / 2;
      let helfHeight = mainHeight / 2;
      openedKeys.forEach((key: string) => {
        if (agvEntry.animateWith && agvEntry.animateWith[key]) {
          const ele = agvEntry.animateWith[key];
          let bgEle: any = null;
          switch (key) {
            case "MiddleTop":
              // let MTBBox = ele.getBBox()
              let MTXOffset = 0;
              let MTYOffset = -helfHeight;

              let BTAnimateParam: any = {
                "0%": {
                  x: startRelativeCenterPoint.x + MTXOffset,
                  y: startRelativeCenterPoint.y + MTYOffset,
                },
                "100%": {
                  x: endRelativeCenterPoint.x + MTXOffset,
                  y: endRelativeCenterPoint.y + MTYOffset,
                },
              };
              let BTAnimation = Raphael.animation(
                BTAnimateParam,
                time,
                "linear"
              );
              ele.animateWith(mainEle, mainAnimation, BTAnimation);
              break;
            case "LeftTop": // 左上显示块
              let LTBBox = ele.getBBox();
              let LTXOffset = -LTBBox.width - helfWidth;
              let LTYOffset = -LTBBox.height / 2 - helfHeight;
              // 此时定位的text元素的x和y值点是其bbox矩形的左测竖边中心点，这里与创建text元素时x/y值为文字bbox矩形中心点不同
              let LTAnimateParam: any = {
                "0%": {
                  x: startRelativeCenterPoint.x + LTXOffset,
                  y: startRelativeCenterPoint.y + LTYOffset,
                },
                "100%": {
                  x: endRelativeCenterPoint.x + LTXOffset,
                  y: endRelativeCenterPoint.y + LTYOffset,
                },
              };
              let LTAnimation = Raphael.animation(
                LTAnimateParam,
                time,
                "linear"
              );
              ele.animateWith(mainEle, mainAnimation, LTAnimation);
              // 处理文字背景动画
              let LTXOffsetB = -LTBBox.width - helfWidth - textSpaceSize;
              let LTYOffsetB = -LTBBox.height - helfHeight - textSpaceSize;
              let LTBackgroundAnimateParam: any = {
                "0%": {
                  x: startRelativeCenterPoint.x + LTXOffsetB,
                  y: startRelativeCenterPoint.y + LTYOffsetB,
                },
                "100%": {
                  x: endRelativeCenterPoint.x + LTXOffsetB,
                  y: endRelativeCenterPoint.y + LTYOffsetB,
                },
              };
              let LTBackgroundAnimation = Raphael.animation(
                LTBackgroundAnimateParam,
                time,
                "linear"
              );
              bgEle = ele.paper.getById(ele.data("backgroundBoxId"));
              bgEle &&
                bgEle.animateWith(ele, LTAnimation, LTBackgroundAnimation);
              break;
            case "LeftBottom": // 左下显示块
              let LBBBox = ele.getBBox();
              let LBXOffset = -LBBBox.width - helfWidth;
              let LBYOffset = LBBBox.height / 2 + helfHeight;
              // 此时定位的text元素的x和y值点是其bbox矩形的左测竖边中心点，这里与创建text元素时x/y值为文字bbox矩形中心点不同
              let LBAnimateParam: any = {
                "0%": {
                  x: startRelativeCenterPoint.x + LBXOffset,
                  y: startRelativeCenterPoint.y + LBYOffset,
                },
                "100%": {
                  x: endRelativeCenterPoint.x + LBXOffset,
                  y: endRelativeCenterPoint.y + LBYOffset,
                },
              };
              let LBAnimation = Raphael.animation(
                LBAnimateParam,
                time,
                "linear"
              );
              ele.animateWith(mainEle, mainAnimation, LBAnimation);
              // 处理文字背景动画
              let LBXOffsetB = -LBBBox.width - helfWidth - textSpaceSize;
              let LBYOffsetB = helfHeight - textSpaceSize;
              let LBBackgroundAnimateParam: any = {
                "0%": {
                  x: startRelativeCenterPoint.x + LBXOffsetB,
                  y: startRelativeCenterPoint.y + LBYOffsetB,
                },
                "100%": {
                  x: endRelativeCenterPoint.x + LBXOffsetB,
                  y: endRelativeCenterPoint.y + LBYOffsetB,
                },
              };
              let LBBackgroundAnimation = Raphael.animation(
                LBBackgroundAnimateParam,
                time,
                "linear"
              );
              bgEle = ele.paper.getById(ele.data("backgroundBoxId"));
              bgEle &&
                bgEle.animateWith(ele, LBAnimation, LBBackgroundAnimation);
              break;
            case "RightTop": // 右上显示块
              let RTBBox = ele.getBBox();
              let RTXOffset = helfWidth;
              let RTYOffset = -RTBBox.height / 2 - helfHeight;
              // 此时定位的text元素的x和y值点是其bbox矩形的左测竖边中心点，这里与创建text元素时x/y值为文字bbox矩形中心点不同
              let RTAnimateParam: any = {
                "0%": {
                  x: startRelativeCenterPoint.x + RTXOffset,
                  y: startRelativeCenterPoint.y + RTYOffset,
                },
                "100%": {
                  x: endRelativeCenterPoint.x + RTXOffset,
                  y: endRelativeCenterPoint.y + RTYOffset,
                },
              };
              let RTAnimation = Raphael.animation(
                RTAnimateParam,
                time,
                "linear"
              );
              ele.animateWith(mainEle, mainAnimation, RTAnimation);
              // 处理文字背景动画
              let RTXOffsetB = helfWidth - textSpaceSize;
              let RTYOffsetB = -RTBBox.height - helfHeight - textSpaceSize;
              let RTBackgroundAnimateParam: any = {
                "0%": {
                  x: startRelativeCenterPoint.x + RTXOffsetB,
                  y: startRelativeCenterPoint.y + RTYOffsetB,
                },
                "100%": {
                  x: endRelativeCenterPoint.x + RTXOffsetB,
                  y: endRelativeCenterPoint.y + RTYOffsetB,
                },
              };
              let RTBackgroundAnimation = Raphael.animation(
                RTBackgroundAnimateParam,
                time,
                "linear"
              );
              bgEle = ele.paper.getById(ele.data("backgroundBoxId"));
              bgEle &&
                bgEle.animateWith(ele, RTAnimation, RTBackgroundAnimation);
              break;
            case "RightBottom": // 右下显示块
              let RBBBox = ele.getBBox();
              let RBXOffset = helfWidth;
              let RBYOffset = RBBBox.height / 2 + helfHeight;
              // 此时定位的text元素的x和y值点是其bbox矩形的左测竖边中心点，这里与创建text元素时x/y值为文字bbox矩形中心点不同
              let RBAnimateParam: any = {
                "0%": {
                  x: startRelativeCenterPoint.x + RBXOffset,
                  y: startRelativeCenterPoint.y + RBYOffset,
                },
                "100%": {
                  x: endRelativeCenterPoint.x + RBXOffset,
                  y: endRelativeCenterPoint.y + RBYOffset,
                },
              };
              let RBAnimation = Raphael.animation(
                RBAnimateParam,
                time,
                "linear"
              );
              ele.animateWith(mainEle, mainAnimation, RBAnimation);
              // 处理文字背景动画
              let RBXOffsetB = helfWidth - textSpaceSize;
              let RBYOffsetB = helfHeight - textSpaceSize;
              let RBBackgroundAnimateParam: any = {
                "0%": {
                  x: startRelativeCenterPoint.x + RBXOffsetB,
                  y: startRelativeCenterPoint.y + RBYOffsetB,
                },
                "100%": {
                  x: endRelativeCenterPoint.x + RBXOffsetB,
                  y: endRelativeCenterPoint.y + RBYOffsetB,
                },
              };
              let RBBackgroundAnimation = Raphael.animation(
                RBBackgroundAnimateParam,
                time,
                "linear"
              );
              bgEle = ele.paper.getById(ele.data("backgroundBoxId"));
              bgEle &&
                bgEle.animateWith(ele, RBAnimation, RBBackgroundAnimation);
              break;
          }
        }
      });
    }
    mainEle.animate(mainAnimation);
  }
  // 批量点定位，以主元素为主，其他副元素围绕并跟随主元素一起定位
  private transformBy1PointBatch(
    agvEntry: IAgvEntry,
    point: any,
    callback: any = undefined
  ) {
    const mainEle = agvEntry.agvImgEle;
    if (!mainEle) return;
    this.transformBy1Point(mainEle, point);

    // 判断是否有跟随物
    const animateSwitchObj = agvEntry.animateSwitch || {};
    const openedKeys = Object.keys(animateSwitchObj).filter(
      (key: string) => animateSwitchObj[key]
    );
    if (openedKeys.length) {
      openedKeys.forEach((key: string) => {
        if (agvEntry.animateWith && agvEntry.animateWith[key]) {
          this.setSingleEleAround(key, agvEntry.animateWith[key], mainEle);
        }
      });
    }

    if (callback) callback();
  }
  // point 单个点位的x/y/theta角度等
  private transformBy1Point(ele: any, point: any, callback: any = undefined) {
    if (!ele) return;
    const _attr = ele?.attr();
    const IndentRatio = ele.data("ratios");
    const xOffset = -_attr?.width * IndentRatio.width;
    const yOffset = -_attr?.height * IndentRatio.height;

    // 地图原始坐标
    const x = this.getMapCoordiateX(point.x);
    const y = this.getMapCoordiateY(point.y);
    // 根据AGV型号身位校准后的偏移坐标
    const xCorrect = x + xOffset;
    const yCorrect = y + yOffset;

    if (point.hasOwnProperty("theta")) {
      const angle: number = this.piToRotate(point.theta);
      const transformStr = Raphael.format("R{0},{1},{2}", angle, x, y);
      ele.attr({
        x: xCorrect,
        y: yCorrect,
        transform: transformStr,
      });
    } else {
      ele.attr({
        x: xCorrect,
        y: yCorrect,
      });
    }

    if (callback) callback();
  }
  // 单个点只旋转rotate不矩阵计算matrix
  // 批量点定位，以主元素为主，其他副元素围绕并跟随主元素一起定位
  private rotateBy1PointBatch(
    agvEntry: IAgvEntry,
    point: any,
    callback: any = undefined
  ) {
    const mainEle = agvEntry.agvImgEle;
    if (!mainEle) return;
    this.rotateBy1Point(mainEle, point);

    // 遍历跟随元素
    const animateSwitchObj = agvEntry.animateSwitch || {};
    const openedKeys = Object.keys(animateSwitchObj).filter(
      (key: string) => animateSwitchObj[key]
    );
    if (openedKeys.length) {
      openedKeys.forEach((key: string) => {
        if (agvEntry.animateWith && agvEntry.animateWith[key]) {
          this.setSingleEleAround(key, agvEntry.animateWith[key], mainEle);
        }
      });
    }

    if (callback) callback();
  }
  // 单点旋转
  private rotateBy1Point(ele: any, point: any, callback: any = undefined) {
    if (!ele) return;
    const _attr = ele?.attr();
    const IndentRatio = ele.data("ratios");
    const xOffset = -_attr?.width * IndentRatio.width;
    const yOffset = -_attr?.height * IndentRatio.height;

    // AGV在地图上原始坐标
    const x = this.getMapCoordiateX(point.x);
    const y = this.getMapCoordiateY(point.y);
    // 根据AGV型号身位校准后的偏移坐标
    const xCorrect = x + xOffset;
    const yCorrect = y + yOffset;
    /* x = Number(x.toFixed(0))
    y = Number(y.toFixed(0)) */
    ele
      .attr({
        x: xCorrect,
        y: yCorrect,
      })
      .data({
        x: x,
        y: y,
      });

    // ele.node.setAttribute('transform', '')
    if (point.hasOwnProperty("theta")) {
      const angle: number = this.piToRotate(point.theta);
      // let bbox = ele.getBBox(true)
      // ele.node.setAttribute('transform', `rotate(${angle},${bbox.cx},${bbox.cy})`)
      ele.node.setAttribute("transform", `rotate(${angle}, ${x}, ${y})`);
    }

    if (callback) callback();
  }
  // 设置单个元素环绕主元素
  private setSingleEleAround(position: string, currentEle: any, mainEle: any) {
    if (!mainEle) return;
    let isTransform = false;
    let attr = mainEle.attr();
    let halfWidth = attr.width / 2;
    let halfHeight = attr.height / 2;
    let centerPoint = {
      cx: attr.x + halfWidth,
      cy: attr.y + halfHeight,
    };

    if (!this.elementConfig.Agv.demarcate) {
      // 非标定模式
      let mainBBox = mainEle.getBBox(true); // transform前的
      let mainBBoxTrans = mainEle.getBBox(); // transform后的
      if (mainBBox.x === mainBBoxTrans.x && mainBBox.y === mainBBoxTrans.y) {
        // 无transform操作
        isTransform = false;
        centerPoint.cx = mainBBoxTrans.x;
        centerPoint.cy = mainBBoxTrans.y;
      } else {
        // 有transform操作
        isTransform = true;
        centerPoint.cx = mainBBoxTrans.cx;
        centerPoint.cy = mainBBoxTrans.cy;
      }
    } else {
      // 标定模式
      isTransform = true;
      /* const _data = mainEle.data()
      centerPoint.cx = _data.x
      centerPoint.cy = _data.y */
    }

    // 定位环绕元素
    let textSpaceSize = this.elementConfig.Text.size.space;
    let ele = currentEle;
    let bgEle = null;
    switch (position) {
      case "MiddleTop":
        // let MTBBox = ele.getBBox()
        let MTXOffset = halfWidth;
        let MTYOffset = 0;
        if (isTransform) {
          MTXOffset = MTXOffset - halfWidth;
          MTYOffset = MTYOffset - halfWidth;
        }
        ele.attr({
          x: centerPoint.cx + MTXOffset,
          y: centerPoint.cy + MTYOffset,
        });
        break;
      case "LeftTop": // 左上显示块
        let LTBBox = ele.getBBox();
        let LTXOffset = -LTBBox.width;
        let LTYOffset = -LTBBox.height / 2;
        if (isTransform) {
          LTXOffset = LTXOffset - halfWidth;
          LTYOffset = LTYOffset - halfHeight;
        }
        // 此时定位的text元素的x和y值点是其bbox矩形的左测竖边中心点，这里与创建text元素时x/y值为文字bbox矩形中心点不同
        ele.attr({
          x: centerPoint.cx + LTXOffset,
          y: centerPoint.cy + LTYOffset,
        });
        // 处理文字背景
        let LTRealBBox = ele.getBBox();
        bgEle = ele.paper.getById(ele.data("backgroundBoxId"));
        bgEle &&
          bgEle.attr({
            x: LTRealBBox.x - textSpaceSize,
            y: LTRealBBox.y - textSpaceSize,
            width: LTRealBBox.width + textSpaceSize * 2,
            height: LTRealBBox.height + textSpaceSize * 2,
          });
        break;
      case "LeftBottom": // 左下显示块
        let LBBBox = ele.getBBox();
        let LBXOffset = -LBBBox.width;
        let LBYOffset = LBBBox.height / 2 + halfHeight * 2;
        if (isTransform) {
          LBXOffset = LBXOffset - halfWidth;
          LBYOffset = LBYOffset - halfHeight;
        }
        // 此时定位的text元素的x和y值点是其bbox矩形的左测竖边中心点，这里与创建text元素时x/y值为文字bbox矩形中心点不同
        ele.attr({
          x: centerPoint.cx + LBXOffset,
          y: centerPoint.cy + LBYOffset,
        });
        // 处理文字背景
        let LBRealBBox = ele.getBBox();
        bgEle = ele.paper.getById(ele.data("backgroundBoxId"));
        bgEle &&
          bgEle.attr({
            x: LBRealBBox.x - textSpaceSize,
            y: LBRealBBox.y - textSpaceSize,
            width: LBRealBBox.width + textSpaceSize * 2,
            height: LBRealBBox.height + textSpaceSize * 2,
          });
        break;
      case "RightTop": // 右上显示块
        let RTBBox = ele.getBBox();
        let RTXOffset = halfWidth * 2;
        let RTYOffset = -RTBBox.height / 2;
        if (isTransform) {
          RTXOffset = RTXOffset - halfWidth;
          RTYOffset = RTYOffset - halfHeight;
        }
        // 此时定位的text元素的x和y值点是其bbox矩形的左测竖边中心点，这里与创建text元素时x/y值为文字bbox矩形中心点不同
        ele.attr({
          x: centerPoint.cx + RTXOffset,
          y: centerPoint.cy + RTYOffset,
        });
        // 处理文字背景
        let RTRealBBox = ele.getBBox();
        bgEle = ele.paper.getById(ele.data("backgroundBoxId"));
        bgEle &&
          bgEle.attr({
            x: RTRealBBox.x - textSpaceSize,
            y: RTRealBBox.y - textSpaceSize,
            width: RTRealBBox.width + textSpaceSize * 2,
            height: RTRealBBox.height + textSpaceSize * 2,
          });
        break;
      case "RightBottom": // 右下显示块
        let RBBBox = ele.getBBox();
        let RBXOffset = halfWidth * 2;
        let RBYOffset = RBBBox.height / 2 + halfHeight * 2;
        if (isTransform) {
          RBXOffset = RBXOffset - halfWidth;
          RBYOffset = RBYOffset - halfHeight;
        }
        // 此时定位的text元素的x和y值点是其bbox矩形的左测竖边中心点，这里与创建text元素时x/y值为文字bbox矩形中心点不同
        ele.attr({
          x: centerPoint.cx + RBXOffset,
          y: centerPoint.cy + RBYOffset,
        });
        // 处理文字背景
        let RBRealBBox = ele.getBBox();
        bgEle = ele.paper.getById(ele.data("backgroundBoxId"));
        bgEle &&
          bgEle.attr({
            x: RBRealBBox.x - textSpaceSize,
            y: RBRealBBox.y - textSpaceSize,
            width: RBRealBBox.width + textSpaceSize * 2,
            height: RBRealBBox.height + textSpaceSize * 2,
          });
        break;
    }
  }

  // 单个点位调整元素角度等
  // point 单个点位的x/y/theta角度等，悬浮在坐标点上方
  private transformBy1PointAbove(
    ele: any,
    point: any,
    callback: any = undefined
  ) {
    if (!ele) return;
    let attr = ele?.attr();
    let xOffset = -attr?.width / 2;
    let yOffset = -attr?.height;
    let transformStr = "";
    if (point.hasOwnProperty("theta")) {
      let angle: number = this.piToRotate(point.theta);
      transformStr = Raphael.format("T{0},{1} R{2}", xOffset, yOffset, angle);
    } else {
      transformStr = Raphael.format("T{0},{1}", xOffset, yOffset);
    }

    ele?.attr({
      x: point.x,
      y: point.y,
      transform: transformStr,
    });
    if (callback) callback();
    return ele;
  }
  /**
   * agv动画 end
   */

  /***********************************************************
   * 动态渲染元素 end
   */

  /***********************************************************
   * 角度、圆弧计算相关 start
   */
  /**
   * 三点确定一个圆形，提供圆弧上的三个点坐标，确定该圆形的圆心坐标
   * @param x1 圆形所在圆弧起点坐标，x值
   * @param y1 圆形所在圆弧起点坐标，y值
   * @param x2 圆形所在圆弧中间任一点坐标，x值
   * @param y2 圆形所在圆弧中间任一点坐标，y值
   * @param x3 圆形所在圆弧终点坐标，x值
   * @param y3 圆形所在圆弧终点坐标，y值
   * @returns 圆心坐标
   * {
   *  x: 圆形x坐标，
   *  y: 圆形y坐标
   * }
   */
  public getCircleCenterPoint(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    x3: number,
    y3: number
  ) {
    const a = 2 * (x2 - x1);
    const b = 2 * (y2 - y1);
    const c = x2 * x2 + y2 * y2 - x1 * x1 - y1 * y1;
    const d = 2 * (x3 - x2);
    const e = 2 * (y3 - y2);
    const f = x3 * x3 + y3 * y3 - x2 * x2 - y2 * y2;
    const x = (b * f - e * c) / (b * d - e * a);
    const y = (d * c - a * f) / (b * d - e * a);
    return { x, y };
  }

  /**
   * 传入两个点的点位坐标
   * 获取Raphael.angle返回的角度
   * @param x1 起点的x
   * @param y1 起点的y
   * @param x2 终点的x
   * @param y2 终点的y
   * @returns angle number
   *              90度
   *              |
   *              |
   * 0度/360度——— ———— ———→X  180度
   *              |
   *              |
   *              ↓
   *              Y 270度
   */
  public raphaelAngle(x1: number, y1: number, x2: number, y2: number) {
    return Raphael.angle(x1, y1, x2, y2);
  }

  /**
   * 把AGV行驶航向转为地图角度
   * @param theta
   *               90度
   *                |
   *                |
   * 180度-180度——— ———— ———→X  0度
   *                |
   *                |
   *                ↓
   *                Y -90度
   * @returns angle
   *              90度
   *              |
   *              |
   * 0度/360度——— ———— ———→X  180度
   *              |
   *              |
   *              ↓
   *              Y 270度
   */
  public thetaToAngle(theta: number) {
    return 180 - theta;
  }
  /**
   * 把AGV行驶航向转为地图角度
   * @param theta
   *               90度
   *                |
   *                |
   * 180度-180度——— ———— ———→X  0度
   *                |
   *                |
   *                ↓
   *                Y -90度
   * @returns rotate
   *              270
   *                |
   *                |
   * 180 ——— ———— ——— ———— ————→X  0/360
   *                |
   *                |
   *                ↓
   *                Y 90
   */
  public thetaToRotate(theta: number) {
    if (theta >= 0) {
      return 360 - theta;
    } else {
      return -theta;
    }
  }

  /**
   * 把AGV车返回的角度
   * 转换成transform需要的R属性（rotate）
   * @param pi number AGV车返回的航向【0, π/2, π, -π, -π/2, 0】
   * X轴上方，左极为π，右极为0
   * X轴下方，左极为-π，右极为0
   *               π/2
   *                |
   *                |
   * π/-π——— ———— ——— ———— ————→X  0
   *                |
   *                |
   *                ↓
   *                Y -π/2
   * @returns rotate number        角度【360, 270, 180, 90, 0】
   * X轴上方，左极为180度，右极为360度
   * X轴下方，左极为180度，右极为0度
   *               270
   *                |
   *                |
   * 180 ——— ———— ——— ———— ————→X  0/360
   *                |
   *                |
   *                ↓
   *                Y 90
   * this.paper.path("M0,0 L100,0 L100,2 L102,2 L 102,-4 L100,-4, L100,0").attr({stroke: 'red'}).animate({
      '0%': {transform: Raphael.format('R{0}', 0) },
      '15%': {transform: Raphael.format('R{0}', 45) },
      '30%': {transform: Raphael.format('R{0}', 90) },
      '45%': {transform: Raphael.format('R{0}', 135) },
      '60%': {transform: Raphael.format('R{0}', 180) },
      '70%': {transform: Raphael.format('R{0}', 225) },
      '80%': {transform: Raphael.format('R{0}', 270) },
      '90%': {transform: Raphael.format('R{0}', 315) },
      '100%': {transform: Raphael.format('R{0}', 360) }
    }, 20000, 'linear')
   */
  public piToRotate = (pi: number): number => {
    let rotate: number = 0;
    if (pi > 0) {
      // 航向大于0，指向X轴上方，左极为π（对应角度180度），右极为0（对应角度360度）
      rotate = 360 - (180 * pi) / Math.PI;
    } else {
      // 航向小于0，指向X轴下方，左极为-π（对应角度180度），右极为0（对应角度0度）
      rotate = -((180 * pi) / Math.PI);
    }
    return Number(rotate.toFixed(0));
  };

  /**
   * π类型AGV航向转0~180度类型航向
   * @param pi
   * X轴上方，左极为π，右极为0
   * X轴下方，左极为-π，右极为0
   *               π/2
   *                |
   *                |
   * π/-π——— ———— ——— ———— ————→X  0
   *                |
   *                |
   *                ↓
   *                Y -π/2
   * @returns theta
   *               90度
   *                |
   *                |
   * 180度-180度——— ———— ———→X  0度
   *                |
   *                |
   *                ↓
   *                Y -90度
   */
  public piToTheta(pi: number): number {
    return (180 * pi) / Math.PI;
  }
  /**
   * 0~180度类型航向转π类型AGV航向
   
   * @param theta
   *               90度
   *                |
   *                |
   * 180度-180度——— ———— ———→X  0度
   *                |
   *                |
   *                ↓
   *                Y -90度
   * @returns pi
   * X轴上方，左极为π，右极为0
   * X轴下方，左极为-π，右极为0
   *               π/2
   *                |
   *                |
   * π/-π——— ———— ——— ———— ————→X  0
   *                |
   *                |
   *                ↓
   *                Y -π/2
   */
  public thetaToPi(theta: number): number {
    return (theta * Math.PI) / 180;
  }
  /**
   * 0~360度类型旋转角度转π类型AGV航向
   
   * @param rotate
   *               270
   *                |
   *                |
   * 180 ——— ———— ——— ———— ————→X  0/360
   *                |
   *                |
   *                ↓
   *                Y 90
   * @returns pi
   * X轴上方，左极为π，右极为0
   * X轴下方，左极为-π，右极为0
   *               π/2
   *                |
   *                |
   * π/-π——— ———— ——— ———— ————→X  0
   *                |
   *                |
   *                ↓
   *                Y -π/2
   */
  public rotateToPi(rotate: number): number {
    if (rotate > 180) {
      return ((360 - rotate) * Math.PI) / 180;
    } else {
      return -(rotate * Math.PI) / 180;
    }
  }

  /**
   * 获取当前元素实时的Transform的Rotate值
   * @param ele Raphael元素
   * @returns rotate number
   */
  private getEleCurrentTransformRotate(ele: any): number {
    const transformArr = ele.transform();
    const rotateArr = transformArr.find((row: any) => {
      return row[0] === "R";
    });
    return rotateArr ? rotateArr[1] : 0;
  }

  /**
   * 获取两点之间的直线距离
   * @param x1 开始点位的x值
   * @param y1 开始点位的y值
   * @param x2 结束点位的x值
   * @param y2 结束点位的y值
   * @returns length number
   */
  private getLengthBetweenTwoPoints(
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    return Raphael.getTotalLength(
      Raphael.format("M{0},{1} L{2},{3}", x1, y1, x2, y2)
    );
  }
  /***********************************************************
   * 角度、圆弧计算相关 end
   */

  /***********************************************************
   * 便捷函数 start
   */
  /**
   * 输入地图坐标xy值，返回AGV真实坐标字串
   * @param x
   * @param y
   * @param precision 保留的小数位数
   * @param coordinateType 数据转换类型：
   *  0 不转换
   *  1 地图坐标转真实坐标
   *  2 真实坐标转地图坐标
   * @returns String
   */
  public getCoordinateTextStr(
    x: number | undefined = undefined,
    y: number | undefined = undefined,
    precision: number = 2,
    coordinateType: number = 1
  ) {
    if (x === undefined || y === undefined) return "";
    if (coordinateType === 1) {
      return `${this.mathRound(this.getRealCoordiateX(x), precision)},${this.mathRound(
        this.getRealCoordiateY(y),
        precision
      )}`;
    } else if (coordinateType === 2) {
      return `${this.mathRound(this.getMapCoordiateX(x), precision)},${this.mathRound(
        this.getMapCoordiateY(y),
        precision
      )}`;
    }
    return `${this.mathRound(x, precision)},${this.mathRound(y, precision)}`;
  }
  /**
   * 数字四舍五入方法
   * @param number 需要四舍五入的数字
   * @param precision 需要四舍五入的小数点后位数
   * @returns
   */
  public mathRound = (number: number, precision: number) => {
    const times = Math.pow(10, precision);
    return Math.round((Number(number) || 0) * times) / times;
  };
  /**
   * 判断是否为数字
   * @param value
   * @returns
   */
  public isNumber = (value: any) => {
    if (typeof value === "number" && Number.isFinite(value)) {
      return true;
    } else if (typeof value === "string") {
      if (value === "") return false;
      return !isNaN(Number(value));
    }
    return false;
  };
  /***********************************************************
   * 便捷函数 end
   */

  /**
   * 清除Raphael的画布的所有绘画项目
   * 清除panzoom
   */
  public dispose() {
    Object.assign(this._mapOriginData, this._mapOriginDataInit);
    this.mapClassifyData.clear;
    this.elementNamesRendered = [];
    this.backgroundImgData = JSON.parse(
      JSON.stringify(this._backgroundImgDataInit)
    );
    Object.assign(this._renderSwitch, this._renderSwitchInit);
    this._outlineData = JSON.parse(JSON.stringify(this._outlineDataInit));
    Object.assign(this._viewBoxParams, { value: [] });
    Object.assign(this._paperStatus, this._paperStatusInit);
    Object.assign(this.panzoomStatus, this._panzoomStatusInit);
    this.vnlOutlineData = JSON.parse(JSON.stringify(this._vnlOutlineDataInit));
    // 过滤数据，也暂时不清理，每次更换地图时，需要保持上一次的过滤状态
    // this._renderFilter = JSON.parse(JSON.stringify(this._renderFilterInit));
    // 但是库位层数要重置为1
    this._renderFilter.layer.current = 1;
    // 覆盖标识物数据，暂时不自动清理
    /* Object.values(this._agvConfig).forEach((agvEntry: any) => {
      agvEntry.destroy()
    })
    this._agvConfig = {}
    Object.assign(this._markerRendered, this._markerRenderedInit) */

    this.paper?.clear();
    this.paper?.remove();
    this.paper = null;
    this.panzoom?.dispose();
    this.panzoom = null;
  }
}
