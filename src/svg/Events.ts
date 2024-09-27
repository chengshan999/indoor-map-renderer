import Renderer from "./Renderer";
import {
  IPoint,
  IOutline,
  IRectPoints,
  IOutlineEleData,
  IRectRange,
  IAreaDraw,
  IEventCondition,
  IEvents,
} from "./Interface";

export default class Events extends Renderer {
  /**
   * 事件类的构造函数
   */
  constructor() {
    super();
    this.eventCallback = () => {
      // 绑定所有开启的事件
      this.bindEvents();
    };
  }

  /**
   * 事件开关
   */
  private _eventStatusInit = {
    panzoom: false,
    parkStock: false,
    parkSelect: false,
    pointSelect: false,
    areaDraw: false,
    mouseCoordiate: false,
    vnlOutlineMove: false,
  };
  protected _eventStatus = Object.assign({}, this._eventStatusInit);
  private _eventSwitchInit: IEvents = {
    panzoom: true,
    parkStock: false,
    parkSelect: false,
    pointSelect: false,
    areaDraw: false,
    mouseCoordiate: false,
    vnlOutlineMove: false,
  };
  protected _eventSwitch: IEvents = Object.assign({}, this._eventSwitchInit);
  public eventSwitch: IEvents = new Proxy(this._eventSwitch, {
    set: (target: any, prop: string, value: any) => {
      target[prop] = value;
      // 对每个事件的变动做单独处理
      if (this.renderSwitch.completed) {
        // 地图元素渲染完成才可以绑定事件
        switch (prop) {
          case "panzoom":
            if (value) {
              if (!this._eventStatus.panzoom) {
                this._eventStatus.panzoom = true;
                this.panzoom?.resume();
              }
            } else {
              if (this._eventStatus.panzoom) {
                this._eventStatus.panzoom = false;
                this.panzoom?.pause();
              }
            }
            break;
          case "parkStock": // 库位有无货事件
            if (value) {
              if (!this._eventStatus.parkStock) {
                this._eventStatus.parkStock = true;
                this.parkStockEventUnbind(() => {
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
                this.parkSelectEventUnbind(() => {
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
                this.pointSelectEventUnbind(() => {
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
                this.areaDrawEventUnbind(() => {
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
                this.mousehoverCoordiateUnbind(() => {
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
                this.vnlOutlineMoveEventUnbind(() => {
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
    parkStockScope: [], // 绑定库位有无货操作事件的库位ID
    parkStockImmediate: true, // 有无货事件是否立即执行
    parkSelectScope: [], // 绑定库位有无货操作事件的库位ID
    parkSelectImmediate: true, // 有无货事件是否立即执行
    pointSelectScope: undefined, // 点位选择区域
    areaDrawParam: {} as IAreaDraw, // 区域绘制参数
  };
  public eventCondition: IEventCondition = new Proxy(this._eventCondition, {
    set: (target: any, prop: string, value: any) => {
      // 对每个事件的变动做单独处理
      if (this.renderSwitch.completed) {
        // 地图元素渲染完成才可以绑定事件
        switch (prop) {
          case "parkStockScope":
            if (Array.isArray(value)) {
              target[prop] = value.map((id: number | string) => String(id));
              if (this._eventSwitch.parkStock) {
                this.parkStockEventUnbind(() => {
                  this.parkStockEventBind();
                });
              }
            }
            break;
          case "parkSelectScope":
            if (Array.isArray(value)) {
              target[prop] = value.map((id: number | string) => String(id));
              if (this._eventSwitch.parkSelect) {
                this.parkSelectEventUnbind(() => {
                  this.parkSelectEventBind();
                });
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
              if (this._eventSwitch.pointSelect) {
                this.pointSelectEventUnbind(() => {
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
              if (this._eventSwitch.pointSelect) {
                this.areaDrawEventUnbind(() => {
                  this.areaDrawEventBind();
                });
              }
            }
            break;
        }
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
      allParkIds: string[]
    ) => {},
    parkSelect: (
      selectParkIds: string[],
      cancelParkIds: string[],
      allParkIds: string[]
    ) => {},
    pointSelect: (
      selectPoints: IPoint[],
      preSelectMothed: any = (point: IPoint) => {},
      completeMothed: any = () => {}
    ) => {},
    areaDraw: (rectPoints: IRectPoints) => {},
    mouseCoordiate: (point: IPoint) => {},
    vnlOutlineMove: (rectPoints: IRectPoints) => {},
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
   * 根据事件获取鼠标当前点对象及数据
   * @param evt 事件对象
   * @returns 返回点位对象
   */
  private transformPoint(evt: any): IPoint {
    const pt = this.paper?.canvas?.createSVGPoint();
    if (/^touch.*$/.test(evt.type)) {
      // 触摸事件
      const touches = evt.changedTouches[0] ? evt.changedTouches[0] : undefined;
      pt.x = touches?.clientX;
      pt.y = touches?.clientY;
    } else {
      // 鼠标点击事件
      pt.x = evt?.clientX;
      pt.y = evt?.clientY;
    }
    const ctm = this.paper?.canvas?.getScreenCTM();
    return pt.matrixTransform(ctm.inverse());
  }
  /**
   * 初始化鼠标选择矩形
   * @param point 鼠标开始点点位
   * @param color 矩形颜色
   * @param width 选择矩形ele
   * @returns
   */
  private initMouseSelectRect(point: IPoint, color: string, width: number = 4) {
    return this.paper.rect(point.x, point.y, 10, 10).attr({
      "stroke-width": width,
      stroke: color,
      "stroke-opacity": 1,
      "stroke-dasharray": "- ",
    });
  }

  /**
   * 更新化鼠标选择矩形
   * @param rectEle
   * @param startPoint
   * @param endPoint
   */
  private updateMouseSelectRect = (
    rectEle: any,
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

    rectEle.attr({
      x: x,
      y: y,
      width: Math.abs(w),
      height: Math.abs(h),
    });
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
      eventParkIds = Array.from(this.elementRendered.Park.mapObj.event.keys());
    }
    const parkMap = this.elementRendered.Park.mapObj.stock;
    const selectEvent = (parkId: string) => {
      this.signParkStock(parkId);
    };
    const cancelEvent = (parkId: string) => {
      this.signParkEmpty(parkId);
    };
    const isImmediate = this._eventCondition.parkStockImmediate;
    const parkStockSingleEventUnbind = (method: any) => {
      this._parkStockSingleEventUnbind = method;
    };
    const parkStockBatchEventUnbind = (method: any) => {
      this._parkStockBatchEventUnbind = method;
    };

    /* 绑定单击事件 start */
    this.commonParkSingleEvent(
      eventParkIds,
      parkMap,
      selectEvent,
      cancelEvent,
      this._eventHook.parkStock,
      isImmediate,
      parkStockSingleEventUnbind
    );
    /* 绑定单击事件 end */

    /* 绑定框选事件 start */
    this.commonParkBatchEvent(
      eventParkIds,
      parkMap,
      selectEvent,
      cancelEvent,
      this._eventHook.parkStock,
      isImmediate,
      parkStockBatchEventUnbind
    );
    /* 绑定框选事件 end */
  }
  // 库位有无货状态单选事件解绑方法
  private _parkStockSingleEventUnbind = () => {};
  // 库位有无货状态多选事件解绑方法
  private _parkStockBatchEventUnbind = () => {};
  // 解绑库位有无货状态所有事件
  protected parkStockEventUnbind(callback: any = null) {
    this._parkStockSingleEventUnbind();
    this._parkStockBatchEventUnbind();
    // 处理完毕的回调
    callback && callback();
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
      eventParkIds = Array.from(this.elementRendered.Park.mapObj.event.keys());
    }
    const parkMap = this.elementRendered.Park.mapObj.selected;
    const selectEvent = (parkId: string) => {
      this.signParkSelect(parkId);
    };
    const cancelEvent = (parkId: string) => {
      this.signParkDefault(parkId);
    };
    const isImmediate = this._eventCondition.parkSelectImmediate;
    const parkSingleEventUnbind = (method: any) => {
      this._parkSelectSingleEventUnbind = method;
    };
    const parkBatchEventUnbind = (method: any) => {
      this._parkSelectBatchEventUnbind = method;
    };

    /* 绑定单击事件 start */
    this.commonParkSingleEvent(
      eventParkIds,
      parkMap,
      selectEvent,
      cancelEvent,
      this._eventHook.parkSelect,
      isImmediate,
      parkSingleEventUnbind
    );
    /* 绑定单击事件 end */

    /* 绑定框选事件 start */
    this.commonParkBatchEvent(
      eventParkIds,
      parkMap,
      selectEvent,
      cancelEvent,
      this._eventHook.parkSelect,
      isImmediate,
      parkBatchEventUnbind
    );
    /* 绑定框选事件 end */
  }
  // 库位有无货状态单选事件解绑方法
  private _parkSelectSingleEventUnbind = () => {};
  // 库位有无货状态多选事件解绑方法
  private _parkSelectBatchEventUnbind = () => {};
  // 解绑库位有无货状态所有事件
  protected parkSelectEventUnbind(callback: any = null) {
    this._parkSelectSingleEventUnbind();
    this._parkSelectBatchEventUnbind();
    // 处理完毕的回调
    callback && callback();
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
    eventParkIds: string[],
    parkMap: Map<string, any>,
    selectEvent: Function,
    cancelEvent: Function,
    hookEvent: Function,
    isImmediate: boolean,
    unbindEvent: Function
  ) {
    const selectedCallback = (ele: any, event: any) => {
      const parkId = ele?.data("id");
      if (parkId) {
        const isSelected = parkMap.has(parkId);
        if (isImmediate) {
          if (isSelected) {
            // 已经被选中，则取消选中
            cancelEvent && cancelEvent(parkId);
          } else {
            // 当前未被选中，则选中之
            selectEvent && selectEvent(parkId);
          }
        }
        if (hookEvent) {
          const selectParks = [];
          const cancelParks = [];
          if (isSelected) {
            // 已选中，需要取消选中
            cancelParks.push(parkId);
          } else {
            // 未选中，需要选中
            selectParks.push(parkId);
          }
          const allParks = Array.from(parkMap.keys()).filter((id: string) =>
            eventParkIds.includes(id)
          );
          hookEvent(selectParks, cancelParks, allParks);
        }
      }
    };
    const bindParkSelectEvent = (parkEle: any) => {
      let timer: any = 0;
      parkEle.click((event: any) => {
        timer && clearTimeout(timer);
        timer = setTimeout(() => {
          selectedCallback(parkEle, event);
        }, 200);
      });
      parkEle.dblclick((event: any) => {
        timer && clearTimeout(timer);
      });
      // 只有触摸才会触发，触摸长按不触发
      let touchstartTime: number = 0;
      parkEle.touchstart(() => {
        touchstartTime = new Date().getTime();
      });
      parkEle.touchend((event: any) => {
        let touchendTime = new Date().getTime();
        if (touchendTime - touchstartTime <= 200) {
          selectedCallback(parkEle, event);
        }
      });
      parkEle.attr({ cursor: "pointer" });
    };
    eventParkIds.forEach((parkId: string) => {
      if (this.elementRendered.Park.mapObj.event.has(parkId)) {
        bindParkSelectEvent(this.elementRendered.Park.mapObj.event.get(parkId));
      }
    });
    // 定义解绑事件
    unbindEvent &&
      unbindEvent(() => {
        const unbindParkSelectEvent = (parkEle: any) => {
          // 解绑定鼠标hover
          parkEle.attr({ cursor: "" });
          // 解绑定鼠标点击
          parkEle.unclick();
          parkEle.undblclick();
          parkEle.untouchstart();
          parkEle.untouchend();
        };
        eventParkIds.forEach((parkId: string) => {
          if (this.elementRendered.Park.mapObj.event.has(parkId)) {
            unbindParkSelectEvent(
              this.elementRendered.Park.mapObj.event.get(parkId)
            );
          }
        });
      });
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
    eventParkIds: string[],
    parkMap: Map<string, any>,
    selectEvent: Function,
    cancelEvent: Function,
    hookEvent: Function,
    isImmediate: boolean,
    unbindEvent: Function
  ) {
    let isBindAltMouseEvents = false;
    let alt_isMouseDown = false;
    let alt_mousedownStartPoint: any;
    let alt_mouseupEndPoint: any;
    let alt_mouseSelectRectEle: any;
    const alt_selectRectColor = "#EB2829";

    const cancelMouseSelectRect = () => {
      alt_mouseSelectRectEle && alt_mouseSelectRectEle?.remove();
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
      this.paper?.canvas?.addEventListener("mousedown", altMousedown, false);
      this.paper?.canvas?.addEventListener("mousemove", altMousemove, false);
      this.paper?.canvas?.addEventListener("mouseup", altMouseup, false);
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
        bindAltMouseEvents();
        isBindAltMouseEvents = true;
      }
    };
    const unbindAltMouseEvents = () => {
      this.paper?.canvas?.removeEventListener("mousedown", altMousedown, false);
      this.paper?.canvas?.removeEventListener("mousemove", altMousemove, false);
      this.paper?.canvas?.removeEventListener("mouseup", altMouseup, false);
    };
    const bindMouseEventAfterAltKeyup = (e: any) => {
      // 清除现有鼠标动作动画数据
      altInitMouseAnimationData();
      // 解绑鼠标事件
      // key: "Control",keyCode: 17 不分左右Control
      // key: "Alt",keyCode: 18 不分左右Alt
      if ([18].includes(e.keyCode) || ["Alt"].includes(e.key)) {
        unbindAltMouseEvents();
        isBindAltMouseEvents = false;
      }
    };
    const altMousedown = (e: any) => {
      // metaKey/altKey/ctrlKey/shiftKey
      if (e.altKey) {
        // this.isAltKeydown = e.altKey
        if (e.button === 0) {
          cancelMouseSelectRect();
          alt_isMouseDown = true;
          alt_mousedownStartPoint = this.transformPoint(e);
          alt_mouseSelectRectEle = this.initMouseSelectRect(
            alt_mousedownStartPoint,
            alt_selectRectColor
          );
        }
      }
    };
    const altMousemove = (e: any) => {
      if (alt_isMouseDown && e.altKey) {
        alt_mouseupEndPoint = this.transformPoint(e);
        this.updateMouseSelectRect(
          alt_mouseSelectRectEle,
          alt_mousedownStartPoint,
          alt_mouseupEndPoint
        );
      }
    };
    const altMouseup = (e: any) => {
      // 执行选中效果
      if (e.altKey && alt_mouseSelectRectEle) {
        // 按下alt键,按下alt键，执行选中库位操作
        let mousedownSelectRectBBox = alt_mouseSelectRectEle.getBBox();
        let selectParks: any[] = []; // 当前被选框选中的库位
        let cancelParks: any[] = []; // 当前被框选取消的库位
        const intersectParkByMouse = (parkEle: any) => {
          const parkId = parkEle?.data("id");
          let currentBBox = parkEle.getBBox();
          if (
            currentBBox.x >= mousedownSelectRectBBox.x &&
            currentBBox.y >= mousedownSelectRectBBox.y &&
            currentBBox.x2 <= mousedownSelectRectBBox.x2 &&
            currentBBox.y2 <= mousedownSelectRectBBox.y2
          ) {
            const isSelected = parkMap.has(parkId);
            // 判断是否立即选中
            if (isImmediate) {
              // 立即选中
              // 最新逻辑，对框选的库位进行取反操作
              if (isSelected) {
                // 已经选中的，置为未选中
                cancelEvent && cancelEvent(parkId);
                return false;
              } else {
                // 未选中的置为选中
                selectEvent && selectEvent(parkId);
                return true;
              }
            } else {
              // 非立即选中，被框选住状态
              if (isSelected) {
                // 已经选中的，置为未选中
                return false;
              } else {
                // 未选中的置为选中
                return true;
              }
            }
          } else {
            return null;
          }
        };
        eventParkIds.forEach((parkId: string) => {
          if (this.elementRendered.Park.mapObj.event.has(parkId)) {
            const ele = this.elementRendered.Park.mapObj.event.get(parkId);
            if (ele.node.style.display !== "none") {
              // 没被隐藏的才需要参加事件
              let isSelected = intersectParkByMouse(ele);
              if (isSelected) selectParks.push(ele.data("id"));
              if (isSelected === false) cancelParks.push(ele.data("id"));
            }
          }
        });
        if (hookEvent) {
          const allParks = Array.from(parkMap.keys()).filter((id: string) =>
            eventParkIds.includes(id)
          );
          hookEvent(selectParks, cancelParks, allParks);
        }
      }
      // 清除现有鼠标动作动画数据
      altInitMouseAnimationData();
    };
    window.addEventListener("keydown", bindMouseEventAfterAltKeydown, false);
    window.addEventListener("keyup", bindMouseEventAfterAltKeyup, false);
    this.bindMouseCursorChangeEvent();

    // 定义解绑事件
    unbindEvent &&
      unbindEvent(() => {
        window.removeEventListener(
          "keydown",
          bindMouseEventAfterAltKeydown,
          false
        );
        window.removeEventListener("keyup", bindMouseEventAfterAltKeyup, false);
        this.unbindMouseCursorChangeEvent();
      });
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
    let isGlobal: boolean = true;
    let eventPoints: IPoint[] = [];
    if (this._eventCondition.pointSelectScope) {
      isGlobal = false;
      // 有区域，只让区域内的点生效，区域内无点则不绑定
      eventPoints = Array.from(this.elementRendered.AGVPathPoint.map.keys())
        .map((key: string) => {
          const pointArr = key.split(",");
          if (pointArr.length === 2) {
            const x = Number(pointArr[0]);
            const y = Number(pointArr[1]);
            if (
              x >= this._eventCondition.pointSelectScope?.left &&
              x <= this._eventCondition.pointSelectScope?.right &&
              y <= this._eventCondition.pointSelectScope?.bottom &&
              y >= this._eventCondition.pointSelectScope?.top
            ) {
              // 绑定鼠标hover事件
              if (this.elementRendered.AGVPathPoint.map.has(key)) {
                const ele = this.elementRendered.AGVPathPoint.map.get(key);
                // 绑定鼠标hover
                ele.attr({ cursor: "pointer" });
              }
              // 属于当前区域的点，需要返回
              return {
                x,
                y,
                key,
              };
            }
          }
          return false;
        })
        .filter((item: IPoint | boolean) => {
          return item;
        });
    } else {
      isGlobal = true;
      // 无限制区域，则绑定所有点事件
      eventPoints = Array.from(
        this.elementRendered.AGVPathPoint.map.keys()
      ).map((key: string) => {
        const pointArr = key.split(",");
        const x = Number(pointArr[0]);
        const y = Number(pointArr[1]);
        return {
          x,
          y,
          key,
        };
      });
      // 无限制区域，则绑定所有点事件
      this.elementRendered.AGVPathPoint.map.forEach((ele: any, key: string) => {
        // 绑定鼠标hover
        ele.attr({ cursor: "pointer" });
      });
    }

    // 定义单击和双击的响应半径
    const singleClickRadius = this.elementConfig.AGVPathPoint.size.r;
    const doubleClickRadius = this.elementConfig.AGVPathPoint.size.r * 5; // 5倍点位直径
    // 通用点位选则方法
    const commonPointSelect = (e: any, radius: number) => {
      // 如果画布都不存在，直接终止
      if (!this.paper?.canvas) return;
      // 获取当前鼠标点中的点在地图上的坐标
      const MousePoint = this.transformPoint(e);
      const selectRectBBbox = {
        x: MousePoint.x - radius,
        y: MousePoint.y - radius,
        x2: MousePoint.x + radius,
        y2: MousePoint.y + radius,
      };
      // 计算在选中区域的点
      let selectedPoints: IPoint[] = eventPoints.filter((point: IPoint) => {
        if (
          point.x >= selectRectBBbox.x &&
          point.x <= selectRectBBbox.x2 &&
          point.y >= selectRectBBbox.y &&
          point.y <= selectRectBBbox.y2
        ) {
          return true;
        }
        return false;
      });
      // 对选中的点进行处理
      if (selectedPoints.length) {
        // 有选中的点
        this.renderCandidateRange(
          selectRectBBbox.x,
          selectRectBBbox.y,
          selectRectBBbox.x2 - selectRectBBbox.x,
          selectRectBBbox.y2 - selectRectBBbox.y
        );
        // 定义预选中点位标识方法
        const preSelectEvent = (point: IPoint) => {
          // 处理点位预选中标识效果
          this.signCandidatePoint(point);
        };
        // 定义选定点位后的回调方法
        const completeEvent = () => {
          this.clearCandidateRange();
        };
        if (this._eventHook.pointSelect) {
          // 地图坐标转真实坐标
          selectedPoints = selectedPoints.map((point: IPoint) => {
            point.x = this.getRealCoordiateX(point.x);
            point.y = this.getRealCoordiateY(point.y);
            return point;
          });
          this._eventHook.pointSelect(
            selectedPoints,
            preSelectEvent,
            completeEvent
          );
        }
      } else {
        this.clearCandidateRange();
      }
    };

    // 绑定鼠标单击、双击鼠标事件
    const pointClickEvent = (e: any) => {
      commonPointSelect(e, singleClickRadius);
    };
    const pointDbclickEvent = (e: any) => {
      commonPointSelect(e, doubleClickRadius);
    };
    this.paper?.canvas?.addEventListener("click", pointClickEvent, false);
    this.paper?.canvas?.addEventListener("dblclick", pointDbclickEvent, false);
    // 绑定触摸单击、双击鼠标事件
    let pointTouchLastTime: number = 0;
    let pointTouchstartEventTimer: any;
    const clearPointTouchEvent = () => {
      pointTouchstartEventTimer && clearTimeout(pointTouchstartEventTimer);
      pointTouchstartEventTimer = 0;
    };
    const pointTouchstartEvent = (e: any) => {
      const touchCount = e?.touches.length || 0;
      // 必须单点触控才会触发
      if (touchCount === 1) {
        const now = new Date().getTime();
        let timeSinceLastTouch = now - pointTouchLastTime;
        if (timeSinceLastTouch < 250 && timeSinceLastTouch > 0) {
          // 触发双击事件
          e.preventDefault();
          // 在这里执行双击事件的处理逻辑
          clearPointTouchEvent();
          commonPointSelect(e, doubleClickRadius);
        } else {
          // 触发单击
          e.preventDefault();
          pointTouchstartEventTimer = setTimeout(() => {
            commonPointSelect(e, singleClickRadius);
          }, 300);
        }
        pointTouchLastTime = now;
      }
    };
    const pointTouchmoveEvent = (e: any) => {
      clearPointTouchEvent();
    };
    this.paper?.canvas?.addEventListener(
      "touchstart",
      pointTouchstartEvent,
      false
    );
    this.paper?.canvas?.addEventListener(
      "touchmove",
      pointTouchmoveEvent,
      false
    );
    // 定义解绑函数
    this._pointSelectSingleEventUnbind = () => {
      this.paper?.canvas?.removeEventListener("click", pointClickEvent, false);
      this.paper?.canvas?.removeEventListener(
        "dblclick",
        pointDbclickEvent,
        false
      );
      this.paper?.canvas?.removeEventListener(
        "touchstart",
        pointTouchstartEvent,
        false
      );
      this.paper?.canvas?.removeEventListener(
        "touchmove",
        pointTouchmoveEvent,
        false
      );
    };
  }
  private pointSelectEventUnbind(callback: any = undefined) {
    this._pointSelectSingleEventUnbind && this._pointSelectSingleEventUnbind();
    callback && callback();
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
    const { elesObj, callback, dragStartCallback, dragEndCallback } = params;
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
    TopPointEle.mouseover((e: any) => {
      e.target.style.cursor = "n-resize";
    });
    RightPointEle.mouseover((e: any) => {
      e.target.style.cursor = "e-resize";
    });
    BootomPointEle.mouseover((e: any) => {
      e.target.style.cursor = "s-resize";
    });
    LeftPointEle.mouseover((e: any) => {
      e.target.style.cursor = "w-resize";
    });
    // 四顶点hover事件
    LeftTopPointEle.mouseover((e: any) => {
      e.target.style.cursor = "nw-resize";
    });
    RightTopPointEle.mouseover((e: any) => {
      e.target.style.cursor = "ne-resize";
    });
    RightBottomPointEle.mouseover((e: any) => {
      e.target.style.cursor = "se-resize";
    });
    LeftBottomPointEle.mouseover((e: any) => {
      e.target.style.cursor = "sw-resize";
    });

    const _dragStartCallback = () => {
      dragStartCallback && dragStartCallback();
    };
    const _dragEndCallback = () => {
      dragEndCallback && dragEndCallback();
    };
    // 绑定边框移动事件
    /**
     * onmove
     * onstart
     * onend
     */
    // 上边点
    TopPointEle.drag(
      (dx: number, dy: number, x: number, y: number, event: any) => {
        // 整理参数
        let currentMousePoint = this.transformPoint(event);
        const _data = MainEle.data();
        let correctY =
          currentMousePoint.y < _data.leftBottom.y
            ? currentMousePoint.y
            : _data.leftBottom.y;
        const extremumX = this.viewBoxParams[1];
        correctY = correctY < extremumX ? extremumX : correctY;

        _data.leftTop.y = correctY;
        _data.rightTop.y = correctY;
        // 调整轮廓
        MainEle.attr({
          x: _data.leftTop.x,
          y: _data.leftTop.y,
          height: Math.abs(_data.leftBottom.y - _data.leftTop.y),
        }).data(_data);
        // 移动上边点
        TopPointEle.attr({
          cy: _data?.leftTop.y,
        });
        // 移动右边点
        RightPointEle.attr({
          cy: (_data?.rightTop.y + _data?.rightBottom.y) / 2,
        });
        // 移动左边点
        LeftPointEle.attr({
          cy: (_data?.leftTop.y + _data?.leftBottom.y) / 2,
        });

        // 移动左上角点
        LeftTopPointEle.attr({
          cx: _data?.leftTop.x,
          cy: _data?.leftTop.y,
        });
        this.updateOutlineCoordinateText(
          "leftTop",
          LeftTopTextEle,
          _data?.leftTop.x,
          _data?.leftTop.y
        );
        // 移动右上角点
        RightTopPointEle.attr({
          cx: _data?.rightTop.x,
          cy: _data.rightTop.y,
        });
        this.updateOutlineCoordinateText(
          "rightTop",
          RightTopTextEle,
          _data?.rightTop.x,
          _data?.rightTop.y
        );
      },
      (x: number, y: number, event: any) => {
        this.panzoom.pause();
      },
      (x: number, y: number, event: any) => {
        this.panzoom.resume();
        // 回调
        const _data = MainEle.data();
        callback && callback(_data);
      }
    );
    // 右边点
    RightPointEle.drag(
      (dx: number, dy: number, x: number, y: number, event: any) => {
        // 整理参数
        let currentMousePoint = this.transformPoint(event);
        const _data = MainEle.data();
        let correctX =
          currentMousePoint.x > _data.leftTop.x
            ? currentMousePoint.x
            : _data.leftTop.x;
        const extremumX = this.viewBoxParams[0] + this.viewBoxParams[2];
        correctX = correctX > extremumX ? extremumX : correctX;

        _data.rightTop.x = correctX;
        _data.rightBottom.x = correctX;
        // 调整轮廓
        MainEle.attr({
          x: _data.leftTop.x,
          y: _data.leftTop.y,
          width: Math.abs(_data.rightTop.x - _data.leftTop.x),
        }).data(_data);
        // 移动上边点
        TopPointEle.attr({
          cx: (_data.leftTop.x + _data?.rightTop.x) / 2,
        });
        // 移动右边点
        RightPointEle.attr({
          cx: _data?.rightTop.x,
        });
        // 移动下边点
        BootomPointEle.attr({
          cx: (_data?.leftBottom.x + _data?.rightBottom.x) / 2,
        });

        // 移动右上角点
        RightTopPointEle.attr({
          cx: _data?.rightTop.x,
          cy: _data?.rightTop.y,
        });
        this.updateOutlineCoordinateText(
          "rightTop",
          RightTopTextEle,
          _data?.rightTop.x,
          _data?.rightTop.y
        );
        // 移动右下角点
        RightBottomPointEle.attr({
          cx: _data?.rightBottom.x,
          cy: _data.rightBottom.y,
        });
        this.updateOutlineCoordinateText(
          "rightBottom",
          RightBottomTextEle,
          _data?.rightBottom.x,
          _data?.rightBottom.y
        );
      },
      (x: number, y: number, event: any) => {
        _dragStartCallback();
      },
      (x: number, y: number, event: any) => {
        _dragEndCallback();
        // 回调
        const _data = MainEle.data();
        callback && callback(_data);
      }
    );
    // 下边点
    BootomPointEle.drag(
      (dx: number, dy: number, x: number, y: number, event: any) => {
        // 整理参数
        let currentMousePoint = this.transformPoint(event);
        const _data = MainEle.data();
        let correctY =
          currentMousePoint.y > _data.leftTop.y
            ? currentMousePoint.y
            : _data.leftTop.y;
        const extremumY = this.viewBoxParams[1] + this.viewBoxParams[3];
        correctY = correctY > extremumY ? extremumY : correctY;

        _data.rightBottom.y = correctY;
        _data.leftBottom.y = correctY;
        // 调整轮廓
        MainEle.attr({
          x: _data.leftTop.x,
          y: _data.leftTop.y,
          // width: Math.abs(_data.rightTop.x - _data.leftTop.x)
          height: Math.abs(_data.leftBottom.y - _data.leftTop.y),
        }).data(_data);
        // 移动右边点
        RightPointEle.attr({
          cy: (_data?.rightTop.y + _data?.rightBottom.y) / 2,
        });
        // 移动下边点
        BootomPointEle.attr({
          cy: _data?.leftBottom.y,
        });
        // 移动左边点
        LeftPointEle.attr({
          cy: (_data.leftTop.y + _data?.leftBottom.y) / 2,
        });

        // 移动右下角点
        RightBottomPointEle.attr({
          cx: _data?.rightBottom.x,
          cy: _data.rightBottom.y,
        });
        this.updateOutlineCoordinateText(
          "rightBottom",
          RightBottomTextEle,
          _data?.rightBottom.x,
          _data?.rightBottom.y
        );
        // 移动左下角点
        LeftBottomPointEle.attr({
          cx: _data?.leftBottom.x,
          cy: _data?.leftBottom.y,
        });
        this.updateOutlineCoordinateText(
          "leftBottom",
          LeftBottomTextEle,
          _data?.leftBottom.x,
          _data?.leftBottom.y
        );
      },
      (x: number, y: number, event: any) => {
        _dragStartCallback();
      },
      (x: number, y: number, event: any) => {
        _dragEndCallback();
        // 回调
        const _data = MainEle.data();
        callback && callback(_data);
      }
    );
    // 左边点
    LeftPointEle.drag(
      (dx: number, dy: number, x: number, y: number, event: any) => {
        // 整理参数
        let currentMousePoint = this.transformPoint(event);
        const _data = MainEle.data();
        let correctX =
          currentMousePoint.x < _data.rightTop.x
            ? currentMousePoint.x
            : _data.rightTop.x;
        const extremumX = this.viewBoxParams[0];
        correctX = correctX < extremumX ? extremumX : correctX;

        _data.leftTop.x = correctX;
        _data.leftBottom.x = correctX;
        // 调整轮廓
        MainEle.attr({
          x: _data.leftTop.x,
          y: _data.leftTop.y,
          width: Math.abs(_data.rightTop.x - _data.leftTop.x),
          // height: Math.abs(_data.leftBottom.y - _data.leftTop.y)
        }).data(_data);
        // 移动下边点
        BootomPointEle.attr({
          cx: (_data.leftBottom.x + _data?.rightBottom.x) / 2,
        });
        // 移动左边点
        LeftPointEle.attr({
          cx: _data.leftTop.x,
        });
        // 移动上边点
        TopPointEle.attr({
          cx: (_data?.leftTop.x + _data?.rightTop.x) / 2,
        });

        // 移动左下角点
        LeftBottomPointEle.attr({
          cx: _data?.leftBottom.x,
          cy: _data?.leftBottom.y,
        });
        this.updateOutlineCoordinateText(
          "leftBottom",
          LeftBottomTextEle,
          _data?.leftBottom.x,
          _data?.leftBottom.y
        );
        // 移动左上角点
        LeftTopPointEle.attr({
          cx: _data?.leftTop.x,
          cy: _data.leftTop.y,
        });
        this.updateOutlineCoordinateText(
          "leftTop",
          LeftTopTextEle,
          _data?.leftTop.x,
          _data?.leftTop.y
        );
      },
      (x: number, y: number, event: any) => {
        _dragStartCallback();
      },
      (x: number, y: number, event: any) => {
        _dragEndCallback();
        // 回调
        const _data = MainEle.data();
        callback && callback(_data);
      }
    );
    // 绑定顶点移动事件
    /**
     * onmove
     * onstart
     * onend
     */
    // 左上点
    LeftTopPointEle.drag(
      (dx: number, dy: number, x: number, y: number, event: any) => {
        // 整理参数
        let currentMousePoint = this.transformPoint(event);
        const _data = MainEle.data();
        let correctX =
          currentMousePoint.x < _data.rightBottom.x
            ? currentMousePoint.x
            : _data.rightBottom.x;
        let correctY =
          currentMousePoint.y < _data.rightBottom.y
            ? currentMousePoint.y
            : _data.rightBottom.y;
        const extremumX = this.viewBoxParams[0];
        correctX = correctX < extremumX ? extremumX : correctX;
        const extremumY = this.viewBoxParams[1];
        correctY = correctY < extremumY ? extremumY : correctY;

        _data.leftTop.x = correctX;
        _data.leftTop.y = correctY;
        _data.rightTop.y = correctY;
        _data.leftBottom.x = correctX;
        // 调整轮廓
        MainEle.attr({
          x: _data.leftTop.x,
          y: _data.leftTop.y,
          width: Math.abs(_data.rightTop.x - _data.leftTop.x),
          height: Math.abs(_data.leftBottom.y - _data.leftTop.y),
        }).data(_data);
        // 移动上边点
        TopPointEle.attr({
          cx: (_data?.leftTop.x + _data?.rightTop.x) / 2,
          cy: _data.leftTop.y,
        });
        // 移动右边点
        RightPointEle.attr({
          cy: (_data?.rightTop.y + _data?.rightBottom.y) / 2,
        });
        // 移动下边点
        BootomPointEle.attr({
          cx: (_data.leftBottom.x + _data?.rightBottom.x) / 2,
        });
        // 移动左边点
        LeftPointEle.attr({
          cx: _data?.leftTop.x,
          cy: (_data?.leftTop.y + _data?.leftBottom.y) / 2,
        });

        // 移动左上角点
        LeftTopPointEle.attr({
          cx: _data?.leftTop.x,
          cy: _data.leftTop.y,
        });
        this.updateOutlineCoordinateText(
          "leftTop",
          LeftTopTextEle,
          _data?.leftTop.x,
          _data?.leftTop.y
        );
        // 移动右上角点
        RightTopPointEle.attr({
          cx: _data?.rightTop.x,
          cy: _data?.rightTop.y,
        });
        this.updateOutlineCoordinateText(
          "rightTop",
          RightTopTextEle,
          _data?.rightTop.x,
          _data?.rightTop.y
        );
        // 移动左下角点
        LeftBottomPointEle.attr({
          cx: _data?.leftBottom.x,
          cy: _data?.leftBottom.y,
        });
        this.updateOutlineCoordinateText(
          "leftBottom",
          LeftBottomTextEle,
          _data?.leftBottom.x,
          _data?.leftBottom.y
        );
      },
      (x: number, y: number, event: any) => {
        _dragStartCallback();
      },
      (x: number, y: number, event: any) => {
        _dragEndCallback();
        // 回调
        const _data = MainEle.data();
        callback && callback(_data);
      }
    );
    // 右上点
    RightTopPointEle.drag(
      (dx: number, dy: number, x: number, y: number, event: any) => {
        // 整理参数
        let currentMousePoint = this.transformPoint(event);
        const _data = MainEle.data();
        let correctX =
          currentMousePoint.x > _data.leftTop.x
            ? currentMousePoint.x
            : _data.leftTop.x;
        let correctY =
          currentMousePoint.y < _data.leftBottom.y
            ? currentMousePoint.y
            : _data.leftBottom.y;
        const extremumX = this.viewBoxParams[0] + this.viewBoxParams[2];
        correctX = correctX > extremumX ? extremumX : correctX;
        const extremumY = this.viewBoxParams[1];
        correctY = correctY < extremumY ? extremumY : correctY;

        _data.rightTop.x = correctX;
        _data.rightTop.y = correctY;
        _data.leftTop.y = correctY;
        _data.rightBottom.x = correctX;
        // 调整轮廓
        MainEle.attr({
          x: _data.leftTop.x,
          y: _data.leftTop.y,
          width: Math.abs(_data.rightTop.x - _data.leftTop.x),
          height: Math.abs(_data.leftBottom.y - _data.leftTop.y),
        }).data(_data);
        // 移动上边点
        TopPointEle.attr({
          cx: (_data?.leftTop.x + _data?.rightTop.x) / 2,
          cy: _data.leftTop.y,
        });
        // 移动右边点
        RightPointEle.attr({
          cx: _data?.rightTop.x,
          cy: (_data?.rightTop.y + _data?.rightBottom.y) / 2,
        });
        // 移动下边点
        BootomPointEle.attr({
          cx: (_data.leftBottom.x + _data?.rightBottom.x) / 2,
        });
        // 移动左边点
        LeftPointEle.attr({
          cy: (_data?.leftTop.y + _data?.leftBottom.y) / 2,
        });

        // 移动右上角点
        RightTopPointEle.attr({
          cx: _data?.rightTop.x,
          cy: _data?.rightTop.y,
        });
        this.updateOutlineCoordinateText(
          "rightTop",
          RightTopTextEle,
          _data?.rightTop.x,
          _data?.rightTop.y
        );
        // 移动左上角点
        LeftTopPointEle.attr({
          cx: _data?.leftTop.x,
          cy: _data.leftTop.y,
        });
        this.updateOutlineCoordinateText(
          "leftTop",
          LeftTopTextEle,
          _data?.leftTop.x,
          _data?.leftTop.y
        );
        // 移动右下角点
        RightBottomPointEle.attr({
          cx: _data?.rightBottom.x,
          cy: _data?.rightBottom.y,
        });
        this.updateOutlineCoordinateText(
          "rightBottom",
          RightBottomTextEle,
          _data?.rightBottom.x,
          _data?.rightBottom.y
        );
      },
      (x: number, y: number, event: any) => {
        _dragStartCallback();
      },
      (x: number, y: number, event: any) => {
        _dragEndCallback();
        // 回调
        const _data = MainEle.data();
        callback && callback(_data);
      }
    );
    // 右下点
    RightBottomPointEle.drag(
      (dx: number, dy: number, x: number, y: number, event: any) => {
        // 整理参数
        let currentMousePoint = this.transformPoint(event);
        const _data = MainEle.data();
        let correctX =
          currentMousePoint.x > _data.leftTop.x
            ? currentMousePoint.x
            : _data.leftTop.x;
        let correctY =
          currentMousePoint.y > _data.leftTop.y
            ? currentMousePoint.y
            : _data.leftTop.y;
        const extremumX = this.viewBoxParams[0] + this.viewBoxParams[2];
        correctX = correctX > extremumX ? extremumX : correctX;
        const extremumY = this.viewBoxParams[1] + this.viewBoxParams[3];
        correctY = correctY > extremumY ? extremumY : correctY;

        _data.rightBottom.x = correctX;
        _data.rightBottom.y = correctY;
        _data.leftBottom.y = correctY;
        _data.rightTop.x = correctX;
        // 调整轮廓
        MainEle.attr({
          x: _data.leftTop.x,
          y: _data.leftTop.y,
          width: Math.abs(_data.rightTop.x - _data.leftTop.x),
          height: Math.abs(_data.leftBottom.y - _data.leftTop.y),
        }).data(_data);
        // 移动上边点
        TopPointEle.attr({
          cx: (_data?.leftTop.x + _data?.rightTop.x) / 2,
        });
        // 移动右边点
        RightPointEle.attr({
          cx: _data?.rightTop.x,
          cy: (_data?.rightTop.y + _data?.rightBottom.y) / 2,
        });
        // 移动下边点
        BootomPointEle.attr({
          cx: (_data.leftBottom.x + _data?.rightBottom.x) / 2,
          cy: _data.leftBottom.y,
        });
        // 移动左边点
        LeftPointEle.attr({
          cy: (_data?.leftTop.y + _data?.leftBottom.y) / 2,
        });

        // 移动右上角点
        RightTopPointEle.attr({
          cx: _data?.rightTop.x,
          cy: _data?.rightTop.y,
        });
        this.updateOutlineCoordinateText(
          "rightTop",
          RightTopTextEle,
          _data?.rightTop.x,
          _data?.rightTop.y
        );
        // 移动右下角点
        RightBottomPointEle.attr({
          cx: _data?.rightBottom.x,
          cy: _data?.rightBottom.y,
        });
        this.updateOutlineCoordinateText(
          "rightBottom",
          RightBottomTextEle,
          _data?.rightBottom.x,
          _data?.rightBottom.y
        );
        // 移动左下角点
        LeftBottomPointEle.attr({
          cx: _data?.leftBottom.x,
          cy: _data.leftBottom.y,
        });
        this.updateOutlineCoordinateText(
          "leftBottom",
          LeftBottomTextEle,
          _data?.leftBottom.x,
          _data?.leftBottom.y
        );
      },
      (x: number, y: number, event: any) => {
        _dragStartCallback();
      },
      (x: number, y: number, event: any) => {
        _dragEndCallback();
        // 回调
        const _data = MainEle.data();
        callback && callback(_data);
      }
    );
    // 左下点
    LeftBottomPointEle.drag(
      (dx: number, dy: number, x: number, y: number, event: any) => {
        // 整理参数
        let currentMousePoint = this.transformPoint(event);
        const _data = MainEle.data();
        let correctX =
          currentMousePoint.x < _data.rightTop.x
            ? currentMousePoint.x
            : _data.rightTop.x;
        let correctY =
          currentMousePoint.y > _data.rightTop.y
            ? currentMousePoint.y
            : _data.rightTop.y;
        const extremumX = this.viewBoxParams[0];
        correctX = correctX < extremumX ? extremumX : correctX;
        const extremumY = this.viewBoxParams[1] + this.viewBoxParams[3];
        correctY = correctY > extremumY ? extremumY : correctY;

        _data.leftBottom.x = correctX;
        _data.leftBottom.y = correctY;
        _data.rightBottom.y = correctY;
        _data.leftTop.x = correctX;
        // 调整轮廓
        MainEle.attr({
          x: _data.leftTop.x,
          y: _data.leftTop.y,
          width: Math.abs(_data.rightTop.x - _data.leftTop.x),
          height: Math.abs(_data.leftBottom.y - _data.leftTop.y),
        }).data(_data);
        // 移动上边点
        TopPointEle.attr({
          cx: (_data?.leftTop.x + _data?.rightTop.x) / 2,
        });
        // 移动右边点
        RightPointEle.attr({
          cy: (_data?.rightTop.y + _data?.rightBottom.y) / 2,
        });
        // 移动下边点
        BootomPointEle.attr({
          cx: (_data.leftBottom.x + _data?.rightBottom.x) / 2,
          cy: _data.leftBottom.y,
        });
        // 移动左边点
        LeftPointEle.attr({
          cx: _data.leftBottom.x,
          cy: (_data?.leftTop.y + _data?.leftBottom.y) / 2,
        });

        // 移动右下角点
        RightBottomPointEle.attr({
          cx: _data?.rightBottom.x,
          cy: _data?.rightBottom.y,
        });
        this.updateOutlineCoordinateText(
          "rightBottom",
          RightBottomTextEle,
          _data?.rightBottom.x,
          _data?.rightBottom.y
        );
        // 移动左下角点
        LeftBottomPointEle.attr({
          cx: _data?.leftBottom.x,
          cy: _data.leftBottom.y,
        });
        this.updateOutlineCoordinateText(
          "leftBottom",
          LeftBottomTextEle,
          _data?.leftBottom.x,
          _data?.leftBottom.y
        );
        // 移动左上角点
        LeftTopPointEle.attr({
          cx: _data?.leftTop.x,
          cy: _data?.leftTop.y,
        });
        this.updateOutlineCoordinateText(
          "leftTop",
          LeftTopTextEle,
          _data?.leftTop.x,
          _data?.leftTop.y
        );
      },
      (x: number, y: number, event: any) => {
        _dragStartCallback();
      },
      (x: number, y: number, event: any) => {
        _dragEndCallback();
        // 回调
        const _data = MainEle.data();
        callback && callback(_data);
      }
    );
  };
  private unbindRectOutlineMoveEvents = (elesObj: any) => {
    const noCursor = (e: any) => {
      e.target.style.cursor = "default";
    };
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
    TopPointEle && TopPointEle.unmousemove(noCursor);
    RightPointEle && RightPointEle.unmousemove(noCursor);
    BootomPointEle && BootomPointEle.unmousemove(noCursor);
    LeftPointEle && LeftPointEle.unmousemove(noCursor);
    LeftTopPointEle && LeftTopPointEle.unmousemove(noCursor);
    RightTopPointEle && RightTopPointEle.unmousemove(noCursor);
    RightBottomPointEle && RightBottomPointEle.unmousemove(noCursor);
    LeftBottomPointEle && LeftBottomPointEle.unmousemove(noCursor);

    TopPointEle && TopPointEle.undrag();
    RightPointEle && RightPointEle.undrag();
    BootomPointEle && BootomPointEle.undrag();
    LeftPointEle && LeftPointEle.undrag();
    LeftTopPointEle && LeftTopPointEle.undrag();
    RightTopPointEle && RightTopPointEle.undrag();
    RightBottomPointEle && RightBottomPointEle.undrag();
    LeftBottomPointEle && LeftBottomPointEle.undrag();
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
        rectBBox,
        dragStartCallback,
        dragEndCallback,
        areaChangeCallback,
        mainColor,
        bgColor,
      } = params;
      this.elementRendered.area.objObj.draw = this.renderAreaRect({
        ltx: rectBBox.x, // 左上坐标X
        lty: rectBBox.y, // 左上坐标Y
        rtx: rectBBox.x2, // 右上坐标X
        rty: rectBBox.y, // 右上坐标Y
        rbx: rectBBox.x2, // 右下坐标X
        rby: rectBBox.y2, // 右下坐标Y
        lbx: rectBBox.x, // 左下坐标X
        lby: rectBBox.y2, // 左下坐标Y
        pointRadius: 5,
        borderSize: 2,
        mainColor: mainColor,
        bgColor: bgColor,
      });
      const left = this.getRealCoordiateX(rectBBox.x),
        right = this.getRealCoordiateX(rectBBox.x2),
        top = this.getRealCoordiateY(rectBBox.y),
        bottom = this.getRealCoordiateY(rectBBox.y2);
      // 创建轮廓值输入代理
      this.outlineData.drawOutline = {
        left,
        right,
        bottom,
        top,
        width: right - left,
        height: top - bottom,
      };

      this.bindRectOutlineMoveEvents({
        elesObj: this.elementRendered.area.objObj.draw,
        callback: areaChangeCallback,
        dragStartCallback: dragStartCallback,
        dragEndCallback: dragEndCallback,
      });
      // 执行回调
      if (areaChangeCallback) {
        areaChangeCallback({
          leftTop: { x: left, y: top },
          rightTop: { x: right, y: top },
          rightBottom: { x: right, y: bottom },
          leftBottom: { x: left, y: bottom },
        });
      }
    };
    const cancelRectDrawMouseSelectRect = () => {
      rectDraw_mouseSelectRectEle?.remove();
      rectDraw_mouseSelectRectEle = null;
      if (this.elementRendered.area.objObj.draw) {
        Object.values(this.elementRendered.area.objObj.draw).forEach(
          (ele: any) => {
            ele?.remove();
          }
        );
        this.elementRendered.area.objObj.draw = undefined;
      }
    };
    // 鼠标按下
    const rectDrawMousedown = (e: any) => {
      rectDraw_mouseDown = true;
      cancelRectDrawMouseSelectRect();
      rectDraw_mousedownStartPoint = this.transformPoint(e);
      rectDraw_mouseSelectRectEle = this.initMouseSelectRect(
        rectDraw_mousedownStartPoint,
        rectDraw_selectRectColor,
        2
      );
    };
    // 鼠标移动
    const rectDrawMousemove = (e: any) => {
      if (rectDraw_mouseDown) {
        rectDraw_mousedownEndPoint = this.transformPoint(e);
        this.updateMouseSelectRect(
          rectDraw_mouseSelectRectEle,
          rectDraw_mousedownStartPoint,
          rectDraw_mousedownEndPoint
        );
      }
    };
    // 鼠标弹起
    const rectDrawMouseup = () => {
      rectDraw_mouseDown = false;
      // 生成绘制后的矩形，绑定矩形范围拖动事件
      const _rectBBox = rectDraw_mouseSelectRectEle.getBBox();
      cancelRectDrawMouseSelectRect();
      // 绘制完成，创建控制元素
      createRectDrawControl({
        rectBBox: _rectBBox,
        dragStartCallback: unbindRectDrawEvent,
        dragEndCallback: bindRectDrawEvent,
        areaChangeCallback: this._eventHook.areaDraw,
        mainColor: rectDraw_selectRectColor,
        bgColor: rectDraw_selectRectBgColor,
      });
    };

    const bindRectDrawEvent = () => {
      this.paper?.canvas?.addEventListener(
        "mousedown",
        rectDrawMousedown,
        false
      );
      this.paper?.canvas?.addEventListener(
        "mousemove",
        rectDrawMousemove,
        false
      );
      this.paper?.canvas?.addEventListener("mouseup", rectDrawMouseup, false);
      this.paper?.canvas?.addEventListener(
        "touchstart",
        rectDrawMousedown,
        false
      );
      this.paper?.canvas?.addEventListener(
        "touchmove",
        rectDrawMousemove,
        false
      );
      this.paper?.canvas?.addEventListener("touchend", rectDrawMouseup, false);
    };
    const unbindRectDrawEvent = () => {
      this.paper?.canvas?.removeEventListener(
        "mousedown",
        rectDrawMousedown,
        false
      );
      this.paper?.canvas?.removeEventListener(
        "mousemove",
        rectDrawMousemove,
        false
      );
      this.paper?.canvas?.removeEventListener(
        "mouseup",
        rectDrawMouseup,
        false
      );
      this.paper?.canvas?.removeEventListener(
        "touchstart",
        rectDrawMousedown,
        false
      );
      this.paper?.canvas?.removeEventListener(
        "touchmove",
        rectDrawMousemove,
        false
      );
      this.paper?.canvas?.removeEventListener(
        "touchend",
        rectDrawMouseup,
        false
      );
    };

    if (rectDraw_currentAreaId) {
      // 传入了区域ID，查询当前是否有渲染了这个区域
      if (this.elementRendered.area.mapObj.rule.has(rectDraw_currentAreaId)) {
        // 有，则获取关键数据并清除这组元素
        const _areaMain = this.elementRendered.area.mapObj.rule.get(
          rectDraw_currentAreaId
        );
        const _areaBBox = _areaMain?.getBBox();
        // 清除这个规则区域下的所有元素
        Object.keys(this.elementConfig.Area.mapKeySuffix.rule).forEach(
          (key: string) => {
            const currentKey = rectDraw_currentAreaId + key;
            if (this.elementRendered.area.mapObj.rule.has(currentKey)) {
              this.elementRendered.area.mapObj.rule.get(currentKey).reomve();
            }
          }
        );
        createRectDrawControl({
          rectBBox: _areaBBox,
          dragStartCallback: unbindRectDrawEvent,
          dragEndCallback: bindRectDrawEvent,
          areaChangeCallback: this._eventHook.areaDraw,
          mainColor: rectDraw_selectRectColor,
          bgColor: rectDraw_selectRectBgColor,
        });
      }
    }
    // 禁用panzoom
    this.panzoom.pause();
    // 绑定绘制事件
    bindRectDrawEvent();

    // 保存取消事件
    this._unbindRectDrawEvent = () => {
      // 解禁panzoom
      this.panzoom.resume();
      unbindRectDrawEvent();
      cancelRectDrawMouseSelectRect();
    };
  }
  private areaDrawEventUnbind(callback: any = undefined) {
    this._unbindRectDrawEvent && this._unbindRectDrawEvent();
    callback && callback();
  }
  /**
   * 矩形区域绘制事件
   * end
   */

  /**
   * VNL轮廓用户可移动调节事件
   * start
   */
  public vnlOutlineMoveEventBind = (callback: any = undefined) => {
    // 不渲染VNL文件轮廓的话就不绑定事件
    if (!this._renderSwitch.vnlOutline) return;

    // 修改轮廓参数
    const updateVnlFileOutlineCoordiate = (coordinateData: IRectPoints) => {
      this._outlineData.vnlOutline.left = coordinateData?.leftTop.x;
      this._outlineData.vnlOutline.right = coordinateData?.rightBottom.x;
      this._outlineData.vnlOutline.top = coordinateData?.leftTop.y;
      this._outlineData.vnlOutline.bottom = coordinateData?.rightBottom.y;
      this._outlineData.vnlOutline.width =
        coordinateData?.rightBottom.x - coordinateData?.leftTop.x;
      this._outlineData.vnlOutline.height =
        coordinateData?.rightBottom.y - coordinateData?.leftTop.y;
    };
    // 内置回调
    const _innerCallback = (coordinateData: IRectPoints) => {
      updateVnlFileOutlineCoordiate(coordinateData);
      // 需要转换为真实坐标
      callback &&
        callback({
          leftTopCoordiate: {
            x: this.getRealCoordiateX(coordinateData?.leftTop.x),
            y: this.getRealCoordiateY(coordinateData?.leftTop.y),
          },
          rightTopCoordiate: {
            x: this.getRealCoordiateX(coordinateData?.rightTop.x),
            y: this.getRealCoordiateY(coordinateData?.rightTop.y),
          },
          rightBottomCoordiate: {
            x: this.getRealCoordiateX(coordinateData?.rightBottom.x),
            y: this.getRealCoordiateY(coordinateData?.rightBottom.y),
          },
          leftBottomCoordiate: {
            x: this.getRealCoordiateX(coordinateData?.leftBottom.x),
            y: this.getRealCoordiateY(coordinateData?.leftBottom.y),
          },
        });
    };
    this.bindRectOutlineMoveEvents({
      elesObj: this.vnlOutlineData,
      callback: _innerCallback,
      dragStartCallback: () => {
        this.panzoom.pause();
      },
      dragEndCallback: () => {
        this.panzoom.resume();
      },
    });
  };
  public vnlOutlineMoveEventUnbind = (callback: any = undefined) => {
    this.unbindRectOutlineMoveEvents(this.vnlOutlineData);
    callback && callback();
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
    const mousehoverCoordiateEvent = (e: any) => {
      const currentPoint = this.transformPoint(e);
      currentPoint.x = this.getRealCoordiateX(currentPoint.x || 0);
      currentPoint.y = this.getRealCoordiateY(currentPoint.y || 0);
      this._eventHook.mouseCoordiate(currentPoint);
    };
    this.paper?.canvas?.addEventListener(
      "mousemove",
      mousehoverCoordiateEvent,
      false
    );
    this._unbindMousehoverCoordiate = () => {
      this.paper?.canvas?.removeEventListener(
        "mousemove",
        mousehoverCoordiateEvent,
        false
      );
    };
  }
  private mousehoverCoordiateUnbind(callback: any = undefined) {
    this._unbindMousehoverCoordiate();
    callback && callback();
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
    this.paper?.canvas?.addEventListener(
      "mousehover",
      this.setCursorGrab,
      false
    );
    this.paper?.canvas?.addEventListener(
      "mousedown",
      this.setCursorGrabing,
      false
    );
    this.paper?.canvas?.addEventListener("mouseup", this.setCursorGrab, false);
    window.addEventListener("keydown", this.setCursorCrosshair, false);
    window.addEventListener("keyup", this.setCursorGrab, false);
  };
  // 绑定/解绑事件用的方法
  private setCursorGrab = (e: any) => {
    if (this.paper?.canvas) this.paper.canvas.style.cursor = "grab";
  };
  private setCursorGrabing = (e: any) => {
    if (this.paper?.canvas) this.paper.canvas.style.cursor = "grabbing";
  };
  private setCursorCrosshair = (e: any) => {
    if (this.paper?.canvas) this.paper.canvas.style.cursor = "crosshair";
  };
  // 解绑鼠标样式变化事件
  private unbindMouseCursorChangeEvent = () => {
    this.paper?.canvas?.removeEventListener(
      "mousehover",
      this.setCursorGrab,
      false
    );
    this.paper?.canvas?.removeEventListener(
      "mousedown",
      this.setCursorGrabing,
      false
    );
    this.paper?.canvas?.removeEventListener(
      "mouseup",
      this.setCursorGrab,
      false
    );
    window.removeEventListener("keydown", this.setCursorCrosshair, false);
    window.removeEventListener("keyup", this.setCursorGrab, false);
  };
  /**
   * 绑定/解绑鼠标图标变更事件
   * end
   */

  /*
   * 1 清除事件绑定，
   *   渲染新地图，在SVG父辈上绑定的事件都要清除重新绑定
   * 2 执行父类的 dispose
   */
  public dispose() {
    // 清除事件数据
    Object.assign(this._eventSwitch, this._eventSwitchInit);
    super.dispose();
  }
}
