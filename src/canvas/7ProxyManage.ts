import * as PIXI from "pixi.js";
import * as CryptoJS from "crypto-js";
import Draw from "./6Draw";
import { IMark, IFilter, IDraw } from "./Interface";

export default class ProxyManage extends Draw {

  protected mapOriginData = new Proxy(this._mapOriginData, {
    set: (obj: any, prop, value) => {
      switch (prop) {
        case "contentDom":
          obj[prop] = value;
          break;
        case "rectangle":
          if (value) {
            // 赋值坐标系偏移值
            this._offsetX = value.left * this._unitZoom;
            this._offsetY = value.top * -this._unitZoom;
            obj[prop] = {
              left: this.getMapCoordiateX(value.left),
              right: this.getMapCoordiateX(value.right),
              bottom: this.getMapCoordiateY(value.bottom),
              top: this.getMapCoordiateY(value.top),
              width: value.width * this._unitZoom,
              height: value.height * this._unitZoom,
            };
            this._outlineData.vnlElement = Object.assign({}, obj[prop]);
          }
          break;
        case "rectangleCustom":
          if (value) {
            obj[prop] = {
              left: this.getMapCoordiateX(value.left),
              right: this.getMapCoordiateX(value.right),
              bottom: this.getMapCoordiateY(value.bottom),
              top: this.getMapCoordiateY(value.top),
              width: value.width * this._unitZoom,
              height: value.height * this._unitZoom,
            };
            this._outlineData.vnlOutline = Object.assign({}, obj[prop]);
          }
          break;
        case "originData":
          if (value && typeof value === "object") {
            console.time("哈希处理原始数据");
            obj[prop] = JSON.stringify(value);
            const currentHashKey = CryptoJS.SHA256(
              obj["originData"]
            ).toString(CryptoJS.enc.Hex);
            if (this._mapOriginDataHashKey) {
              // 存在上一个VNL数据，则判断是否变更了VNL
              this._isChangeMap = this._mapOriginDataHashKey !== currentHashKey
            }
            this._mapOriginDataHashKey = currentHashKey
            console.timeEnd("哈希处理原始数据");
            // 赋值分类数据
            Object.assign(this.mapClassifyData, value);
            // 设置数据已经准备好
            this.renderSwitch.dataReady = true;
            return true;
          }
          break;
      }
      return true;
    },
  });

  /**
   * 分类后的VNL原始数据
   */
  protected mapClassifyData = new Proxy(this._mapClassifyData, {
    get: (target: any, prop: string, receiver) => {
      switch (prop) {
        case "clear":
          // 初始化
          Object.keys(target).forEach((key: string) => {
            target[key] = [];
          });
          break;
      }
      return target[prop];
    },
  });

  /**
   * VNL元素渲染开关控制
   */
  protected renderSwitch = new Proxy(this._renderSwitch, {
    set: (obj: any, prop, value) => {
      obj[prop] = value;
      switch (prop) {
        case "dataReady":
          if (value) this.renderManage();
          break;
        case "completed":
          if (value) this.renderCompleteCallback();
          break;
      }
      return true;
    },
  });

  /**
   * 渲染地图元素 start
   */
  private renderManage() {
    // 判断容器大小
    if (
      !this.contentDom ||
      !this.contentDom.offsetWidth ||
      !this.contentDom.offsetHeight ||
      this.contentDom.offsetWidth < 0 ||
      this.contentDom.offsetHeight < 0
    )
      return console.log(
        "地图容器尺寸无效：",
        this.contentDom,
        this.contentDom?.offsetWidth,
        this.contentDom?.offsetHeight
      );
    // 创建渲染应用
    this.app = new PIXI.Application();
    globalThis.__PIXI_APP__ = this.app; // DEBUG 插件
    // 初始化应用
    this.app
      .init({
        background: "#f5f5f5",
        antialias: this._antialias, // 抗锯齿
        resizeTo: this.contentDom,
        width: this.contentDom.offsetWidth,
        height: this.contentDom.offsetHeight,
      })
      .then(() => {
        // 添加convas到主容器
        this.contentDom.appendChild(this.app.canvas);

        // 生成视口过滤元素区域
        // const maskRect = new PIXI.Graphics()
        //   .rect(0, 0, this.app.screen.width, this.app.screen.height)
        //   .fill({ color: 0xf5f5f5, alpha: 0 });
        // 超过视口的就不渲染
        // this.app.stage.mask = maskRect;
        // this.mainContainer.mask = maskRect; // 决定着主容器的事件范围
        // this.app.stage.addChild(maskRect);

        // 添加主地图容器到舞台
        this.app.stage.addChild(this.mainContainer);

        // 处理地图数据
        console.time("数据处理时间");
        // 处理静态地图元素
        this.renderStaticElements().then(() => {
          console.timeEnd("数据处理时间");
          console.time("渲染时间");
          window.requestAnimationFrame(() => {
            console.timeEnd("渲染时间");
            // 销毁渲染中动画和元素
            this.removeLoadingAnimation()
            // 设置渲染完成
            this.renderSwitch.completed = true;
            this.rendering = false;
            // 移动视口到地图元素中央，确保用户视口离地图元素不会很远
            if (this._renderSwitch.backgroundImg) {
              const x = (this._outlineData.backgroundImg.left + this._outlineData.backgroundImg.right) / 2
              const y = (this._outlineData.backgroundImg.top + this._outlineData.backgroundImg.bottom) / 2
              this.panCoordinateToCenter(x, y)
            } else if (this._renderSwitch.vnl) {
              const x = (this._outlineData.vnlElement.left + this._outlineData.vnlElement.right) / 2
              const y = (this._outlineData.vnlElement.top + this._outlineData.vnlElement.bottom) / 2
              this.panCoordinateToCenter(x, y)
            }
          })
        }).catch(() => {
          // 销毁渲染中动画和元素
          this.removeLoadingAnimation()
        });
      });
  }

  /**
   * 地图渲染代理
   * 传入图片URL动态渲染
   * 用于整张VNL已经渲染完成之后的底图替换或关闭
   */
  public backgroundImgData = new Proxy(this._backgroundImgData, {
    set: (target: any, prop: any, value: any) => {
      target[prop] = value;
      this._backgroundImgData[prop] = value;
      switch (prop) {
        case "url":
          if (value) {
            this.renderBackgroundImg();
          } else {
            this.cancelBackgroundImg();
          }
          break;
      }
      return true;
    },
  });

  // 渲染完成后需要去做的执行列表
  protected needDoQueue: any[] = [];
  // 渲染完成后的回调
  protected renderCompleteCallback() {
    // 触发库位过滤展示
    Object.keys(this._renderFilter).forEach((key: string) => {
      // 新渲染后，当前值跟默认初始值不同时，才需要触发处理
      this.renderFilter[key as keyof typeof this.renderFilter] = this._renderFilter[key];
    });
    // 重新渲染覆盖物
    if (this._isChangeMap) this._initMarkerRendered();
    Object.keys(this._markerRendered).forEach((key: string) => {
      // 判断有值才会赋值
      const newValue =
        this._markerRendered[key as keyof typeof this._markerRendered];
      this.markerRendered[key] = newValue;
    });
    // 重新创建AGV元素及其动画代理 未实现
    Object.keys(this._agvConfig).forEach((key: string) => {
      this._agvConfig[key].destroy();
      this.agvConfig[key] = this._agvConfig[key];
    });
    // 是否开启了锚定模式
    this.anchorState = this._anchorState
    // 绘制的元素
    Object.keys(this._drawRendered).forEach((key: string) => {
      // 判断有值才会赋值
      const newValue =
        this._drawRendered[key as keyof typeof this._drawRendered];
      this.drawRendered[key] = newValue;
    });
    // 处理事件绑定
    this.bindEvents();
    // 执行待处理列表
    const len = this.needDoQueue.length;
    for (let i = 0; i < len; i++) {
      const func = this.needDoQueue.shift();
      func && func();
    }
  }

  /**
   * 临时控制元素展示/隐藏
   * 属于显示过滤操作
   */
  public renderFilter: IFilter = new Proxy(this._renderFilter, {
    set: (obj: any, prop, value) => {
      // 跟初始状态不同，则需要处理
      this._renderFilter[prop] = value;
      obj[prop] = value;
      if (this._renderSwitch.completed) {
        switch (prop) {
          case "parkClassify": // 库位分类参数
            if (value.hasOwnProperty("mode") && Array.isArray(value["mode"])) {
              const parkModeReflect = this._elementKeyReflect["ParkMode"];
              value["mode"] = value["mode"].map((mode: string) => {
                if (parkModeReflect.hasOwnProperty(mode))
                  return parkModeReflect[mode as keyof typeof parkModeReflect];
                return mode;
              });
              obj["parkMode"] = value["mode"];
            }
            if (value.hasOwnProperty("type") && Array.isArray(value["type"])) {
              const parkTypeReflect = this._elementKeyReflect["ParkType"];
              value["type"] = value["type"].map((type: string) => {
                if (parkTypeReflect.hasOwnProperty(type))
                  return parkTypeReflect[type as keyof typeof parkTypeReflect];
                return type;
              });
              obj["parkType"] = value["type"];
            }
            if (
              value.hasOwnProperty("information") &&
              Array.isArray(value["information"])
            ) {
              obj["parkInformation"] = value["information"];
            } else {
              obj["parkInformation"] = []
            }
            this.filterParks();
            break;
          case "parkMode": // 库位模式
            if (value && Array.isArray(value)) {
              const parkModeReflect = this._elementKeyReflect["ParkMode"];
              obj[prop] = value.map((mode: string) => {
                if (parkModeReflect.hasOwnProperty(mode))
                  return parkModeReflect[mode as keyof typeof parkModeReflect];
                return mode;
              });
              this.filterParks();
            }
            break;
          case "parkType": // 库位类型
            if (value && Array.isArray(value)) {
              const parkTypeReflect = this._elementKeyReflect["ParkType"];
              obj[prop] = value.map((type: string) => {
                if (parkTypeReflect.hasOwnProperty(type))
                  return parkTypeReflect[type as keyof typeof parkTypeReflect];
                return type;
              });
              this.filterParks();
            }
            break;
          case "parkInformation": // 库位进出路线
            if (!value || !Array.isArray(value)) {
              obj["parkInformation"] = []
            }
            this.filterParks();
            break;
          case "parkLayer": // 库位层级相关参数
            let tag = false;
            if (
              value.hasOwnProperty("layer") &&
              Number.isInteger(value["layer"])
            ) {
              obj["layer"] = value["layer"];
              tag = true;
            }
            if (
              value.hasOwnProperty("layerMaxNum") &&
              Number.isInteger(value["layerMaxNum"])
            ) {
              obj["layerMaxNum"] = value["layerMaxNum"];
              tag = true;
            }
            if (tag) {
              // 当前标记的库位层级、极值赋值了，且和需要设置的库位层级不同，才需要去渲染
              this.filterParkByLayer();
            }
            break;
          case "layer":
            if (Number.isInteger(value)) {
              this.filterParkByLayer();
            }
            break;
          case "layerMaxNum":
            if (Number.isInteger(value)) {
              this.filterParkId();
            }
            break;
          case "backgroundImg":
            if (value !== this._renderShowStatus["backgroundImg"]) {
              if (value) {
                this.backgroundImgShow();
              } else {
                this.backgroundImgHide();
              }
              this._renderShowStatus["backgroundImg"] = value;
            }
            break;
          case "vnlOutline":
            if (value !== this._renderShowStatus["vnlOutline"]) {
              if (value) {
                this.vnlOutlineShow();
              } else {
                this.vnlOutlineHide();
              }
              this._renderShowStatus["vnlOutline"] = value;
            }
            break;
          case "origin":
            if (value !== this._renderShowStatus["origin"]) {
              if (value) {
                this.originCoordinateShow();
              } else {
                this.originCoordinateHide();
              }
              this._renderShowStatus["origin"] = value;
            }
            break;
          case "text":
            if (value !== this._renderShowStatus["text"]) {
              if (value) {
                this.TextShow();
              } else {
                this.TextHide();
              }
              this._renderShowStatus["text"] = value;
            }
            break;
          case "mark":
            if (value !== this._renderShowStatus["mark"]) {
              if (value) {
                this.MarkShow();
              } else {
                this.MarkHide();
              }
              this._renderShowStatus["mark"] = value;
            }
            break;
          case "line":
            if (value !== this._renderShowStatus["line"]) {
              if (value) {
                this.LineShapeShow();
              } else {
                this.LineShapeHide();
              }
              this._renderShowStatus["line"] = value;
            }
            break;
          case "path":
            if (value !== this._renderShowStatus["path"]) {
              if (value) {
                this.AGVPathShow();
              } else {
                this.AGVPathHide();
              }
              this._renderShowStatus["path"] = value;
            }
            break;
          case "point":
            if (value !== this._renderShowStatus["point"]) {
              if (value) {
                this.AGVPathPointShow();
              } else {
                this.AGVPathPointHide();
              }
              this._renderShowStatus["point"] = value;
            }
            break;
          case "park":
            if (value !== this._renderShowStatus["park"]) {
              if (value) {
                this.ParkShow();
              } else {
                this.ParkHide();
              }
              this._renderShowStatus["park"] = value;
            }
            break;
          case "parkId":
            if (value !== this._renderShowStatus["parkId"]) {
              if (value) {
                this.ParkIdShow();
              } else {
                this.ParkIdHide();
              }
              this._renderShowStatus["parkId"] = value;
            }
            break;
        }
      }
      return true;
    },
  });

  /**
   * 标识物渲染
   * 行驶路径、控制路径、库位推导结果、起终点、途经点、区域等
   */
  public markerRendered: IMark = new Proxy(this._markerRendered, {
    set: (obj: IMark, prop: string, value) => {
      this._markerRendered[prop as keyof typeof this._markerRendered] = value;
      obj[prop as keyof typeof obj] = value;
      let toDo = () => {};
      switch (prop) {
        case "movePath":
          toDo = () => {
            this.renderAGVPathByTypeBatch("move", value);
          };
          break;
        case "assistPath":
          toDo = () => {
            this.renderAGVPathByTypeBatch("assist", value);
          };
          break;
        case "ctrlPath":
          toDo = () => {
            this.renderAGVPathByTypeBatch("control", value);
          };
          break;
        case "railway":
          toDo = () => {
            this.renderRailway(value);
          };
          break;
        case "regressTag":
          toDo = () => {
            this.renderRegressTag(value);
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
        case "parkNumTag":
          toDo = () => {
            this.renderParksNumTag(value);
          };
          break;
        case "parkInferTag":
          toDo = () => {
            this.renderParksInferTag(value);
          };
          break;
        case "pathwayPoint":
          toDo = () => {
            this.renderPathwayPoint(value);
          };
          break;
        case "pathwayPoints":
          toDo = () => {
            this.renderPathwayPoints(value);
          };
          break;
        case "startPoint":
          toDo = () => {
            this.renderStartPoint(value);
          };
          break;
        case "endPoint":
          toDo = () => {
            this.renderEndPoint(value);
          };
          break;
        case "selectPark": // 库位单选使用
          toDo = () => {
            this.signAllParkDefault()
            this.signParkSelect(value);
          };
          break;
        case "selectParks": // 库位多选使用
          toDo = () => {
            if (Array.isArray(value)) {
              this.signParksSelect(value);
            }
          };
          break;
        case "tempPark":
          toDo = () => {
            this.renderTempPark(value);
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
   * 绘制元素
   */
  public drawRendered: IDraw = new Proxy(this._drawRendered, {
    set: (obj: any, prop: string, value) => {
      this._drawRendered[prop as keyof typeof this._drawRendered] = value;
      obj[prop as keyof typeof obj] = value;
      let toDo = () => {};
      switch (prop) {
        case "dots":
          toDo = () => {
            this.setDots(value);
          };
          break;
        case "lines":
          toDo = () => {
            this.setLines(value);
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
   * 清除Raphael的画布的所有绘画项目
   * 清除panzoom
   */
  public dispose() {
    // 销毁渲染元素
    if (this.app) {
      // 清理AGV动画代理
      this.agvConfig.clear;
      // 移除画布
      this.app.canvas.remove();
      // 销毁这个APP所有的资源
      this.app.destroy()
    }
  }
  /**
   * 初始化所有相关数据
   */
  public initialize() {
    // 清除事件数据
    this._initEventStatus();
    this._initEventSwitch();
    this._initMapOriginData();
    this.mapClassifyData.clear;
    this.elementNamesRendered = [];
    this._initbackgroundImgData();
    this._initRenderSwitch();
    this._initRenderShowStatus();
    this._initOutlineData();
    // 但是库位层数要重置为1
    // this._renderFilter.layer = 1;
    /* // 过滤数据，也暂时不清理，每次更换地图时，需要保持上一次的过滤状态
    this._renderFilter = JSON.parse(JSON.stringify(this._renderFilterInit)); */
    // 清理AGV动画代理
    this.agvConfig.clear;
    // 初始化渲染数据集合
    this._initElementRendered();
  }
}
