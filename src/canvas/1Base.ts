import * as PIXI from "pixi.js";
import {
  IMark,
  IOutline,
  IOrderArea,
  IOutlineData,
  IParkTag,
  IPoint,
  IRuleArea,
  ITruckArea,
  ITruckPark,
  IFilter,
  IAgvConfig,
  ITempPark,
  IOutlineEleData,
} from "./Interface";
import COMMON_IMGS from "../images/commonBase64";

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
 * @value rotation 的坐标系
 *              3π/2
 *                |
 *                |
 *  π ——— ———— ——— ———— ————→X  0/2π
 *                |
 *                |
 *                ↓
 *                Y π/2
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
 * @value angle
 *             270度
 *              |
 *              |
 * 180度——— —————— ———— ——→X  0度/360度
 *              |
 *              |
 *              ↓
 *              Y 90度
 */

export default class Base {
  /**
   * 地图主容器
   */
  protected mainContainer: PIXI.Container;
  constructor() {
    // 创建整体地图container
    this.mainContainer = new PIXI.Container();
  }
  /**
   * 当前版本号，每次更新内部渲染逻辑必须更新，否则会有缓存问题
   */
  public version = '2.18.6'
  /**
   * 获取缓存关键信息列表的key
   */
  protected _cacheName = 'map_render_cache'
  /**
   * 地图原始数据哈希值
   */
  protected _mapOriginDataHashKey = "";
  /**
   * 是否开启缓存
   * @default true
   */
  protected isCache = true;
  /**
   * 是否开启抗锯齿
   */
  protected _antialias = false
  /**
   * 加载中元素
   */
  protected _loadingElement: HTMLElement
  /**
   * 生成一个加载动画
   */
  public addLoadingAnimation() {
    if (!this.contentDom || !(this.contentDom instanceof HTMLElement)) return
    // 创建loading盒子
    // 创建一个居中显示的 GIF 图片元素
    const loadingImg = document.createElement('img');
    loadingImg.src = COMMON_IMGS['loading'];
    loadingImg.style.position = 'absolute';
    loadingImg.style.top = '50%';
    loadingImg.style.left = '50%';
    loadingImg.style.width = '128px';
    loadingImg.style.transform = 'translate(-50%, -50%)';
    loadingImg.style.zIndex = '1000'; // 确保在最前面显示
    this.contentDom.appendChild(loadingImg);
    this._loadingElement = loadingImg
  }
  /**
   * 移除加载动画
   * @returns
   */
  public removeLoadingAnimation() {
    if (!this._loadingElement || !this.contentDom || !(this.contentDom instanceof HTMLElement)) return
    this.contentDom.removeChild(this._loadingElement)
  }
  /**
   * 预置配置数据，一般不动态修改
   * 地图数据单位缩放倍数，地图数据单位为m，展示需要展示mm
   */
  protected _unitZoom = 100;
  /**
   * 坐标系偏移值
   */
  protected _offsetX = 0;
  protected _offsetY = 0;
  /**
   * HTML容器元素
   */
  protected contentDom: HTMLElement;
  /**
   * 地图元素当前平移缩放数据
   */
  protected _panzoom = {
    scale: 1,
    offsetX: 0,
    offsetY: 0,
  };
  /**
   * 地图临界缩放级别，下限值
   * 低于这个值，会渲染低配版的元素缩略图
   * 部分不重要的元素会直接不渲染
   * 重要元素也会简化显示，因为太小了，本身也看不清明细
   */
  protected criticalScaleMin: number = 0.1;
  /**
   * Raphael创建的canvas画图对象
   */
  protected app: PIXI.Application;

  /**
   * 地图原始数据
   * originData 后端传来的原始vnl地图数据,json: 需要渲染的地图源数据，当前版本为JSON对象的字串
   * rectangle: 地图范围数据
   * rectangleCustom?: 地图自定义范围数据
   */
  private _mapOriginDataInit = {
    rectangle: {
      left: 0,
      right: 0,
      bottom: 0,
      top: 0,
      width: 0,
      height: 0,
    } as IOutline,
    rectangleCustom: null,
    originData: "",
  };
  protected _mapOriginData = Object.assign({}, this._mapOriginDataInit);
  /**
   * 初始化VNL原始数据
   */
  protected _initMapOriginData() {
    Object.assign(this._mapOriginData, this._mapOriginDataInit);
  }

  /**
   * 是否变更了一张新的地图
   * 用于判断切换地图时刷新markRender数据
   */
  protected _isChangeMap: boolean = false

  /**
   * 预置配置数据，一般不动态修改
   * 本库支持渲染的元素类型
   */
  protected _elementRenderSuppot: string[] = [
    // 支持渲染的元素，数组中的排序代表渲染先后顺序
    "Park", // 库位， 库位ID文字和库位一起渲染，ParkIdText
    "AGVPath", // 行车路线
    "AGVPathPoint", // 路径节点
    "Text", // 文本
    "LineShape", // 直线
    "Mark", // 二维码点
  ];
  /**
   * 源数据分类后的json数据
   */
  protected _mapClassifyData = {
    AGVPath: [], // 行车路线
    // AGVPathPoint: [], // 行车路线开始和结束节点元素，已在处理路径时一起处理
    Park: [], // 库位元素
    // ParkId: [], // 库位的Id展示，text元素，已合并进Park
    Mark: [], // 二维码方块元素
    LineShape: [], // 直线元素
    Text: [], // 文本元素
  };

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
    origin: false, // 是否原点坐标系
    dataReady: false, // 原始数据是否准备好
    completed: false, // 渲染完成
  };
  protected rendering: boolean = false; // 是否正在渲染
  protected _renderSwitch = Object.assign({}, this._renderSwitchInit);
  protected _initRenderSwitch() {
    Object.assign(this._renderSwitch, this._renderSwitchInit);
  }


  /**
   * 库位路径校验
   * 校验库位是否必须绑定倒车路径
   * 影响库位事件绑定
   */
  protected _parkPathValidate: boolean | string = false

  /**
   * 元素显示状态
   */
  protected _renderShowStatus: IFilter = JSON.parse(JSON.stringify(this._renderSwitchInit));
  /**
   * 初始化显示状态
   */
  protected _initRenderShowStatus() {
    this._renderShowStatus = JSON.parse(JSON.stringify(this._renderSwitchInit));
  }

  /**
   * 元素渲染配置数据
   */
  protected elementConfig = {
    backgroundImg: {
      zIndex: {
        // 层级或索引
        container: -7, // 底图容器的层级
      },
    },
    regress: {
      // 标识覆盖层
      zIndex: {
        container: -6,
      },
    },
    system: {
      // 坐标系统
      zIndex: {
        container: -5,
      },
      color: {
        originX: 0xEB2829,
        originY: 0x999999,
      },
      size: {
        originX: 70,
        originY: 70,
        arrows: 10,
      },
      width: {
        originX: 1,
        originY: 1,
        arrows: 10,
      }
    },
    covers: {
      // 标识覆盖层
      zIndex: {
        container: -4,
        normal: -4,
        float: 10,
      },
    },
    Text: {
      // 文本
      zIndex: {
        // 层级或索引
        container: -3, // 文案容器的层级
      },
      color: {
        default: 0xeb2829,
      },
      size: {
        space: 10,
      },
      performance: {
        count: 0,
        uniqueCount: 0,
        time: 0,
      },
    },
    LineShape: {
      // 直线
      zIndex: {
        container: -2,
      },
      size: {
        default: 1,
      },
      color: {
        default: 0xcccccc,
      },
      performance: {
        count: 0,
        uniqueCount: 0,
        time: 0,
      },
    },
    Mark: {
      // 二维码
      zIndex: {
        container: -1,
      },
      size: {
        default: 1,
      },
      color: {
        default: 0xcccccc,
        fill: 0xfef263,
      },
      performance: {
        count: 0,
        uniqueCount: 0,
        time: 0,
      },
    },
    AGVPath: {
      // 行车路线
      zIndex: {
        container: 0,
        default: 0,
        control: 1,
        move: 2,
        assist: 3,
      },
      typeList: ["move", "control", "assist"], // 目前支持的标识路径类型
      color: {
        // 颜色
        default: 0x6a91e6, // 0xcccccc  #FFD900 #FEF263
        forward: 0x32cd32, // #00FA9A #2E8B57 #00FF00 #7CFC00 #228B22 #006400 #32CD32
        back: 0xeb2829,
        control: 0xed7b00,
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
        forward: 1,
        back: 1,
        assist: 0.5,
        control: 0.5,
      },
      mode: {
        // 当前路径数据形式
        control: "", // array/string
      },
      performance: {
        count: 0,
        uniqueCount: 0,
        time: 0,
      },
    },
    AGVPathPoint: {
      zIndex: {
        container: 2,
        default: 0,
        candidate: 1,
      },
      // 路径节点
      size: {
        r: 5,
      },
      color: {
        // 颜色
        default: 0x1d4ad4,
        fill: 0xffffff, // transparent
        candidate: 0xeb2829,
        select: 0xeb2829,
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
      suffix: {
        // 后缀
        select: "_select",
      },
      performance: {
        count: 0,
        uniqueCount: 0,
        time: 0,
      },
    },
    Park: {
      // 库位
      zIndex: {
        container: 1,
        stock: -2,
        candidate: -1,
        parkId: 0,
        park: 1,
        typeTag: 2,
        numTag: 3,
        inferTag: 4,
      },
      color: {
        // 颜色
        default: 0x6a91e6,
        stock: 0x1dd4cd,
        candidate: 0xeb2829,
        selected: 0xeb2829,
        parking: 0xed7b00,
        charging: 0x08b562,
        truck: 0x262626, // '#A3C6FF', '#262626'
      },
      width: {
        // 宽度
        default: 2,
        selected: 3,
      },
      rotateMode: {
        // 库位角度值模式
        // 库位默认角度值模式
        // 仅仅记录用
        default: "pi", // [pi, theta, rotate]
        truck: "theta",
      },
      performance: {
        count: 0,
        uniqueCount: 0,
        time: 0,
      },
    },
    ParkId: {
      // 库位编号
      color: {
        // 颜色
        default: 0x000000,
        fill: 0x000000,
      },
      performance: {
        count: 0,
        uniqueCount: 0,
        time: 0,
      },
    },
    vnlOutline: {
      // VNL轮廓元素
      zIndex: {
        // 层级或索引
        container: 3, // 轮廓的层级
      },
    },
    draw: {
      // 绘制图层
      zIndex: {
        // 层级或索引
        container: 4, // 绘制的层级
        point: 2,
        line: 1,
      },
      size: {
        point: 6,
        line: 2
      },
      color: {
        point: 0x1D4AD4,
        pointSelected: 0xEB2829,
        line: 0x1D4AD4,
        lineSelected: 0xEB2829,
      },
    },
    Agv: {
      demarcate: false, // 是否标定模式
    },
    Truck: {
      color: {
        default: 0x505050, // #84E0BD
      },
      width: {
        default: 2,
      },
    },
    Area: {
      zIndex: {
        // 层级
        order: -4,
        rule: -4,
        truck: -4,
      },
      color: {
        border: 0x505050,
        bg: 0x505050,
      },
      width: {
        default: 2,
      },
    },
  };
  /**
   * 记录当前这次渲染，已渲染的元素集合
   */
  private _elementRenderedInit = {
    regress: {
      // 回归元素
      container: new PIXI.Container(),
    },
    system: {
      // 坐标系统信息，如原点坐标轴等
      container: new PIXI.Container(),
      objObj: {
        origin: new PIXI.Container(), // Container()
      }
    },
    covers: {
      // 覆盖物层，如起终点标识、AGV动画等
      container: new PIXI.Container(),
    },
    Text: {
      // 文本
      container: new PIXI.Container(),
      mapObj: {
        data: new Map(),
        text: new Map(), // new Map([textId, new PIXI.Text()])
      },
    },
    LineShape: {
      // 直线
      container: new PIXI.Container(),
      texture: new PIXI.Graphics() as PIXI.Graphics, // 整块的GraphicsContext纹理
      mapObj: {
        data: new Map(),
      },
    },
    Mark: {
      // 二维码
      container: new PIXI.Container(),
      texture: new PIXI.Graphics() as PIXI.Graphics, // 整块的GraphicsContext纹理
      mapObj: {
        data: new Map(),
      },
    },
    AGVPath: {
      // 行车路线
      container: new PIXI.Container(),
      texture: new PIXI.Graphics() as PIXI.Graphics, // 整块的GraphicsContext纹理
      mapObj: {
        data: new Map(), // 存储路径元素初始化后的系列数据， new Map([pathId, pathData])
        selected: new Map(), // new Map([pathId, Graphics])
        control: new Map(), // new Map([pathId, Graphics])
        assist: new Map(), // new Map([pathId, Graphics])
      },
      setObj: {
        data: new Set(), // 渲染效果不重复的路径数据
      },
    },
    AGVPathPoint: {
      // 路径节点
      container: new PIXI.Container(),
      mapObj: {
        // key是去重之后的，值是数组包含当前key对应的所有点
        data: new Map(), // 存储点位元素初始化后的系列数据 new Map([点坐标'x,y', pathData[]])
        // 点位纹理
        texture: new Map(), // new Map([点半径和宽'radius_strokeWidth', new Graphics()])
        // 点位元素，渲染效果不重复
        point: new Map(), // new Map([点坐标'x,y', new Graphics()])
        pathway: new Map(), // new Map([点坐标'x,y', new Container()])
        start: new Map(), // new Map([点坐标'x,y', new Container()])
        end: new Map(), // new Map([点坐标'x,y', new Container()])
        close: new Map(), // new Map([点坐标'x,y', new Container()])
      },
      setObj: {
        data: new Set(), // 渲染效果不重复的点位数据, new Set({key,x,y,radius})
        candidate: new Set(), // 候选点标识
      },
    },
    Park: {
      // 库位元素
      container: new PIXI.Container(),
      containerObj: {
        stock: new PIXI.Container(),
        candidate: new PIXI.Container(),
        parkId: new PIXI.Container(),
        park: new PIXI.Container(),
        typeTag: new PIXI.Container(),
        numTag: new PIXI.Container(),
        inferTag: new PIXI.Container(),
        spareTag: new PIXI.Container(),
      },
      setObj: {
        // 按照类型存储库位的Id
        SingleDirection: new Set(),
        DualDirection: new Set(),
        FourDirection: new Set(),
        Normal: new Set(),
        AGVPark: new Set(),
        ChargingPark: new Set(),
        visible: new Set(), // 可见
      },
      mapObj: {
        // 存储各个库位渲染用数据
        data: new Map(), // 存储库位元素初始化后的系列数据
        // 存储库位缩略图形纹理等
        texture: new Map(), // new Map([[this.criticalScaleMin, ''], Graphics(GraphicsContext)])
        // 保存库位功能、模式、类型、大小唯一的库位纹理，便于Graphics图形对象复用
        graphicsTexture: new Map(), // 存储库位texture，new Map([key, GraphicsContext])
        // 选中的库位，不新建，只对下面park中的元素进行存储+改样式和恢复样式+去存储，
        selected: new Map(), // new Map([parkId, Graphics()])
        // 单个库位图形，存储库位图形对象
        park: new Map(), // 存储库位预备渲染的Graphics，new Map([parkId, Graphics()])
        // 存储库位ID文案对象
        parkId: new Map(), // new Map([parkId, Text()])
        // 存储库位有无货对象
        stock: new Map(), // new Map([parkId, Graphics()])
        // 存储库位候选对象
        candidate: new Map(), // new Map([parkId, Graphics()])
        // 库位类型标记
        typeTag: new Map(), // new Map([parkId, Sprite()]),
        // 库位编号
        numTag: new Map(), // new Map([parkId, Text()]),
        // 库位推导标记
        inferTag: new Map(), // new Map([parkId, Sprite()]),
        // 库位备用标识
        spareTag: new Map(), // new Map([parkId, Text()]),
        // 临时库位
        temp: new Map(), // new Map([parkId, Graphics()]),
      },
    },
    information: {
      // 进出路线数据，涉及路径和库位的对应关系
      objObj: {
        parkToPath: {}, // {key(information string) => {parkId => pathId}}
        pathToPark: {}, // {key(information string) => {pathId => parkId}}
      },
    },
    orderArea: {
      // 订单区域
      container: new PIXI.Container(),
    },
    ruleArea: {
      // 规则区域
      container: new PIXI.Container(),
      mapObj: {
        data: new Map(), // new Map([area.uuid, IRectRange]),
        area: new Map(), // new Map([area.uuid, Container()]),
      },
      objObj: {
        draw: {} as IOutlineEleData,
      },
    },
    truckArea: {
      // 货柜车区域
      container: new PIXI.Container(),
      mapObj: {
        area: new Map(), // new Map([area.uuid, Container()]),
      },
    },
    outline: {
      // 轮廓
      container: new PIXI.Container(),
      objObj: {
        vnl: {
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
        } as IOutlineEleData,
      },
    },
    backgroundImg: {
      // 底图
      container: new PIXI.Container(),
      mapObj: {
        img: new Map(), // new Map([url, Sprite()]),
        texture: new Map(), // new Map([url, Texture()]),
      },
    },
    candidateRange: {
      // 候选框
      // 涉及多个元素选择时出现的选择范围虚框
      container: new PIXI.Container(),
    },
    draw: {
      // 绘制层
      container: new PIXI.Container(),
      containerObj: {
        point: new PIXI.Container(),
        line: new PIXI.Container(),
      },
      mapObj: {
        pointData: new Map(), // new Map([id, pointData<IPoint>])
        point: new Map(), // new Map([id, Graphics()])
        pointSelected: new Map(), // new Map([id, Container()])
        tempLineData: new Map(), // new Map([id, lineData]) 未确认的线数据
        tempLine: new Map(), // new Map([id, Graphics()]) 未确认的线元素
        lineData: new Map(), // new Map([id, lineData]) 确认过的线数据
        line: new Map(), // new Map([id, Graphics()]) 确认过的线元素
        lineSelected: new Map(), // new Map([id, Container()])
      },
    },
    railway: {
      // agv返回轨道
      mapObj: {
        railway: new Map(), // new Map([pathId, Graphics])
        path: new Map(), // new Map([pathId, Graphics])
        agv: new Map(), // new Map([agvId, Container])
      }
    }
  };
  protected elementRendered = Object.assign({}, this._elementRenderedInit);

   /**
   * elementRendered对象初始化操作
   */
  protected _initElementRendered() {
    Object.keys(this.elementRendered).forEach((key: string) => {
      const elementRenderedObj: any =
        this.elementRendered[key as keyof typeof this.elementRendered];
      Object.keys(elementRenderedObj).forEach((key1: string) => {
        switch (key1) {
          case "container":
            // PIXI.Container();
            // Park 库位图层单独处理，库位图层有containerObj，在containerObj处重置
            if (this.elementRendered[key as keyof typeof this.elementRendered].hasOwnProperty('containerObj')) return
            elementRenderedObj[key1]?.removeChildren()
            break;
          case "texture":
            elementRenderedObj[key1]?.destroy()
            elementRenderedObj[key1] = new PIXI.Graphics() as PIXI.Graphics;
            break;
          case "containerObj":
            if (typeof elementRenderedObj[key1] === "object") {
              Object.keys(elementRenderedObj[key1]).forEach((key2: string) => {
                // new PIXI.Container();
                elementRenderedObj[key1][key2]?.removeChildren()
              })
            }
            break;
          case "map":
            elementRenderedObj[key1]?.clear()
            elementRenderedObj[key1] = new Map();
            break;
          case "set":
            elementRenderedObj[key1]?.clear()
            elementRenderedObj[key1] = new Set();
            break;
          case "setObj":
            if (typeof elementRenderedObj[key1] === "object") {
              Object.keys(elementRenderedObj[key1]).forEach((key2: string) => {
                elementRenderedObj[key1][key2]?.clear()
                elementRenderedObj[key1][key2] = new Set();
              })
            }
            break;
          case "mapObj":
            if (typeof elementRenderedObj[key1] === "object") {
              Object.keys(elementRenderedObj[key1]).forEach((key2: string) => {
                elementRenderedObj[key1][key2]?.clear()
                elementRenderedObj[key1][key2] = new Map();
              })
            }
            break;
          case "objObj":
            if (typeof elementRenderedObj[key1] === "object") {
              Object.keys(elementRenderedObj[key1]).forEach((key2: string) => {
                elementRenderedObj[key1][key2] = {};
              })
            }
            break;
        }
      })
    })
  }

  /**
   * 已渲染元素的过滤器，控制元素展示/隐藏
   */
  protected _renderFilterInit: IFilter = {
    parkClassify: {
      mode: [],
      type: [],
      information: [],
    },
    parkMode: [], // SingleDirection/DualDirection/FourDirection
    parkType: [], // Normal/AGVPark/ChargingPark
    parkInformation: [], // default/其他自定义的4个长度字符值
    layer: 1, // // 当前库位层级
    layerMaxNum: 100000, // 单层库位数量极值
    backgroundImg: false, // 是否显示分区地图底图
    vnlOutline: false, // 是否显示分区地图轮廓
    text: false, // 是否显示文字
    mark: false, // 是否显示二维码
    line: false, // 是否显示线条
    path: false, // 是否显示路径
    park: false, // 是否显示库位
    parkId: false, // 是否显示库位编号
    point: false, // 是否显示点位
  };
  protected _renderFilter: IFilter = JSON.parse(JSON.stringify(this._renderFilterInit));


  /**
   * 底图相关数据
   */
  private _backgroundImgDataInit = {
    url: "", // 背景图片URL
    // 背景底图参数，resolution:分辨率缩放比例，origin: 左下角源点坐标，negate: '0'是白底,'1'是黑底
    args: { resolution: 0, origin: [0, 0, 0], negate: 1 },
    // 底图是否是黑底
    blackBase: true,
    // 背景图真实轮廓
    rectangle: {
      left: 0,
      right: 0,
      bottom: 0,
      top: 0,
      width: 0,
      height: 0,
    } as IOutline,
  };
  protected _backgroundImgData = JSON.parse(
    JSON.stringify(this._backgroundImgDataInit)
  );
  /**
   * 初始化地图数据
   */
  protected _initbackgroundImgData() {
    this._backgroundImgData = JSON.parse(
      JSON.stringify(this._backgroundImgDataInit)
    );
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
  /**
   * 初始化轮廓数据
   */
  protected _initOutlineData() {
    this._outlineData = JSON.parse(JSON.stringify(this._outlineDataInit));
    this.outlineData = JSON.parse(JSON.stringify(this._outlineDataInit));
  }
  /**
   * 轮廓数据代理
   */
  public outlineData: IOutlineData = JSON.parse(
    JSON.stringify(this._outlineDataInit)
  );

  // 覆盖物渲染数据
  private _markerRenderedInit: IMark = {
    movePath: [] as string[] | string, // 形式路径
    ctrlPath: [] as string[] | string, // 控制路径
    orderArea: [] as IOrderArea[], // 订单区域
    ruleArea: [] as IRuleArea[], // 规则区域
    truckArea: [] as ITruckArea[], // 货柜车区域
    truckPark: [] as ITruckPark[], // 货柜车动态库位
    parkStock: [] as string[], // 有货的库位
    parkNumTag: [] as IParkTag[], // 库位序号标记
    parkInferTag: [] as IParkTag[], // 库位推断状态标记
    pathwayPoint: {} as IPoint, // 单个途经点
    pathwayPoints: [] as IPoint[], // 多个途经点
    startPoint: {} as IPoint, // 起点
    endPoint: {} as IPoint, // 终点
    selectPark: "", // 当前选中库位
    selectParks: [] as string[], // 当前选中库位集合
    tempPark: {} as ITempPark, // 临时库位
  };
  protected _markerRendered: IMark = Object.assign(
    {},
    this._markerRenderedInit
  );
  /**
   * 初始化覆盖物标识渲染
   */
  protected _initMarkerRendered() {
    this._markerRendered = Object.assign({}, this._markerRenderedInit);
  }

  /**
   * 重新绑定事件
   * @param eventName
   */
  protected _rebindEvent = (eventName: string) => {}
  /**
   * 弹出事件
   * @param eventName
   */
  protected _emitEvent = (eventName: string, params: any) => {}


  protected _agvConfig: IAgvConfig = {};

  /**
   * 元素映射关系
   */
  protected _elementKeyReflect = {
    ParkMode: {
      SingleDirection: '1',
      DualDirection: '2',
      FourDirection: '4',
    },
    ParkType: {
      Normal: 'L',
      AGVPark: 'P',
      ChargingPark: 'C',
    },
    Park: {
      ElementId: 'Id', // 库位ID @ObjectId
      Mode: 'M', // 库位模式 @Mode SingleDirection/DualDirection/FourDirection改为1/2/4
      Type: 'T', // 库位类型 @ParkType"改为"T",其值 Normal/AGVPark/ChargingPark 改为L/P/C
      Groups: 'G', // @Groups
      Length: 'L', // @Length 单位米
      Width: 'W', // @Width 单位米
      BackPathIds: 'BPI', // @BackPathId 倒车路径ID
      Angle: 'A', // @Angle
      X: 'X', // @Position{@X:'',@Y:''}” 库位坐标x值
      Y: 'Y', // @Position{@X:'',@Y:''}” 库位坐标y值
      Name: 'Name', // @Name 库位名称
      TruckId: 'TId', // @TruckID 库位所属货柜车ID
      AvailableLevels: 'AL', // @AvailableLevels 库位所在层数
    },
    AGVPath: {
      ElementId: 'Id', // 路径ID @ObjectId
      BackParkId: 'BKI', // @BackParkId 绑定的库位ID
      Forward: 'F', // @Forward 路径方向
      Groups: 'G', // @Groups
      Information: 'I', // @Information 进出路线，string
      Points: 'P', // @PathItems[{@X,@Y,@R}...]"改为"P[{X,Y,R}...]" 路径点集合,R是半径
      X: 'X',
      Y: 'Y',
      Radius: 'R',
    },
    Mark: {
      ElementId: 'Id', // 二维码ID @ObjectId
      X: 'X', // @Position{@X:'',@Y:''}” 坐标x值
      Y: 'Y', // @Position{@X:'',@Y:''}” 坐标y值
      Size: 'S', // @MarkSize 二维码尺寸
      Height: 'H', // @MarkHeight 二维码高度
      Angle: 'A', // @Angle 二维码角度
    },
    LineShape: {
      ElementId: 'Id', // 线性元素ID @ObjectId
      StartX: 'SX', // @StartX 起始点x值
      StartY: 'SY', // @StartY 起始点y值
      EndX: 'EX', // @EndX 终止点x值
      EndY: 'EY', // @EndY 终止点y值
    },
    Text: {
      ElementId: 'Id', // 文本元素ID @ObjectId
      X: 'X', // @Position{@X:'',@Y:''}” 坐标x值
      Y: 'Y', // @Position{@X:'',@Y:''}” 坐标y值
      Angle: 'A', // @Angle 角度
      Text: 'T', // @String 文本内容
      Color: 'C', // @Color 颜色
      Size: 'S',
    }
  }
  /**********************************************************************/
  /**********************************************************************/
  /**********************************************************************/
  /**                            以上是基础数据                         **/
  /**********************************************************************/
  /**********************************************************************/
  /**********************************************************************/
  /**                            以下是通用方法                         **/

  // 根据AGV坐标系值换取地图坐标系值-X
  public getMapCoordiateX(x: number) {
    return x * this._unitZoom - this._offsetX;
  }
  // 根据AGV坐标系值换取地图坐标系值-Y
  public getMapCoordiateY(y: number) {
    return y * -this._unitZoom - this._offsetY;
  }
  // 根据地图坐标系值换取AGV坐标系值-X
  public getRealCoordiateX(x: number) {
    return this.mathRound((x + this._offsetX) / this._unitZoom, 4);
  }
  // 根据地图坐标系值换取AGV坐标系值-Y
  public getRealCoordiateY(y: number) {
    return this.mathRound((y + this._offsetY) / -this._unitZoom, 4);
  }
  /***********************************************************
   * 便捷函数 start
   */

  /**
   * 传入一个库位ID，根据库位当前层级，获取这个库位的真实ID（即第一层的ID）
   * @param parkNo
   * @returns
   */
  public getBaseParkId(parkId: string) {
    const parkNumber = Number(parkId)
    if (parkNumber) {
      let parkLayerNum = this._renderFilter.layer
      let parkCountExtreme = this._renderFilter.layerMaxNum
      if (parkLayerNum && parkCountExtreme) {
        if (parkNumber > parkCountExtreme) {
          return String(parkNumber % parkCountExtreme)
        }
      }
    }
    return String(parkId)
  }
  /**
   * 根据库位ID获取指定层数的库位ID
   * @param parkId
   * @returns
   */
  public getLayerParkId(parkId: string) {
    const parkNumber = Number(parkId)
    if (parkNumber) {
      let parkLayerNum = this._renderFilter.layer
      let parkCountExtreme = this._renderFilter.layerMaxNum
      if (parkLayerNum && parkCountExtreme) {
        if (parkLayerNum === 1) {
          return parkId
        } else if (parkLayerNum > 1) {
          let parkNumI = (parkLayerNum - 1) * parkCountExtreme + parkNumber
          return String(parkNumI)
        }
      }
    }
    return parkId
  }
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
      return !isNaN(Number(value));
    } else if (typeof value === "string") {
      if (value === "") return false;
      return !isNaN(Number(value));
    }
    return false;
  };
  /***********************************************************
   * 便捷函数 end
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
  public getCircleCenterBy3Point(
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
   *
   * @param x1 圆形所在圆弧起点坐标，x值
   * @param y1 圆形所在圆弧起点坐标，y值
   * @param x2 圆形所在圆弧终点坐标，x值
   * @param y2 圆形所在圆弧终点坐标，y值
   * @param radius 圆的半径，大于0逆时针画圆弧，小于0顺时针画圆弧，等于0 为直线
   * @returns
   */
  public getCircleCenterByRadius(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    radius: number,
  ) {
    if (radius === 0) return {
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2,
    }
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const a = distance / 2;
    const radiusABS = Math.abs(radius);
    const h = Math.sqrt(radiusABS * radiusABS - a * a);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    const offsetX = (h * (y1 - y2)) / distance;
    const offsetY = (h * (x2 - x1)) / distance;
    let x,y
    if (radius < 0) {
      // 顺时针
      x = midX + offsetX;
      y = midY + offsetY;
    } else {
      // 逆时针
      x = midX - offsetX;
      y = midY - offsetY;
    }
    return { x, y };
  }

  /**
   * 传入两个点的点位坐标
   * 获取svg.angle返回的角度
   * @param x1 起点的x
   * @param y1 起点的y
   * @param x2 终点的x
   * @param y2 终点的y
   * @returns SVGangle number
   *              90度
   *              |
   *              |
   * 0度/360度——— ———— ———→X  180度
   *              |
   *              |
   *              ↓
   *              Y 270度
   */
  public lineAngle(x1: number, y1: number, x2: number, y2: number) {
    const diffX = x2 - x1;
    const diffY = y2 - y1;
    // 如果都是0，说明是一个点，不是一条线，直接返回0
    if (diffX === 0 && diffY === 0) return 0;
    // 是一条直线时
    if (diffX === 0) {
      // 竖线
      if (diffY > 0) {
        return 270;
      } else {
        return 90;
      }
    } else if (diffY === 0) {
      // 横线
      if (diffX > 0) {
        return 180;
      } else {
        return 0;
      }
    } else {
      // 斜线
      const a = (Math.atan(Math.abs(diffY) / Math.abs(diffX)) / Math.PI) * 180;
      if (diffX > 0) {
        if (diffY > 0) {
          return 180 + a;
        } else {
          return 180 - a;
        }
      } else {
        if (diffY > 0) {
          return 360 - a;
        } else {
          return a;
        }
      }
    }
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
   *             270度
   *              |
   *              |
   * 180度——— —————— ———— ——→X  0度/360度
   *              |
   *              |
   *              ↓
   *              Y 90度
   */
  public thetaToAngle(theta: number) {
    if (theta > 0) {
      return 360 - theta;
    } else {
      return -theta;
    }
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
   * @returns rotation
   *              3π/2
   *                |
   *                |
   *  π ——— ———— ——— ———— ————→X  0/2π
   *                |
   *                |
   *                ↓
   *                Y π/2
   */
  public thetaToRotate(theta: number) {
    if (theta > 0) {
      return ((360 - theta) * Math.PI) / 180;
    } else {
      return (-theta * Math.PI) / 180;
    }
  }

  /**
   * 把AGV车返回的角度
   * 转换成rotation
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
   * @returns rotation
   *              3π/2
   *                |
   *                |
   *  π ——— ———— ——— ———— ————→X  0/2π
   *                |
   *                |
   *                ↓
   *                Y π/2
   */
  public piToRotate(pi: number) {
    if (pi > 0) {
      return 2 * Math.PI - pi;
    } else {
      return -pi;
    }
  }
  /**
   * 把AGV车返回的角度
   * 转换成angle
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
   * @returns angle
   *             270度
   *              |
   *              |
   * 180度——— —————— ———— ——→X  0度/360度
   *              |
   *              |
   *              ↓
   *              Y 90度
   */
  public piToAngle(pi: number) {
    if (pi > 0) {
      return ((2 * Math.PI - pi) * 360) / (2 * Math.PI);
    } else {
      return (-pi * 360) / (2 * Math.PI);
    }
  }

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
  public angleToPi(rotate: number): number {
    if (rotate > 180) {
      return ((360 - rotate) * Math.PI) / 180;
    } else {
      return -(rotate * Math.PI) / 180;
    }
  }

  /**
   * 路径方向转AGV航向
   * * @param theta
   *               90度
   *                |
   *                |
   * 180度-180度——— ———— ———→X  0度
   *                |
   *                |
   *                ↓
   *                Y -90度
   */
  public pathToTheta(theta: number, forward: boolean = true): number {
    if (forward) return theta;
    if (theta >= 0) {
      return theta - 180;
    } else {
      return theta + 180;
    }
  }
  /***********************************************************
   * 角度、圆弧计算相关 end
   */




  /**
   * 视图操作 start
   */
  /**
   * 获取当前视口中心点数据
   * @returns
   */
  public getViewportCenter() {
    // 获取视口容器元素
    const viewportContainer = this.contentDom

    // 获取视口容器的宽度和高度
    const viewportWidth = viewportContainer.clientWidth;
    const viewportHeight = viewportContainer.clientHeight;

    // 计算鼠标相对于容器的位置
    const mouseX = viewportWidth / 2 - this.app.canvas.offsetLeft;
    const mouseY = viewportHeight / 2 - this.app.canvas.offsetTop;
    const mouseInContainerX =
      (mouseX - this.mainContainer.position.x) / this.mainContainer.scale.x;
    const mouseInContainerY =
      (mouseY - this.mainContainer.position.y) / this.mainContainer.scale.y;

    // 计算出显示在容器视口的画布的bound
    const currentViewBound = {
      mouseX,
      mouseY,
      cx: mouseInContainerX, // 中心点的X值
      cy: mouseInContainerY // 中心点的Y值
    }
    return currentViewBound
  }
  /**
   * 获取当前视口的四向坐标值
   * @returns
   */
  public getViewportRect() {
    // 计算鼠标相对于容器的位置
    const leftView = - this.app.canvas.offsetLeft
    const topView = - this.app.canvas.offsetTop
    const rightView = - this.app.canvas.offsetLeft + this.app.canvas.offsetWidth
    const bottomView = - this.app.canvas.offsetTop + this.app.canvas.offsetHeight
    const left = (leftView - this.mainContainer.position.x) / this.mainContainer.scale.x;
    const top = (topView - this.mainContainer.position.y) / this.mainContainer.scale.y;
    const right = (rightView - this.mainContainer.position.x) / this.mainContainer.scale.x;
    const bottom = (bottomView - this.mainContainer.position.y) / this.mainContainer.scale.y;

    // 计算出显示在容器视口的画布的bound
    const currentViewRect = {
      left,
      top,
      right,
      bottom
    }
    return currentViewRect
  }
  /**
   * 以当前地图中心点放大
   */
  public zoomIn() {
    const centerPoint = this.getViewportCenter()
    const zoom = 1.1

    // 更新缩放和位置
    this.mainContainer.scale.x *= zoom;
    this.mainContainer.scale.y *= zoom;

    this.mainContainer.position.x = centerPoint.mouseX - centerPoint.cx * this.mainContainer.scale.x;
    this.mainContainer.position.y = centerPoint.mouseY - centerPoint.cy * this.mainContainer.scale.y;
  }
  /**
   * 以当前地图中心点缩小
   */
  public zoomOut() {
    const centerPoint = this.getViewportCenter()
    const zoom = 0.9

    // 更新缩放和位置
    this.mainContainer.scale.x *= zoom;
    this.mainContainer.scale.y *= zoom;

    this.mainContainer.position.x = centerPoint.mouseX - centerPoint.cx * this.mainContainer.scale.x;
    this.mainContainer.position.y = centerPoint.mouseY - centerPoint.cy * this.mainContainer.scale.y;
  }
  /**
   * 移动到地图坐标处
   * @param mapX 地图的x坐标
   * @param mapY 地图的y坐标
   */
  protected panCoordinateToCenter(mapX: number, mapY: number) {
    // 根据传入的mapX和mapY，这两个地图内的坐标，将this.mainContainer上的这个点移动到this.contentDom这个容器视口的中央
    const centerPoint = this.getViewportCenter()
    const needMoveXInContainer = centerPoint.cx - mapX
    const needMoveYInContainer = centerPoint.cy - mapY
    const needMoveXInViewport = needMoveXInContainer * this.mainContainer.scale.x + this.mainContainer.position.x
    const needMoveYInViewport = needMoveYInContainer * this.mainContainer.scale.y + this.mainContainer.position.y
    // 移动到这个点
    this.mainContainer.position.x = needMoveXInViewport
    this.mainContainer.position.y = needMoveYInViewport
  }
  /**
   * 视图操作 end
   */
}
