import * as PIXI from "pixi.js";
import Animation from "./4Animation";
import {
  IPoint,
  IOutline,
  IRectPoints,
  IOutlineEleData,
  IRectRange,
  IAreaDraw,
  IEventCondition,
  IEvents,
  IPointType,
  IPointTypeEnum,
} from "./Interface";

export default class Events extends Animation {
  constructor() {
    super();
    this._rebindEvent = (eventName: string) => {
      switch (eventName) {
        case "pointSelect":
          if (this._eventSwitch.pointSelect) {
            this._eventStatus.pointSelect = true;
            this.pointSelectEventUnbind().then(() => {
              this.pointSelectEventBind();
            });
          }
          break;
        case "vnlOutlineMove":
          if (this._eventSwitch.vnlOutlineMove) {
            this._eventStatus.vnlOutlineMove = true;
            this.vnlOutlineMoveEventUnbind().then(() => {
              this.vnlOutlineMoveEventBind();
            });
          }
          break;
      }
    };
    this._emitEvent = (eventName: string, params: any) => {
      switch (eventName) {
        case "parkSelect":
          let selectParkIds: string[] = [];
          let cancelParkIds: string[] = [];
          let allParkIds: string[] = [];
          let completeMothed: any = () => {};
          if (params && params.hasOwnProperty("selectParkIds")) {
            selectParkIds = params.selectParkIds;
          }
          if (params && params.hasOwnProperty("cancelParkIds")) {
            cancelParkIds = params.cancelParkIds;
          }
          if (params && params.hasOwnProperty("allParkIds")) {
            allParkIds = params.allParkIds;
          }
          if (params && params.hasOwnProperty("completeMothed")) {
            completeMothed = params.completeMothed;
          } else {
            completeMothed = () => {
              this.clearCandidatePark();
            };
          }
          this._eventHook.parkSelect(
            selectParkIds,
            cancelParkIds,
            allParkIds,
            completeMothed
          );
          break;
      }
    };
  }
  /**
   * 事件开关
   */
  protected _eventSwitchStatus: IEvents = {
    pan: false,
    zoom: false,
    parkStock: false,
    parkSelect: false,
    pointSelect: false,
    areaDraw: false,
    mouseCoordiate: false,
    vnlOutlineMove: false,
  };
  protected _eventStatus = Object.assign({}, this._eventSwitchStatus);
  /**
   * 事件状态初始化
   */
  protected _initEventStatus() {
    Object.assign(this._eventStatus, this._eventSwitchStatus);
  }
  /**
   * 事件状态数据初始化
   */
  protected _eventSwitchInit: IEvents = {
    pan: true,
    zoom: true,
    parkStock: false,
    parkSelect: false,
    pointSelect: false,
    areaDraw: false,
    mouseCoordiate: false,
    vnlOutlineMove: false,
  };
  protected _eventSwitch: IEvents = Object.assign({}, this._eventSwitchInit);
  /**
   * 事件开关初始化
   */
  protected _initEventSwitch() {
    Object.assign(this._eventSwitch, this._eventSwitchInit);
  }
  /**
   * 事件开关代理
   * 动态管理事件开启/关闭
   */
  public eventSwitch: IEvents = new Proxy(this._eventSwitch, {
    set: (target: any, prop: string, value: any) => {
      target[prop] = value;
      // 对每个事件的变动做单独处理
      if (this._renderSwitch.completed) {
        // 地图元素渲染完成才可以绑定事件
        switch (prop) {
          case "pan":
            if (value) {
              if (!this._eventStatus.pan) {
                this._eventStatus.pan = true;
                this.cancelCanvasPan().then(() => {
                  this.openCanvasPan();
                });
              }
            } else {
              if (this._eventStatus.pan) {
                this._eventStatus.pan = false;
                this.cancelCanvasPan();
              }
            }
            break;
          case "zoom":
            if (value) {
              if (!this._eventStatus.zoom) {
                this._eventStatus.zoom = true;
                this.cancelCanvasZoom().then(() => {
                  this.openCanvasZoom();
                });
              }
            } else {
              if (this._eventStatus.zoom) {
                this._eventStatus.zoom = false;
                this.cancelCanvasZoom();
              }
            }
            break;
          case "parkStock": // 库位有无货事件
            if (value) {
              if (!this._eventStatus.parkStock) {
                this._eventStatus.parkStock = true;
                this.parkStockEventUnbind().then(() => {
                  this.parkStockEventBind();
                });
              }
            } else {
              if (this._eventStatus.parkStock) {
                this._eventStatus.parkStock = false;
                this.parkStockEventUnbind();
              }
            }
            break;
          case "parkSelect": // 库位选中事件
            if (value) {
              if (!this._eventStatus.parkSelect) {
                this._eventStatus.parkSelect = true;
                this.parkSelectEventUnbind().then(() => {
                  this.parkSelectEventBind();
                });
              }
            } else {
              if (this._eventStatus.parkSelect) {
                this._eventStatus.parkSelect = false;
                this.parkSelectEventUnbind();
              }
            }
            break;
          case "pointSelect": // 点位选中事件
            if (value) {
              if (!this._eventStatus.pointSelect) {
                this._eventStatus.pointSelect = true;
                this.pointSelectEventUnbind().then(() => {
                  this.pointSelectEventBind();
                });
              }
            } else {
              if (this._eventStatus.pointSelect) {
                this._eventStatus.pointSelect = false;
                this.pointSelectEventUnbind();
              }
            }
            break;
          case "areaDraw": // 矩形区域绘制事件
            if (value) {
              if (!this._eventStatus.areaDraw) {
                this._eventStatus.areaDraw = true;
                this.areaDrawEventUnbind().then(() => {
                  this.areaDrawEventBind();
                });
              }
            } else {
              if (this._eventStatus.areaDraw) {
                this._eventStatus.areaDraw = false;
                this.areaDrawEventUnbind();
              }
            }
            break;
          case "mouseCoordiate": // 鼠标实时坐标
            if (value) {
              if (!this._eventStatus.mouseCoordiate) {
                this._eventStatus.mouseCoordiate = true;
                this.mousehoverCoordiateUnbind().then(() => {
                  this.mousehoverCoordiateBind();
                });
              }
            } else {
              if (this._eventStatus.mouseCoordiate) {
                this._eventStatus.mouseCoordiate = false;
                this.mousehoverCoordiateUnbind();
              }
            }
            break;
          case "vnlOutlineMove": // VNL的轮廓移动
            if (value) {
              if (!this._eventStatus.vnlOutlineMove) {
                this._eventStatus.vnlOutlineMove = true;
                this.vnlOutlineMoveEventUnbind().then(() => {
                  this.vnlOutlineMoveEventBind();
                });
              }
            } else {
              if (this._eventStatus.vnlOutlineMove) {
                this._eventStatus.vnlOutlineMove = false;
                this.vnlOutlineMoveEventUnbind();
              }
            }
            break;
        }
      }
      return true;
    },
  });
  /**
   * 事件条件
   */
  protected _eventCondition: IEventCondition = {
    parkEventIds: [], // 当前事件正在生效的库位ID
    parkStockScope: [], // 绑定库位有无货操作事件的库位ID
    parkStockMultiple: true, // 库位有无货多选
    parkStockImmediate: true, // 有无货事件是否立即执行
    parkSelectScope: [], // 绑定库位有无货操作事件的库位ID
    parkSelectMultiple: false, // 库位多选
    parkSelectImmediate: true, // 有无货事件是否立即执行
    pointSelectScope: {} as IRectRange, // 点位选择区域
    areaDrawParam: {} as IAreaDraw, // 区域绘制参数
  };
  public eventCondition: IEventCondition = new Proxy(this._eventCondition, {
    set: (target: any, prop: string, value: any) => {
      // 对每个事件的变动做单独处理
      switch (prop) {
        case "addParkEventIds": // 添加绑定事件的库位ID
          if (Array.isArray(value) && this._renderSwitch.completed) {
            const addParkIds = value.map((id: number | string) => String(id));
            if (this._eventSwitch.parkStock) this.parkStockEventAdd(addParkIds)
            if (this._eventSwitch.parkSelect) this.parkSelectEventAdd(addParkIds)
          }
          break;
        case "removeParkEventIds": // 移除绑定事件的库位ID
          if (Array.isArray(value) && this._renderSwitch.completed) {
            const removeParkIds = value.map((id: number | string) => String(id));
            if (this._eventSwitch.parkStock) this.parkStockEventRemove(removeParkIds)
            if (this._eventSwitch.parkSelect) this.parkSelectEventRemove(removeParkIds)
          }
          break;
        case "parkStockScope": // 修改了事件范围，需要重新绑定事件
          if (Array.isArray(value)) {
            target[prop] = value.map((id: number | string) => String(id));
            if (this._renderSwitch.completed && this._eventSwitch.parkStock) {
              this.parkStockEventUnbind().then(() => {
                this.parkStockEventBind();
              });
            }
          }
          break;
        case "parkStockMultiple": // 修改了多选/单选模式，需要重新绑定事件
          target[prop] = value;
          if (this._renderSwitch.completed) {
            if (value) {
              if (this._eventSwitch.parkStock) {
                this.parkStockEventUnbind().then(() => {
                  this.parkStockEventBind();
                });
              }
            } else {
              this.parkStockEventUnbind();
            }
          }
          break;
        case "parkSelectScope": // 修改了事件范围，需要重新绑定事件
          if (Array.isArray(value)) {
            target[prop] = value.map((id: number | string) => String(id));
            if (this._renderSwitch.completed && this._eventSwitch.parkSelect) {
              this.parkSelectEventUnbind().then(() => {
                this.parkSelectEventBind();
              });
            }
          }
          break;
        case "parkSelectMultiple": // 修改了多选/单选模式，需要重新绑定事件
          target[prop] = value;
          if (this._renderSwitch.completed) {
            if (value) {
              if (this._eventSwitch.parkSelect) {
                this.parkSelectEventUnbind().then(() => {
                  this.parkSelectEventBind();
                });
              }
            } else {
              this.parkSelectEventUnbind();
            }
          }
          break;
        case "pointSelectScope":
          if (
            typeof value === "object" &&
            value.hasOwnProperty("left") &&
            value.hasOwnProperty("right") &&
            value.hasOwnProperty("top") &&
            value.hasOwnProperty("bottom")
          ) {
            value.left = this.getMapCoordiateX(value.left);
            value.right = this.getMapCoordiateX(value.right);
            value.top = this.getMapCoordiateY(value.top);
            value.bottom = this.getMapCoordiateY(value.bottom);
            target[prop] = value;
            if (this._renderSwitch.completed && this._eventSwitch.pointSelect) {
              this.pointSelectEventUnbind().then(() => {
                this.pointSelectEventBind();
              });
            }
          }
          break;
        case "areaDrawParam":
          if (
            typeof value === "object" &&
            value.hasOwnProperty("areaId") &&
            value.hasOwnProperty("color") &&
            value.hasOwnProperty("bgColor")
          ) {
            target[prop] = value;
            if (this._renderSwitch.completed && this._eventSwitch.pointSelect) {
              this.areaDrawEventUnbind().then(() => {
                this.areaDrawEventBind();
              });
            }
          }
          break;
      }
      return true;
    },
  });
  /**
   * 已经绑定事件的钩子
   */
  protected _eventHook = {
    parkStock: (
      selectParkIds: string[],
      cancelParkIds: string[],
      allParkIds: string[],
      completeMothed: any = () => {}
    ) => {},
    parkSelect: (
      selectParkIds: string[],
      cancelParkIds: string[],
      allParkIds: string[],
      completeMothed: any = () => {}
    ) => {},
    pointSelect: (
      pointType: IPointType,
      currentPoint: IPoint,
      selectedPoints: IPoint[],
      completeMothed: any = () => {}
    ) => {},
    areaDraw: (rectProxy: IOutline) => {},
    vnlOutlineMove: (rectProxy: IOutline) => {},
    mouseCoordiate: (point: IPoint) => {},
  };
  public eventHook = new Proxy(this._eventHook, {
    set: (target: any, prop: string, value: any) => {
      if (typeof value === "function") {
        target[prop] = value;
      }
      return true;
    },
  });

  /**
   * 绑定开启的事件
   */
  protected bindEvents() {
    // 对所有事件进行整体处理
    Object.keys(this._eventSwitch).forEach((key: string) => {
      this.eventSwitch[key as keyof typeof this.eventSwitch] =
        this._eventSwitch[key as keyof typeof this._eventSwitch];
    });
  }

  /**
   * 平移缩放数据代理
   */
  private panzoom = new Proxy(this._panzoom, {
    set: (target: any, prop, value) => {
      switch (prop) {
        case "scale":
          this.scaleStaticElements(value, target[prop]);
          break;
      }
      target[prop] = value;
      return true;
    },
  });

  /**
   * 开启画布平移事件
   */
  protected openCanvasPan() {
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;

    let pointStartPoint: PIXI.Point;
    let mainStartPoint: PIXI.Point;

    /** 鼠标移动 */
    const mousemoveEvent = (event: PIXI.FederatedPointerEvent) => {
      if (event.buttons === 0)
        return this.app.stage.off("mousemove", mousemoveEvent);
      if (pointStartPoint && mainStartPoint) {
        const pointCurrentPoint = new PIXI.Point(event.x, event.y);
        const offsetX = pointCurrentPoint.x - pointStartPoint.x;
        const offsetY = pointCurrentPoint.y - pointStartPoint.y;
        this.mainContainer.x = mainStartPoint.x + offsetX;
        this.mainContainer.y = mainStartPoint.y + offsetY;
        // 记录下来
        this.panzoom.offsetX = this.mainContainer.x;
        this.panzoom.offsetY = this.mainContainer.y;
      }
    };
    const mousedownEvent = (event: PIXI.FederatedPointerEvent) => {
      pointStartPoint = new PIXI.Point(event.x, event.y);
      mainStartPoint = new PIXI.Point(
        this.mainContainer.x,
        this.mainContainer.y
      );
      this.app.stage.on("mousemove", mousemoveEvent);
    };
    const mouseupEvent = (event: PIXI.FederatedPointerEvent) => {
      this.app.stage.off("mousemove", mousemoveEvent);
    };
    this.app.stage.on("mousedown", mousedownEvent);
    this.app.stage.on("mouseup", mouseupEvent);
    this.app.stage.on("mouseout", mouseupEvent);
    this.app.stage.on("mouseleave", mouseupEvent);
    this.app.stage.on("mouseupoutside", mouseupEvent);

    /** 触摸屏移动 */
    const touchmoveEvent = (event: TouchEvent) => {
      if (event.touches.length === 1 && pointStartPoint && mainStartPoint) {
        const pointCurrentPoint = new PIXI.Point(
          event.touches[0].screenX,
          event.touches[0].screenY
        );
        const offsetX = pointCurrentPoint.x - pointStartPoint.x;
        const offsetY = pointCurrentPoint.y - pointStartPoint.y;
        this.mainContainer.x = mainStartPoint.x + offsetX;
        this.mainContainer.y = mainStartPoint.y + offsetY;
        // 记录下来
        this.panzoom.offsetX = this.mainContainer.x;
        this.panzoom.offsetY = this.mainContainer.y;
      }
    };
    const touchstartEvent = (event: TouchEvent) => {
      if (event.touches.length === 1) {
        pointStartPoint = new PIXI.Point(
          event.touches[0].screenX,
          event.touches[0].screenY
        );
        mainStartPoint = new PIXI.Point(
          this.mainContainer.x,
          this.mainContainer.y
        );
        this.app.canvas.addEventListener("touchmove", touchmoveEvent);
      }
    };
    const touchendEvent = (event: TouchEvent) => {
      this.app.canvas.removeEventListener("touchmove", touchmoveEvent);
    };
    this.app.canvas.addEventListener("touchstart", touchstartEvent);
    this.app.canvas.addEventListener("touchend", touchendEvent);

    this._unbindCanvasPan = () => {
      // 移除鼠标拖动事件
      this.app.stage.off("mousedown", mousedownEvent);
      this.app.stage.off("mouseup", mouseupEvent);
      this.app.stage.off("mouseout", mouseupEvent);
      this.app.stage.off("mouseupoutside", mouseupEvent);

      // 移除触摸拖动事件
      this.app.canvas.removeEventListener("touchstart", touchstartEvent);
      this.app.canvas.removeEventListener("touchend", touchendEvent);
    };
  }
  private _unbindCanvasPan = () => {};
  /**
   * 关闭画布平移事件
   * @returns promise
   */
  protected cancelCanvasPan() {
    return new Promise((resolve, reject) => {
      try {
        this._unbindCanvasPan && this._unbindCanvasPan();
        resolve("success");
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * 开启画图缩放
   */
  protected openCanvasZoom() {
    this.app.stage.eventMode = "static";
    this.app.stage.hitArea = this.app.screen;

    /** 鼠标滚轮部分 */
    const mouseWheelEvent = (event: PIXI.FederatedWheelEvent) => {
      // 阻止滚动
      event.preventDefault();

      const scaleFactor = 0.1; // 调整缩放速度

      // 计算缩放因子
      const delta = event.deltaY;
      const zoom = delta > 0 ? 1 - scaleFactor : 1 + scaleFactor;

      // 计算鼠标相对于容器的位置
      const mouseX = event.screenX - this.app.canvas.offsetLeft;
      const mouseY = event.screenY - this.app.canvas.offsetTop;
      const mouseInContainerX =
        (mouseX - this.mainContainer.position.x) / this.mainContainer.scale.x;
      const mouseInContainerY =
        (mouseY - this.mainContainer.position.y) / this.mainContainer.scale.y;

      // 更新缩放和位置
      this.mainContainer.scale.x *= zoom;
      this.mainContainer.scale.y *= zoom;

      this.mainContainer.position.x =
        mouseX - mouseInContainerX * this.mainContainer.scale.x;
      this.mainContainer.position.y =
        mouseY - mouseInContainerY * this.mainContainer.scale.y;

      // 更新当前缩放比例
      // 执行缩放回调
      this._zoomCallback(this.mainContainer.scale.x);
    };
    this.app.stage.on("wheel", mouseWheelEvent);

    /** 触摸屏缩放部分 */
    // 监听触摸事件
    let touchStartPos: IPoint[] = []; // 保存触摸开始时的触摸点位置
    const touchstartEvent = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        touchStartPos = [
          { x: event.touches[0].clientX, y: event.touches[0].clientY },
          { x: event.touches[1].clientX, y: event.touches[1].clientY },
        ];
      }
    };
    const touchmoveEvent = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        const touch1: IPoint = {
          x: event.touches[0].clientX,
          y: event.touches[0].clientY,
        };
        const touch2: IPoint = {
          x: event.touches[1].clientX,
          y: event.touches[1].clientY,
        };

        // 计算两个触摸点的中心点
        const center = {
          x: (touch1.x + touch2.x) / 2,
          y: (touch1.y + touch2.y) / 2,
        };

        // 计算触摸中心点在容器内的位置
        const containerCenterX =
          (center.x - this.mainContainer.position.x) /
          this.mainContainer.scale.x;
        const containerCenterY =
          (center.y - this.mainContainer.position.y) /
          this.mainContainer.scale.y;

        // 计算触摸点距离变化比例，这里简单地使用触摸点之间的距离变化来计算缩放比例
        const startDistance = Math.sqrt(
          Math.pow(touchStartPos[0].x - touchStartPos[1].x, 2) +
            Math.pow(touchStartPos[0].y - touchStartPos[1].y, 2)
        );
        const currentDistance = Math.sqrt(
          Math.pow(touch1.x - touch2.x, 2) + Math.pow(touch1.y - touch2.y, 2)
        );
        const zoom = currentDistance / startDistance;

        // 更新缩放和位置
        this.mainContainer.scale.x *= zoom;
        this.mainContainer.scale.y *= zoom;

        // 计算缩放后的容器位置，以保持触摸中心点不动
        this.mainContainer.position.x =
          center.x - containerCenterX * this.mainContainer.scale.x;
        this.mainContainer.position.y =
          center.y - containerCenterY * this.mainContainer.scale.y;

        // 保存触摸开始时的位置
        touchStartPos = [touch1, touch2];

        // 更新当前缩放比例
        // 执行缩放回调
        this._zoomCallback(this.mainContainer.scale.x);
      }
    };
    const touchendEvent = (event: TouchEvent) => {
      touchStartPos = [];
    };
    // this.app.canvas 是 HTMLCanvasElement 继承DOM的事件对象
    // this.app.stage 继承 FederatedEvent 事件对象
    this.app.canvas.addEventListener("touchstart", touchstartEvent);
    this.app.canvas.addEventListener("touchmove", touchmoveEvent);
    // 在 touchend 事件中，可以清除 touchStartPos 数组，以便在下一次触摸开始时重新记录触摸点的位置
    this.app.canvas.addEventListener("touchend", touchendEvent);

    this._unbindCanvasZoom = () => {
      // 移除鼠标滚轮事件
      this.app.stage.off("wheel", mouseWheelEvent);
      // 移除触摸双指缩放事件
      this.app.canvas.removeEventListener("touchstart", touchstartEvent);
      this.app.canvas.removeEventListener("touchmove", touchmoveEvent);
      this.app.canvas.removeEventListener("touchend", touchendEvent);
    };
  }
  private _unbindCanvasZoom = () => {};
  /**
   * 缩放后根据当前缩放比例执行系列操作
   * 如：元素重绘
   */
  private _zoomCallbackTimer: any;
  private _zoomCallback(scale: number) {
    this._zoomCallbackTimer && clearTimeout(this._zoomCallbackTimer);
    this._zoomCallbackTimer = setTimeout(() => {
      console.log("scale", scale);
      this.panzoom.scale = scale;
    }, 500);
  }
  /**
   * 关闭画布缩放
   * @returns Promise
   */
  protected cancelCanvasZoom() {
    return new Promise((resolve, reject) => {
      try {
        this._unbindCanvasZoom && this._unbindCanvasZoom();
        resolve("success");
      } catch (e) {
        reject(e);
      }
    });
  }

  /**
   * 更新化鼠标选择矩形
   * @param rectEle
   * @param startPoint
   * @param endPoint
   */
  private updateMouseSelectRect = (
    rectEle: PIXI.Graphics,
    startPoint: IPoint,
    endPoint: IPoint
  ) => {
    let w = endPoint.x - startPoint.x;
    let h = endPoint.y - startPoint.y;
    let x = startPoint.x;
    let y = startPoint.y;
    if (w >= 0) {
      // 鼠标向右滑动，取开始点的X为新起点X
      x = startPoint.x;
    } else {
      // 鼠标向左滑动，取结束点的X为新起点X
      x = endPoint.x;
    }
    if (h >= 0) {
      // 鼠标向下滑动，取开始点的Y为新起点Y
      y = startPoint.y;
    } else {
      // 鼠标向上滑动，取结束点的Y为新起点Y
      y = endPoint.y;
    }
    const strokeStyle = rectEle.strokeStyle;
    rectEle.clear();
    rectEle.rect(x, y, Math.abs(w), Math.abs(h));
    rectEle.stroke(strokeStyle);
  };

  /**
   * 库位有无货状态事件
   * start
   */
  protected parkStockEventBind() {
    let eventParkIds = [];
    if (
      Array.isArray(this._eventCondition.parkStockScope) &&
      this._eventCondition.parkStockScope.length > 0
    ) {
      eventParkIds = Object.assign([], this._eventCondition.parkStockScope);
    } else {
      eventParkIds = Array.from(this.elementRendered.Park.mapObj.park.keys());
    }
    // 保存当前事件生效的库位ID
    this._eventCondition.parkEventIds = Object.assign([], eventParkIds);
    const parkMap = this.elementRendered.Park.mapObj.stock;
    const isImmediate = this._eventCondition.parkStockImmediate;
    const isMultiple = this._eventCondition.parkStockMultiple;
    const selectEvent = (parkId: number | string) => {
      if (!isMultiple) {
        // 单选模式，排他式选中
        this.signAllParkEmpty();
      }
      this.signParkStock(String(parkId));
    };
    const cancelEvent = (parkId: number | string) => {
      this.signParkEmpty(String(parkId));
    };

    // 绑定单击事件 start
    this.commonParkSingleEvent(
      parkMap,
      selectEvent,
      cancelEvent,
      this._eventHook.parkStock,
      isImmediate
    );
    // 绑定单击事件 end

    // 绑定框选事件 start
    if (isMultiple) {
      this.commonParkBatchEvent(
        parkMap,
        selectEvent,
        cancelEvent,
        this._eventHook.parkStock,
        isImmediate
      );
    }
    // 绑定框选事件 end
  }
  /**
   * 根据库位ID追加库位绑定事件
   * @param addParkIds string[]
   * @returns 
   */
  protected parkStockEventAdd(addParkIds: string[]) {
    addParkIds = addParkIds.map((parkId: string) => {
      if (this._eventCondition.parkEventIds.includes(parkId)) return ''
      return parkId
    }).filter((parkId: string) => !!parkId)
    if (!addParkIds || !Array.isArray(addParkIds) || addParkIds.length <= 0) return
    addParkIds.forEach((parkId: string) => {
      // 保存当前事件生效的库位ID
      this._eventCondition.parkEventIds.push(parkId)
    })
    const parkMap = this.elementRendered.Park.mapObj.stock;
    const isImmediate = this._eventCondition.parkStockImmediate;
    const isMultiple = this._eventCondition.parkStockMultiple;
    const selectEvent = (parkId: number | string) => {
      if (!isMultiple) {
        // 单选模式，排他式选中
        this.signAllParkEmpty();
      }
      this.signParkStock(String(parkId));
    };
    const cancelEvent = (parkId: number | string) => {
      this.signParkEmpty(String(parkId));
    };

    // 绑定单击事件 start
    this.commonParkSingleEvent(
      parkMap,
      selectEvent,
      cancelEvent,
      this._eventHook.parkStock,
      isImmediate,
      addParkIds
    );
    // 绑定单击事件 end

    // 绑定框选事件,框选事件不需要重新绑定，直接添加到parkEventIds即可
  }
  /**
   * 根据库位ID解除库位绑定事件
   * @param removeParkIds 
   * @returns 
   */
  protected parkStockEventRemove(removeParkIds: string[]) {
    if (!removeParkIds || !Array.isArray(removeParkIds) || removeParkIds.length <= 0) return
    removeParkIds.forEach((parkId: string) => {
      // 保存当前事件生效的库位ID
      const index = this._eventCondition.parkEventIds.indexOf(parkId)
      if (index > -1) {
        this._eventCondition.parkEventIds.splice(index, 1)
      }
    })

    // 解除绑定单击事件 start
    const unbindParkSelectEvent = (parkEle: PIXI.Graphics) => {
      // 解绑定鼠标hover
      parkEle.eventMode = "passive";
      parkEle.cursor = "default";
      // 解绑定鼠标点击
      parkEle.off("pointerup");
    };
    removeParkIds.forEach(
      (parkId: string) => {
        if (this.elementRendered.Park.mapObj.park.has(parkId)) {
          unbindParkSelectEvent(this.elementRendered.Park.mapObj.park.get(parkId));
        }
      }
    );
    // 解除绑定单击事件 end

    // 解除绑定框选事件,框选事件不需要重新绑定，直接添加到parkEventIds即可
  }
  // 库位有无货状态单选事件解绑方法
  private _parkStockSingleEventUnbind = () => {
    const unbindParkSelectEvent = (parkEle: PIXI.Graphics) => {
      // 解绑定鼠标hover
      parkEle.eventMode = "passive";
      parkEle.cursor = "default";
      // 解绑定鼠标点击
      parkEle.off("pointerup");
    };
    this.elementRendered.Park.mapObj.park.forEach(
      (parkGraphics: PIXI.Graphics) => {
        unbindParkSelectEvent(parkGraphics);
      }
    );
  };
  // 库位有无货状态多选事件解绑方法
  private _parkStockBatchEventUnbind = () => {
    window.removeEventListener(
      "keydown",
      this._bindMouseEventAfterAltKeydown,
      false
    );
    window.removeEventListener(
      "keyup",
      this._bindMouseEventAfterAltKeyup,
      false
    );
    this.unbindMouseCursorChangeEvent();
  };
  // 解绑库位有无货状态所有事件
  protected parkStockEventUnbind() {
    return new Promise((resolve, reject) => {
      try {
        this._parkStockSingleEventUnbind();
        this._parkStockBatchEventUnbind();
        resolve("success");
      } catch (e) {
        reject(e);
      }
    });
  }
  /**
   * 库位有无货状态事件
   * end
   */
  /**
   * 库位选中状态事件
   * start
   */
  protected parkSelectEventBind() {
    let eventParkIds = [];
    if (
      Array.isArray(this._eventCondition.parkSelectScope) &&
      this._eventCondition.parkSelectScope.length > 0
    ) {
      eventParkIds = Object.assign([], this._eventCondition.parkSelectScope);
    } else {
      eventParkIds = Array.from(this.elementRendered.Park.mapObj.park.keys());
    }
    // 对库位ID做库位路径校验判断
    if (this._parkPathValidate) {
      eventParkIds = eventParkIds
        .map((parkId: string) => {
          if (this.elementRendered.Park.mapObj.data.has(parkId)) {
            const parkData = this.elementRendered.Park.mapObj.data.get(parkId);
            if (parkData.backPathIds) {
              return parkId;
            }
          }
          return "";
        })
        .filter((parkId: string) => !!parkId);
    }
    // 保存当前事件生效的库位ID
    this._eventCondition.parkEventIds = Object.assign([], eventParkIds);
    const parkMap = this.elementRendered.Park.mapObj.selected;
    const isImmediate = this._eventCondition.parkSelectImmediate;
    const isMultiple = this._eventCondition.parkSelectMultiple;
    const selectEvent = (parkNo: string | number) => {
      // 单选模式，需要清除其他库位的选中状态
      if (!isMultiple) {
        // 单选模式，排他式选中
        this.signAllParkDefault();
      }
      this.signParkSelect(String(parkNo));
    };
    const cancelEvent = (parkNo: string | number) => {
      this.signParkDefault(String(parkNo));
    };

    // 绑定单击事件 start
    this.commonParkSingleEvent(
      parkMap,
      selectEvent,
      cancelEvent,
      this._eventHook.parkSelect,
      isImmediate
    );
    // 绑定单击事件 end

    // 绑定框选事件 start
    if (isMultiple) {
      this.commonParkBatchEvent(
        parkMap,
        selectEvent,
        cancelEvent,
        this._eventHook.parkSelect,
        isImmediate
      );
    }
    // 绑定框选事件 end
  }
  /**
   * 根据库位ID追加库位绑定事件
   * @param addParkIds string[]
   * @returns 
   */
  protected parkSelectEventAdd(addParkIds: string[]) {
    addParkIds = addParkIds.map((parkId: string) => {
      if (this._eventCondition.parkEventIds.includes(parkId)) return ''
      return parkId
    }).filter((parkId: string) => !!parkId)
    if (!addParkIds || !Array.isArray(addParkIds) || addParkIds.length <= 0) return
    // 对库位ID做库位路径校验判断
    if (this._parkPathValidate) {
      addParkIds = addParkIds
        .map((parkId: string) => {
          if (this.elementRendered.Park.mapObj.data.has(parkId)) {
            const parkData = this.elementRendered.Park.mapObj.data.get(parkId);
            if (parkData.backPathIds) {
              return parkId;
            }
          }
          return "";
        })
        .filter((parkId: string) => !!parkId);
    }
    addParkIds.forEach((parkId: string) => {
      // 保存当前事件生效的库位ID
      this._eventCondition.parkEventIds.push(parkId)
    })
    const parkMap = this.elementRendered.Park.mapObj.selected;
    const isImmediate = this._eventCondition.parkSelectImmediate;
    const isMultiple = this._eventCondition.parkSelectMultiple;
    const selectEvent = (parkNo: string | number) => {
      // 单选模式，需要清除其他库位的选中状态
      if (!isMultiple) {
        // 单选模式，排他式选中
        this.signAllParkDefault();
      }
      this.signParkSelect(String(parkNo));
    };
    const cancelEvent = (parkNo: string | number) => {
      this.signParkDefault(String(parkNo));
    };

    // 绑定单击事件 start
    this.commonParkSingleEvent(
      parkMap,
      selectEvent,
      cancelEvent,
      this._eventHook.parkSelect,
      isImmediate,
      addParkIds
    );
    // 绑定单击事件 end

    // 绑定框选事件,框选事件不需要重新绑定，直接添加到parkEventIds即可
  }
  /**
   * 根据库位ID解除库位绑定事件
   * @param removeParkIds 
   * @returns 
   */
  protected parkSelectEventRemove(removeParkIds: string[]) {
    if (!removeParkIds || !Array.isArray(removeParkIds) || removeParkIds.length <= 0) return
    removeParkIds.forEach((parkId: string) => {
      // 保存当前事件生效的库位ID
      const index = this._eventCondition.parkEventIds.indexOf(parkId)
      if (index > -1) {
        this._eventCondition.parkEventIds.splice(index, 1)
      }
    })

    // 解除绑定单击事件 start
    const unbindParkSelectEvent = (parkEle: PIXI.Graphics) => {
      // 解绑定鼠标hover
      parkEle.eventMode = "passive";
      parkEle.cursor = "default";
      // 解绑定鼠标点击
      parkEle.off("pointerup");
    };
    removeParkIds.forEach(
      (parkId: string) => {
        if (this.elementRendered.Park.mapObj.park.has(parkId)) {
          unbindParkSelectEvent(this.elementRendered.Park.mapObj.park.get(parkId));
        }
      }
    );
    // 解除绑定单击事件 end

    // 解除绑定框选事件,框选事件不需要重新绑定，直接添加到parkEventIds即可
  }
  // 库位有无货状态单选事件解绑方法
  private _parkSelectSingleEventUnbind = () => {
    const unbindParkSelectEvent = (parkEle: PIXI.Graphics) => {
      // 解绑定鼠标hover
      parkEle.eventMode = "passive";
      parkEle.cursor = "default";
      // 解绑定鼠标点击
      parkEle.off("pointerup");
    };
    this.elementRendered.Park.mapObj.park.forEach(
      (parkGraphics: PIXI.Graphics) => {
        unbindParkSelectEvent(parkGraphics);
      }
    );
  };
  // 库位有无货状态多选事件解绑方法
  private _bindMouseEventAfterAltKeydown = (e: any) => {};
  private _bindMouseEventAfterAltKeyup = (e: any) => {};
  private _parkSelectBatchEventUnbind = () => {
    window.removeEventListener(
      "keydown",
      this._bindMouseEventAfterAltKeydown,
      false
    );
    window.removeEventListener(
      "keyup",
      this._bindMouseEventAfterAltKeyup,
      false
    );
    this.unbindMouseCursorChangeEvent();
  };
  // 解绑库位有无货状态所有事件
  protected parkSelectEventUnbind() {
    return new Promise((resolve, reject) => {
      try {
        this._parkSelectSingleEventUnbind();
        this._parkSelectBatchEventUnbind();
        resolve("success");
      } catch (e) {
        reject(e);
      }
    });
  }
  /**
   * 库位选中状态事件
   * end
   */

  /**
   * 通用
   * 库位单选事件 start
   * @param eventParkIds 需要绑定事件的库位ID数组 string[]
   * @param parkMap 选中库位后，标识选中的渲染元素集合的Map
   * @param selectEvent 置为选中的处理事件
   * @param cancelEvent 取消选中的处理事件
   * @param isImmediate 是否立即执行selectEvent或cancelEvent，不立即执行的话只返回当前事件的库位ID
   * @param unbindEvent 取消绑定当前事件的方法
   */
  private commonParkSingleEvent(
    parkMap: Map<string, any>,
    selectEvent: Function,
    cancelEvent: Function,
    hookEvent: Function,
    isImmediate: boolean,
    eventParkIds: string[] = []
  ) {
    const selectedCallback = (parkNo: string, parkId: string) => {
      if (parkNo) {
        const isSelected = parkMap.has(parkNo);
        let completeMothed = () => {};
        if (isImmediate) {
          if (isSelected) {
            // 已经被选中，则取消选中
            cancelEvent && cancelEvent(parkNo);
          } else {
            // 当前未被选中，则选中之
            selectEvent && selectEvent(parkNo);
          }
        } else {
          // 非立即选中模式，标识候选的库位
          this.signCandidatePark(String(parkNo));
          completeMothed = () => {
            this.clearCandidatePark();
          };
        }
        if (hookEvent) {
          const selectParks = [];
          const cancelParks = [];
          if (isSelected) {
            // 已选中，需要取消选中
            cancelParks.push(parkNo);
          } else {
            // 未选中，需要选中
            selectParks.push(parkNo);
          }
          const allParks = Array.from(parkMap.keys())
            .filter((parkNo: string) => {
              const parkId = this.getBaseParkId(parkNo)
              return this._eventCondition.parkEventIds.includes(parkId)
            })
          hookEvent(selectParks, cancelParks, allParks, completeMothed);
        }
      }
    };
    const bindParkSelectEvent = (parkEle: PIXI.Graphics, parkId: string) => {
      parkEle.eventMode = "static";
      parkEle.cursor = "pointer";
      parkEle.on("pointerup", () => {
        selectedCallback(this.getLayerParkId(parkId), parkId);
      });
    };
    if (Array.isArray(eventParkIds) && eventParkIds.length > 0) {
      // 指定了库位ID绑定
      eventParkIds.forEach((parkId: string) => {
        if (this.elementRendered.Park.mapObj.park.has(parkId)) {
          bindParkSelectEvent(
            this.elementRendered.Park.mapObj.park.get(parkId),
            parkId
          );
        }
      });
    } else {
      // 未指定库位ID绑定，则全量绑定
      this._eventCondition.parkEventIds.forEach((parkId: string) => {
        if (this.elementRendered.Park.mapObj.park.has(parkId)) {
          bindParkSelectEvent(
            this.elementRendered.Park.mapObj.park.get(parkId),
            parkId
          );
        }
      });
    }
  }
  /**
   * 通用
   * 库位单选事件 end
   */
  /**
   * 通用
   * 库位多选事件 start
   * @param eventParkIds 需要绑定事件的库位ID数组 string[]
   * @param parkMap 选中库位后，标识选中的渲染元素集合的Map
   * @param selectEvent 置为选中的处理事件
   * @param cancelEvent 取消选中的处理事件
   * @param isImmediate 是否立即执行selectEvent或cancelEvent，不立即执行的话只返回当前事件的库位ID
   * @param unbindEvent 取消绑定当前事件的方法
   */
  private commonParkBatchEvent(
    parkMap: Map<string, any>,
    selectEvent: Function,
    cancelEvent: Function,
    hookEvent: Function,
    isImmediate: boolean
  ) {
    let isBindAltMouseEvents = false;
    let alt_isMouseDown = false;
    let alt_mousedownStartPoint: any;
    let alt_mouseupEndPoint: any;
    let alt_mouseSelectRectEle: any;

    const cancelMouseSelectRect = () => {
      this.clearCandidateRange();
      alt_mouseSelectRectEle = null;
    };
    const altInitMouseAnimationData = () => {
      alt_isMouseDown = false;
      alt_mousedownStartPoint = null;
      alt_mouseupEndPoint = null;
      if (isImmediate) {
        cancelMouseSelectRect();
      }
    };
    const bindAltMouseEvents = () => {
      this.app.stage.on("pointerdown", altMousedown);
      this.app.stage.on("pointermove", altMousemove);
      this.app.stage.on("pointerup", altMouseup);
    };
    const bindMouseEventAfterAltKeydown = (e: any) => {
      // 只有按下Control和Alt才能触发事件
      // keydown事件会在keyup之前一直触发
      // key: "Control",keyCode: 17 不分左右Control
      // key: "Alt",keyCode: 18 不分左右Alt
      if (
        !isBindAltMouseEvents &&
        ([18].includes(e.keyCode) || ["Alt"].includes(e.key))
      ) {
        // 先清除移动事件
        this.cancelCanvasPan().then(() => {
          bindAltMouseEvents();
          isBindAltMouseEvents = true;
        });
      }
    };
    const unbindAltMouseEvents = () => {
      this.app.stage.off("pointerdown", altMousedown);
      this.app.stage.off("pointermove", altMousemove);
      this.app.stage.off("pointerup", altMouseup);
    };
    const bindMouseEventAfterAltKeyup = (e: any) => {
      // 清除现有鼠标动作动画数据
      altInitMouseAnimationData();
      // 解绑鼠标事件
      // key: "Control",keyCode: 17 不分左右Control
      // key: "Alt",keyCode: 18 不分左右Alt
      if ([18].includes(e.keyCode) || ["Alt"].includes(e.key)) {
        this.openCanvasPan();
        unbindAltMouseEvents();
        isBindAltMouseEvents = false;
      }
    };
    const altMousedown = (event: PIXI.FederatedPointerEvent) => {
      // metaKey/altKey/ctrlKey/shiftKey
      if (event.altKey) {
        // this.isAltKeydown = e.altKey
        if (event.button === 0) {
          cancelMouseSelectRect();
          alt_isMouseDown = true;
          alt_mousedownStartPoint = event.getLocalPosition(this.mainContainer);
          alt_mouseSelectRectEle = this.renderCandidateRange(
            alt_mousedownStartPoint.x,
            alt_mousedownStartPoint.y
          );
        }
      }
    };
    const altMousemove = (event: PIXI.FederatedPointerEvent) => {
      if (alt_isMouseDown && event.altKey) {
        alt_mouseupEndPoint = event.getLocalPosition(this.mainContainer);
        this.updateMouseSelectRect(
          alt_mouseSelectRectEle,
          alt_mousedownStartPoint,
          alt_mouseupEndPoint
        );
      }
    };
    const altMouseup = (event: PIXI.FederatedPointerEvent) => {
      // 执行选中效果
      if (event.altKey && alt_mouseSelectRectEle) {
        // 按下alt键,按下alt键，执行选中库位操作
        let mousedownSelectRectBounds = alt_mouseSelectRectEle.getBounds();
        let selectParks: string[] = []; // 当前被选框选中的库位
        let cancelParks: string[] = []; // 当前被框选取消的库位
        const intersectParkByMouse = (
          parkEle: PIXI.Graphics,
          parkNo: string,
          parkId: string
        ) => {
          let currentBounds = parkEle.getBounds();
          if (
            currentBounds.minX >= mousedownSelectRectBounds.minX &&
            currentBounds.minY >= mousedownSelectRectBounds.minY &&
            currentBounds.maxX <= mousedownSelectRectBounds.maxX &&
            currentBounds.maxY <= mousedownSelectRectBounds.maxY
          ) {
            const isSelected = parkMap.has(parkNo);
            // 判断是否立即选中
            if (isImmediate) {
              // 立即选中
              // 最新逻辑，对框选的库位进行取反操作
              if (isSelected) {
                // 已经选中的，置为未选中
                cancelEvent && cancelEvent(parkNo);
                return false;
              } else {
                // 未选中的置为选中
                selectEvent && selectEvent(parkNo);
                return true;
              }
            } else {
              // 非立即选中，被框选住状态
              if (isSelected) {
                // 已经选中的，置为未选中
                return false;
              } else {
                // 未选中的置为选中
                this.signCandidatePark(String(parkNo));
                return true;
              }
            }
          } else {
            return null;
          }
        };
        // 处理非立即执行情况下的库位候选标识清理，函数
        let completeMothed = () => {};
        if (!isImmediate) {
          completeMothed = () => {
            this.clearCandidatePark();
          };
        }
        this._eventCondition.parkEventIds.forEach((parkId: string) => {
          if (this.elementRendered.Park.mapObj.park.has(parkId)) {
            const parkEle = this.elementRendered.Park.mapObj.park.get(parkId);
            // 只能框选到当前在展示的库位
            if (this.elementRendered.Park.setObj.visible.has(parkId)) {
              const parkNo = this.getLayerParkId(parkId);
              let isSelected = intersectParkByMouse(parkEle, parkNo, parkId);
              if (isSelected) selectParks.push(parkNo);
              if (isSelected === false) cancelParks.push(parkNo);
            }
          }
        });
        if (hookEvent) {
          const allParks = Array.from(parkMap.keys())
            .filter((parkNo: string) => {
              const parkId = this.getBaseParkId(parkNo)
              return this._eventCondition.parkEventIds.includes(parkId)
            })
          hookEvent(selectParks, cancelParks, allParks, completeMothed);
        }
      }
      // 清除现有鼠标动作动画数据
      altInitMouseAnimationData();
    };
    window.addEventListener("keydown", bindMouseEventAfterAltKeydown, false);
    window.addEventListener("keyup", bindMouseEventAfterAltKeyup, false);
    this.bindMouseCursorChangeEvent();

    // 定义解绑事件
    this._bindMouseEventAfterAltKeydown = bindMouseEventAfterAltKeydown;
    this._bindMouseEventAfterAltKeyup = bindMouseEventAfterAltKeyup;
  }
  /**
   * 通用
   * 库位多选事件 end
   */

  /**
   * 点位选择事件
   * start
   */
  private _pointSelectSingleEventUnbind = () => {};
  private pointSelectEventBind() {
    let eventPointsMap: Map<string, PIXI.Graphics> = new Map();
    if (
      typeof this._eventCondition.pointSelectScope === "object" &&
      Object.keys(this._eventCondition.pointSelectScope).length >= 4 &&
      this._eventCondition.pointSelectScope.hasOwnProperty("left") &&
      this._eventCondition.pointSelectScope.hasOwnProperty("right") &&
      this._eventCondition.pointSelectScope.hasOwnProperty("bottom") &&
      this._eventCondition.pointSelectScope.hasOwnProperty("top")
    ) {
      // 有区域，只让区域内的点生效，区域内无点则不绑定
      this.elementRendered.AGVPathPoint.mapObj.point.forEach(
        (pointEle: PIXI.Graphics, pointkey: string) => {
          const pointArr = pointkey.split(",");
          if (pointArr && Array.isArray(pointArr) && pointArr.length === 2) {
            const x = Number(pointArr[0]);
            const y = Number(pointArr[1]);
            if (
              x >= this._eventCondition.pointSelectScope?.left &&
              x <= this._eventCondition.pointSelectScope?.right &&
              y <= this._eventCondition.pointSelectScope?.bottom &&
              y >= this._eventCondition.pointSelectScope?.top
            ) {
              eventPointsMap.set(pointkey, pointEle);
            }
          }
        }
      );
    } else {
      // 无限制区域，则绑定所有点事件
      eventPointsMap = this.elementRendered.AGVPathPoint.mapObj.point;
    }

    // 绑定单击事件
    const pointClickEvent = (pointkey: string) => {
      // 地图坐标
      const pointArr = pointkey.split(",");
      if (pointArr && Array.isArray(pointArr) && pointArr.length === 2) {
        // 点位一次只选一个
        // 点位都不会立即选中，需要区分起终点、途经点等类型
        // const r = this.elementConfig.AGVPathPoint.size.r * 1.5;
        const x = Number(pointArr[0]);
        const y = Number(pointArr[1]);
        // this.renderCandidateRange(x - r, y - r, r * 2, r * 2, 1);
        // 处理点位预选中标识效果
        this.signCandidatePoint({ x, y });

        // 定义选定点位后的回调方法
        const completeEvent = () => {
          // this.clearCandidateRange();
          this.clearCandidatePoint();
        };
        if (this._eventHook.pointSelect) {
          // 判断当前点是否有被选中过
          let pointType: IPointType = IPointTypeEnum.unknow;
          // 开始点
          if (this.elementRendered.AGVPathPoint.mapObj.start.has(pointkey))
            pointType = IPointTypeEnum.start;
          if (this.elementRendered.AGVPathPoint.mapObj.end.has(pointkey))
            pointType = IPointTypeEnum.end;
          if (this.elementRendered.AGVPathPoint.mapObj.pathway.has(pointkey))
            pointType = IPointTypeEnum.pathway;
          if (this.elementRendered.AGVPathPoint.mapObj.close.has(pointkey))
            pointType = IPointTypeEnum.close;
          const currentPoint = {
            key: pointkey,
            x: this.getRealCoordiateX(x),
            y: this.getRealCoordiateY(y),
            type: pointType,
          };

          // 收集所有已经被选中的点
          const selectedPoints: IPoint[] = [];
          if (this.elementRendered.AGVPathPoint.mapObj.pathway.size) {
            Array.from(
              this.elementRendered.AGVPathPoint.mapObj.pathway.keys()
            ).forEach((pointKey: string) => {
              const pointArr = pointKey.split(",");
              if (
                pointArr &&
                Array.isArray(pointArr) &&
                pointArr.length === 2
              ) {
                const x = Number(pointArr[0]);
                const y = Number(pointArr[1]);
                selectedPoints.push({
                  key: pointKey,
                  x: this.getRealCoordiateX(x),
                  y: this.getRealCoordiateY(y),
                  type: IPointTypeEnum.pathway,
                });
              }
            });
          }
          if (this.elementRendered.AGVPathPoint.mapObj.close.size) {
            const pointKey = Array.from(
              this.elementRendered.AGVPathPoint.mapObj.close.keys()
            )[0];
            const pointArr = pointKey.split(",");
            if (pointArr && Array.isArray(pointArr) && pointArr.length === 2) {
              const x = Number(pointArr[0]);
              const y = Number(pointArr[1]);
              selectedPoints.unshift({
                key: pointKey,
                x: this.getRealCoordiateX(x),
                y: this.getRealCoordiateY(y),
                type: IPointTypeEnum.start,
              });
              selectedPoints.push({
                key: pointKey,
                x: this.getRealCoordiateX(x),
                y: this.getRealCoordiateY(y),
                type: IPointTypeEnum.end,
              });
            }
          } else {
            if (this.elementRendered.AGVPathPoint.mapObj.start.size) {
              const pointKey = Array.from(
                this.elementRendered.AGVPathPoint.mapObj.start.keys()
              )[0];
              const pointArr = pointKey.split(",");
              if (
                pointArr &&
                Array.isArray(pointArr) &&
                pointArr.length === 2
              ) {
                const x = Number(pointArr[0]);
                const y = Number(pointArr[1]);
                selectedPoints.unshift({
                  key: pointKey,
                  x: this.getRealCoordiateX(x),
                  y: this.getRealCoordiateY(y),
                  type: IPointTypeEnum.start,
                });
              }
            }
            if (this.elementRendered.AGVPathPoint.mapObj.end.size) {
              const pointKey = Array.from(
                this.elementRendered.AGVPathPoint.mapObj.end.keys()
              )[0];
              const pointArr = pointKey.split(",");
              if (
                pointArr &&
                Array.isArray(pointArr) &&
                pointArr.length === 2
              ) {
                const x = Number(pointArr[0]);
                const y = Number(pointArr[1]);
                selectedPoints.push({
                  key: pointKey,
                  x: this.getRealCoordiateX(x),
                  y: this.getRealCoordiateY(y),
                  type: IPointTypeEnum.end,
                });
              }
            }
          }

          // 点位选择回调
          this._eventHook.pointSelect(
            pointType,
            currentPoint,
            selectedPoints,
            completeEvent
          );
        }
      }
    };
    eventPointsMap.forEach((pointEle: PIXI.Graphics, pointkey: string) => {
      pointEle.eventMode = "static";
      pointEle.cursor = "pointer";
      pointEle.on("pointerup", (event: PIXI.FederatedPointerEvent) => {
        pointClickEvent(pointkey);
      });
    });

    // 定义解绑函数
    this._pointSelectSingleEventUnbind = () => {
      eventPointsMap.forEach((pointEle: PIXI.Graphics) => {
        pointEle.eventMode = "passive";
        pointEle.cursor = "defalult";
        pointEle.off("pointerup");
      });
    };
  }
  private pointSelectEventUnbind() {
    return new Promise((resolve, reject) => {
      try {
        this._pointSelectSingleEventUnbind &&
          this._pointSelectSingleEventUnbind();
        resolve("success");
      } catch (e) {
        reject(e);
      }
    });
  }
  /**
   * 点位选择事件
   * end
   */

  /**
   * 矩形轮廓边框移动事件绑定 start
   * callback返回的入参：
   * {
   * leftTopCoordiate：{x, y},
    rightTopCoordiate：{x, y},
    rightBottomCoordiate：{x, y},
    leftBottomCoordiate：{x, y},
   * }
  */
  private bindRectOutlineMoveEvents = (params: any) => {
    const {
      outlineName,
      elesObj,
      callback,
      dragStartCallback,
      dragEndCallback,
    } = params;
    // 不渲染VNL文件轮廓的话就不绑定事件
    if (!elesObj) return;
    const {
      MainEle,
      TopPointEle,
      RightPointEle,
      BootomPointEle,
      LeftPointEle,
      LeftTopPointEle,
      LeftTopTextEle,
      RightTopPointEle,
      RightTopTextEle,
      RightBottomPointEle,
      RightBottomTextEle,
      LeftBottomPointEle,
      LeftBottomTextEle,
    } = elesObj;
    if (
      !MainEle ||
      !TopPointEle ||
      !RightPointEle ||
      !BootomPointEle ||
      !LeftPointEle ||
      !LeftTopPointEle ||
      !LeftTopTextEle ||
      !RightTopPointEle ||
      !RightTopTextEle ||
      !RightBottomPointEle ||
      !RightBottomTextEle ||
      !LeftBottomPointEle ||
      !LeftBottomTextEle
    )
      return;
    // 边长中心点hover事件
    TopPointEle.eventMode = "static";
    TopPointEle.cursor = "n-resize";
    RightPointEle.eventMode = "static";
    RightPointEle.cursor = "e-resize";
    BootomPointEle.eventMode = "static";
    BootomPointEle.cursor = "s-resize";
    LeftPointEle.eventMode = "static";
    LeftPointEle.cursor = "w-resize";

    // 四顶点hover事件
    LeftTopPointEle.eventMode = "static";
    LeftTopPointEle.cursor = "nw-resize";
    RightTopPointEle.eventMode = "static";
    RightTopPointEle.cursor = "ne-resize";
    RightBottomPointEle.eventMode = "static";
    RightBottomPointEle.cursor = "se-resize";
    LeftBottomPointEle.eventMode = "static";
    LeftBottomPointEle.cursor = "sw-resize";

    const _dragStartCallback = () => {
      dragStartCallback && dragStartCallback();
    };
    const _dragEndCallback = () => {
      dragEndCallback && dragEndCallback();
    };

    // 定义代理
    const outlineProxyManage = this.createOutlineProxy(outlineName, elesObj);
    const outlineProxy = outlineProxyManage.proxy;

    // 定义PIXI.js封装拖拽事件
    const dragEventBind = (
      pointGraphics: PIXI.Graphics,
      moveCallback: any = () => {}
    ) => {
      const pointerdownEvent = (event: PIXI.FederatedPointerEvent) => {
        event.stopPropagation();
        this.app.stage.on("pointermove", pointermoveEvent);
        // 禁用拖动
        this.cancelCanvasPan().then(() => {
          // 禁用绘制
          _dragStartCallback();
        });
      };
      const pointermoveEvent = (event: PIXI.FederatedPointerEvent) => {
        event.stopPropagation();
        const point = event.getLocalPosition(this.mainContainer);
        moveCallback && moveCallback(event, point);
      };
      const pointerupEvent = (event: PIXI.FederatedPointerEvent) => {
        event.stopPropagation();
        this.app.stage.off("pointermove", pointermoveEvent);
        // 重启拖动
        this.openCanvasPan();
        _dragEndCallback();
        callback && callback(outlineProxy);
      };
      pointGraphics.on("pointerdown", pointerdownEvent);
      pointGraphics.on("pointerup", pointerupEvent);
      pointGraphics.on("pointerupoutside", pointerupEvent);
    };
    const dragEventUnbind = (pointGraphics: PIXI.Graphics) => {
      pointGraphics.off("pointerdown");
      pointGraphics.off("pointerup");
      pointGraphics.off("pointerupoutside");
    };

    // 绑定边框移动事件
    /**
     * onmove
     * onstart
     * onend
     */
    // 上边点
    dragEventBind(
      TopPointEle,
      (event: PIXI.FederatedPointerEvent, point: IPoint) => {
        let correctY =
          point.y < outlineProxy.bottom ? point.y : outlineProxy.bottom;
        outlineProxy.top = correctY;
      }
    );
    // 右边点
    dragEventBind(
      RightPointEle,
      (event: PIXI.FederatedPointerEvent, point: IPoint) => {
        let correctX =
          point.x > outlineProxy.left ? point.x : outlineProxy.left;
        outlineProxy.right = correctX;
      }
    );
    // 下边点
    dragEventBind(
      BootomPointEle,
      (event: PIXI.FederatedPointerEvent, point: IPoint) => {
        let correctY = point.y > outlineProxy.top ? point.y : outlineProxy.top;
        outlineProxy.bottom = correctY;
      }
    );
    // 左边点
    dragEventBind(
      LeftPointEle,
      (event: PIXI.FederatedPointerEvent, point: IPoint) => {
        let correctX =
          point.x < outlineProxy.right ? point.x : outlineProxy.right;
        outlineProxy.left = correctX;
      }
    );
    // 绑定顶点移动事件
    /**
     * onmove
     * onstart
     * onend
     */
    // 左上点
    dragEventBind(
      LeftTopPointEle,
      (event: PIXI.FederatedPointerEvent, point: IPoint) => {
        let correctX =
          point.x < outlineProxy.right ? point.x : outlineProxy.right;
        let correctY =
          point.y < outlineProxy.bottom ? point.y : outlineProxy.bottom;
        outlineProxy.left = correctX;
        outlineProxy.top = correctY;
      }
    );
    // 右上点
    dragEventBind(
      RightTopPointEle,
      (event: PIXI.FederatedPointerEvent, point: IPoint) => {
        let correctX =
          point.x > outlineProxy.left ? point.x : outlineProxy.left;
        let correctY =
          point.y < outlineProxy.bottom ? point.y : outlineProxy.bottom;
        outlineProxy.right = correctX;
        outlineProxy.top = correctY;
      }
    );
    // 右下点
    dragEventBind(
      RightBottomPointEle,
      (event: PIXI.FederatedPointerEvent, point: IPoint) => {
        let correctX =
          point.x > outlineProxy.left ? point.x : outlineProxy.left;
        let correctY = point.y > outlineProxy.top ? point.y : outlineProxy.top;
        outlineProxy.right = correctX;
        outlineProxy.bottom = correctY;
      }
    );
    // 左下点
    dragEventBind(
      LeftBottomPointEle,
      (event: PIXI.FederatedPointerEvent, point: IPoint) => {
        let correctX =
          point.x < outlineProxy.right ? point.x : outlineProxy.right;
        let correctY = point.y > outlineProxy.top ? point.y : outlineProxy.top;
        outlineProxy.left = correctX;
        outlineProxy.bottom = correctY;
      }
    );

    // 定义解除事件
    this._unbindRectOutlineMoveEvents[outlineName] = () => {
      // 取消代理
      outlineProxyManage.revoke();

      // 边长中心点hover事件
      TopPointEle.eventMode = "passive";
      TopPointEle.cursor = "default";
      RightPointEle.eventMode = "passive";
      RightPointEle.cursor = "default";
      BootomPointEle.eventMode = "passive";
      BootomPointEle.cursor = "default";
      LeftPointEle.eventMode = "passive";
      LeftPointEle.cursor = "default";

      // 四顶点hover事件
      LeftTopPointEle.eventMode = "passive";
      LeftTopPointEle.cursor = "default";
      RightTopPointEle.eventMode = "passive";
      RightTopPointEle.cursor = "default";
      RightBottomPointEle.eventMode = "passive";
      RightBottomPointEle.cursor = "default";
      LeftBottomPointEle.eventMode = "passive";
      LeftBottomPointEle.cursor = "default";

      // 解绑拖拽事件
      dragEventUnbind(TopPointEle);
      dragEventUnbind(RightPointEle);
      dragEventUnbind(BootomPointEle);
      dragEventUnbind(LeftPointEle);
      dragEventUnbind(LeftTopPointEle);
      dragEventUnbind(RightTopPointEle);
      dragEventUnbind(RightBottomPointEle);
      dragEventUnbind(LeftBottomPointEle);
    };
    return outlineProxy;
  };
  private _unbindRectOutlineMoveEvents: any = {};
  private unbindRectOutlineMoveEvents = (outlineName: string = "") => {
    if (
      !outlineName ||
      !Reflect.has(this._unbindRectOutlineMoveEvents, outlineName)
    )
      return;
    this._unbindRectOutlineMoveEvents[outlineName]();
  };
  /**
   * 矩形轮廓边框移动事件绑定 end
   */

  /**
   * 矩形区域绘制事件
   * start
   */
  private _unbindRectDrawEvent = () => {};
  private areaDrawEventBind() {
    // 定义必要数据
    let rectDraw_currentAreaId = "";
    if (
      this._eventCondition.areaDrawParam.hasOwnProperty("areaId") &&
      this._eventCondition.areaDrawParam.areaId
    ) {
      rectDraw_currentAreaId = this._eventCondition.areaDrawParam.areaId;
    }
    // 矩形颜色
    let rectDraw_selectRectColor: string = "#6A91E6";
    if (
      this._eventCondition.areaDrawParam.hasOwnProperty("color") &&
      this._eventCondition.areaDrawParam.color
    ) {
      rectDraw_selectRectColor = this._eventCondition.areaDrawParam.color;
    }
    // 矩形填充颜色
    let rectDraw_selectRectBgColor: string = "#6A91E6";
    if (
      this._eventCondition.areaDrawParam.hasOwnProperty("bgColor") &&
      this._eventCondition.areaDrawParam.bgColor
    ) {
      rectDraw_selectRectBgColor = this._eventCondition.areaDrawParam.bgColor;
    }
    let rectDraw_mouseDown: boolean = false;
    // 鼠标按下时的点位数据
    let rectDraw_mousedownStartPoint: IPoint;
    // 鼠标弹起时的点位数据
    let rectDraw_mousedownEndPoint: IPoint;
    // 鼠标按下到弹起后划出的矩形元素
    let rectDraw_mouseSelectRectEle: any;

    // 创建矩形区域控制元素
    /**
     * * 生成矩形区域控制元素等
     * @param _rectBBox 矩形的BBox
     * {
        "x": -172.48366928100586,
        "y": -90.31844520568848,
        "x2": 61.08836364746094,
        "y2": 20.159225463867188,
        "width": 122.38135528564453,
        "height": 40.31844711303711,
        "cx": -0.10231399536132812,
        "cy": 0.0000019073486328125
      }
    * @param dragStartCallback 拖动事件开始时的回调
    * @param dragEndCallback 拖动事件结束时的回调
    * @param areaChangeCallback 区域变动事件回调
    * @param mainColor 区域渲染主颜色，边框颜色
    * @param bgColor 区域渲染填充颜色，背景颜色
    */
    const createRectDrawControl = (params: any) => {
      let {
        rectBound,
        dragStartCallback,
        dragEndCallback,
        areaChangeCallback,
        mainColor,
        bgColor,
      } = params;
      this.elementRendered.ruleArea.objObj.draw = this.renderAreaRect({
        ltx: rectBound.minX, // 左上坐标X
        lty: rectBound.minY, // 左上坐标Y
        rtx: rectBound.maxX, // 右上坐标X
        rty: rectBound.minY, // 右上坐标Y
        rbx: rectBound.maxX, // 右下坐标X
        rby: rectBound.maxY, // 右下坐标Y
        lbx: rectBound.minX, // 左下坐标X
        lby: rectBound.maxY, // 左下坐标Y
        pointRadius: 5,
        borderSize: 2,
        mainColor: mainColor,
        bgColor: bgColor,
      });
      // 添加元素到容器
      const drawContainer: PIXI.Container = new PIXI.Container();
      Object.values(this.elementRendered.ruleArea.objObj.draw).forEach(
        (ele) => {
          drawContainer.addChild(ele);
        }
      );
      this.elementRendered.ruleArea.mapObj.area.set(
        rectDraw_currentAreaId,
        drawContainer
      );
      this.elementRendered.ruleArea.container.addChild(drawContainer);

      const left = rectBound.minX,
        right = rectBound.maxX,
        top = rectBound.minY,
        bottom = rectBound.maxY;
      // 创建轮廓值输入代理
      this._outlineData.drawOutline = {
        left,
        right,
        bottom,
        top,
        width: right - left,
        height: top - bottom,
      };

      const _innerCallback = (outlineData: IOutline) => {
        // 需要转换为真实坐标
        areaChangeCallback &&
          areaChangeCallback(
            new Proxy(outlineData, {
              set: (target, key, value) => {
                switch (key) {
                  case "left":
                    target[key] = this.getMapCoordiateX(value);
                    break;
                  case "right":
                    target[key] = this.getMapCoordiateX(value);
                    break;
                  case "top":
                    target[key] = this.getMapCoordiateY(value);
                    break;
                  case "bottom":
                    target[key] = this.getMapCoordiateY(value);
                    break;
                }
                return true;
              },
              get: (target, key) => {
                switch (key) {
                  case "left":
                    return this.getRealCoordiateX(target[key]);
                    break;
                  case "right":
                    return this.getRealCoordiateX(target[key]);
                    break;
                  case "top":
                    return this.getRealCoordiateY(target[key]);
                    break;
                  case "bottom":
                    return this.getRealCoordiateY(target[key]);
                    break;
                }
                return Reflect.get(target, key);
              },
            })
          );
      };

      const outlineProxy = this.bindRectOutlineMoveEvents({
        outlineName: "drawOutline",
        elesObj: this.elementRendered.ruleArea.objObj.draw,
        callback: _innerCallback,
        dragStartCallback: dragStartCallback,
        dragEndCallback: dragEndCallback,
      });
      // 执行回调
      _innerCallback(outlineProxy);
    };
    const cancelRectDrawMouseSelectRect = () => {
      this.clearCandidateRange();
      rectDraw_mouseSelectRectEle = null;
      if (
        this.elementRendered.ruleArea.objObj.draw &&
        typeof this.elementRendered.ruleArea.objObj.draw === "object" &&
        Object.keys(this.elementRendered.ruleArea.objObj.draw).length
      ) {
        Object.values(this.elementRendered.ruleArea.objObj.draw).forEach(
          (ele: any) => {
            ele?.destroy();
          }
        );
        this.elementRendered.ruleArea.objObj.draw = {} as IOutlineEleData;
      }
    };
    // 鼠标按下
    const rectDrawMousedown = (event: PIXI.FederatedPointerEvent) => {
      this.cancelCanvasPan().then(() => {
        rectDraw_mouseDown = true;
        cancelRectDrawMouseSelectRect();
        rectDraw_mousedownStartPoint = event.getLocalPosition(
          this.mainContainer
        );
        rectDraw_mouseSelectRectEle = this.renderCandidateRange(
          rectDraw_mousedownStartPoint.x,
          rectDraw_mousedownStartPoint.y,
          10,
          10,
          2,
          rectDraw_selectRectColor
        );
      });
    };
    // 鼠标移动
    const rectDrawMousemove = (event: PIXI.FederatedPointerEvent) => {
      if (rectDraw_mouseDown) {
        rectDraw_mousedownEndPoint = event.getLocalPosition(this.mainContainer);
        this.updateMouseSelectRect(
          rectDraw_mouseSelectRectEle,
          rectDraw_mousedownStartPoint,
          rectDraw_mousedownEndPoint
        );
      }
    };
    // 鼠标弹起
    const rectDrawMouseup = () => {
      this.openCanvasPan();
      rectDraw_mouseDown = false;
      // 生成绘制后的矩形，绑定矩形范围拖动事件
      const _rectBounds = rectDraw_mouseSelectRectEle.getLocalBounds();
      cancelRectDrawMouseSelectRect();
      // 绘制完成，创建控制元素
      createRectDrawControl({
        rectBound: _rectBounds,
        dragStartCallback: unbindRectDrawEvent,
        dragEndCallback: bindRectDrawEvent,
        areaChangeCallback: this._eventHook.areaDraw,
        mainColor: rectDraw_selectRectColor,
        bgColor: rectDraw_selectRectBgColor,
      });
    };

    const bindRectDrawEvent = () => {
      this.app.stage.on("pointerdown", rectDrawMousedown);
      this.app.stage.on("pointermove", rectDrawMousemove);
      this.app.stage.on("pointerup", rectDrawMouseup);
    };
    const unbindRectDrawEvent = () => {
      this.app.stage.off("pointerdown", rectDrawMousedown);
      this.app.stage.off("pointermove", rectDrawMousemove);
      this.app.stage.off("pointerup", rectDrawMouseup);
    };

    if (rectDraw_currentAreaId) {
      // 传入了区域ID，查询当前是否有渲染了这个区域
      if (
        this.elementRendered.ruleArea.mapObj.area.has(rectDraw_currentAreaId) &&
        this.elementRendered.ruleArea.mapObj.data.has(rectDraw_currentAreaId)
      ) {
        // 有，则获取关键数据并清除这组元素
        const _areaContainer = this.elementRendered.ruleArea.mapObj.area.get(
          rectDraw_currentAreaId
        );
        const _areaData = this.elementRendered.ruleArea.mapObj.data.get(
          rectDraw_currentAreaId
        );
        const _areaBound = {
          minX: _areaData.left,
          minY: _areaData.top,
          maxX: _areaData.right,
          maxY: _areaData.bottom,
        };

        // 清除这个规则区域下的所有元素
        _areaContainer.destroy();
        this.elementRendered.ruleArea.mapObj.area.delete(
          rectDraw_currentAreaId
        );
        this.elementRendered.ruleArea.mapObj.data.delete(
          rectDraw_currentAreaId
        );

        createRectDrawControl({
          rectBound: _areaBound,
          dragStartCallback: unbindRectDrawEvent,
          dragEndCallback: bindRectDrawEvent,
          areaChangeCallback: this._eventHook.areaDraw,
          mainColor: rectDraw_selectRectColor,
          bgColor: rectDraw_selectRectBgColor,
        });
      }
    }
    // 绑定绘制事件
    bindRectDrawEvent();

    // 保存取消事件
    this._unbindRectDrawEvent = () => {
      unbindRectDrawEvent();
      cancelRectDrawMouseSelectRect();
    };
  }
  private areaDrawEventUnbind() {
    return new Promise((resolve, reject) => {
      try {
        this._unbindRectDrawEvent && this._unbindRectDrawEvent();
        resolve("success");
      } catch (e) {
        reject(e);
      }
    });
  }
  /**
   * 矩形区域绘制事件
   * end
   */

  /**
   * VNL轮廓用户可移动调节事件
   * start
   */
  public vnlOutlineMoveEventBind = () => {
    // 内置回调
    const _innerCallback = (outlineData: IOutline) => {
      // 需要转换为真实坐标
      this._eventHook.vnlOutlineMove &&
        this._eventHook.vnlOutlineMove(
          new Proxy(outlineData, {
            set: (target, key, value) => {
              switch (key) {
                case "left":
                  target[key] = this.getMapCoordiateX(value);
                  break;
                case "right":
                  target[key] = this.getMapCoordiateX(value);
                  break;
                case "top":
                  target[key] = this.getMapCoordiateY(value);
                  break;
                case "bottom":
                  target[key] = this.getMapCoordiateY(value);
                  break;
              }
              return true;
            },
            get: (target, key) => {
              switch (key) {
                case "left":
                  return this.getRealCoordiateX(target[key]);
                  break;
                case "right":
                  return this.getRealCoordiateX(target[key]);
                  break;
                case "top":
                  return this.getRealCoordiateY(target[key]);
                  break;
                case "bottom":
                  return this.getRealCoordiateY(target[key]);
                  break;
              }
              return Reflect.get(target, key);
            },
          })
        );
    };
    const outlineProxy = this.bindRectOutlineMoveEvents({
      outlineName: "vnlOutline",
      elesObj: this.elementRendered.outline.objObj.vnl,
      callback: _innerCallback,
    });
    _innerCallback(outlineProxy);
  };
  public vnlOutlineMoveEventUnbind = () => {
    return new Promise((resolve, reject) => {
      try {
        this.unbindRectOutlineMoveEvents("vnlOutline");
        resolve("success");
      } catch (e) {
        reject(e);
      }
    });
  };
  /**
   * VNL轮廓用户可移动调节事件
   * end
   */

  /**
   * 鼠标悬浮展示坐标数据 start
   */
  private _unbindMousehoverCoordiate = () => {};
  private mousehoverCoordiateBind() {
    const mousehoverCoordiateEvent = (event: PIXI.FederatedPointerEvent) => {
      const currentPoint = event.getLocalPosition(this.mainContainer);
      currentPoint.x = this.getRealCoordiateX(currentPoint.x || 0);
      currentPoint.y = this.getRealCoordiateY(currentPoint.y || 0);
      this._eventHook.mouseCoordiate(currentPoint);
    };

    this.app.stage.on("pointermove", mousehoverCoordiateEvent);
    this._unbindMousehoverCoordiate = () => {
      this.app.stage.off("pointermove", mousehoverCoordiateEvent);
    };
  }
  private mousehoverCoordiateUnbind() {
    return new Promise((resolve, reject) => {
      try {
        this._unbindMousehoverCoordiate();
        resolve("success");
      } catch (e) {
        reject(e);
      }
    });
  }
  /**
   * 鼠标悬浮展示坐标数据 end
   */

  /**
   * start
   * 绑定/解绑鼠标图标变更事件
   * 抓取/抓取中/十字选择
   * grab/grabbing/crosshair
   *
   * 暂时无需暴露给外部
   * 已默认绑定到ContrlKeyEvent和AltKeyEvent
   */
  private bindMouseCursorChangeEvent = () => {
    this.app.stage.on("pointerover", this.setCursorGrab);
    this.app.stage.on("pointerdown", this.setCursorGrabing);
    this.app.stage.on("pointerup", this.setCursorGrab);
    window.addEventListener("keydown", this.setCursorCrosshair, false);
    window.addEventListener("keyup", this.setCursorGrab, false);
  };
  // 绑定/解绑事件用的方法
  private setCursorGrab = () => {
    this.app.stage.cursor = "grab";
  };
  private setCursorGrabing = () => {
    this.app.stage.cursor = "grabbing";
  };
  private setCursorCrosshair = () => {
    this.app.stage.cursor = "crosshair";
  };
  // 解绑鼠标样式变化事件
  private unbindMouseCursorChangeEvent = () => {
    this.app.stage.off("pointerover", this.setCursorGrab);
    this.app.stage.off("pointerdown", this.setCursorGrabing);
    this.app.stage.off("pointerup", this.setCursorGrab);
    window.removeEventListener("keydown", this.setCursorCrosshair, false);
    window.removeEventListener("keyup", this.setCursorGrab, false);
  };
  /**
   * 绑定/解绑鼠标图标变更事件
   * end
   */
}
