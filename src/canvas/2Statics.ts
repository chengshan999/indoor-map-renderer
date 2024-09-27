import * as PIXI from "pixi.js";
import localforage from "localforage";
import Base from "./1Base";
import {
  IOutlineEleData,
  IPoint,
  IParkFilter,
  ILayerFilter,
  IGraphicsDrawData,
  IParkData,
} from "./Interface";
import ParkImgs from "../images/parkBase64";
import { debug } from "console";

export default class Statics extends Base {
  /**
   * 静态元素构造元素
   */
  constructor() {
    super();
    // 添加静态元素图层
    this.elementRendered.Park.container.zIndex =
      this.elementConfig.Park.zIndex.container;
    this.mainContainer.addChild(this.elementRendered.Park.container);
    this.elementRendered.AGVPath.container.zIndex =
      this.elementConfig.AGVPath.zIndex.container;
    this.mainContainer.addChild(this.elementRendered.AGVPath.container);
    this.elementRendered.AGVPathPoint.container.zIndex =
      this.elementConfig.AGVPathPoint.zIndex.container;
    this.mainContainer.addChild(this.elementRendered.AGVPathPoint.container);
    this.elementRendered.Mark.container.zIndex =
      this.elementConfig.Mark.zIndex.container;
    this.mainContainer.addChild(this.elementRendered.Mark.container);
    this.elementRendered.LineShape.container.zIndex =
      this.elementConfig.LineShape.zIndex.container;
    this.mainContainer.addChild(this.elementRendered.LineShape.container);
    this.elementRendered.Text.container.zIndex =
      this.elementConfig.Text.zIndex.container;
    this.mainContainer.addChild(this.elementRendered.Text.container);
    this.elementRendered.backgroundImg.container.zIndex =
      this.elementConfig.backgroundImg.zIndex.container;
    this.mainContainer.addChild(this.elementRendered.backgroundImg.container);
    this.elementRendered.outline.container.zIndex =
      this.elementConfig.vnlOutline.zIndex.container;
    this.mainContainer.addChild(this.elementRendered.outline.container);
    this.elementRendered.system.container.zIndex =
      this.elementConfig.system.zIndex.container;
    this.mainContainer.addChild(this.elementRendered.system.container);

    // 处理库位内部图层
    this.elementRendered.Park.container.addChild(
      this.elementRendered.Park.containerObj.stock
    );
    this.elementRendered.Park.container.addChild(
      this.elementRendered.Park.containerObj.candidate
    );
    this.elementRendered.Park.container.addChild(
      this.elementRendered.Park.containerObj.numTag
    );
    this.elementRendered.Park.container.addChild(
      this.elementRendered.Park.containerObj.inferTag
    );
    this.elementRendered.Park.container.addChild(
      this.elementRendered.Park.containerObj.parkId
    );
    this.elementRendered.Park.container.addChild(
      this.elementRendered.Park.containerObj.park
    );
    this.elementRendered.Park.container.addChild(
      this.elementRendered.Park.containerObj.typeTag
    );
    this.elementRendered.Park.container.addChild(
      this.elementRendered.Park.containerObj.spareTag
    );
  }
  /**
   * 记录当前这次渲染，已渲染的元素名称
   */
  protected elementNamesRendered: string[] = [];

  /**
   * 按照可支持元素列表渲染所有静态元素
   */
  protected renderStaticElements() {
    return new Promise((resolve, reject) => {
      try {
        Promise.all([
          this.renderVnlElements(), // 渲染VNL元素
          this.renderBackgroundImg(), // 生成背景图
          this.renderVnlOutline(), // 渲染地图轮廓
          this.renderOriginCoordinate(), // 渲染原点坐标系
        ]).then(() => {
          resolve("complete");
        });
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * 渲染VNL地图元素
   */
  private renderVnlElements = async () => {
    if (this._renderSwitch.vnl) {
      // 记录需要渲染的元素列表
      this.elementNamesRendered = this._elementRenderSuppot.filter(
        (name: string) => {
          switch (name) {
            case "Park":
              return this._renderSwitch.park;
            case "AGVPath":
              return this._renderSwitch.path;
            case "Text":
              return this._renderSwitch.text;
            case "Mark":
              return this._renderSwitch.mark;
            case "LineShape":
              return this._renderSwitch.line;
            default:
              return false;
          }
        }
      );

      // 无缓存时的处理方式
      const renderInitNoCache = () => {
        // 遍历渲染
        this._elementRenderSuppot.forEach((eleName: string) => {
          if (this._mapClassifyData.hasOwnProperty(eleName)) {
            const JSONArr =
              this._mapClassifyData[
                eleName as keyof typeof this._mapClassifyData
              ];
            const renderMethod =
              this[`${eleName}InitRenderBatch` as keyof Statics];
            renderMethod(JSONArr);
          }
        });
        // 打印性能统计
        // performanceData
        console.table({
          Text: this.elementConfig["Text"].performance,
          LineShape: this.elementConfig["LineShape"].performance,
          Mark: this.elementConfig["Mark"].performance,
          AGVPath: this.elementConfig["AGVPath"].performance,
          AGVPathPoint: this.elementConfig["AGVPathPoint"].performance,
          Park: this.elementConfig["Park"].performance,
          ParkId: this.elementConfig["ParkId"].performance,
        });
      };

      // 判断是否需要应用缓存
      let isApplyCache = true;
      // 如不能应用，则直接删除缓存
      // 获取当前版本和缓存版本
      const _cacheInfo = await localforage.getItem(this._cacheName);
      if (_cacheInfo) {
        const _cacheInfoObj = _cacheInfo;
        const _cacheVersion = _cacheInfoObj.version;
        if (_cacheVersion !== this.version) {
          isApplyCache = false;
          // 版本不同，需要清理缓存
          const _cacheKeys = _cacheInfoObj.keys;
          if (_cacheKeys && Array.isArray(_cacheKeys)) {
            _cacheKeys.forEach((key: string) => {
              localforage.removeItem(key);
            });
          }
          // 然后重新设置版本信息
          await localforage.setItem(this._cacheName, {
            version: this.version,
            keys: [],
          });
        }
      } else {
        isApplyCache = false;
        // 设置缓存版本
        await localforage.setItem(this._cacheName, {
          version: this.version,
          keys: [],
        });
      }

      // 判断是否有缓存
      if (this.isCache && this._mapOriginDataHashKey) {
        const _data = await localforage.getItem(this._mapOriginDataHashKey);
        if (isApplyCache && _data) {
          // 有缓存，读缓存数据渲染
          // 解析为对象数据
          try {
            console.time("读取缓存数据");
            const cacheDataPrepare = _data;
            console.log("cacheDataPrepare", cacheDataPrepare);
            // 保存缓存数据
            for (const key in cacheDataPrepare) {
              if (typeof cacheDataPrepare[key] === "object") {
                // 是对象继续遍历
                for (const key1 in cacheDataPrepare[key]) {
                  if (typeof cacheDataPrepare[key][key1] === "object") {
                    for (const key2 in cacheDataPrepare[key][key1]) {
                      switch (key1) {
                        case "mapObj":
                          // Map对象
                          this.elementRendered[key][key1][key2] = new Map(
                            Object.entries(cacheDataPrepare[key][key1][key2])
                          );
                          break;
                        case "setObj":
                          // Set对象
                          this.elementRendered[key][key1][key2] = new Set(
                            cacheDataPrepare[key][key1][key2]
                          );
                          break;
                        default:
                          // object对象
                          this.elementRendered[key][key1][key2] =
                            cacheDataPrepare[key][key1][key2];
                          break;
                      }
                    }
                  }
                }
              }
            }
            console.timeEnd("读取缓存数据");
            // 遍历渲染
            this.elementNamesRendered.forEach((eleName: string) => {
              const renderMethod =
                this[`${eleName}InitRenderBatch` as keyof Statics];
              renderMethod([], true);
            });
            // performanceData
            console.table({
              Text: this.elementConfig["Text"].performance,
              LineShape: this.elementConfig["LineShape"].performance,
              Mark: this.elementConfig["Mark"].performance,
              AGVPath: this.elementConfig["AGVPath"].performance,
              AGVPathPoint: this.elementConfig["AGVPathPoint"].performance,
              Park: this.elementConfig["Park"].performance,
              ParkId: this.elementConfig["ParkId"].performance,
            });
          } catch (e) {
            console.log("地图缓存数据解析失败：", e);
            // 直接读原始数据
            renderInitNoCache();
          }
        } else {
          // 无缓存，读原始数据渲染
          renderInitNoCache();
          // 生成缓存数据
          const cacheDataPrepare = {
            Text: {
              mapObj: {
                data: Object.fromEntries(
                  this.elementRendered.Text.mapObj.data.entries()
                ),
              },
            },
            LineShape: {
              mapObj: {
                data: Object.fromEntries(
                  this.elementRendered.LineShape.mapObj.data.entries()
                ),
              },
            },
            Mark: {
              mapObj: {
                data: Object.fromEntries(
                  this.elementRendered.Mark.mapObj.data.entries()
                ),
              },
            },
            AGVPath: {
              mapObj: {
                data: Object.fromEntries(
                  this.elementRendered.AGVPath.mapObj.data.entries()
                ),
              },
              setObj: {
                data: Array.from(this.elementRendered.AGVPath.setObj.data),
              },
            },
            AGVPathPoint: {
              mapObj: {
                data: Object.fromEntries(
                  this.elementRendered.AGVPathPoint.mapObj.data.entries()
                ),
              },
              setObj: {
                data: Array.from(this.elementRendered.AGVPathPoint.setObj.data),
              },
            },
            Park: {
              mapObj: {
                data: Object.fromEntries(
                  this.elementRendered.Park.mapObj.data.entries()
                ),
              },
              setObj: {
                Normal: Array.from(this.elementRendered.Park.setObj.Normal),
                AGVPark: Array.from(this.elementRendered.Park.setObj.AGVPark),
                ChargingPark: Array.from(
                  this.elementRendered.Park.setObj.ChargingPark
                ),
                SingleDirection: Array.from(
                  this.elementRendered.Park.setObj.SingleDirection
                ),
                DualDirection: Array.from(
                  this.elementRendered.Park.setObj.DualDirection
                ),
                FourDirection: Array.from(
                  this.elementRendered.Park.setObj.FourDirection
                ),
              },
            },
            information: {
              objObj: {
                parkToPath: this.elementRendered.information.objObj.parkToPath,
                pathToPark: this.elementRendered.information.objObj.pathToPark,
              },
            },
          };
          // 缓存起来
          localforage.setItem(this._mapOriginDataHashKey, cacheDataPrepare);
          // 更新缓存列表
          localforage.getItem(this._cacheName).then((_cacheInfo) => {
            if (_cacheInfo) {
              const _cacheInfoObj = _cacheInfo;
              _cacheInfoObj.keys.push(this._mapOriginDataHashKey);
              localforage.setItem(this._cacheName, _cacheInfoObj);
            } else {
              localforage.setItem(this._cacheName, {
                version: this.version,
                keys: [],
              });
            }
          });
        }
      } else {
        // 没有生成缓存唯一识别码 HASH
        // 直接读原始数据
        renderInitNoCache();
      }
    }
  };

  /**
   * 缩放率变更时，重绘机制
   */
  protected scaleStaticElements(newScale: number, oldScale: number) {
    const newScaleStatus = newScale < this.criticalScaleMin;
    const oldScaleStatus = oldScale < this.criticalScaleMin;
    if (newScaleStatus !== oldScaleStatus) {
      // 突破criticalScaleMin才需要重新渲染
      // 且只有这一个临界值
      // 缩小到0.1以下，已经无法正常看到库位以外的内容了
      // 删除库位元素以外的内容，库位变为矩形
      this._elementRenderSuppot
        .filter((name: string) => {
          switch (name) {
            case "Park":
              return this._renderSwitch.park;
            case "AGVPath":
              return this._renderSwitch.path;
            case "AGVPathPoint":
              return this._renderSwitch.point;
            case "Text":
              return this._renderSwitch.text;
            case "Mark":
              return this._renderSwitch.mark;
            case "LineShape":
              return this._renderSwitch.line;
            default:
              return false;
          }
        })
        .forEach((eleName: string) => {
          const renderMethod =
            this[`${eleName}ScaleRenderBatch` as keyof Statics];
          renderMethod(newScale);
        });
    } else {
      // 新旧值同时大于 criticalScaleMin，或者同时小于 criticalScaleMin
      // 点位特殊处理 AGVPathPoint
      if (this._renderSwitch.point) {
        const pointScaleMax = 3;
        if (newScale > pointScaleMax) {
          // 大于最小临界值
          this.AGVPathPointScaleRenderBatch(newScale, pointScaleMax);
        }
      }
    }
  }

  /**
   * 渲染地图元素 start
   */

  /*
   * 渲染 Park start
   */
  /*
   * 库位初始化批量渲染
   * @ParkType:  普通库位 Normal/停车库位 AGVPark/充电库位 ChargingPark
   * @Mode:  单向库位 SingleDirection/双向库位 DualDirection/四向库位 FourDirection
   *
   * 默认库位朝向，如下图，然后再根据angle旋转
   * ————————
   * |
   * ————————
   * 当前这个朝向是angle=0
   */
  private ParkInitRenderBatch = (
    ParkJSONArr: any[],
    useCache: boolean = false
  ) => {
    if (!Array.isArray(ParkJSONArr)) return;

    const startTime = performance.now();

    // 执行渲染
    let doRender = this.ParkCreateSingle;
    if (this._renderSwitch.park) {
      doRender = this.ParkRenderSingle;
    }

    // 判断是否能用缓存
    if (useCache) {
      // 有缓存，读缓存数据
      const ParkArr = Array.from(
        this.elementRendered.Park.mapObj.data.values()
      );
      this.elementConfig.Park.performance.count = ParkArr.length;
      this.elementConfig.ParkId.performance.count = ParkArr.length;
      ParkArr.forEach((parkData) => {
        doRender(parkData);
      });
    } else {
      this.elementConfig.Park.performance.count = ParkJSONArr.length;
      this.elementConfig.ParkId.performance.count = ParkJSONArr.length;

      // 获取字段映射关系
      const reflectObj = this._elementKeyReflect["Park"];

      // 非缓存，读原始数据，需要二次处理
      const doData = (park: any) => {
        const mode = park[reflectObj["Mode"]], // SingleDirection/DualDirection/FourDirection
          type = park[reflectObj["Type"]], // Normal/AGVPark/ChargingPark
          pi = Number(park[reflectObj["Angle"]]),
          id = park[reflectObj["ElementId"]],
          x = park[reflectObj["X"]],
          y = park[reflectObj["Y"]],
          w = park[reflectObj["Width"]],
          l = park[reflectObj["Length"]],
          backPathIds = park[reflectObj["BackPathIds"]],
          parkLayers = park[reflectObj["AvailableLevels"]] ? park[reflectObj["AvailableLevels"]] : '',
          truckId = park[reflectObj["TruckId"]]
            ? Number(park[reflectObj["TruckId"]])
            : 0;

        // 处理原始数据
        // 存储预制好的库位数据
        const parkData: IParkData = this.ParkDataCreateSingle({
          id,
          mode,
          type,
          pi,
          x,
          y,
          w,
          l,
          backPathIds,
          parkLayers,
          truckId,
        });
        // 存储初始化后的数据
        this.elementRendered.Park.mapObj.data.set(parkData.parkId, parkData);

        return parkData;
      };
      // 判断是否需要渲染
      ParkJSONArr.forEach((park: any) => {
        const parkData: IParkData = doData(park);
        doRender(parkData);
      });
    }
    this.elementConfig.Park.performance.time = performance.now() - startTime;
  };
  /**
   * 组装单个库位元素并渲染
   * @param parkData
   */
  protected ParkRenderSingle = (parkData: IParkData) => {
    // 渲染库位ID元素
    const parkIdText = this.ParkIdRenderSingle(parkData);
    this.elementRendered.Park.containerObj.parkId.addChild(parkIdText);

    // 渲染库位相关元素
    const parkGraphics = this.ParkTextureRenderSingle(parkData);
    this.elementRendered.Park.containerObj.park.addChild(parkGraphics);

    // 判断是否添加到可见列表
    const parkLayers = parkData.parkLayers || []
    if (parkLayers.length === 0 || (parkLayers.length && parkLayers.includes(1))) {
      this.elementRendered.Park.setObj.visible.add(parkData.parkId);
    }

    // 渲染库位类型图标
    if (parkData.typeTag && ParkImgs.hasOwnProperty(parkData.typeTag)) {
      PIXI.Assets.load(ParkImgs[parkData.typeTag]).then((img) => {
        const parkTypeSprite = new PIXI.Sprite(img);
        parkTypeSprite.anchor = 0.5;
        parkTypeSprite.x = parkData.bX;
        parkTypeSprite.y = parkData.bY;
        this.elementRendered.Park.containerObj.typeTag.addChild(parkTypeSprite);
        this.elementRendered.Park.mapObj.typeTag.set(
          parkData.parkId,
          parkTypeSprite
        );
      });
    }

    // 库位备用标识信息
    if (this._parkPathValidate && !parkData.backPathIds) {
      const spareTagText = new PIXI.Text({
        text: this._parkPathValidate || "?",
        style: new PIXI.TextStyle({
          align: "center",
          fontSize: 10,
          // fontWeight: "bold",
          fill: { color: "#000000" },
          stroke: { color: "#000000" },
        }),
      });
      spareTagText.anchor.set(0.5);
      spareTagText.position.set(parkData.x, parkData.y);
      this.elementRendered.Park.mapObj.spareTag.set(
        parkData.parkId,
        spareTagText
      );
      this.elementRendered.Park.containerObj.spareTag.addChild(spareTagText);
    }

    // 返回库位主元素
    return parkGraphics
  };
  /**
   * 组装单个库位元素，不渲染
   * @param parkData
   */
  protected ParkCreateSingle = (parkData: IParkData) => {
    // 渲染库位ID元素
    this.ParkIdRenderSingle(parkData);

    // 渲染库位相关元素
    this.ParkTextureRenderSingle(parkData);

    // 判断是否添加到可见列表
    const parkLayers = parkData.parkLayers || []
    if (parkLayers.length === 0 || (parkLayers.length && parkLayers.includes(1))) {
      this.elementRendered.Park.setObj.visible.add(parkData.parkId);
    }

    // 渲染库位类型图标
    if (parkData.typeTag && ParkImgs.hasOwnProperty(parkData.typeTag)) {
      PIXI.Assets.load(ParkImgs[parkData.typeTag]).then((img) => {
        const parkTypeSprite = new PIXI.Sprite(img);
        parkTypeSprite.anchor = 0.5;
        parkTypeSprite.x = parkData.bX;
        parkTypeSprite.y = parkData.bY;
        this.elementRendered.Park.mapObj.typeTag.set(
          parkData.parkId,
          parkTypeSprite
        );
      });
    }
    // 库位备用标识信息
    if (this._parkPathValidate && !parkData.backPathIds) {
      const spareTagText = new PIXI.Text({
        text: this._parkPathValidate || "?",
        style: new PIXI.TextStyle({
          align: "center",
          fontSize: 10,
          // fontWeight: "bold",
          fill: { color: "#000000" },
          stroke: { color: "#000000" },
        }),
      });
      spareTagText.anchor.set(0.5);
      spareTagText.position.set(parkData.x, parkData.y);
      this.elementRendered.Park.mapObj.spareTag.set(
        parkData.parkId,
        spareTagText
      );
    }
  };
  /**
   *
   * 传入单位为AGV坐标系的初始库位数据，生成渲染库位必备的库位数据
   * AGV坐标系的x, y, w, l单位为米，分别为库位中心点坐标XY值和库位宽，库位深（又称为长）
   * mode: ['1', '2', '4'] 多向库位：单向、双向、四向
   * type：['L', 'P', 'C'] 库位类型：取放货库位、停车库位、充电库位
   * pi：π值的库位朝向，坐标系如下：
   *               π/2
   *                |
   *                |
   * π/-π——— ———— ——— ———— ————→X  0
   *                |
   *                |
   *                ↓
   *                Y -π/2
   * backPathIds： 绑定的倒车路径ID
   * truckId： 如果是货车库位，则需要传入货车ID，为0则默认不是货车库位
   * @param initData
   * @returns
   */
  protected ParkDataCreateSingle = (initData) => {
    let { id, mode, type, pi, x, y, w, l, backPathIds, parkLayers, truckId } = initData;

    x = this.getMapCoordiateX(Number(x));
    y = this.getMapCoordiateY(Number(y));
    w = Number(w) * this._unitZoom;
    l = Number(l) * this._unitZoom;
    const rotate = this.piToRotate(pi);
    const parkId = String(id);
    const isTruck = !!truckId;
    const halfL = l / 2;
    const halfW = w / 2;
    let color = this.elementConfig.Park.color.default;
    let typeTag = "";
    // 根据库位类型/模式收纳当前库位
    const parkTypeReflect = this._elementKeyReflect["ParkType"];
    switch (type) {
      case parkTypeReflect.Normal:
        this.elementRendered.Park.setObj.Normal.add(parkId);
        // 货柜车库位，库位颜色不同
        if (isTruck) {
          color = this.elementConfig.Park.color.truck;
        } else {
          color = this.elementConfig.Park.color.default;
        }
        break;
      case parkTypeReflect.AGVPark:
        this.elementRendered.Park.setObj.AGVPark.add(parkId);
        color = this.elementConfig.Park.color.parking;

        typeTag = "stop";
        break;
      case parkTypeReflect.ChargingPark:
        this.elementRendered.Park.setObj.ChargingPark.add(parkId);
        color = this.elementConfig.Park.color.charging;

        typeTag = "charge";
        break;
    }
    // 预存储不同mode的库位元素
    const textureData: IGraphicsDrawData[] = [];
    const parkModeReflect = this._elementKeyReflect["ParkMode"];
    switch (mode) {
      case parkModeReflect.SingleDirection:
        this.elementRendered.Park.setObj.SingleDirection.add(parkId);
        textureData.push({
          action: "draw",
          method: "moveTo",
          params: [l, 0],
        });
        textureData.push({
          action: "draw",
          method: "lineTo",
          params: [0, 0],
        });
        textureData.push({
          action: "draw",
          method: "lineTo",
          params: [0, w],
        });
        textureData.push({
          action: "draw",
          method: "lineTo",
          params: [l, w],
        });
        textureData.push({
          action: "stroke",
          method: "stroke",
          params: {
            color: color,
            width: this.elementConfig.Park.width.default,
          },
        });
        textureData.push({
          action: "fill",
          method: "fill",
          params: { color: "#FFFFFF", alpha: 0 },
        });
        break;
      case parkModeReflect.DualDirection:
        this.elementRendered.Park.setObj.DualDirection.add(parkId);
        textureData.push({
          action: "draw",
          method: "moveTo",
          params: [l, 0],
        });
        textureData.push({
          action: "draw",
          method: "lineTo",
          params: [0, 0],
        });
        textureData.push({
          action: "draw",
          method: "moveTo",
          params: [0, w],
        });
        textureData.push({
          action: "draw",
          method: "lineTo",
          params: [l, w],
        });
        textureData.push({
          action: "stroke",
          method: "stroke",
          params: {
            color: color,
            width: this.elementConfig.Park.width.default,
          },
        });
        textureData.push({
          action: "draw",
          method: "rect",
          params: [0, 0, l, w],
        });
        textureData.push({
          action: "stroke",
          method: "stroke",
          params: { width: 1, alpha: 0 },
        });
        textureData.push({
          action: "fill",
          method: "fill",
          params: { color: "#FFFFFF", alpha: 0 },
        });
        break;
      case parkModeReflect.FourDirection:
        this.elementRendered.Park.setObj.FourDirection.add(parkId);
        textureData.push({
          action: "draw",
          method: "rect",
          params: [0, 0, l, w],
        });
        textureData.push({
          action: "stroke",
          method: "stroke",
          params: {
            color: color,
            width: this.elementConfig.Park.width.default,
          },
        });
        textureData.push({
          action: "fill",
          method: "fill",
          params: { color: "#FFFFFF", alpha: 0 },
        });
        break;
    }
    // 库位中心点
    textureData.push({
      action: 'draw',
      method: 'circle',
      params: [l/2, w/2, 4]
    })
    textureData.push({
      action: "fill",
      method: "fill",
      params: {
        color: 0xba28eb,
      },
    });
    return {
      id,
      parkId,
      x,
      y,
      w,
      l,
      pi,
      rotate,
      type,
      mode,
      truckId,
      isTruck,
      halfL,
      halfW,
      color,
      textureData,
      typeTag,
      backPathIds,
      parkLayers: parkLayers ? parkLayers.split(',').map((layer: string) => Number(layer)) : [],
      tX: x,
      tY: y - halfW / 2,
      bX: x,
      bY: y + halfW / 2,
      lX: x - halfL / 2,
      lY: y,
      rX: x + halfL / 2,
      rY: y,
    };
  };
  /**
   * 缩放后库位展示变动
   * @param scale
   */
  private ParkScaleRenderBatch = (scale: number) => {
    if (scale < this.criticalScaleMin) {
      // 库位图层
      const parkContainer: PIXI.Container =
        this.elementRendered.Park.containerObj.park;
      parkContainer.removeChildren();
      // 判断是否已经生成过一次缩略图
      if (this.elementRendered.Park.mapObj.texture.has(this.criticalScaleMin)) {
        // 已经生成过缩略图，直接取
        const parkGraphic = this.elementRendered.Park.mapObj.texture.get(
          this.criticalScaleMin
        );
        // 添加到库位图层
        parkContainer.addChild(parkGraphic);
      } else {
        // 未生成过缩略图，需要生成
        const parkGraphicContext: PIXI.GraphicsContext =
          new PIXI.GraphicsContext();
        Array.from(this.elementRendered.Park.mapObj.data.values()).forEach(
          (parkData) => {
            const { x, y, w, l, halfL, halfW } = parkData;

            // 绘制缩略库位
            parkGraphicContext.rect(x - halfL, y - halfW, l, w);
          }
        );
        // 设置缩略库位样式
        parkGraphicContext.stroke({
          color: this.elementConfig.Park.color.default,
          width: this.elementConfig.Park.width.default,
        });
        parkGraphicContext.fill({
          color: this.elementConfig.Park.color.default,
        });
        // 创建缩略图形对象
        const parkGraphic = new PIXI.Graphics(parkGraphicContext);
        // 添加到库位图层
        parkContainer.addChild(parkGraphic);
      }
    } else {
      this.ParkShow();
    }
  };
  /**
   * 展示库位图层中的各类图层
   */
  protected ParkShow() {
    // 清除现有的元素，准备重新加载
    this.elementRendered.Park.container.children.forEach(
      (parkContainer: PIXI.Container) => {
        parkContainer.removeChildren();
      }
    );

    // 获取当前层所有的库位
    const currentLayer = Number(this._renderFilter.layer)
    const currentLayerParkId: string[] = []
    this.elementRendered.Park.mapObj.data.forEach((parkData: IParkData, parkId: string) => {
      const parkLayers = parkData.parkLayers || []
      if (parkLayers.length === 0 || (parkLayers.length && parkLayers.includes(currentLayer))) currentLayerParkId.push(parkId)
    })

    // 便利此层库位ID
    currentLayerParkId.forEach((parkId: string) => {
      // 库位有无货状态图层
      if (this.elementRendered.Park.mapObj.stock.has(parkId)) {
        this.elementRendered.Park.containerObj.stock.addChild(this.elementRendered.Park.mapObj.stock.get(parkId))
      }
      // 库位候选状态图层
      if (this.elementRendered.Park.mapObj.candidate.has(parkId)) {
        this.elementRendered.Park.containerObj.candidate.addChild(this.elementRendered.Park.mapObj.candidate.get(parkId))
      }
      // 库位ID图层
      if (this.elementRendered.Park.mapObj.parkId.has(parkId)) {
        this.elementRendered.Park.containerObj.parkId.addChild(this.elementRendered.Park.mapObj.parkId.get(parkId))
      }
      // 库位图层
      if (this.elementRendered.Park.mapObj.park.has(parkId)) {
        this.elementRendered.Park.containerObj.park.addChild(this.elementRendered.Park.mapObj.park.get(parkId))
        // 添加到可见列表
        this.elementRendered.Park.setObj.visible.add(parkId);
      }
      // 库位备用标识信息
      if (this.elementRendered.Park.mapObj.spareTag.has(parkId)) {
        this.elementRendered.Park.containerObj.spareTag.addChild(this.elementRendered.Park.mapObj.spareTag.get(parkId))
      }
      // 库位类型图层
      if (this.elementRendered.Park.mapObj.typeTag.has(parkId)) {
        this.elementRendered.Park.containerObj.typeTag.addChild(this.elementRendered.Park.mapObj.typeTag.get(parkId))
      }
      // 库位编号图层
      if (this.elementRendered.Park.mapObj.numTag.has(parkId)) {
        this.elementRendered.Park.containerObj.numTag.addChild(this.elementRendered.Park.mapObj.numTag.get(parkId))
      }
      // 库位编号图层
      if (this.elementRendered.Park.mapObj.inferTag.has(parkId)) {
        this.elementRendered.Park.containerObj.inferTag.addChild(this.elementRendered.Park.mapObj.inferTag.get(parkId))
      }
    })
  }
  /**
   * 隐藏库位图层中的各类图层
   */
  protected ParkHide() {
    this.elementRendered.Park.container.children.forEach(
      (parkContainer: PIXI.Container) => {
        parkContainer.removeChildren();
      }
    );
    this.elementRendered.Park.setObj.visible.clear();
  }
  /**
   * 展示库位ID
   */
  protected ParkIdShow() {
    // 库位ID图层
    const parkIdContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.parkId;
    if (parkIdContainer) {
      // 库位ID容器
      this.elementRendered.Park.mapObj.parkId.forEach((parkIdText) => {
        parkIdContainer.addChild(parkIdText);
      });
    }
  }
  /**
   * 隐藏库位ID
   */
  protected ParkIdHide() {
    // 库位ID图层
    const parkIdContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.parkId;
    if (parkIdContainer) {
      // 库位ID容器
      parkIdContainer.removeChildren();
    }
  }
  /**
   * 根据库位ID显示库位相关信息
   * @param parkId
   */
  private showParkById(parkId: string, force: boolean = true) {
    // 库位有无货状态图层
    const stockContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.stock;
    if (stockContainer) {
      // 有无货状态容器
      if (this.elementRendered.Park.mapObj.stock.has(parkId)) {
        stockContainer.addChild(
          this.elementRendered.Park.mapObj.stock.get(parkId)
        );
      }
    }

    // 库位候选状态图层
    const candidateContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.candidate;
    if (candidateContainer) {
      // 库位候选状态容器
      if (this.elementRendered.Park.mapObj.candidate.has(parkId)) {
        candidateContainer.addChild(
          this.elementRendered.Park.mapObj.candidate.get(parkId)
        );
      }
    }

    // 库位ID图层
    const parkIdContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.parkId;
    if (parkIdContainer) {
      // 库位ID容器
      if (this.elementRendered.Park.mapObj.parkId.has(parkId)) {
        parkIdContainer.addChild(
          this.elementRendered.Park.mapObj.parkId.get(parkId)
        );
      }
    }

    // 库位图层
    const parkContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.park;
    if (parkContainer) {
      // 库位图形容器
      if (this.elementRendered.Park.mapObj.park.has(parkId)) {
        const parkGraphics: PIXI.Graphics = this.elementRendered.Park.mapObj.park.get(parkId);
        parkContainer.addChild(parkGraphics);
        // 判断当前库位是否被选中
        const parkNo = this.getLayerParkId(parkId)
        const parkData = this.elementRendered.Park.mapObj.data.get(parkId);
        if (this.elementRendered.Park.mapObj.selected.has(parkNo)) {
          // 标识选中的样式
          const parkGraphicsContext: PIXI.GraphicsContext = this.getParkUniqueTexture(parkData, true);
          parkGraphics.context = parkGraphicsContext;
        } else {
          const parkGraphicsContext: PIXI.GraphicsContext = this.getParkUniqueTexture(parkData);
          parkGraphics.context = parkGraphicsContext;
        }
        // 添加到可见列表
        if (force) this.elementRendered.Park.setObj.visible.add(parkId);
      }
    }

    // 库位备用标识信息
    const spareTagContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.spareTag;
    if (spareTagContainer) {
      if (this.elementRendered.Park.mapObj.spareTag.has(parkId)) {
        spareTagContainer.addChild(
          this.elementRendered.Park.mapObj.spareTag.get(parkId)
        );
      }
    }

    // 库位类型图层
    const parkTypeContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.typeTag;
    if (parkTypeContainer) {
      // 库位类型容器
      if (this.elementRendered.Park.mapObj.typeTag.has(parkId)) {
        parkTypeContainer.addChild(
          this.elementRendered.Park.mapObj.typeTag.get(parkId)
        );
      }
    }

    // 库位编号图层
    const parkNumContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.numTag;
    if (parkNumContainer) {
      // 库位类型容器
      if (this.elementRendered.Park.mapObj.numTag.has(parkId)) {
        parkNumContainer.addChild(
          this.elementRendered.Park.mapObj.numTag.get(parkId)
        );
      }
    }

    // 库位推导标识图层
    const parkInferContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.inferTag;
    if (parkInferContainer) {
      // 库位类型容器
      if (this.elementRendered.Park.mapObj.inferTag.has(parkId)) {
        parkInferContainer.addChild(
          this.elementRendered.Park.mapObj.inferTag.get(parkId)
        );
      }
    }
  }
  /**
   * 根据库位ID隐藏库位相关信息
   * @param parkId
   */
  private hiddenParkById(parkId: string, force: boolean = true) {
    // 库位有无货状态图层
    const stockContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.stock;
    if (stockContainer) {
      // 有无货状态容器
      if (this.elementRendered.Park.mapObj.stock.has(parkId)) {
        stockContainer.removeChild(
          this.elementRendered.Park.mapObj.stock.get(parkId)
        );
      }
    }

    // 库位候选状态图层
    const candidateContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.candidate;
    if (candidateContainer) {
      // 库位候选状态容器
      if (this.elementRendered.Park.mapObj.candidate.has(parkId)) {
        candidateContainer.removeChild(
          this.elementRendered.Park.mapObj.candidate.get(parkId)
        );
      }
    }

    // 库位ID图层
    const parkIdContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.parkId;
    if (parkIdContainer) {
      // 库位ID容器
      if (this.elementRendered.Park.mapObj.parkId.has(parkId)) {
        parkIdContainer.removeChild(
          this.elementRendered.Park.mapObj.parkId.get(parkId)
        );
      }
    }

    // 库位图层
    const parkContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.park;
    if (parkContainer) {
      // 库位图形容器
      if (this.elementRendered.Park.mapObj.park.has(parkId)) {
        parkContainer.removeChild(
          this.elementRendered.Park.mapObj.park.get(parkId)
        );
        // 删除可见列表
        if (force) this.elementRendered.Park.setObj.visible.delete(parkId);
      }
    }

    // 库位备用标识信息
    const spareTagContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.spareTag;
    if (spareTagContainer) {
      if (this.elementRendered.Park.mapObj.spareTag.has(parkId)) {
        spareTagContainer.removeChild(
          this.elementRendered.Park.mapObj.spareTag.get(parkId)
        );
      }
    }

    // 库位类型图层
    const parkTypeContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.typeTag;
    if (parkTypeContainer) {
      // 库位类型容器
      if (this.elementRendered.Park.mapObj.typeTag.has(parkId)) {
        parkTypeContainer.removeChild(
          this.elementRendered.Park.mapObj.typeTag.get(parkId)
        );
      }
    }

    // 库位编号图层
    const parkNumContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.numTag;
    if (parkNumContainer) {
      // 库位类型容器
      if (this.elementRendered.Park.mapObj.numTag.has(parkId)) {
        parkNumContainer.removeChild(
          this.elementRendered.Park.mapObj.numTag.get(parkId)
        );
      }
    }

    // 库位推导图层
    const parkInferContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.inferTag;
    if (parkInferContainer) {
      // 库位类型容器
      if (this.elementRendered.Park.mapObj.inferTag.has(parkId)) {
        parkInferContainer.removeChild(
          this.elementRendered.Park.mapObj.inferTag.get(parkId)
        );
      }
    }
  }
  /**
   * 单个渲染库位
   * @param parkData
   */
  private ParkTextureRenderSingle = (parkData) => {
    const {
      id,
      parkId,
      x,
      y,
      w,
      l,
      pi,
      rotate,
      type,
      mode,
      truckId,
      isTruck,
      halfL,
      halfW,
      color,
      textureData,
    } = parkData;

    // 创建库位
    // 判断是否有可用的texture
    const parkGraphicsContext: PIXI.GraphicsContext =
      this.getParkUniqueTexture(parkData);

    // 库位图形
    const parkGraphics = new PIXI.Graphics(parkGraphicsContext);
    parkGraphics.pivot.set(halfL, halfW);
    parkGraphics.position.set(x, y);
    parkGraphics.rotation = rotate;
    // 保存当前库位图形对象
    this.elementRendered.Park.mapObj.park.set(id, parkGraphics);

    return parkGraphics;
  };

  /**
   * 获取库位纹理
   * @param parkData 库位渲染预存数据
   * @param isSelected 是否是要选中的库位
   * @returns PIXI.GraphicsContext
   */
  protected getParkUniqueTexture(parkData, isSelected: boolean = false) {
    const textureKey = this.createParkTextureKey(
      parkData.l,
      parkData.w,
      parkData.type,
      parkData.mode,
      parkData.isTruck,
      isSelected
    );
    let parkGraphicsContext: PIXI.GraphicsContext = new PIXI.GraphicsContext();
    if (this.elementRendered.Park.mapObj.graphicsTexture.has(textureKey)) {
      // 已经有此纹理，直接赋值纹理
      parkGraphicsContext =
        this.elementRendered.Park.mapObj.graphicsTexture.get(textureKey);
    } else {
      // 无此纹理，新建一个新纹理，保存起来
      if (isSelected) {
        // 库位样式
        parkData.textureData.forEach((item) => {
          if (!item) return;
          switch (item.action) {
            case "draw":
              parkGraphicsContext[item.method](...item.params);
              break;
            case "stroke":
              item.params.color = this.elementConfig.Park.color.selected;
              item.params.width = this.elementConfig.Park.width.selected;
              parkGraphicsContext[item.method](item.params);
              break;
            case "fill":
              parkGraphicsContext[item.method](item.params);
              break;
          }
        });
      } else {
        // 库位样式
        parkData.textureData.forEach((item) => {
          if (!item) return;
          switch (item.action) {
            case "draw":
              parkGraphicsContext[item.method](...item.params);
              break;
            case "stroke":
              parkGraphicsContext[item.method](item.params);
              break;
            case "fill":
              parkGraphicsContext[item.method](item.params);
              break;
          }
        });
      }
      // 保存库位图形纹理
      this.elementRendered.Park.mapObj.graphicsTexture.set(
        textureKey,
        parkGraphicsContext
      );
    }
    return parkGraphicsContext;
  }

  /**
   * 创建一个库位ID元素
   * @param parkIdData
   * @returns
   */
  private ParkIdRenderSingle = (parkIdData) => {
    const { id, parkId, tX, tY } = parkIdData;
    // 创建库位ID
    const parkIdText = new PIXI.Text({
      text: id,
      style: new PIXI.TextStyle({
        align: "center",
        fill: this.elementConfig.ParkId.color.fill,
        fontSize: 20,
        stroke: { color: this.elementConfig.ParkId.color.default },
      }),
    });
    parkIdText.anchor.set(0.5, 0.5);
    parkIdText.position.set(tX, tY);
    // 保存当前库位ID对象
    this.elementRendered.Park.mapObj.parkId.set(parkId, parkIdText);

    return parkIdText;
  };

  /**
   * 创建库位纹理唯一key
   * @param l
   * @param w
   * @param type
   * @param mode
   * @param isTruck
   * @returns
   */
  private createParkTextureKey(
    l: number,
    w: number,
    type: string,
    mode: string,
    isTruck: boolean,
    isSelected: boolean = false
  ) {
    return `${l}_${w}_${type}_${mode}_${isTruck}_${isSelected}`;
  }

  /**
   * 重置库位样式
   * @param parkId 库位编号
   * @param isLayerParkId 是否还原真实库位ID
   * @param force 是否在修改样式的同时取消选中标记
   */
  protected signParkDefault(parkNo: string, force: boolean = true) {
    if (!parkNo) return
    const parkId = this.getBaseParkId(parkNo)
    if (
      this.elementRendered.Park.mapObj.data.has(parkId) &&
      this.elementRendered.Park.mapObj.park.has(parkId)
    ) {
      const parkGraphics: PIXI.Graphics = this.elementRendered.Park.mapObj.park.get(parkId);
      const parkData = this.elementRendered.Park.mapObj.data.get(parkId);

      // 判断是否当前层库位
      const currentParkId = this.getLayerParkId(parkId)
      if (parkNo === currentParkId) {
        // 是当前层
        const parkGraphicsContext: PIXI.GraphicsContext = this.getParkUniqueTexture(parkData);
        parkGraphics.context = parkGraphicsContext;
      }
      // 清除已选中数据的记录
      if (force) this.elementRendered.Park.mapObj.selected.delete(parkNo);
    }
  }
  /**
   * 批量取消选中库位
   * @param force 是否在修改样式的同时取消选中标记
   */
  protected signAllParkDefault(force: boolean = true) {
    this.elementRendered.Park.mapObj.selected.forEach(
      (parkGraphics: PIXI.Graphics, parkNo: string) => {
        const parkId = this.getBaseParkId(parkNo)
        const parkData = this.elementRendered.Park.mapObj.data.get(parkId);
        if (parkData) {
          const parkGraphicsContext: PIXI.GraphicsContext =
            this.getParkUniqueTexture(parkData);
          parkGraphics.context = parkGraphicsContext;
        }
      }
    );
    if (force) this.elementRendered.Park.mapObj.selected.clear();
  }
  /**
   * 选中单个库位
   * @param parkId 库位编号
   * @param force 是否在修改样式的同时取消选中标记
   * @returns
   */
  protected signParkSelect(parkNo: string, force: boolean = true) {
    // 如果已经被选中了则不作为
    if (!parkNo) return;
    const parkId = this.getBaseParkId(parkNo)
    if (
      this.elementRendered.Park.mapObj.data.has(parkId) &&
      this.elementRendered.Park.mapObj.park.has(parkId)
    ) {
      const parkData = this.elementRendered.Park.mapObj.data.get(parkId);
      const parkGraphics: PIXI.Graphics =
        this.elementRendered.Park.mapObj.park.get(parkId);
      if (parkData && parkGraphics) {
        // 判断是否当前层库位
        const currentParkId = this.getLayerParkId(parkId)
        if (parkNo === currentParkId) {
          // 是当前层
          // 标识选中的样式
          const parkGraphicsContext: PIXI.GraphicsContext = this.getParkUniqueTexture(parkData, true);
          parkGraphics.context = parkGraphicsContext;
        }

        // 记录已选中
        if (force) this.elementRendered.Park.mapObj.selected.set(parkNo, parkGraphics);
      }
    }
  }
  /**
   * 批量设置库位选中
   * @param parkId 库位编号
   * @param isLayerParkId 是否还原真实库位ID
   * @param force 是否在修改样式的同时取消选中标记
   */
  protected signParksSelect(parkNos: string[], force: boolean = true) {
    if (Array.isArray(parkNos)) {
      // 获取当前已经选中的库位
      const parkIdSelected = Array.from(
        this.elementRendered.Park.mapObj.selected.keys()
      );
      const needDeleteParkIds = parkIdSelected.filter(
        (parkNo: string) => !parkNos.includes(parkNo)
      );
      const needSelectParkIds = parkNos.filter(
        (parkNo: string) => !parkIdSelected.includes(parkNo)
      );
      needDeleteParkIds.forEach((parkNo: string) => {
        this.signParkDefault(parkNo, force);
      });
      needSelectParkIds.forEach((parkNo: string) => {
        this.signParkSelect(parkNo, force);
      });
    }
  }
  /**
   * 渲染，标识候选库位
   * @param parkNumber string
   */
  protected signCandidatePark(parkNo: string) {
    if (parkNo) {
      const parkId = this.getBaseParkId(parkNo)
      let candidateContainer: PIXI.Container =
        this.elementRendered.Park.containerObj.candidate;
      candidateContainer.zIndex = this.elementConfig.Park.zIndex.candidate;
      this.elementRendered.Park.container.addChild(candidateContainer);

      const parkData = this.elementRendered.Park.mapObj.data.get(parkId);
      if (!this.elementRendered.Park.mapObj.candidate.has(parkId) && parkData) {
        // 不存在这个候选标识，才需要添加
        // 获取是否已经有次纹理
        let parkCandidateGraphicsContext: PIXI.GraphicsContext;
        const parkCandidateKey = "candidate";
        if (this.elementRendered.Park.mapObj.texture.has(parkCandidateKey)) {
          // 已经有了直接利用
          parkCandidateGraphicsContext =
            this.elementRendered.Park.mapObj.texture.get(parkCandidateKey);
        } else {
          // 没有此纹理，创建一个
          parkCandidateGraphicsContext = new PIXI.GraphicsContext();
          parkCandidateGraphicsContext.rect(
            0,
            0,
            parkData.l - 4,
            parkData.w - 4
          );
          parkCandidateGraphicsContext.stroke({
            color: this.elementConfig.Park.color.candidate,
          });
          parkCandidateGraphicsContext.fill({
            color: this.elementConfig.Park.color.candidate,
          });
          this.elementRendered.Park.mapObj.texture.set(
            parkCandidateKey,
            parkCandidateGraphicsContext
          );
        }

        const parkCandidateGraphics: PIXI.Graphics = new PIXI.Graphics(
          parkCandidateGraphicsContext
        );
        parkCandidateGraphics.pivot.set(0.5, 0.5);
        parkCandidateGraphics.position.set(parkData.x, parkData.y);
        parkCandidateGraphics.rotation = parkData.rotate;

        // 添加到候选区图层
        candidateContainer.addChild(parkCandidateGraphics);
      }
    }
  }
  /**
   * 清除候选标识库位符号
   */
  protected clearCandidatePark() {
    const candidateContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.candidate;
    candidateContainer.children.forEach(
      (parkCandidateGraphics: PIXI.Graphics) => {
        parkCandidateGraphics.destroy();
      }
    );
    candidateContainer?.removeChildren();
  }
  /*
   * 渲染 AGVPath start
   */
  /**
   * AGV路径初始化批量渲染
   * @param AGVPathJSONArr
   */
  private AGVPathInitRenderBatch = (
    AGVPathJSONArr: any[],
    useCache: boolean = false
  ) => {
    const startTime = performance.now();

    // 路径数量太多，需要创建路径纹理
    const pathGraphicsTexture: PIXI.GraphicsContext =
      new PIXI.GraphicsContext();

    // 路径纹理唯一性识别数组
    const textureKeyArr: string[] = [];

    // 定义处理点位对象方法
    let doPointRender = (pointData) => {
      const pointGraphics = this.createPathPoint(
        pointData.x,
        pointData.y,
        pointData.radius
      );
      // 保存元素
      this.elementRendered.AGVPathPoint.mapObj.point.set(
        pointData.key,
        pointGraphics
      );
    };
    if (this._renderSwitch.point) {
      doPointRender = (pointData) => {
        const pointGraphics = this.createPathPoint(
          pointData.x,
          pointData.y,
          pointData.radius
        );
        // 添加元素到渲染
        this.elementRendered.AGVPathPoint.container.addChild(pointGraphics);
        // 保存元素
        this.elementRendered.AGVPathPoint.mapObj.point.set(
          pointData.key,
          pointGraphics
        );
      };
    }

    if (useCache) {
      // 有缓存数据，直接用缓存数据渲染

      // 获取样式非重复的路径数据
      const pathArr = Array.from(this.elementRendered.AGVPath.setObj.data);
      this.elementConfig.AGVPath.performance.uniqueCount = pathArr.length;
      pathArr.forEach((pathData) => {
        const { x1, y1, x2, y2, radius } = pathData;
        pathGraphicsTexture.moveTo(x1, y1);
        if (radius == 0) {
          // 直线
          pathGraphicsTexture.lineTo(x2, y2);
        } else {
          // 曲线
          const radiusABS = Math.abs(radius);
          const lineAngle = this.lineAngle(x1, y1, x2, y2);
          const sweepFlag = radius > 0 ? 0 : 1;
          pathGraphicsTexture.arcToSvg(
            radiusABS,
            radiusABS,
            lineAngle,
            0,
            sweepFlag,
            x2,
            y2
          );
        }
      });

      // 获取样式非重复的点位数据
      const pointArr = Array.from(
        this.elementRendered.AGVPathPoint.setObj.data
      );
      this.elementConfig.AGVPathPoint.performance.uniqueCount = pointArr.length;
      pointArr.forEach((pointData) => {
        doPointRender(pointData);
      });
    } else {
      // 无缓存，处理原始数据
      this.elementConfig.AGVPath.performance.count = AGVPathJSONArr.length;
      this.elementConfig.AGVPathPoint.performance.count =
        AGVPathJSONArr.length * 2;

      // 获取字段映射关系
      const reflectObj = this._elementKeyReflect["AGVPath"];
      AGVPathJSONArr.forEach((path) => {
        const points = path[reflectObj["Points"]];
        if (points.length < 2) return;
        const startPoint = points[0], // 当前线路开始点
          endPoint = points[points.length - 1]; // 当前线路结束点
        const id = path[reflectObj["ElementId"]], // 当前线路唯一ID
          x1 = this.getMapCoordiateX(Number(startPoint[reflectObj["X"]])), // 开始点X坐标
          y1 = this.getMapCoordiateY(Number(startPoint[reflectObj["Y"]])), // 开始点Y坐标
          x2 = this.getMapCoordiateX(Number(endPoint[reflectObj["X"]])), // 结束点X坐标
          y2 = this.getMapCoordiateY(Number(endPoint[reflectObj["Y"]])), // 结束点Y坐标
          radius = Number(endPoint[reflectObj["Radius"]]) * this._unitZoom, // 当前线路半径，为0是直线
          forward = path[reflectObj["Forward"]] == "true", // 线路朝向是正向还是反向
          information = path[reflectObj["Information"]]; // information

        const pathId = String(id);
        const parkId = String(path[reflectObj["BackParkId"]]);

        // 存储全量路径数据
        const _pathData = {
          id,
          pathId,
          parkId,
          x1,
          y1,
          x2,
          y2,
          radius,
          forward,
          information,
        };
        // 保存每条路径的数据
        this.elementRendered.AGVPath.mapObj.data.set(pathId, _pathData);

        // 根据information字段分类存储
        let info = "default";
        if (information) {
          info = information;
        }
        // 保存当前information信息关联的库位ID
        // 绑定了倒车路径的库位，如果路径没有配置进出路径，则其进出路径默认值为default
        if (parkId) {
          // 处理库位对应路径对应关系
          if (
            !this.elementRendered.information.objObj.parkToPath.hasOwnProperty(
              info
            )
          ) {
            // 首个值
            this.elementRendered.information.objObj.parkToPath[info] = {};
          }
          this.elementRendered.information.objObj.parkToPath[info][parkId] =
            pathId;

          // 处理路径对应库位对应关系
          if (
            !this.elementRendered.information.objObj.pathToPark.hasOwnProperty(
              info
            )
          ) {
            // 首个值
            this.elementRendered.information.objObj.pathToPark[info] = {};
          }
          this.elementRendered.information.objObj.pathToPark[info][pathId] =
            parkId;
        }

        // 收集全量路径数据、去除重复数据
        const pathKeys = this.createPathTextureKeys(x1, y1, x2, y2, radius);
        // 如果存在渲染效果重复的路径，直接跳过渲染步骤
        if (!textureKeyArr.includes(pathKeys.current)) {
          // 当前路径不存在重复
          // 需要渲染
          pathGraphicsTexture.moveTo(x1, y1);
          if (radius == 0) {
            // 直线
            pathGraphicsTexture.lineTo(x2, y2);
          } else {
            // 曲线
            const radiusABS = Math.abs(radius);
            const lineAngle = this.lineAngle(x1, y1, x2, y2);
            const sweepFlag = radius > 0 ? 0 : 1;
            pathGraphicsTexture.arcToSvg(
              radiusABS,
              radiusABS,
              lineAngle,
              0,
              sweepFlag,
              x2,
              y2
            );
          }
          // 渲染的同时要存入已渲染数据
          textureKeyArr.push(pathKeys.current);
          textureKeyArr.push(pathKeys.reverse);
          // 保存非重复路径数据
          this.elementRendered.AGVPath.setObj.data.add(_pathData);
        }

        // 点位部分
        // 判断点位数据的重复性
        const pathPointKey1 = this.createPathPointTextureKey(x1, y1);
        const pathPointKey2 = this.createPathPointTextureKey(x2, y2);
        if (!this.elementRendered.AGVPathPoint.mapObj.data.has(pathPointKey1)) {
          const pointData = {
            key: pathPointKey1,
            x: x1,
            y: y1,
            radius: this.elementConfig.AGVPathPoint.size.r,
          };
          // 创建保存数据的容器
          this.elementRendered.AGVPathPoint.mapObj.data.set(pathPointKey1, []);
          // 添加不重复的定位数据
          this.elementRendered.AGVPathPoint.setObj.data.add(pointData);
          // 没有这个点，需要渲染
          doPointRender(pointData);
        }
        this.elementRendered.AGVPathPoint.mapObj.data.get(pathPointKey1).push({
          x: x1,
          y: y1,
          ..._pathData,
        });

        if (!this.elementRendered.AGVPathPoint.mapObj.data.has(pathPointKey2)) {
          const pointData = {
            key: pathPointKey2,
            x: x2,
            y: y2,
            radius: this.elementConfig.AGVPathPoint.size.r,
          };
          // 创建保存数据的容器
          this.elementRendered.AGVPathPoint.mapObj.data.set(pathPointKey2, []);
          // 添加不重复的定位数据
          this.elementRendered.AGVPathPoint.setObj.data.add(pointData);
          // 没有这个点，需要渲染
          doPointRender(pointData);
        }
        this.elementRendered.AGVPathPoint.mapObj.data.get(pathPointKey2).push({
          x: x2,
          y: y2,
          ..._pathData,
        });
      });
    }

    // 渲染全量，不重复的路径数据，并设置样式
    pathGraphicsTexture.stroke({
      color: this.elementConfig.AGVPath.color.default,
    });
    // 处理、收集路径数据
    const linePathGraphics = new PIXI.Graphics(pathGraphicsTexture);
    // 保存初始点位纹理
    this.elementRendered.AGVPath.texture = linePathGraphics;
    // 添加到容器内
    if (this._renderSwitch.path) {
      this.elementRendered.AGVPath.container.addChild(linePathGraphics);
    }

    this.elementConfig.AGVPath.performance.time = performance.now() - startTime;
  };

  /**
   * 根据当前缩放率展示路径元素
   * @param scale
   */
  private AGVPathScaleRenderBatch = (scale: number) => {
    if (scale < this.criticalScaleMin) {
      this.AGVPathHide();
    } else {
      this.AGVPathShow();
    }
  };
  /**
   * 展示路径元素
   */
  protected AGVPathShow() {
    this.elementRendered.AGVPath.container.removeChildren();
    this.elementRendered.AGVPath.container.addChild(
      this.elementRendered.AGVPath.texture
    );
  }
  /**
   * 隐藏路径元素
   */
  protected AGVPathHide() {
    this.elementRendered.AGVPath.container.removeChildren();
  }
  /**
   * 根据当前缩放率展示点位元素
   * @param scale
   */
  private AGVPathPointScaleRenderBatch = (
    scale: number,
    pointScaleMax: number
  ) => {
    if (scale < this.criticalScaleMin) {
      this.AGVPathPointHide();
    } else {
      this.elementRendered.AGVPathPoint.container.removeChildren();
      // 非显示隐藏式的变更，只需要切换缩放率
      let radius = this.elementConfig.AGVPathPoint.size.r;
      let width = 1;
      if (scale > pointScaleMax) {
        // 缩放率大于3时，点位元素面积不再增加
        radius = (radius * pointScaleMax) / scale;
        width = (width * pointScaleMax) / scale;
      }

      Array.from(
        this.elementRendered.AGVPathPoint.setObj.data.values()
      ).forEach((pointData) => {
        if (
          pointData.key &&
          this.elementRendered.AGVPathPoint.mapObj.point.has(pointData.key)
        ) {
          const pointGraphics: PIXI.Graphics =
            this.elementRendered.AGVPathPoint.mapObj.point.get(pointData.key);
          pointGraphics.destroy();
          this.elementRendered.AGVPathPoint.mapObj.point.delete(pointData.key);
        }
        const pointGraphics: PIXI.Graphics = this.createPathPoint(
          pointData.x,
          pointData.y,
          radius,
          width
        );
        this.elementRendered.AGVPathPoint.mapObj.point.set(
          pointData.key,
          pointGraphics
        );
        this.elementRendered.AGVPathPoint.container.addChild(pointGraphics);
      });
      // 因为重绘了点位，需要重新绑定选中事件
      window.requestAnimationFrame(() => {
        this._rebindEvent("pointSelect");
      });
    }
  };
  /**
   * 展示点位元素
   */
  protected AGVPathPointShow() {
    this.elementRendered.AGVPathPoint.container.removeChildren();
    this.elementRendered.AGVPathPoint.mapObj.point.forEach(
      (pointGraphics: PIXI.Graphics) => {
        this.elementRendered.AGVPathPoint.container.addChild(pointGraphics);
      }
    );
  }
  /**
   * 隐藏点位元素
   */
  protected AGVPathPointHide() {
    this.elementRendered.AGVPathPoint.container.removeChildren();
  }

  /**
   * 创建一条路径的纹理级别的唯一标识
   * 用于判断路径是否重复
   * 从点1到点2，和从点2到点1算一条相同的路径
   * @param x1
   * @param y1
   * @param x2
   * @param y2
   * @param radius
   * @returns
   */
  private createPathTextureKeys(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    radius: number
  ) {
    return {
      current: `${x1}_${y1}_${x2}_${y2}_${radius}`,
      reverse: `${x2}_${y2}_${x1}_${y1}_${-radius}`,
    };
  }
  /**
   * 创建一个点位坐标的唯一标识
   * 用于判断点位书否重复
   * @param x
   * @param y
   * @returns
   */
  protected createPathPointTextureKey(x: number, y: number) {
    return `${x},${y}`;
  }
  /**
   * 创建一个点位纹理唯一键
   * @param r
   * @param strokeWidth
   * @returns
   */
  private createPathPointRadiusTextureKey(r: number, strokeWidth: number = 1) {
    return `${r}_${strokeWidth}`;
  }

  /**
   * 创建点位纹理
   * @param radius
   * @param width
   * @returns
   */
  private createPathPointTexture(radius: number, width: number = 1) {
    // 获取点位纹理
    const textureKey = this.createPathPointRadiusTextureKey(radius, width);
    if (!this.elementRendered.AGVPathPoint.mapObj.texture.has(textureKey)) {
      // 无此纹理
      const pointGraphicsContext = new PIXI.GraphicsContext();
      pointGraphicsContext
        .circle(0, 0, radius)
        .stroke({
          color: this.elementConfig.AGVPathPoint.color.default,
          width,
        })
        .fill({
          color: "#FFFFFF",
          alpha: 0,
        });
      this.elementRendered.AGVPathPoint.mapObj.texture.set(
        textureKey,
        pointGraphicsContext
      );
    }
    return this.elementRendered.AGVPathPoint.mapObj.texture.get(textureKey);
  }
  /**
   * 创建点位元素
   * @param x
   * @param y
   * @param radius
   * @param width
   * @returns
   */
  private createPathPoint(
    x: number,
    y: number,
    radius: number,
    width: number = 1
  ) {
    const pointGraphicsContext = this.createPathPointTexture(radius, width);
    const pointGraphics = new PIXI.Graphics(pointGraphicsContext);
    pointGraphics.pivot.set(0.5);
    pointGraphics.position.set(x, y);
    return pointGraphics;
  }

  /**
   *
   * @param type 需要渲染的路径类型：
   *              move    行驶路径(带方向)
   *              control 控制路径
   *              assist  辅助路径
   * @param pathNos 路径编号/AGV行驶字串
   */
  protected renderAGVPathByTypeBatch(
    type: string,
    pathParam: string[] | string
  ) {
    // 传入了不支持的类型不作为
    if (!this.elementConfig.AGVPath.typeList.includes(type)) return;

    let currentPaths: string[] = [];
    let currentMap = new Map();
    let AGVPathAttrF = {};
    let AGVPathAttrB = {};
    let zIndex = 1;
    switch (type) {
      case "move": // 移动路径
        currentPaths = Array.from(
          this.elementRendered.AGVPath.mapObj.selected.keys()
        );
        currentMap = this.elementRendered.AGVPath.mapObj.selected;
        AGVPathAttrF = {
          color: this.elementConfig.AGVPath.color.forward,
          width: this.elementConfig.AGVPath.width.forward,
          alpha: this.elementConfig.AGVPath.opacity.forward,
        };
        AGVPathAttrB = {
          color: this.elementConfig.AGVPath.color.back,
          width: this.elementConfig.AGVPath.width.back,
          alpha: this.elementConfig.AGVPath.opacity.back,
        };
        zIndex = this.elementConfig.AGVPath.zIndex.move;
        break;
      case "control": // 控制路径
        currentPaths = Array.from(
          this.elementRendered.AGVPath.mapObj.control.keys()
        );
        currentMap = this.elementRendered.AGVPath.mapObj.control;
        AGVPathAttrF = {
          color: this.elementConfig.AGVPath.color.forward,
          width: this.elementConfig.AGVPath.width.control,
          alpha: this.elementConfig.AGVPath.opacity.control,
        };
        AGVPathAttrB = {
          color: this.elementConfig.AGVPath.color.back,
          width: this.elementConfig.AGVPath.width.control,
          alpha: this.elementConfig.AGVPath.opacity.control,
        };
        zIndex = this.elementConfig.AGVPath.zIndex.control;
        break;
      case "assist": // 辅助路径
        currentPaths = Array.from(
          this.elementRendered.AGVPath.mapObj.assist.keys()
        );
        currentMap = this.elementRendered.AGVPath.mapObj.assist;
        AGVPathAttrF = {
          color: this.elementConfig.AGVPath.color.forward,
          width: this.elementConfig.AGVPath.width.assist,
          alpha: this.elementConfig.AGVPath.opacity.assist,
        };
        AGVPathAttrB = {
          color: this.elementConfig.AGVPath.color.back,
          width: this.elementConfig.AGVPath.width.assist,
          alpha: this.elementConfig.AGVPath.opacity.assist,
        };
        zIndex = this.elementConfig.AGVPath.zIndex.assist;
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
      pathDataMap = this.elementRendered.AGVPath.mapObj.data;
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
          const { forward } = pathData;
          const AGVPathAttr = forward ? AGVPathAttrF : AGVPathAttrB;
          const pathGraphics: PIXI.Graphics = this.drawLineWithArrow(
            pathData,
            AGVPathAttr
          );
          // 添加到对应的路径图层
          this.elementRendered.AGVPath.container.addChild(pathGraphics);
          pathGraphics.zIndex = zIndex;

          if (currentMap.has(no)) {
            currentMap.get(no).destroy();
            currentMap.delete(no);
          }
          currentMap.set(no, pathGraphics);
        } catch (e) {
          console.log("error", e, pathData);
        }
      }
    };
    // 判断路劲数据类型是否变更
    if (this.elementConfig.AGVPath.mode.control !== mode) {
      // 路径数据类型变更了，直接清空上次渲染，强制渲染新内容
      currentMap.forEach((pathGraphics) => {
        pathGraphics.destroy();
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
          currentMap.get(no).destroy();
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
   * 绘制带箭头的线路
   * @param pathData
   * @param AGVPathAttr
   * @returns
   */
  protected drawLineWithArrow(pathData, AGVPathAttr) {
    const arrowLength = 20; // 箭头的长度
    const arrowWidth = AGVPathAttr.width + 2; // 箭头的宽度
    const { id, x1, y1, x2, y2, radius, forward } = pathData;

    const pathGraphics: PIXI.Graphics = new PIXI.Graphics();

    const sectionLength = Math.sqrt(
      Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)
    );
    // 判断线段长度
    if (sectionLength >= arrowLength) {
      // 线段比箭头长度长
      pathGraphics.moveTo(x1, y1);
      if (radius == 0) {
        // 计算直线箭头起点坐标
        const lineAngle = Math.atan2(y2 - y1, x2 - x1);
        const lineArrowStartX = x2 - arrowLength * Math.cos(lineAngle);
        const lineArrowStartY = y2 - arrowLength * Math.sin(lineAngle);
        // 直线
        pathGraphics.lineTo(lineArrowStartX, lineArrowStartY);
        pathGraphics.stroke(AGVPathAttr);

        // 计算箭头的方向
        const angle = Math.atan2(y2 - y1, x2 - x1);
        // 绘制三角形箭头
        pathGraphics.moveTo(x2, y2);
        pathGraphics.lineTo(
          x2 - arrowLength * Math.cos(angle) + arrowWidth * Math.sin(angle),
          y2 - arrowLength * Math.sin(angle) - arrowWidth * Math.cos(angle)
        );
        pathGraphics.lineTo(
          x2 - arrowLength * Math.cos(angle) - arrowWidth * Math.sin(angle),
          y2 - arrowLength * Math.sin(angle) + arrowWidth * Math.cos(angle)
        );
        pathGraphics.lineTo(x2, y2);
        pathGraphics.fill(AGVPathAttr.color);
      } else {
        // 曲线
        const radiusABS = Math.abs(radius);
        const sweepFlag = radius > 0 ? 0 : 1;

        // 计算圆弧的中心点
        const dx = x2 - x1;
        const dy = y2 - y1;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // 确保圆心位置计算正确
        const a = distance / 2;
        const h = Math.sqrt(radiusABS * radiusABS - a * a);
        const midX = (x1 + x2) / 2;
        const midY = (y1 + y2) / 2;
        const offsetX = (h * (y1 - y2)) / distance;
        const offsetY = (h * (x2 - x1)) / distance;
        // 决定顺时针还是逆时针绘制
        let centerX, centerY, angleToEnd, angleToStart;

        if (sweepFlag === 1) {
          // 顺时针
          centerX = midX + offsetX;
          centerY = midY + offsetY;
        } else {
          // 逆时针
          centerX = midX - offsetX;
          centerY = midY - offsetY;
        }

        angleToEnd = Math.atan2(y2 - centerY, x2 - centerX);
        angleToStart =
          angleToEnd + ((sweepFlag === 1 ? -1 : 1) * arrowLength) / radiusABS;

        // 计算点P的位置
        const arrowStartX = centerX + radiusABS * Math.cos(angleToStart);
        const arrowStartY = centerY + radiusABS * Math.sin(angleToStart);
        // 计算箭头方向
        const arrowDirection = Math.atan2(y2 - arrowStartY, x2 - arrowStartX);

        // 绘制曲线
        const lineAngle = this.lineAngle(x1, y1, arrowStartX, arrowStartY);
        pathGraphics.arcToSvg(
          radiusABS,
          radiusABS,
          lineAngle,
          0,
          sweepFlag,
          arrowStartX,
          arrowStartY
        );
        pathGraphics.stroke(AGVPathAttr);

        // 绘制三角形箭头
        pathGraphics.moveTo(x2, y2);
        pathGraphics.lineTo(
          x2 -
            arrowLength * Math.cos(arrowDirection) +
            arrowWidth * Math.sin(arrowDirection),
          y2 -
            arrowLength * Math.sin(arrowDirection) -
            arrowWidth * Math.cos(arrowDirection)
        );
        pathGraphics.lineTo(
          x2 -
            arrowLength * Math.cos(arrowDirection) -
            arrowWidth * Math.sin(arrowDirection),
          y2 -
            arrowLength * Math.sin(arrowDirection) +
            arrowWidth * Math.cos(arrowDirection)
        );
        pathGraphics.lineTo(x2, y2);
        pathGraphics.fill(AGVPathAttr.color);
      }
    } else {
      // 线段没有箭头长度长
      pathGraphics.moveTo(x1, y1);
      if (radius == 0) {
        pathGraphics.lineTo(x2, y2);
      } else {
        const radiusABS = Math.abs(radius);
        const sweepFlag = radius > 0 ? 0 : 1;
        const lineAngle = this.lineAngle(x1, y1, x2, y2);
        pathGraphics.arcToSvg(
          radiusABS,
          radiusABS,
          lineAngle,
          0,
          sweepFlag,
          x2,
          y2
        );
      }
      pathGraphics.stroke(AGVPathAttr);
    }

    return pathGraphics;
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
    const { id, x1, y1, x2, y2, radius, forward } = pathData;
    let AGVPathAttr: any = {
      color: this.elementConfig.AGVPath.color.default,
      width: this.elementConfig.AGVPath.width.default,
      opacity: this.elementConfig.AGVPath.opacity.default,
    };
    let zIndex = 1;
    switch (type) {
      case "move": // 移动路径
        if (forward) {
          AGVPathAttr = {
            color: this.elementConfig.AGVPath.color.forward,
            width: this.elementConfig.AGVPath.width.forward,
            opacity: this.elementConfig.AGVPath.opacity.forward,
          };
        } else {
          AGVPathAttr = {
            color: this.elementConfig.AGVPath.color.back,
            width: this.elementConfig.AGVPath.width.back,
            opacity: this.elementConfig.AGVPath.opacity.back,
          };
        }
        zIndex = this.elementConfig.AGVPath.zIndex.move;
        break;
      case "control": // 控制路径
        AGVPathAttr = {
          color: this.elementConfig.AGVPath.color.control,
          width: this.elementConfig.AGVPath.width.control,
          opacity: this.elementConfig.AGVPath.opacity.control,
        };
        zIndex = this.elementConfig.AGVPath.zIndex.control;
        break;
      case "assist": // 辅助路径
        if (forward) {
          AGVPathAttr = {
            color: this.elementConfig.AGVPath.color.forward,
            width: this.elementConfig.AGVPath.width.assist,
            opacity: this.elementConfig.AGVPath.opacity.assist,
          };
        } else {
          AGVPathAttr = {
            color: this.elementConfig.AGVPath.color.back,
            width: this.elementConfig.AGVPath.width.assist,
            opacity: this.elementConfig.AGVPath.opacity.assist,
          };
        }
        zIndex = this.elementConfig.AGVPath.zIndex.assist;
        break;
    }

    const pathGraphics: PIXI.Graphics = this.drawLineWithArrow(
      pathData,
      AGVPathAttr
    );
    // 添加到对应的路径图层
    this.elementRendered.AGVPath.container.addChild(pathGraphics);
    pathGraphics.zIndex = zIndex;

    switch (type) {
      case "move": // 移动路径
        if (this.elementRendered.AGVPath.mapObj.selected.has(id)) {
          this.elementRendered.AGVPath.mapObj.selected.get(id).destroy();
        }
        this.elementRendered.AGVPath.mapObj.selected.set(id, pathGraphics);
        break;
      case "control": // 控制路径
        if (this.elementRendered.AGVPath.mapObj.control.has(id)) {
          this.elementRendered.AGVPath.mapObj.control.get(id).destroy();
        }
        this.elementRendered.AGVPath.mapObj.control.set(id, pathGraphics);
        break;
      case "assist": // 辅助路径
        if (this.elementRendered.AGVPath.mapObj.assist.has(id)) {
          this.elementRendered.AGVPath.mapObj.assist.get(id).destroy();
        }
        this.elementRendered.AGVPath.mapObj.assist.set(id, pathGraphics);
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
          AGVPathMap.get(pathNo).destroy();
          AGVPathMap.delete(pathNo);
        }
      });
    } else {
      AGVPathMap.forEach((ele: any) => {
        ele.destroy();
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
  /**
   * 渲染，标识候选点位
   * @param point {x:'', y:''}
   */
  protected signCandidatePoint(point: IPoint) {
    this.clearCandidatePoint();
    if (point) {
      const x = point.x;
      const y = point.y;
      const pointGraphics: PIXI.Graphics = new PIXI.Graphics();
      const magnificationSelectedPoint = pointGraphics.circle(
        x,
        y,
        this.elementConfig.AGVPathPoint.size.r
      );
      magnificationSelectedPoint.stroke({
        color: this.elementConfig.AGVPathPoint.color.candidate,
      });
      magnificationSelectedPoint.fill({
        color: this.elementConfig.AGVPathPoint.color.candidate,
      });
      this.elementRendered.AGVPathPoint.setObj.candidate.add(
        magnificationSelectedPoint
      );
      this.elementRendered.candidateRange.container.addChild(
        magnificationSelectedPoint
      );
    }
  }
  protected clearCandidatePoint() {
    this.elementRendered.AGVPathPoint.setObj.candidate.forEach(
      (pointGraphics) => {
        pointGraphics?.destroy();
      }
    );
    this.elementRendered.AGVPathPoint.setObj.candidate.clear();
    this.elementRendered.candidateRange.container.removeChildren();
  }
  /*
   * 渲染 AGVPathPoint end
   */
  /*
   * 二维码初始化批量渲染
   */
  private MarkInitRenderBatch = (
    MarkJSONArr: any[],
    useCache: boolean = false
  ) => {
    const startTime = performance.now();

    // 获取字段映射关系
    const reflectObj = this._elementKeyReflect["Mark"];
    // 创建纹理容器
    const markGraphicsContext: PIXI.GraphicsContext =
      new PIXI.GraphicsContext();

    // 处理渲染
    const doRender = (markData: any) => {
      const { x, y, size, sx, sy, helfSize } = markData;
      // 绘制二维码纹理
      markGraphicsContext.rect(sx, sy, size, size);
      markGraphicsContext.moveTo(x, y);
      markGraphicsContext.lineTo(x + helfSize, y);
    };

    if (useCache) {
      // 有缓存数据，直接用缓存数据渲染
      const markArr = Array.from(
        this.elementRendered.Mark.mapObj.data.values()
      );
      this.elementConfig.Mark.performance.count = markArr.length;
      markArr.forEach((markData) => {
        doRender(markData);
      });
    } else {
      // 无缓存数据，处理初始数据渲染
      this.elementConfig.Mark.performance.count = MarkJSONArr.length;
      const doData = (mark: any) => {
        const id = mark[reflectObj["ElementId"]],
          x = this.getMapCoordiateX(Number(mark[reflectObj["X"]])),
          y = this.getMapCoordiateY(Number(mark[reflectObj["Y"]])),
          size = Number(mark[reflectObj["Size"]]) / 10,
          angle = Number(mark[reflectObj["Angle"]]),
          height = Number(mark[reflectObj["Height"]]);

        const markId = String(id);
        const helfSize = size / 2;
        const sx = x - helfSize;
        const sy = y - helfSize;
        const markData = {
          id,
          markId,
          x,
          y,
          size,
          sx,
          sy,
          helfSize,
          angle,
          height,
        };
        // 保存二维码数据
        this.elementRendered.Mark.mapObj.data.set(markId, markData);
        return markData;
      };
      // 判断是否需要渲染
      MarkJSONArr.forEach((mark) => {
        const markData = doData(mark);

        // 绘制二维码纹理
        doRender(markData);
      });
    }

    // 纹理上样式
    markGraphicsContext
      .stroke({
        color: this.elementConfig.Mark.color.default,
        width: this.elementConfig.Mark.size.default,
      })
      .fill({
        color: this.elementConfig.Mark.color.fill,
      });
    const markGraphics: PIXI.Graphics = new PIXI.Graphics(markGraphicsContext);

    this.elementRendered.Mark.texture = markGraphics;
    // 判断开关是否打开，打开才做渲染
    if (this._renderSwitch.mark) {
      this.elementRendered.Mark.container.addChild(markGraphics);
    }
    this.elementConfig.Mark.performance.time = performance.now() - startTime;
  };
  /**
   * 根据当前缩放率展示二维码元素
   * @param scale
   */
  private MarkScaleRenderBatch = (scale: number) => {
    // 判断缩放比例
    if (scale < this.criticalScaleMin) {
      // 直接删除
      this.MarkHide();
    } else {
      this.MarkShow();
    }
  };
  /**
   * 展示二维码
   */
  protected MarkShow() {
    this.elementRendered.Mark.container.removeChildren();
    this.elementRendered.Mark.container.addChild(
      this.elementRendered.Mark.texture
    );
  }
  /**
   * 隐藏二维码
   */
  protected MarkHide() {
    this.elementRendered.Mark.container.removeChildren();
  }

  /*
   * 渲染 Mark end
   */
  /**
   * 渲染 Line start
   * 线条初始化批量渲染
   */
  private LineShapeInitRenderBatch = (
    LineShapeJSONArr: any[],
    useCache: boolean = false
  ) => {
    const startTime = performance.now();

    // 获取字段映射关系
    const reflectObj = this._elementKeyReflect["LineShape"];

    // 创建纹理容器
    const lineGraphicsContext: PIXI.GraphicsContext =
      new PIXI.GraphicsContext();

    const doRender = (lineData: any) => {
      const { x1, y1, x2, y2 } = lineData;
      // 绘制线条
      lineGraphicsContext.moveTo(x1, y1);
      lineGraphicsContext.lineTo(x2, y2);
    };

    if (useCache) {
      // 有缓存数据，直接用缓存数据渲染
      const lineShapeArr = Array.from(
        this.elementRendered.LineShape.mapObj.data.values()
      );
      this.elementConfig.LineShape.performance.count = lineShapeArr.length;
      lineShapeArr.forEach((lineData) => {
        doRender(lineData);
      });
    } else {
      // 无缓存数据，处理初始数据渲染
      this.elementConfig.LineShape.performance.count = LineShapeJSONArr.length;
      // 处理数据
      const doData = (LineShape: any) => {
        const id = LineShape[reflectObj["ElementId"]],
          x1 = this.getMapCoordiateX(Number(LineShape[reflectObj["StartX"]])),
          y1 = this.getMapCoordiateY(Number(LineShape[reflectObj["StartY"]])),
          x2 = this.getMapCoordiateX(Number(LineShape[reflectObj["EndX"]])),
          y2 = this.getMapCoordiateY(Number(LineShape[reflectObj["EndY"]]));

        const lineId = String(id);
        const lineData = { id, lineId, x1, y1, x2, y2 };

        // 保存线条数据
        this.elementRendered.LineShape.mapObj.data.set(lineId, lineData);
        return lineData;
      };
      // 判断是否需要渲染
      LineShapeJSONArr.forEach((LineShape) => {
        const lineData = doData(LineShape);

        // 绘制线条
        doRender(lineData);
      });
    }

    // 设置线条样式
    lineGraphicsContext.stroke({
      color: this.elementConfig.LineShape.color.default,
      width: this.elementConfig.LineShape.size.default,
    });

    const lineShapGraphics: PIXI.Graphics = new PIXI.Graphics(
      lineGraphicsContext
    );
    this.elementRendered.LineShape.texture = lineShapGraphics;
    // 判断开关是否打开，打开才做渲染
    if (this._renderSwitch.line) {
      this.elementRendered.LineShape.container.addChild(lineShapGraphics);
    }

    this.elementConfig.LineShape.performance.time =
      performance.now() - startTime;
  };
  /**
   * 根据当前缩放率展示线条元素
   * @param scale
   */
  private LineShapeScaleRenderBatch = (scale: number) => {
    // 判断缩放比例
    if (scale < this.criticalScaleMin) {
      // 直接删除
      this.LineShapeHide();
    } else {
      // 重新渲染
      this.LineShapeShow();
    }
  };
  /**
   * 展示线条图形
   */
  protected LineShapeShow() {
    this.elementRendered.LineShape.container.removeChildren();
    this.elementRendered.LineShape.container.addChild(
      this.elementRendered.LineShape.texture
    );
  }
  /**
   * 隐藏线条图形
   */
  protected LineShapeHide() {
    this.elementRendered.LineShape.container.removeChildren();
  }
  /*
   * 渲染 Line end
   */
  /**
   * 渲染 Text start
   * 文案初始化批量渲染
   */
  private TextInitRenderBatch = (
    TextJSONArr: any[],
    useCache: boolean = false
  ) => {
    const startTime = performance.now();

    // 获取字段映射关系
    const reflectObj = this._elementKeyReflect["Text"];

    // 处理渲染
    let doRender = (textData: any) => {
      // 创建一个文字元素
      const docText = this.TextRenderSingle(textData);
      this.elementRendered.Text.mapObj.text.set(textData.textId, docText);
    };
    // 判断开关是否打开，打开才做渲染
    if (this._renderSwitch.text) {
      doRender = (textData: any) => {
        // 创建一个文字元素
        const docText = this.TextRenderSingle(textData);
        this.elementRendered.Text.mapObj.text.set(textData.textId, docText);
        this.elementRendered.Text.container.addChild(docText);
      };
    }

    if (useCache) {
      // 有缓存数据，直接用缓存数据渲染
      const textArr = Array.from(
        this.elementRendered.Text.mapObj.data.values()
      );
      this.elementConfig.Text.performance.count = textArr.length;
      textArr.forEach((textData) => {
        doRender(textData);
      });
    } else {
      // 无缓存数据，处理初始数据渲染
      this.elementConfig.Text.performance.count = TextJSONArr.length;
      // 处理数据
      const doData = (text: any) => {
        const id = text[reflectObj["ElementId"]],
          angle = Number(text[reflectObj["Angle"]]),
          x = this.getMapCoordiateX(Number(text[reflectObj["X"]])),
          y = this.getMapCoordiateY(Number(text[reflectObj["Y"]])),
          size = (Number(text[reflectObj["Size"]]) * this._unitZoom) / 100 / 5,
          doc = text[reflectObj["Text"]],
          color = text[reflectObj["Color"]]
            ? Number(text[reflectObj["Color"]])
            : this.elementConfig.Text.color.default;

        const textId = String(id);
        const textData = { id, textId, x, y, doc, size, color, angle };

        // 存储文案数据
        this.elementRendered.Text.mapObj.data.set(textId, textData);
        return textData;
      };
      // 判断是否需要渲染
      TextJSONArr.forEach((text) => {
        const textData = doData(text);

        // 创建一个文字元素
        doRender(textData);
      });
    }
    this.elementConfig.Text.performance.time = performance.now() - startTime;
  };
  /**
   * 根据当前缩放率展示文本元素
   * @param scale
   */
  private TextScaleRenderBatch = (scale: number) => {
    // 判断缩放比例
    if (scale < this.criticalScaleMin) {
      // 直接删除
      this.TextHide();
    } else {
      // 重新渲染
      this.TextShow();
    }
  };
  /**
   * 已经生成的文字元素显示
   */
  protected TextShow() {
    this.elementRendered.Text.container.removeChildren();
    this.elementRendered.Text.mapObj.text.forEach((docText, textId) => {
      this.elementRendered.Text.container.addChild(docText);
    });
  }
  /**
   * 已经生成的文字元素隐藏
   */
  protected TextHide() {
    this.elementRendered.Text.container.removeChildren();
  }
  /**
   * 根据已经处理过的数据，创建单个文本元素
   * @param textData
   */
  private TextRenderSingle = (textData) => {
    const { id, textId, x, y, doc, size, color, angle } = textData;

    const docText: PIXI.Text = new PIXI.Text({
      text: doc,
      style: new PIXI.TextStyle({
        fontSize: size,
        fill: color,
        align: "center",
      }),
    });

    docText.anchor.set(0.5, 0.5);
    docText.position.set(x, y);
    docText.angle = angle;
    return docText;
  };
  /*
   * 渲染 Text end
   */

  /**
   * 底图 start
   */
  // 渲染底图
  protected renderBackgroundImg() {
    if (!this.app?.stage) return;
    if (this._backgroundImgData.url) {
      fetch(this._backgroundImgData.url)
        .then((response) => response.blob())
        .then((blob) => {
          // 创建一个 FileReader 对象
          const reader = new FileReader();
          reader.readAsDataURL(blob);
          reader.onloadend = (ev: ProgressEvent<FileReader>) => {
            let base64data: string = ev.target?.result as string;
            // 替换 MIME 类型为正确的 MIME 类型
            base64data = base64data.replace(
              /^data:application\/octet-stream/,
              `data:image/png`
            );
            PIXI.Assets.load(base64data).then((backgroundImgTexture) => {
              // 图片加载完成
              /**
             * frame:{
                "type": "rectangle",
                "x": 0,
                "y": 0,
                "width": 3798,
                "height": 8022
              }
             */
              if (!backgroundImgTexture.frame) return;
              this.elementRendered.backgroundImg.container.removeChildren();
              // 图片分辨率宽高
              const backgroundImgWidth = backgroundImgTexture.frame.width;
              const backgroundImgHeight = backgroundImgTexture.frame.height;
              const resolution = this._backgroundImgData.args?.resolution || 1;
              const origin = this._backgroundImgData.args?.origin || [0, 0, 0];
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
                backgroundImgLeftBottomCoordinateY -
                backgroundImgCoordinateHeight;
              //  计算背景图片的于物理世界的真实轮廓范围
              this._backgroundImgData.rectangle = {
                width: backgroundImgCoordinateWidth,
                height: backgroundImgCoordinateHeight,
                left: backgroundImgLeftTopCoordinateX,
                top: backgroundImgLeftTopCoordinateY,
                right:
                  backgroundImgLeftBottomCoordinateX +
                  backgroundImgCoordinateWidth,
                bottom: backgroundImgLeftBottomCoordinateY,
              };
              this._backgroundImgData.blackBase =
                this._backgroundImgData.args?.negate == 1 ? true : false;

              // 渲染背景图精灵
              this.elementRendered.backgroundImg.mapObj.texture.set(
                this._backgroundImgData.url,
                backgroundImgTexture
              );
              const backgroundImgSprite =
                PIXI.Sprite.from(backgroundImgTexture);
              this.elementRendered.backgroundImg.mapObj.img.set(
                this._backgroundImgData.url,
                backgroundImgSprite
              );
              const backgroundImgContainer =
                this.elementRendered.backgroundImg.container;
              // 摆正精灵位置和大小
              backgroundImgSprite.width = backgroundImgCoordinateWidth;
              backgroundImgSprite.height = backgroundImgCoordinateHeight;
              if (this._renderSwitch.backgroundImg) {
                backgroundImgContainer.addChild(backgroundImgSprite);
              }
              backgroundImgContainer.position.set(
                this._backgroundImgData.rectangle.left,
                this._backgroundImgData.rectangle.top
              );
              // 设置透明度
              backgroundImgContainer.alpha = 0.3;
              // 处理背景色
              if (this._backgroundImgData.blackBase) {
                const backgroundImgFilter = new PIXI.ColorMatrixFilter();
                backgroundImgFilter.negative(true);
                // backgroundImgFilter.contrast(0.1, true)
                // backgroundImgFilter.brightness(0.5, true)
                // 定义反色滤镜的片段着色器代码
                backgroundImgContainer.filters = [backgroundImgFilter];
              }
            });
          };
        })
        .catch((error) => console.error("Error fetching image:", error));
    }
  }
  // 清除底图
  protected cancelBackgroundImg() {
    this.elementRendered.backgroundImg.mapObj.img.forEach(
      (imgSprite: PIXI.Sprite) => {
        imgSprite.destroy();
      }
    );
    this.elementRendered.backgroundImg.mapObj.img.clear();

    this.elementRendered.backgroundImg.mapObj.texture.forEach(
      (imgTexture: PIXI.Texture) => {
        imgTexture.destroy();
      }
    );
    this.elementRendered.backgroundImg.mapObj.texture.clear();

    this.elementRendered.backgroundImg.container.removeChildren();
  }
  /**
   * 显示背景图
   */
  protected backgroundImgShow() {
    // 判断是否已经有背景图资源
    if (
      this.elementRendered.backgroundImg.mapObj.img.has(
        this._backgroundImgData.url
      )
    ) {
      this.elementRendered.backgroundImg.container.removeChildren();
      this.elementRendered.backgroundImg.container.addChild(
        this.elementRendered.backgroundImg.mapObj.img.get(
          this._backgroundImgData.url
        )
      );
    } else {
      this.renderBackgroundImg();
    }
  }
  /**
   * 隐藏背景图
   */
  protected backgroundImgHide() {
    this.elementRendered.backgroundImg.container.removeChildren();
  }
  /**
   * 底图 end
   */

  /**
   * 根据库位的模式、类型、information筛选展示/隐藏库位
   * @param params
   * {
   *    mode: Array string[] SingleDirection/DualDirection/FourDirection
   *    type: Array string[] Normal/AGVPark/ChargingPark
   *    information: Array string[]
   * }
   */
  private filterParksTimer;
  protected filterParks() {
    this.filterParksTimer && clearTimeout(this.filterParksTimer);
    this.filterParksTimer = setTimeout(() => {
      // 必须已渲染完成
      if (!this._renderSwitch.completed) return;
      const filters: IParkFilter = { mode: [], type: [], information: [] };
      Object.assign(filters, {
        mode: this._renderFilter.parkMode,
        type: this._renderFilter.parkType,
        information: this._renderFilter.parkInformation,
      });
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
        if (
          filters.mode &&
          Array.isArray(filters.mode) &&
          filters.mode.length
        ) {
          modeParkIds = [];
          // 有过滤条件，按照过滤条件过滤
          const parkModeReflect = this._elementKeyReflect["ParkMode"];
          filters.mode.forEach((mode: string) => {
            let temp: string[];
            switch (mode) {
              case parkModeReflect.SingleDirection:
                temp = Array.from(
                  this.elementRendered.Park.setObj.SingleDirection.keys()
                ) as string[];
                modeParkIds = modeParkIds?.concat(temp);
                sum = sum.concat(temp);
                break;
              case parkModeReflect.DualDirection:
                temp = Array.from(
                  this.elementRendered.Park.setObj.DualDirection.keys()
                ) as string[];
                modeParkIds = modeParkIds?.concat(temp);
                sum = sum.concat(temp);
                break;
              case parkModeReflect.FourDirection:
                temp = Array.from(
                  this.elementRendered.Park.setObj.FourDirection.keys()
                ) as string[];
                modeParkIds = modeParkIds?.concat(temp);
                sum = sum.concat(temp);
                break;
            }
          });
        }
        if (
          filters.type &&
          Array.isArray(filters.type) &&
          filters.type.length
        ) {
          typeParkIds = [];
          // 有过滤条件，按照过滤条件过滤
          const parkTypeReflect = this._elementKeyReflect["ParkType"];
          filters.type.forEach((type: string) => {
            let temp: string[];
            switch (type) {
              case parkTypeReflect.Normal:
                temp = Array.from(
                  this.elementRendered.Park.setObj.Normal.keys()
                ) as string[];
                typeParkIds = typeParkIds?.concat(temp);
                sum = sum.concat(temp);
                break;
              case parkTypeReflect.AGVPark:
                temp = Array.from(
                  this.elementRendered.Park.setObj.AGVPark.keys()
                ) as string[];
                typeParkIds = typeParkIds?.concat(temp);
                sum = sum.concat(temp);
                break;
              case parkTypeReflect.ChargingPark:
                temp = Array.from(
                  this.elementRendered.Park.setObj.ChargingPark.keys()
                ) as string[];
                typeParkIds = typeParkIds?.concat(temp);
                sum = sum.concat(temp);
                break;
            }
          });
        }
        // 收集进出路线相关数据
        const parkIdToInformationsMap = {};
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
              this.elementRendered.information.objObj.parkToPath?.hasOwnProperty(
                info
              )
            ) {
              const temp: string[] = Object.keys(
                this.elementRendered.information.objObj.parkToPath[info]
              );
              informationParkIds = informationParkIds?.concat(temp);
              sum = sum.concat(temp);
              informationParkIds?.forEach((parkId: string) => {
                if (parkIdToInformationsMap?.hasOwnProperty(parkId)) {
                  parkIdToInformationsMap[parkId].push(info);
                } else {
                  parkIdToInformationsMap[parkId] = [info];
                }
              });
            }
          });
        }
        // 并集去重
        sum = Array.from(new Set(sum));
        // 获取交集
        const intersection = sum.filter((parkId: string) => {
          if (
            modeParkIds &&
            Array.isArray(modeParkIds) &&
            modeParkIds.length &&
            !modeParkIds.includes(parkId)
          )
            return false;
          if (
            typeParkIds &&
            Array.isArray(typeParkIds) &&
            typeParkIds.length &&
            !typeParkIds.includes(parkId)
          )
            return false;
          if (
            informationParkIds &&
            Array.isArray(informationParkIds) &&
            informationParkIds.length &&
            !informationParkIds.includes(parkId)
          )
            return false;
          return true;
        });
        // 先全部隐藏
        this.ParkHide();

        // 获取当前层所有的库位
        const currentLayer = Number(this._renderFilter.layer)
        const currentLayerParkId: string[] = []
        this.elementRendered.Park.mapObj.data.forEach((parkData: IParkData, parkId: string) => {
          const parkLayers = parkData.parkLayers || []
          if (parkLayers.length === 0 || (parkLayers.length && parkLayers.includes(currentLayer))) currentLayerParkId.push(parkId)
        })

        // 再展示交集内的库位
        intersection.forEach((parkId: string) => {
          // 不在当前层的库位不显示
          if (!currentLayerParkId.includes(parkId)) return
          // 展示库位相关
          this.showParkById(parkId);
          // 如有进出路线条件，则展示进出路线标识
          if (
            Object.keys(parkIdToInformationsMap).length &&
            parkIdToInformationsMap.hasOwnProperty(parkId)
          ) {
            const infoArr = parkIdToInformationsMap[parkId];
            infoArr.forEach((info: string) => {
              if (
                this.elementRendered.information.objObj.parkToPath[
                  info
                ]?.hasOwnProperty(parkId)
              ) {
                const pathId =
                  this.elementRendered.information.objObj.parkToPath[info][
                    parkId
                  ];
                if (this.elementRendered.AGVPath.mapObj.data.has(pathId)) {
                  const _pathData =
                    this.elementRendered.AGVPath.mapObj.data.get(pathId);
                  // 渲染候选指示路径
                  this.renderAGVPathByType("move", _pathData);
                }
              }
            });
          }
        });
      } else {
        // 不过滤库位，则显示全部库位
        this.ParkShow();
      }
    }, 200);
  }

  /**
   * 轮廓元素 start
   */
  // 渲染VNL轮廓
  private renderVnlOutline() {
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
      const ele = _AreaEle[key as keyof typeof _AreaEle];
      this.elementRendered.outline.objObj.vnl[
        key as keyof typeof this.elementRendered.outline.objObj.vnl
      ] = ele;
      if (this._renderSwitch.vnlOutline) this.elementRendered.outline.container.addChild(ele);
    });
  }
  /**
   * 展示VNL轮廓
   */
  protected vnlOutlineShow() {
    this.elementRendered.outline.container.removeChildren();
    Object.values(this.elementRendered.outline.objObj.vnl).forEach((ele) => {
      this.elementRendered.outline.container.addChild(ele);
    });
    // 因为重绘了点位，需要重新绑定选中事件
    window.requestAnimationFrame(() => {
      this._rebindEvent("vnlOutlineMove");
    });
  }
  /**
   * 隐藏VNL轮廓
   */
  protected vnlOutlineHide() {
    this.elementRendered.outline.container.removeChildren();
  }
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
    ele: PIXI.Text,
    x: number,
    y: number
  ) {
    if (!position || !ele || !this.isNumber(x) || !this.isNumber(y)) return;
    ele.text = this.getCoordinateTextStr(x, y);
    const CoordinateTextEleBox = ele.getBounds();
    switch (position) {
      case "leftTop":
        ele.position.set(
          x - CoordinateTextEleBox.width / 2,
          y - 24 //CoordinateTextEleBox.height * 0.75
        );
        break;
      case "rightTop":
        ele.position.set(
          x + CoordinateTextEleBox.width / 2,
          y - 24 //CoordinateTextEleBox.height * 0.75
        );
        break;
      case "rightBottom":
        ele.position.set(
          x + CoordinateTextEleBox.width / 2,
          y + 24 //CoordinateTextEleBox.height * 0.75
        );
        break;
      case "leftBottom":
        ele.position.set(
          x - CoordinateTextEleBox.width / 2,
          y + 24 //CoordinateTextEleBox.height * 0.75
        );
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
        textSize: 24,
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

    // 点位
    const left = leftTopCoordiate.x;
    const top = leftTopCoordiate.y;
    const right = rightBottomCoordiate.x;
    const bottom = rightBottomCoordiate.y;
    const leftMiddleY = (leftTopCoordiate.y + leftBottomCoordiate.y) / 2;
    const topMiddleX = (leftTopCoordiate.x + rightTopCoordiate.x) / 2;
    const rightMiddleY = (rightTopCoordiate.y + rightBottomCoordiate.y) / 2;
    const bottomMiddleX = (leftBottomCoordiate.x + rightBottomCoordiate.x) / 2;
    // 计算矩形宽高
    const width = rightBottomCoordiate.x - leftTopCoordiate.x;
    const height = rightBottomCoordiate.y - leftTopCoordiate.y;

    // 1 生成矩形主元素
    const OutlineMainEle = new PIXI.Graphics();
    OutlineMainEle.rect(0, 0, width, height);
    OutlineMainEle.stroke({
      width: borderSize,
      color: mainColor,
    });
    if (bgColor) {
      OutlineMainEle.fill({ color: bgColor, alpha: 0.5 });
    } else {
      OutlineMainEle.fill({ alpha: 0 });
    }
    OutlineMainEle.pivot.set(0, 0);
    OutlineMainEle.position.set(left, top);

    // 2 上边移动点
    const OutlineTopPointEle = new PIXI.Graphics();
    OutlineTopPointEle.circle(0, 0, pointRadius);
    OutlineTopPointEle.stroke({
      width: 1,
      color: mainColor,
    });
    OutlineTopPointEle.fill({
      color: mainColor,
    });
    OutlineTopPointEle.pivot.set(0.5);
    OutlineTopPointEle.x = topMiddleX;
    OutlineTopPointEle.y = top;
    // 3 右边移动点
    const OutlineRightPointEle = new PIXI.Graphics();
    OutlineRightPointEle.circle(0, 0, pointRadius);
    OutlineRightPointEle.stroke({
      width: 1,
      color: mainColor,
    });
    OutlineRightPointEle.fill({
      color: mainColor,
    });
    OutlineRightPointEle.pivot.set(0.5);
    OutlineRightPointEle.x = right;
    OutlineRightPointEle.y = rightMiddleY;
    // 4 下边移动点
    const OutlineBootomPointEle = new PIXI.Graphics();
    OutlineBootomPointEle.circle(0, 0, pointRadius);
    OutlineBootomPointEle.stroke({
      width: 1,
      color: mainColor,
    });
    OutlineBootomPointEle.fill({
      color: mainColor,
    });
    OutlineBootomPointEle.pivot.set(0.5);
    OutlineBootomPointEle.x = bottomMiddleX;
    OutlineBootomPointEle.y = bottom;
    // 5 左边移动点
    const OutlineLeftPointEle = new PIXI.Graphics();
    OutlineLeftPointEle.circle(0, 0, pointRadius);
    OutlineLeftPointEle.stroke({
      width: 1,
      color: mainColor,
    });
    OutlineLeftPointEle.fill({
      color: mainColor,
    });
    OutlineLeftPointEle.pivot.set(0.5);
    OutlineLeftPointEle.x = left;
    OutlineLeftPointEle.y = leftMiddleY;

    // VNL文件轮廓四个顶点
    const coordinateTextSize: number = textSize;
    const coordinateTextStyle = new PIXI.TextStyle({
      fontSize: coordinateTextSize,
      fontWeight: "bold",
      fill: mainColor,
      align: "center",
    });
    // 6 左上角顶点元素
    const OutlineLeftTopPointEle = new PIXI.Graphics();
    OutlineLeftTopPointEle.circle(0, 0, pointRadius);
    OutlineLeftTopPointEle.stroke({
      width: 1,
      color: mainColor,
    });
    OutlineLeftTopPointEle.fill({
      color: mainColor,
    });
    OutlineLeftTopPointEle.pivot.set(0.5);
    OutlineLeftTopPointEle.x = left;
    OutlineLeftTopPointEle.y = top;
    // 7 左上角顶点坐标文案元素
    const leftTopCoordinateText = this.getCoordinateTextStr(
      leftTopCoordiate.x,
      leftTopCoordiate.y
    );
    const OutlineLeftTopCoordinateTextEle = new PIXI.Text({
      text: leftTopCoordinateText,
      style: coordinateTextStyle,
    });
    OutlineLeftTopCoordinateTextEle.anchor.set(0.5, 0.5);
    this.updateOutlineCoordinateText(
      "leftTop",
      OutlineLeftTopCoordinateTextEle,
      leftTopCoordiate.x,
      leftTopCoordiate.y
    );

    // 8 右上角顶点元素
    const OutlineRightTopPointEle = new PIXI.Graphics();
    OutlineRightTopPointEle.circle(0, 0, pointRadius);
    OutlineRightTopPointEle.stroke({
      width: 1,
      color: mainColor,
    });
    OutlineRightTopPointEle.fill({
      color: mainColor,
    });
    OutlineRightTopPointEle.pivot.set(0.5);
    OutlineRightTopPointEle.x = right;
    OutlineRightTopPointEle.y = top;
    // 9 右上角顶点坐标文案元素
    const rightTopCoordinateText = this.getCoordinateTextStr(
      rightTopCoordiate.x,
      rightTopCoordiate.y
    );
    const OutlineRightTopCoordinateTextEle = new PIXI.Text({
      text: rightTopCoordinateText,
      style: coordinateTextStyle,
    });
    OutlineRightTopCoordinateTextEle.anchor.set(0.5, 0.5);
    this.updateOutlineCoordinateText(
      "rightTop",
      OutlineRightTopCoordinateTextEle,
      rightTopCoordiate.x,
      rightTopCoordiate.y
    );

    // 10 右下角顶点元素
    const OutlineRightBottomPointEle = new PIXI.Graphics();
    OutlineRightBottomPointEle.circle(0, 0, pointRadius);
    OutlineRightBottomPointEle.stroke({
      width: 1,
      color: mainColor,
    });
    OutlineRightBottomPointEle.fill({
      color: mainColor,
    });
    OutlineRightBottomPointEle.pivot.set(0.5);
    OutlineRightBottomPointEle.x = right;
    OutlineRightBottomPointEle.y = bottom;
    // 11 右下角顶点坐标文案元素
    const rightBottomCoordinateText = this.getCoordinateTextStr(
      rightBottomCoordiate.x,
      rightBottomCoordiate.y
    );
    const OutlineRightBottomCoordinateTextEle = new PIXI.Text({
      text: rightBottomCoordinateText,
      style: coordinateTextStyle,
    });
    OutlineRightBottomCoordinateTextEle.anchor.set(0.5, 0.5);
    this.updateOutlineCoordinateText(
      "rightBottom",
      OutlineRightBottomCoordinateTextEle,
      rightBottomCoordiate.x,
      rightBottomCoordiate.y
    );

    // 12 左下角顶点元素
    const OutlineLeftBottomPointEle = new PIXI.Graphics();
    OutlineLeftBottomPointEle.circle(0, 0, pointRadius);
    OutlineLeftBottomPointEle.stroke({
      width: 1,
      color: mainColor,
    });
    OutlineLeftBottomPointEle.fill({
      color: mainColor,
    });
    OutlineLeftBottomPointEle.pivot.set(0.5);
    OutlineLeftBottomPointEle.x = left;
    OutlineLeftBottomPointEle.y = bottom;
    // 13 左下角顶点坐标文案元素
    const leftBottomCoordinateText = this.getCoordinateTextStr(
      leftBottomCoordiate.x,
      leftBottomCoordiate.y
    );
    const OutlineLeftBottomCoordinateTextEle = new PIXI.Text({
      text: leftBottomCoordinateText,
      style: coordinateTextStyle,
    });
    OutlineLeftBottomCoordinateTextEle.anchor.set(0.5, 0.5);
    this.updateOutlineCoordinateText(
      "leftBottom",
      OutlineLeftBottomCoordinateTextEle,
      leftBottomCoordiate.x,
      leftBottomCoordiate.y
    );

    return {
      MainEle: OutlineMainEle,
      TopPointEle: OutlineTopPointEle,
      RightPointEle: OutlineRightPointEle,
      BootomPointEle: OutlineBootomPointEle,
      LeftPointEle: OutlineLeftPointEle,
      LeftTopTextEle: OutlineLeftTopCoordinateTextEle,
      RightTopTextEle: OutlineRightTopCoordinateTextEle,
      RightBottomTextEle: OutlineRightBottomCoordinateTextEle,
      LeftBottomTextEle: OutlineLeftBottomCoordinateTextEle,
      LeftTopPointEle: OutlineLeftTopPointEle,
      RightTopPointEle: OutlineRightTopPointEle,
      RightBottomPointEle: OutlineRightBottomPointEle,
      LeftBottomPointEle: OutlineLeftBottomPointEle,
    } as IOutlineEleData;
  }
  /**
   * 轮廓元素 end
   */

  /**
   * 库位规模变动引起的库位ID文案变动
   * @returns
   */
  protected filterParkId() {
    if (!this._renderSwitch.completed) return;
    const filters: ILayerFilter = { current: 1, parkMaxNum: 100000 };
    Object.assign(filters, {
      current: this._renderFilter.layer,
      parkMaxNum: this._renderFilter.layerMaxNum,
    });
    // 获取到库位ID图层
    Array.from(this.elementRendered.Park.setObj.visible.keys()).forEach((parkId) => {
      this.changeParkLayer(parkId, filters.current, filters.parkMaxNum)
    });
  }
  /**
   * 更改库位层数
   * @param parkId
   * @param layer
   * @param parkMaxNum
   * @returns
   */
  private changeParkLayer(parkId: string, layer: number, parkMaxNum: number) {
    parkId = String(parkId)
    if (!this.elementRendered.Park.mapObj.parkId.has(parkId)) return

    const parkIdText: PIXI.Text = this.elementRendered.Park.mapObj.parkId.get(parkId)
    const currentText = parkIdText.text;
    const parkNo = String(
      this.formatLayerParkNo(parkId, layer, parkMaxNum)
    );
    if (currentText !== parkNo) {
      parkIdText.text = parkNo;
      // 清掉选中状态
      if (this.elementRendered.Park.mapObj.selected.has(parkNo)) {
        this.signParkSelect(parkNo, false);
      } else {
        this.signParkDefault(parkNo, false);
      }
    }
  }
  /**
   * 根据库位层数过滤库位
   * @returns
   */
  protected filterParkByLayer() {
    if (!this._renderSwitch.completed) return;
    const filters: ILayerFilter = { current: 1, parkMaxNum: 100000 };
    Object.assign(filters, {
      current: Number(this._renderFilter.layer),
      parkMaxNum: Number(this._renderFilter.layerMaxNum),
    });

    // 遍历库位，显示或隐藏
    this.elementRendered.Park.mapObj.data.forEach((parkData: IParkData, parkId: string) => {
      const parkLayers = parkData.parkLayers || []
      if (parkLayers.length) {
        // 有设置库位层数，判断该层是否有库位
        if (parkLayers.includes(filters.current)) {
          // 有该层，显示库位
          this.showParkById(parkId)
          // 更新库位ID
          this.changeParkLayer(parkId, filters.current, filters.parkMaxNum)
        } else {
          // 无该层，隐藏库位
          this.hiddenParkById(parkId)
        }
      } else {
        // 没设置库位层数，只切换库位ID
        this.changeParkLayer(parkId, filters.current, filters.parkMaxNum)
      }
    })
  }

  /**
   * 渲染原点00坐标标识
   */
  private renderOriginCoordinate() {
    // 转换实际的00坐标点
    const zeroX = this.getMapCoordiateX(0)
    const zeroY = this.getMapCoordiateY(0)
    const crossX = zeroX + this.elementConfig.system.size.originX
    const crossY = zeroY - this.elementConfig.system.size.originY


    const originContainer: PIXI.Container = new PIXI.Container()
    const yGraphics: PIXI.Graphics = new PIXI.Graphics()
    yGraphics.moveTo(zeroX, zeroY)
    yGraphics.lineTo(zeroX, crossY)
    yGraphics.stroke({
      width: this.elementConfig.system.width.originY,
      color: this.elementConfig.system.color.originY
    })
    const yMax = crossY - this.elementConfig.system.size.arrows
    yGraphics.moveTo(zeroX, yMax)
    yGraphics.lineTo(zeroX-5, crossY)
    yGraphics.lineTo(zeroX+5, crossY)
    yGraphics.lineTo(zeroX, yMax)
    yGraphics.fill(this.elementConfig.system.color.originY)

    const yText: PIXI.Text = new PIXI.Text({
      text: 'y',
      style: new PIXI.TextStyle({
        fontSize: 14,
        fill: this.elementConfig.system.color.originY,
        align: "center",
      }),
    });
    yText.anchor.set(0.5, 1)
    yText.position.set(zeroX, yMax)

    const xGraphics: PIXI.Graphics = new PIXI.Graphics()
    xGraphics.moveTo(zeroX, zeroY)
    xGraphics.lineTo(crossX, zeroY)
    xGraphics.stroke({
      width: this.elementConfig.system.width.originX,
      color: this.elementConfig.system.color.originX
    })
    const xMax = crossX + this.elementConfig.system.size.arrows
    xGraphics.moveTo(xMax, zeroY)
    xGraphics.lineTo(crossX, zeroY + 5)
    xGraphics.lineTo(crossX, zeroY - 5)
    xGraphics.lineTo(xMax, zeroY)
    xGraphics.fill(this.elementConfig.system.color.originX)

    const xText: PIXI.Text = new PIXI.Text({
      text: 'x',
      style: new PIXI.TextStyle({
        fontSize: 14,
        fill: this.elementConfig.system.color.originX,
        align: "center",
      }),
    });
    xText.anchor.set(0, 0.5)
    xText.position.set(xMax, zeroY)

    const originGraphics: PIXI.Graphics = new PIXI.Graphics()
    originGraphics.circle(zeroX, zeroY, 3)
    originGraphics.fill(this.elementConfig.system.color.originX)

    const originText: PIXI.Text = new PIXI.Text({
      text: '0,0',
      style: new PIXI.TextStyle({
        fontSize: 12,
        fill: this.elementConfig.system.color.originY,
        align: "center",
      }),
    });
    originText.anchor.set(1, 0)
    originText.position.set(zeroX, zeroY)

    originContainer.addChild(yGraphics)
    originContainer.addChild(yText)
    originContainer.addChild(xGraphics)
    originContainer.addChild(xText)
    originContainer.addChild(originGraphics)
    originContainer.addChild(originText)

    this.elementRendered.system.objObj.origin = originContainer
    if (this._renderSwitch.origin) {
      this.elementRendered.system.container.addChild(originContainer)
    }
  }

  /**
   * 显示原点坐标系
   */
  protected originCoordinateShow() {
    if (this.elementRendered.system.objObj.origin) {
      this.elementRendered.system.container.addChild(this.elementRendered.system.objObj.origin)
    }
  }
  /**
   * 隐藏原点坐标系
   */
  protected originCoordinateHide() {
    this.elementRendered.system.container.removeChildren()
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
   * @param agvPath String B;001,0.585,3.532,-90;002,1.185,2.932,0;001,2.415,2.932,0;
   * B;1,0.585,3.532,-90
   * 前进/倒退;线段类型,x坐标,y坐标,AGV航向
   *
   * 逐个字段解析：
   * 前进/倒退：F：前进；B 后退；
   * 线段类型：xyz
   *          z表示线类型：1 直线；2 弧线；3 3阶Hermite样条；4 3阶B样条；5 斜移直线；
   *          y表示是否动态路径：0 默认；1 标识动态路径；
   *          x表示是否出入库：0 默认；1 标识入库路径；2 标识出库路径；
   * x坐标,y坐标：浮点类型，单位是米
   * AGV航向：坐标系如下
   *                90度
   *                |
   *                |
   * 180度-180度——— ———— ———→X  0度
   *                |
   *                |
   *                ↓
   *                Y -90度
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
          id: "",
          x1: this.getMapCoordiateX(Number(coordinateDataArr[1])),
          y1: this.getMapCoordiateY(Number(coordinateDataArr[2])),
          x2: 0,
          y2: 0,
          radius: 0,
          forward: isForward,
          theta1: 0,
          theta2: 0,
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
          currentPathData.theta1 = t1;
          const t2 = Number(nextCoordinateDataArr[3]);
          currentPathData.theta2 = t2;
          const a1 = this.thetaToAngle(t1);
          const a2 = this.thetaToAngle(t2);
          const a12 = a2 - a1;
          if (Math.abs(a12) <= 1) {
            // 直线
            currentPathData.radius = 0;
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
            currentPathData.radius =
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
}
