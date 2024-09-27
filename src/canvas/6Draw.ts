import * as PIXI from "pixi.js";
import Events from "./5Events";
import { IPoint, IDraw, IParkData, INumToId, ILineData } from "./Interface";
import DRAW_IMGS from "../images/drawBase64";

export default class Draw extends Events {
  /**
   * 绘制图层
   */
  constructor() {
    super();
    // 绘制图层
    this.elementRendered.draw.container.zIndex =
      this.elementConfig.draw.zIndex.container;
    this.mainContainer.addChild(this.elementRendered.draw.container);

    this.elementRendered.draw.containerObj.point.zIndex =
      this.elementConfig.draw.zIndex.point;
    this.elementRendered.draw.container.addChild(
      this.elementRendered.draw.containerObj.point
    );
    this.elementRendered.draw.containerObj.line.zIndex =
      this.elementConfig.draw.zIndex.line;
    this.elementRendered.draw.container.addChild(
      this.elementRendered.draw.containerObj.line
    );
  }

  // 绘制物渲染数据
  private _drawRenderedInit: IDraw = {
    dots: [] as IPoint[], // 多个打点
    lines: [] as ILineData[], // 多个线段
  };
  protected _drawRendered: IDraw = Object.assign({}, this._drawRenderedInit);
  /**
   * 初始化绘制物标识渲染
   */
  protected _initDrawRendered() {
    this._drawRendered = Object.assign({}, this._drawRenderedInit);
  }

  /**
   * 绘制的元素事件回调
   */
  protected _drawHook = {
    dotSelect: (currentPoint: IPoint, selectedPoints: IPoint[]) => {},
    lineDrag: (lineData: ILineData) => {},
    lineSelect: (currentLineId: string, selectedLineIds: string[]) => {},
  };
  public drawHook = new Proxy(this._drawHook, {
    set: (target: any, prop: string, value: any) => {
      if (typeof value === "function") {
        target[prop] = value;
      }
      return true;
    },
  });

  /**
   * 获取点位唯一标识
   */
  private getPointKey(x: number, y: number) {
    return `${x},${y}`;
  }
  /**
   * 设置一个打点
   * @param point
   */
  public setDot(point: IPoint) {
    if (!this._renderSwitch.completed || !this.app || !point.id) return null;

    const id = String(point.id);
    // 判断是否已经存在
    if (this.elementRendered.draw.mapObj.point.has(id)) return null;

    const realX = point.x;
    const realY = point.y;

    // 转换为地图坐标系
    const x = this.getMapCoordiateX(realX);
    const y = this.getMapCoordiateY(realY);
    // 创建打点元素
    const dot: PIXI.Graphics = new PIXI.Graphics();
    dot.circle(0, 0, this.elementConfig.draw.size.point);
    dot.fill(this.elementConfig.draw.color.point);
    dot.pivot.set(0.5);
    dot.position.set(x, y);
    // 添加到绘制图层
    this.elementRendered.draw.mapObj.pointData.set(id, point);
    this.elementRendered.draw.mapObj.point.set(id, dot);
    this.elementRendered.draw.containerObj.point.addChild(dot);
    // 绑定点击事件
    dot.eventMode = "static";
    dot.on("pointerover", () => {
      dot.cursor = "pointer";
    });
    dot.on("pointerup", () => {
      const selectedPoints: IPoint[] = Array.from(
        this.elementRendered.draw.mapObj.pointSelected.keys()
      ).map((pointId: string) => {
        const pointData =
          this.elementRendered.draw.mapObj.pointData.get(pointId);
        return pointData;
      });

      this._drawHook.dotSelect(
        {
          id,
          key: this.getPointKey(realX, realY),
          x: realX,
          y: realY,
        },
        selectedPoints
      );
    });
    // 生成唯一标识
    const key = this.getPointKey(point.x, point.y);
    point.key = key;
    return point;
  }

  /**
   * 设置多个打点信息
   * @param points
   * @returns
   */
  public setDots(points: IPoint[]) {
    const dots: IPoint[] = [];
    if (!points || !Array.isArray(points)) return dots;
    points.forEach((point: IPoint) => {
      const dot = this.setDot(point);
      if (dot) dots.push(dot);
    });
    return dots;
  }

  /**
   * 移除一个打点
   * @param id
   * @returns
   */
  public removeDot(id: string) {
    if (!this._renderSwitch.completed || !this.app || !id) return;

    id = String(id);
    // 判断是否已经存在
    if (!this.elementRendered.draw.mapObj.point.has(id)) return;
    // 删除打点元素
    const dot: PIXI.Graphics = this.elementRendered.draw.mapObj.point.get(id);
    dot.destroy();
    this.elementRendered.draw.mapObj.point.delete(id);
    this.elementRendered.draw.mapObj.pointData.delete(id);
  }
  /**
   * 移除多个打点
   * @param ids
   * @returns
   */
  public removeDots(ids: string[]) {
    if (!ids || !Array.isArray(ids)) return;
    ids.forEach((id: string) => {
      this.removeDot(id);
    });
  }

  /**
   * 选中一个打点
   * @param id
   * @returns
   */
  public selectDot(id: string) {
    if (!this._renderSwitch.completed || !this.app || !id) return;

    id = String(id);
    // 判断该点是否存在
    if (
      !this.elementRendered.draw.mapObj.point.has(id) ||
      !this.elementRendered.draw.mapObj.pointData.has(id)
    )
      return;
    // 判断该点是否已经被选中
    // 已经被选中，则不执行
    if (this.elementRendered.draw.mapObj.pointSelected.has(id)) return;
    // 未被选中，则选中之
    // 转换为地图坐标系
    const point = this.elementRendered.draw.mapObj.pointData.get(id);
    const x = this.getMapCoordiateX(point.x);
    const y = this.getMapCoordiateY(point.y);
    // 创建container
    const pointSelectedContainer: PIXI.Container = new PIXI.Container();
    pointSelectedContainer.position.set(x, y);
    // 创建打点元素
    const dot: PIXI.Graphics = new PIXI.Graphics();
    dot.circle(0, 0, this.elementConfig.draw.size.point);
    dot.fill(this.elementConfig.draw.color.pointSelected);
    // 创建水滴图标
    const dropSize = 40;
    const dropSprite: PIXI.Sprite = new PIXI.Sprite({
      texture: PIXI.Texture.EMPTY,
      width: dropSize,
      height: dropSize,
    });
    dropSprite.anchor.set(0.5, 0.9);
    dropSprite.position.set(0, 0);
    PIXI.Assets.load(DRAW_IMGS["pointSelected"]).then((img) => {
      dropSprite.texture = img;
    });
    // 创建编号Text
    const pointNo: PIXI.Text = new PIXI.Text({
      text: 1 + this.elementRendered.draw.mapObj.pointSelected.size,
      style: new PIXI.TextStyle({
        align: "center",
        fontSize: 12,
        fill: { color: "#FFF" },
      }),
    });
    pointNo.anchor.set(0.5);
    pointNo.position.set(0, 0 - dropSize / 2);

    // 添加元素
    pointSelectedContainer.addChild(dot);
    pointSelectedContainer.addChild(dropSprite);
    pointSelectedContainer.addChild(pointNo);
    // 添加到绘制图层
    this.elementRendered.draw.mapObj.pointSelected.set(
      id,
      pointSelectedContainer
    );
    this.elementRendered.draw.containerObj.point.addChild(
      pointSelectedContainer
    );
  }
  /**
   * 选中多个打点
   * @param ids
   */
  public selectDots(ids: string[]) {
    if (!ids || !Array.isArray(ids)) return;
    ids.forEach((id: string) => {
      this.selectDot(id);
    });
  }

  /**
   * 取消选中一个打点
   * @param id
   * @returns
   */
  public cancelDot(id: string) {
    if (!this._renderSwitch.completed || !this.app || !id) return;

    id = String(id);
    // 判断该点是否存在
    if (!this.elementRendered.draw.mapObj.point.has(id)) return;
    // 判断该点是否已经被选中
    // 没被选中直接不执行
    if (!this.elementRendered.draw.mapObj.pointSelected.has(id)) return;
    // 有被选中，则取消选中
    const pointSelectedContainer: PIXI.Container =
      this.elementRendered.draw.mapObj.pointSelected.get(id);
    pointSelectedContainer.destroy();
    this.elementRendered.draw.mapObj.pointSelected.delete(id);
  }
  /**
   * 取消选中多个打点
   * @param ids
   */
  public cancelDots(ids: string[]) {
    if (!ids || !Array.isArray(ids)) return;
    ids.forEach((id: string) => {
      this.cancelDot(id);
    });
  }

  /**
   * 移动单个打点
   * 根据point对象上的key字段找到指定点
   * @param point
   * @returns
   */
  public moveDot(point: IPoint) {
    if (!this._renderSwitch.completed || !this.app || !point.id) return;

    const id = String(point.id);
    // 判断该点是否存在
    if (!this.elementRendered.draw.mapObj.point.has(id)) return;
    // 生成新的KEY
    const key = this.getPointKey(point.x, point.y);
    point.key = key;
    // 转换为地图坐标系
    const x = this.getMapCoordiateX(point.x);
    const y = this.getMapCoordiateY(point.y);

    // 移动打点
    const dot: PIXI.Graphics = this.elementRendered.draw.mapObj.point.get(id);
    dot.position.set(x, y);

    if (this.elementRendered.draw.mapObj.pointData.has(id)) {
      const pointData = this.elementRendered.draw.mapObj.pointData.get(id);
      pointData.x = point.x;
      pointData.y = point.y;
      pointData.key = point.key;
    }
    // 移动选中标识（如果有）
    if (this.elementRendered.draw.mapObj.pointSelected.has(id)) {
      const pointSelectedContainer: PIXI.Container =
        this.elementRendered.draw.mapObj.pointSelected.get(id);
      pointSelectedContainer.position.set(x, y);
    }

    return point;
  }

  /**
   * 移动多个打点
   * 根据point对象上的key字段找到指定点
   * @param points
   * @returns
   */
  public moveDots(points: IPoint[]) {
    if (!points || !Array.isArray(points)) return;
    points.forEach((point: IPoint) => {
      this.moveDot(point);
    });
  }

  /**
   * 创建库位
   * @param param ，参数如下
   * 必填参数：
      id: string | number // 原始库位ID
      x: number // 库位中心点坐标X值
      y: number // 库位中心点坐标Y值
      w: number // 库位宽
      l: number // 库位深（又称为长）
      theta?: number
      * 外部系统用角度值的库位朝向，坐标系如下
      *               90度
      *                |
      *                |
      * 180度-180度——— ———— ———→X  0度
      *                |
      *                |
      *                ↓
      *                Y -90度
   * 选填参数：
   * mode: ['1', '2', '4'] 多向库位：单向、双向、四向
   * type：['L', 'P', 'C'] 库位类型：取放货库位、停车库位、充电库位
   *  @returns
   */
  public setPark(param: IParkData) {
    if (!this._renderSwitch.completed || !this.app) return;
    // 校验参数
    if (
      !param.hasOwnProperty("id") ||
      !param.hasOwnProperty("x") ||
      !param.hasOwnProperty("y") ||
      !param.hasOwnProperty("theta") ||
      !param.hasOwnProperty("w") ||
      !param.hasOwnProperty("l")
    )
      return;
    // 组合参数
    const parkParam = {
      id: String(param?.id),
      mode: param?.mode || this._elementKeyReflect.ParkMode.SingleDirection,
      type: param?.type || this._elementKeyReflect.ParkType.Normal,
      pi: this.thetaToPi(param.theta),
      x: param?.x,
      y: param?.y,
      w: param?.w,
      l: param?.l,
      backPathIds: "",
      truckId: 0,
    };
    const parkData: IParkData = this.ParkDataCreateSingle(parkParam);
    // 存储初始化后的数据
    this.elementRendered.Park.mapObj.data.set(parkData.parkId, parkData);
    // 渲染此库位
    this.ParkRenderSingle(parkData);
    // 给此库位绑定事件
    this.eventCondition.addParkEventIds = [parkParam.id];
  }

  /**
   * 创建多个库位
   * @param params param[]
   * param如下
   * 必填参数：
      id: string | number // 原始库位ID
      parkId: string // 库位ID
      x: number // 库位中心点坐标X值
      y: number // 库位中心点坐标Y值
      w: number // 库位宽
      l: number // 库位深（又称为长）
      theta?: number
      * 外部系统用角度值的库位朝向，坐标系如下
      *               90度
      *                |
      *                |
      * 180度-180度——— ———— ———→X  0度
      *                |
      *                |
      *                ↓
      *                Y -90度
   * 选填参数：
   * mode: ['1', '2', '4'] 多向库位：单向、双向、四向
   * type：['L', 'P', 'C'] 库位类型：取放货库位、停车库位、充电库位
   * @returns
   */
  public setParks(params: IParkData[]) {
    if (!params || !Array.isArray(params)) return;
    params.forEach((param: IParkData) => {
      this.setPark(param);
    });
  }

  /**
   * 根据库位ID获取库位数据
   * @param parkId string
   * @returns IParkData
   */
  public getParkData(parkId: string) {
    if (!parkId && !this.elementRendered.Park.mapObj.data.has(parkId))
      return null;
    const parkData: IParkData =
      this.elementRendered.Park.mapObj.data.get(parkId);
    return {
      id: parkData.id,
      parkId: parkData.parkId,
      x: this.getRealCoordiateX(parkData.x),
      y: this.getRealCoordiateY(parkData.y),
      w: parkData.w / this._unitZoom,
      l: parkData.l / this._unitZoom,
      pi: parkData.pi,
      theta: this.piToTheta(parkData.pi),
      mode: parkData.mode,
      type: parkData.type,
    };
  }

  /**
   * 根据多个库位ID获取库位数据
   * @param parkIds
   * @returns IParkData[]
   */
  public getParksData(parkIds: string[]) {
    if (!parkIds || !Array.isArray(parkIds)) return;
    return parkIds.map((parkId: string) => {
      return this.getParkData(parkId);
    });
  }

  /**
   * 根据库位ID删除此库位相关信息
   * @param id
   * @returns
   */
  public removePark(id: string) {
    if (!this._renderSwitch.completed || !this.app || !id) return;
    id = String(id);

    if (this.elementRendered.Park.mapObj.data.has(id)) {
      this.elementRendered.Park.mapObj.data.delete(id);
    }
    if (this.elementRendered.Park.mapObj.selected.has(id)) {
      this.elementRendered.Park.mapObj.selected.delete(id);
    }
    if (this.elementRendered.Park.mapObj.stock.has(id)) {
      this.elementRendered.Park.mapObj.stock.get(id).destroy();
      this.elementRendered.Park.mapObj.stock.delete(id);
    }
    if (this.elementRendered.Park.mapObj.park.has(id)) {
      this.elementRendered.Park.mapObj.park.get(id).destroy();
      this.elementRendered.Park.mapObj.park.delete(id);
    }
    if (this.elementRendered.Park.mapObj.parkId.has(id)) {
      this.elementRendered.Park.mapObj.parkId.get(id).destroy();
      this.elementRendered.Park.mapObj.parkId.delete(id);
    }
    if (this.elementRendered.Park.mapObj.candidate.has(id)) {
      this.elementRendered.Park.mapObj.candidate.get(id).destroy();
      this.elementRendered.Park.mapObj.candidate.delete(id);
    }
    if (this.elementRendered.Park.mapObj.typeTag.has(id)) {
      this.elementRendered.Park.mapObj.typeTag.get(id).destroy();
      this.elementRendered.Park.mapObj.typeTag.delete(id);
    }
    if (this.elementRendered.Park.mapObj.numTag.has(id)) {
      this.elementRendered.Park.mapObj.numTag.get(id).destroy();
      this.elementRendered.Park.mapObj.numTag.delete(id);
    }
    if (this.elementRendered.Park.mapObj.inferTag.has(id)) {
      this.elementRendered.Park.mapObj.inferTag.get(id).destroy();
      this.elementRendered.Park.mapObj.inferTag.delete(id);
    }
    if (this.elementRendered.Park.mapObj.spareTag.has(id)) {
      this.elementRendered.Park.mapObj.spareTag.get(id).destroy();
      this.elementRendered.Park.mapObj.spareTag.delete(id);
    }
  }

  /**
   * 根据库位ID批量删除库位相关信息
   * @param ids
   * @returns
   */
  public removeParks(ids: string[]) {
    if (!ids || !Array.isArray(ids)) return;
    ids.forEach((id: string) => {
      this.removePark(id);
    });
  }

  /**
   * 根据库位ID取消选中库位
   * @param id
   * @returns
   */
  public cancelPark(id: string) {
    if (!this._renderSwitch.completed || !this.app || !id) return;
    this.signParkEmpty(String(id));
  }

  /**
   * 根据库位ID批量取消选中库位
   * @param ids
   * @returns
   */
  public cancelParks(ids: string[]) {
    if (!ids || !Array.isArray(ids)) return;
    ids.forEach((id: string) => {
      this.cancelPark(id);
    });
  }

  /**
   * 调整库位
   * @param param  IParkData
   */
  public adjustPark(param: IParkData) {
    if (!this._renderSwitch.completed || !this.app) return;
    const id = String(param.id || "");
    const parkId = String(param.parkId || "");
    if (!id || !this.elementRendered.Park.mapObj.data.has(id)) return;

    const oldParkData: IParkData =
      this.elementRendered.Park.mapObj.data.get(id);

    const parkParam: IParkData = {
      id: param?.parkId,
      mode: param?.mode || this._elementKeyReflect.ParkMode.SingleDirection,
      type: param?.type || this._elementKeyReflect.ParkType.Normal,
      pi: this.thetaToPi(Number(param.theta)),
      x: Number(param?.x),
      y: Number(param?.y),
      w: Number(param?.w),
      l: Number(param?.l),
      backPathIds: "",
      truckId: 0,
    };
    const parkData: IParkData = this.ParkDataCreateSingle(parkParam);

    // 判断是否需要重绘
    let isRerender = false;
    if (
      oldParkData.w !== parkData.w ||
      oldParkData.l !== parkData.l ||
      oldParkData.mode !== parkData.mode ||
      oldParkData.type !== parkData.type
    )
      isRerender = true;
    // 判断是否需要移动
    let isMove = false;
    if (
      oldParkData.x !== parkData.x ||
      oldParkData.y !== parkData.y ||
      oldParkData.rotate !== parkData.rotate
    )
      isMove = true;
    // 判断库位编号是否变更
    let isChangeId = false;
    if (parkId && id !== parkId) isChangeId = true;

    // 有无货状态容器
    if (this.elementRendered.Park.mapObj.stock.has(id)) {
      const parkStockGraphics = this.elementRendered.Park.mapObj.stock.get(id);
      if (isRerender) {
        parkStockGraphics.clear();
        parkStockGraphics.rect(0, 0, parkData.l, parkData.w - 20);
        parkStockGraphics.stroke({
          color: this.elementConfig.Park.color.stock,
        });
        parkStockGraphics.fill({ color: this.elementConfig.Park.color.stock });
        parkStockGraphics.pivot.set(0.5, 0.5);
      }
      if (isMove) {
        parkStockGraphics?.position.set(parkData.x, parkData.y);
        parkStockGraphics.rotation = parkData.rotate;
      }
      if (isChangeId) {
        this.elementRendered.Park.mapObj.stock.delete(id);
        this.elementRendered.Park.mapObj.stock.set(parkId, parkStockGraphics);
      }
    }

    // 库位候选状态容器
    if (this.elementRendered.Park.mapObj.candidate.has(id)) {
      const parkCandidateGraphics =
        this.elementRendered.Park.mapObj.candidate.get(id);
      if (isRerender) {
        parkCandidateGraphics.clear();
        parkCandidateGraphics.rect(0, 0, parkData.l - 4, parkData.w - 4);
        parkCandidateGraphics.stroke({
          color: this.elementConfig.Park.color.candidate,
        });
        parkCandidateGraphics.fill({
          color: this.elementConfig.Park.color.candidate,
        });
        parkCandidateGraphics.pivot.set(0.5, 0.5);
      }
      if (isMove) {
        parkCandidateGraphics.position.set(parkData.x, parkData.y);
        parkCandidateGraphics.rotation = parkData.rotate;
      }
      if (isChangeId) {
        this.elementRendered.Park.mapObj.candidate.delete(id);
        this.elementRendered.Park.mapObj.candidate.set(
          parkId,
          parkCandidateGraphics
        );
      }
    }

    // 库位ID容器
    if (this.elementRendered.Park.mapObj.parkId.has(id)) {
      const parkIdText = this.elementRendered.Park.mapObj.parkId.get(id);
      if (isMove) {
        parkIdText.position.set(parkData.tX, parkData.tY);
      }
      if (isChangeId) {
        parkIdText.text = parkId;
        this.elementRendered.Park.mapObj.parkId.delete(id);
        this.elementRendered.Park.mapObj.parkId.set(parkId, parkIdText);
      }
    }

    // 库位图形容器
    if (this.elementRendered.Park.mapObj.park.has(id)) {
      const parkGraphics = this.elementRendered.Park.mapObj.park.get(id);
      if (isRerender) {
        // 判断库位是否被选中
        let isSelected = false;
        if (this.elementRendered.Park.mapObj.selected.has(id))
          isSelected = true;
        parkGraphics.context = this.getParkUniqueTexture(parkData, isSelected);
        parkGraphics.pivot.set(parkData.halfL, parkData.halfW);
      }
      if (isMove) {
        parkGraphics.position.set(parkData.x, parkData.y);
        parkGraphics.rotation = parkData.rotate;
      }
      if (isChangeId) {
        this.elementRendered.Park.mapObj.park.delete(id);
        this.elementRendered.Park.mapObj.park.set(parkId, parkGraphics);
        // 处理被选中的记录数据
        if (this.elementRendered.Park.mapObj.selected.has(id)) {
          this.elementRendered.Park.mapObj.selected.delete(id);
          this.elementRendered.Park.mapObj.selected.set(parkId, parkGraphics);
        }
      }
    }

    // 库位类型容器
    if (this.elementRendered.Park.mapObj.typeTag.has(id)) {
      const parkTypeSprite = this.elementRendered.Park.mapObj.typeTag.get(id);
      if (isRerender) {
        PIXI.Assets.load(ParkImgs[parkData.typeTag]).then((img) => {
          parkTypeSprite.texture = img;
          parkTypeSprite.anchor = 0.5;
        });
      }
      if (isMove) {
        parkTypeSprite.x = parkData.bX;
        parkTypeSprite.y = parkData.bY;
      }
      if (isChangeId) {
        this.elementRendered.Park.mapObj.typeTag.delete(id);
        this.elementRendered.Park.mapObj.typeTag.set(parkId, parkTypeSprite);
      }
    }

    // 库位序号容器
    if (this.elementRendered.Park.mapObj.numTag.has(id)) {
      const numTagText = this.elementRendered.Park.mapObj.numTag.get(id);
      if (isMove) {
        numTagText.x = parkData.lX;
        numTagText.y = parkData.lY;
      }
      if (isChangeId) {
        this.elementRendered.Park.mapObj.numTag.delete(id);
        this.elementRendered.Park.mapObj.numTag.set(parkId, numTagText);
      }
    }

    // 库位类型容器
    if (this.elementRendered.Park.mapObj.inferTag.has(id)) {
      const inferTagSprite = this.elementRendered.Park.mapObj.inferTag.get(id);
      if (isMove) {
        inferTagSprite.x = parkData.rX;
        inferTagSprite.y = parkData.rY;
      }
      if (isChangeId) {
        this.elementRendered.Park.mapObj.inferTag.delete(id);
        this.elementRendered.Park.mapObj.inferTag.set(parkId, inferTagSprite);
      }
    }

    // 库位备用标识信息
    if (this.elementRendered.Park.mapObj.spareTag.has(id)) {
      const spareTagText = this.elementRendered.Park.mapObj.spareTag.get(id);
      if (isMove) {
        spareTagText.position.set(parkData.x, parkData.y);
      }
      if (isChangeId) {
        this.elementRendered.Park.mapObj.spareTag.delete(id);
        this.elementRendered.Park.mapObj.spareTag.set(parkId, spareTagText);
      }
    }

    if (isChangeId) {
      this.elementRendered.Park.mapObj.data.delete(id);
      this.elementRendered.Park.mapObj.data.set(parkId, parkData);
      // 重新绑定事件
      this.eventCondition.removeParkEventIds = [id];
      this.eventCondition.addParkEventIds = [parkId];
    } else {
      this.elementRendered.Park.mapObj.data.set(id, parkData);
    }
  }

  /**
   * 批量调整库位
   * @param params  IParkData[]
   * @returns
   */
  public adjustParks(params: IParkData[]) {
    if (!params || !Array.isArray(params)) return;
    params.forEach((param: IParkData) => {
      this.adjustPark(param);
    });
  }

  /**
   * 绘制直线（临时）
   */
  public drawStraightLine(points: IPoint[]) {
    // 判断是否有多个点
    if (!points || !Array.isArray(points) || points.length < 2) return [];

    // 组装绘制列
    const lineList: ILineData[] = [];
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const x = this.getMapCoordiateX(point.x);
      const y = this.getMapCoordiateY(point.y);
      if (i === 0) {
        lineList[i] = {
          num: i + 1,
          id1: point.id,
          id2: "",
          x1: x,
          y1: y,
          x2: "",
          y2: "",
          radius: 0,
          forward: true,
          information: "",
        };
      } else if (i <= points.length - 2) {
        // 处理上一个点的终点
        lineList[i - 1].x2 = x;
        lineList[i - 1].y2 = y;
        lineList[i - 1].id2 = point.id;
        // 处理下一个点的起点
        lineList[i] = {
          num: i + 1,
          id1: point.id,
          id2: "",
          x1: x,
          y1: y,
          x2: "",
          y2: "",
          radius: 0,
          forward: true,
          information: "",
        };
      } else if (i === points.length - 1) {
        // 处理最后一个终点
        lineList[i - 1].x2 = x;
        lineList[i - 1].y2 = y;
        lineList[i - 1].id2 = point.id;
      }
    }

    // 清除现有临时路线
    this.elementRendered.draw.mapObj.tempLine.forEach(
      (lineGraphics: PIXI.Graphics) => {
        lineGraphics.destroy();
      }
    );
    this.elementRendered.draw.mapObj.tempLine.clear();
    this.elementRendered.draw.mapObj.tempLineData.clear();

    // 开始渲染
    lineList.forEach((lineData) => {
      lineData.cx = (lineData.x1 + lineData.x2) / 2;
      lineData.cy = (lineData.y1 + lineData.y2) / 2;
      lineData.num = String(lineData.num)
      const lineGraphics: PIXI.Graphics = this.drawLine(
        lineData.x1,
        lineData.y1,
        lineData.x2,
        lineData.y2
      );
      this.elementRendered.draw.mapObj.tempLineData.set(lineData.num, lineData);
      this.elementRendered.draw.mapObj.tempLine.set(lineData.num, lineGraphics);
      this.elementRendered.draw.containerObj.line.addChild(lineGraphics);
    });
    return lineList;
  }

  /**
   * 绘制曲线，默认45度圆心角（临时）
   * @param startPoint
   * @param endPoint
   * @returns
   */
  public drawCurveLine(startPoint: IPoint, endPoint: IPoint) {
    // 判断是否有必要数据
    if (
      !startPoint ||
      !endPoint ||
      !Reflect.has(startPoint, "x") ||
      !Reflect.has(startPoint, "y") ||
      !Reflect.has(endPoint, "x") ||
      !Reflect.has(endPoint, "y")
    )
      return;
    // 1 顺时针，radius小于0
    // 2 先算圆半径
    // 3 再算顺时针的圆心坐标

    // 获取必要数据
    const x1 = this.getMapCoordiateX(startPoint.x);
    const y1 = this.getMapCoordiateY(startPoint.y);
    const x2 = this.getMapCoordiateX(endPoint.x);
    const y2 = this.getMapCoordiateY(endPoint.y);
    let sweepFlag = 1; // 1顺时针;0逆时针;

    // 计算半径
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    let radiusABS = distance * Math.sqrt(0.5)
    let radius = sweepFlag === 1 ? -radiusABS : radiusABS; //  1顺时针,半径负值;0逆时针，半径正值；
    let radiusPi = sweepFlag === 1 ? -Math.PI / 2 : Math.PI / 2; // 初始圆心角
    let radiusAngle = 180 * radiusPi / Math.PI;

    // 计算顺时针圆心坐标
    const a = distance / 2;
    let h = Math.sqrt(radiusABS * radiusABS - a * a);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    let offsetX = (h * (y1 - y2)) / distance;
    let offsetY = (h * (x2 - x1)) / distance;
    let cx, cy;
    if (sweepFlag === 1) {
      // 顺时针
      cx = midX + offsetX;
      cy = midY + offsetY;
    } else {
      // 逆时针
      cx = midX - offsetX;
      cy = midY - offsetY;
    }

    // 生成圆弧数据
    const lineData = {
      num: '1',
      id1: startPoint.id,
      id2: endPoint.id,
      x1,
      y1,
      x2,
      y2,
      cx,
      cy,
      radius,
      radiusPi,
      radiusAngle,
      distance,
      forward: true,
      information: "",
    };

    // 清除现有临时路线
    this.elementRendered.draw.mapObj.tempLine.forEach(
      (lineGraphics: PIXI.Graphics) => {
        lineGraphics.destroy();
      }
    );
    this.elementRendered.draw.mapObj.tempLine.clear();
    this.elementRendered.draw.mapObj.tempLineData.clear();

    const lineContainer: PIXI.Container = new PIXI.Container();
    // 绘制初始圆弧
    const lineGraphics: PIXI.Graphics = this.drawLine(x1, y1, x2, y2, radius);
    this.elementRendered.draw.mapObj.tempLineData.set(lineData.num, lineData);
    lineContainer.addChild(lineGraphics);

    // 绘制辅助线路
    // 圆心点
    const circleCenterRadius = 3;
    const circleCenterGraphics: PIXI.Graphics = new PIXI.Graphics();
    circleCenterGraphics.circle(cx, cy, circleCenterRadius);
    circleCenterGraphics.stroke({
      width: 1,
      color: this.elementConfig.draw.color.line,
    });
    circleCenterGraphics.fill({
      color: 0xfff,
      alpha: 0,
    });
    lineContainer.addChild(circleCenterGraphics);

    // 半径线
    const radiusGraphics: PIXI.Graphics = new PIXI.Graphics();
    radiusGraphics.moveTo(x1, y1);
    radiusGraphics.lineTo(cx, cy);
    radiusGraphics.lineTo(x2, y2);
    radiusGraphics.stroke({
      width: 1,
      color: this.elementConfig.draw.color.line,
      alpha: 0.5,
    });
    lineContainer.addChild(radiusGraphics);

    // 添加到绘制图层
    this.elementRendered.draw.mapObj.tempLine.set(lineData.num, lineContainer);
    this.elementRendered.draw.containerObj.line.addChild(lineContainer);


    // 定义线数据代理
    const lineDataProxy = new Proxy(lineData, {
      set: (target, key, value) => {
        let needValue = value;
        switch (key) {
          case "radius":
            needValue = value * this._unitZoom;
            Reflect.set(target, key, needValue);
            this.updateCurveline(
              lineData,
              lineGraphics,
              circleCenterGraphics,
              radiusGraphics
            );
            break;
          case "radiusAngle":
            Reflect.set(target, key, needValue);
            const radiusPi = Math.PI * needValue / 180
            Reflect.set(target, 'radiusPi', radiusPi);
            if (radiusPi < 0) {
              // 顺时针，radius要为负数
              const radius = - a / Math.sin(Math.abs(radiusPi) / 2)
              Reflect.set(target, 'radius', radius);
            } else {
              const radius = a / Math.sin(Math.abs(radiusPi) / 2)
              Reflect.set(target, 'radius', radius);
            }
            this.updateCurveline(
              lineData,
              lineGraphics,
              circleCenterGraphics,
              radiusGraphics
            );
            break
          case "radiusPi":
            Reflect.set(target, key, needValue);
            const radiusAngle = 180 * needValue / Math.PI
            Reflect.set(target, 'radiusAngle', radiusAngle);
            if (needValue < 0) {
              // 顺时针，radius要为负数
              const radius = - a / Math.sin(Math.abs(needValue) / 2)
              Reflect.set(target, 'radius', radius);
            } else {
              const radius = a / Math.sin(Math.abs(needValue) / 2)
              Reflect.set(target, 'radius', radius);
            }
            this.updateCurveline(
              lineData,
              lineGraphics,
              circleCenterGraphics,
              radiusGraphics
            );
            break
        }
        return true;
      },
      get: (target, key) => {
        switch (key) {
          case "x1":
            return this.getRealCoordiateX(lineData.x1);
          case "y1":
            return this.getRealCoordiateY(lineData.y1);
          case "x2":
            return this.getRealCoordiateX(lineData.x2);
          case "y2":
            return this.getRealCoordiateY(lineData.y2);
          case "cx":
            return this.getRealCoordiateX(lineData.cx);
          case "cy":
            return this.getRealCoordiateY(lineData.cy);
          case "radius":
            return lineData.radius / this._unitZoom;
          case "radiusPi":
            return lineData.radiusPi
          case "radiusAngle":
            return lineData.radiusAngle
          case "distance":
            return lineData.distance / this._unitZoom
        }
        return Reflect.get(target, key);
      },
    })

    // 设置圆心操作事件和回调
    const firstH = h
    let firstDistance = 0;
    let firstCross = 0
    const circleCenterPointermoveEvent = (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      const point = event.getLocalPosition(this.mainContainer);
      const currentDistance = Math.sqrt(
        Math.pow(point.x - midX, 2) + Math.pow(point.y - midY, 2)
      );
      // 计算二维交叉积
      // currentCross > 0 左侧，currentCross < 0 右侧，currentCross = 0 平行
      const currentCross = (x2-x1)*(point.y-y1)-(y2-y1)*(point.x-x1)
      sweepFlag = currentCross > 0 ? 1 : 0 // 1顺时针,0逆时针
      // 判断是否转向
      if (currentCross === firstCross) {
        // 同向
        const offsetDistance = currentDistance - firstDistance
        h = firstH + offsetDistance
      } else {
        // 转向
        h = currentDistance
      }
      offsetX = (h * (y1 - y2)) / distance;
      offsetY = (h * (x2 - x1)) / distance;
      if (sweepFlag === 1) {
        // 顺时针
        cx = midX + offsetX;
        cy = midY + offsetY;
      } else {
        // 逆时针
        cx = midX - offsetX;
        cy = midY - offsetY;
      }
      // 计算新的半径
      radiusABS = Math.sqrt(Math.pow(h, 2) + Math.pow(a, 2));
      radius = sweepFlag === 1 ? -1 * radiusABS : radiusABS;
      const radiusPiABS = Math.asin(a / radiusABS) * 2
      // 更新路径数据
      lineData.cx = cx;
      lineData.cy = cy;
      lineData.radius = radius;
      lineData.radiusPi = sweepFlag === 1 ? -radiusPiABS : radiusPiABS
      lineData.radiusAngle = 180 * lineData.radiusPi / Math.PI;
      // 更新元素
      this.updateCurveline(
        lineData,
        lineGraphics,
        circleCenterGraphics,
        radiusGraphics
      );

      // 回调钩子更新
      this._drawHook.lineDrag && this._drawHook.lineDrag(lineDataProxy);
    };
    const circleCenterPointerdownEvent = (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      const point = event.getLocalPosition(this.mainContainer);
      firstDistance = Math.sqrt(
        Math.pow(point.x - midX, 2) + Math.pow(point.y - midY, 2)
      );
      firstCross = (x2-x1)*(point.y-y1)-(y2-y1)*(point.x-x1)
      this.app.stage.on("pointermove", circleCenterPointermoveEvent);
      // 禁用拖动
      this.cancelCanvasPan();
    };
    const circleCenterPointerupEvent = (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      this.app.stage.off("pointermove", circleCenterPointermoveEvent);
      // 重启拖动
      this.openCanvasPan();
    };
    circleCenterGraphics.eventMode = "static";
    circleCenterGraphics.cursor = "pointer";
    circleCenterGraphics.on("pointerdown", circleCenterPointerdownEvent);
    circleCenterGraphics.on("pointerup", circleCenterPointerupEvent);
    circleCenterGraphics.on("pointerupoutside", circleCenterPointerupEvent);

    // 设置圆弧操作事件和回调
    const linePointermoveEvent = (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      const point = event.getLocalPosition(this.mainContainer);
      const currentCenterPoint = this.getCircleCenterBy3Point(
        x1,
        y1,
        point.x,
        point.y,
        x2,
        y2
      )
      cx = currentCenterPoint.x
      cy = currentCenterPoint.y
      h = Math.sqrt(Math.pow(cx - midX, 2) + Math.pow(cy - midY, 2))
      // 计算二维交叉积
      // currentCross > 0 左侧，currentCross < 0 右侧，currentCross = 0 平行
      const currentCross = (x2-x1)*(point.y-y1)-(y2-y1)*(point.x-x1)
      sweepFlag = currentCross > 0 ? 0 : 1 // 1顺时针,0逆时针
      // 计算新的半径
      radiusABS = Math.sqrt(Math.pow(h, 2) + Math.pow(a, 2));
      radius = sweepFlag === 1 ? -1 * radiusABS : radiusABS;
      const radiusPiABS = Math.asin(a / radiusABS) * 2
      // 更新路径数据
      lineData.cx = cx;
      lineData.cy = cy;
      lineData.radius = radius;
      lineData.radiusPi = sweepFlag === 1 ? -radiusPiABS : radiusPiABS
      lineData.radiusAngle = 180 * lineData.radiusPi / Math.PI;
      // 更新元素
      this.updateCurveline(
        lineData,
        lineGraphics,
        circleCenterGraphics,
        radiusGraphics
      );

      // 回调钩子更新
      this._drawHook.lineDrag && this._drawHook.lineDrag(lineDataProxy);
    }
    const linePointerdownEvent = (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      this.app.stage.on("pointermove", linePointermoveEvent);
      // 禁用拖动
      this.cancelCanvasPan();
    }
    const linePointerupEvent = (event: PIXI.FederatedPointerEvent) => {
      event.stopPropagation();
      this.app.stage.off("pointermove", linePointermoveEvent);
      // 重启拖动
      this.openCanvasPan();
    };
    lineGraphics.eventMode = "static";
    lineGraphics.cursor = "pointer";
    lineGraphics.on("pointerdown", linePointerdownEvent);
    lineGraphics.on("pointerup", linePointerupEvent);
    lineGraphics.on("pointerupoutside", linePointerupEvent);


    this._drawHook.lineDrag && this._drawHook.lineDrag(lineDataProxy);

    return lineData
  }

  /**
   * 更新曲线/待调整状态的曲线
   * @param lineData
   * @param lineGraphics
   * @param circleCenterGraphics
   * @param radiusGraphics
   * @returns
   */
  private updateCurveline(
    lineData: ILineData,
    lineGraphics: PIXI.Graphics,
    circleCenterGraphics: PIXI.Graphics,
    radiusGraphics: PIXI.Graphics
  ) {
    if (!lineGraphics) return;
    const { x1, y1, x2, y2, radius } = lineData;
    let cx, cy;
    const radiusABS = Math.abs(radius);
    const sweepFlag = radius < 0 ? 1 : 0; // // 1顺时针;0逆时针;
    const lineAngle = this.lineAngle(x1, y1, x2, y2); // 椭圆方向
    const dx = x2 - x1;
    const dy = y2 - y1;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const a = distance / 2;
    const h = Math.sqrt(radiusABS * radiusABS - a * a);
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    let offsetX = (h * (y1 - y2)) / distance;
    let offsetY = (h * (x2 - x1)) / distance;
    if (sweepFlag === 1) {
      // 顺时针
      cx = midX + offsetX;
      cy = midY + offsetY;
    } else {
      // 逆时针
      cx = midX - offsetX;
      cy = midY - offsetY;
    }

    // 重新绘制曲线
    lineGraphics.clear();
    lineGraphics.moveTo(x1, y1);
    lineGraphics.arcToSvg(
      radiusABS,
      radiusABS,
      lineAngle,
      0,
      sweepFlag,
      x2,
      y2
    );
    lineGraphics.stroke({
      width: this.elementConfig.draw.size.line,
      color: this.elementConfig.draw.color.line,
    });
    if (circleCenterGraphics && radiusGraphics) {
      // 重新绘制圆心
      circleCenterGraphics.clear();
      circleCenterGraphics.circle(cx, cy, 3);
      circleCenterGraphics.stroke({
        width: 1,
        color: this.elementConfig.draw.color.line,
      });
      circleCenterGraphics.fill({
        color: 0xfff,
        alpha: 0,
      });
      // 重新绘制半径线
      radiusGraphics.clear();
      radiusGraphics.moveTo(x1, y1);
      radiusGraphics.lineTo(cx, cy);
      radiusGraphics.lineTo(x2, y2);
      radiusGraphics.stroke({
        width: 1,
        color: this.elementConfig.draw.color.line,
        alpha: 0.5,
      });
    }
  }

  /**
   * 根据线ID获取当前绘制的线的数据
   * @param lineId
   * @returns ILineData
   */
  public getDrawLineData(lineId: string) {
    if (!lineId || (!this.elementRendered.draw.mapObj.tempLineData.has(lineId) && !this.elementRendered.draw.mapObj.lineData.has(lineId))) return {}
    return Object.assign({}, this.elementRendered.draw.mapObj.tempLineData.get(lineId), this.elementRendered.draw.mapObj.lineData.get(lineId))
  }

  /**
   * 绘制一条直线/曲线，并返回该元素对象
   * @param x1
   * @param y1
   * @param x2
   * @param y2
   * @param radius
   * @returns
   */
  private drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    radius: number = 0,
    isSelected: boolean = false
  ) {
    // 判断直线还是曲线
    const lineGraphics: PIXI.Graphics = new PIXI.Graphics();
    lineGraphics.moveTo(x1, y1);
    if (radius === 0) {
      lineGraphics.lineTo(x2, y2);
    } else {
      const radiusABS = Math.abs(radius);
      const lineAngle = this.lineAngle(x1, y1, x2, y2); // 椭圆方向
      const sweepFlag = radius < 0 ? 1 : 0; // 1顺时针;0逆时针;
      lineGraphics.arcToSvg(
        radiusABS,
        radiusABS,
        lineAngle,
        0,
        sweepFlag,
        x2,
        y2
      );
    }
    if (isSelected) {
      lineGraphics.stroke({
        width: this.elementConfig.draw.size.line,
        color: this.elementConfig.draw.color.lineSelected,
      });
    } else {
      lineGraphics.stroke({
        width: this.elementConfig.draw.size.line,
        color: this.elementConfig.draw.color.line,
      });
    }
    return lineGraphics;
  }

  /**
   * 保存直线/曲线
   * @param params INumToId[]
   * {
   *  num: number | string 线的临时编号setLine时会返回
   *  id: number | string 线的唯一ID，用于保存
   * }
   * @param isBindEvent boolean
   * 保存完成之后，是否绑定选择事件，默认绑定
   */
  public saveLine(params: INumToId[], isBindEvent: boolean = true) {
    if (!params || !Array.isArray(params) || params.length <= 0) return;
    params.forEach((param: INumToId) => {
      if (
        param.num &&
        this.elementRendered.draw.mapObj.tempLineData.has(param.num) &&
        this.elementRendered.draw.mapObj.tempLine.has(param.num)
      ) {
        // 转移临时数据
        const lineData = this.elementRendered.draw.mapObj.tempLineData.get(
          param.num
        );
        this.elementRendered.draw.mapObj.tempLineData.delete(param.num);
        param.id = String(param.id)
        lineData.id = param.id;
        this.elementRendered.draw.mapObj.lineData.set(param.id, lineData);
        // 重绘线元素
        const lineElement = this.elementRendered.draw.mapObj.tempLine.get(
          param.num
        );
        lineElement.destroy();
        this.elementRendered.draw.mapObj.tempLine.delete(param.num);

        const lineGraphics: PIXI.Graphics = this.drawLine(
          lineData.x1,
          lineData.y1,
          lineData.x2,
          lineData.y2,
          lineData.radius
        );
        this.elementRendered.draw.mapObj.line.set(param.id, lineGraphics);
        this.elementRendered.draw.containerObj.line.addChild(lineGraphics);

        // 线已经保存成功了，需要绑定可选择事件
        if (isBindEvent) {
          lineGraphics.eventMode = "static";
          lineGraphics.cursor = "pointer";
          lineGraphics.on("pointerdown", () => {
            const selectedLineIds: string[] = Array.from(
              this.elementRendered.draw.mapObj.lineSelected.keys()
            );
            this._drawHook.lineSelect &&
              this._drawHook.lineSelect(String(param.id), selectedLineIds);
          });
        }
      }
    });
  }

  /**
   * 根据绘制方法返回的线编号，移除临时绘制的线
   * @param lineNums
   */
  public unsaveLine(lineNums: string[] = []) {
    if (lineNums && Array.isArray(lineNums) && lineNums.length > 0) {
      // 传了参数，指定数据清除
      lineNums.forEach((lineNum: string) => {
        lineNum = String(lineNum);
        if (
          lineNum &&
          this.elementRendered.draw.mapObj.tempLineData.has(lineNum) &&
          this.elementRendered.draw.mapObj.tempLine.has(lineNum)
        ) {
          this.elementRendered.draw.mapObj.tempLineData.delete(lineNum);
          this.elementRendered.draw.mapObj.tempLine.get(lineNum)?.destroy();
          this.elementRendered.draw.mapObj.tempLine.delete(lineNum);
        }
      });
    } else {
      // 未传参数，全部取消
      this.elementRendered.draw.mapObj.tempLine.forEach((lineElement) => {
        lineElement.destroy();
      });
      this.elementRendered.draw.mapObj.tempLine.clear();
      this.elementRendered.draw.mapObj.tempLineData.clear();
    }
  }

  /**
   * 根据ID选中单挑线
   * @param lineId
   * @returns
   */
  public selectLine(lineId: string) {
    if (!this._renderSwitch.completed || !this.app || !lineId) return;

    lineId = String(lineId);
    // 判断该线是否存在
    if (
      !this.elementRendered.draw.mapObj.line.has(lineId) ||
      !this.elementRendered.draw.mapObj.lineData.has(lineId)
    )
      return;

    // 判断该线是否已被选择
    if (this.elementRendered.draw.mapObj.lineSelected.has(lineId)) return;

    const lineData: ILineData =
      this.elementRendered.draw.mapObj.lineData.get(lineId);

    // 创建container
    const lineSelectedContainer: PIXI.Container = new PIXI.Container();

    const lineGraphics: PIXI.Graphics = this.drawLine(
      lineData.x1,
      lineData.y1,
      lineData.x2,
      lineData.y2,
      lineData.radius,
      true
    );
    lineSelectedContainer.addChild(lineGraphics);

    const midX = (lineData.x1 + lineData.x2) / 2;
    const midY = (lineData.y1 + lineData.y2) / 2;
    // 计算线段中心点
    let cx, cy;
    if (lineData.radius === 0) {
      // 直线
      cx = midX;
      cy = midY;
    } else {
      // 曲线
      const dx = lineData.x2 - lineData.x1;
      const dy = lineData.y2 - lineData.y1;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const radiusABS = Math.abs(lineData.radius);
      const a = distance / 2;
      const b = radiusABS - Math.sqrt(radiusABS * radiusABS - a * a);
      const angle1 = Math.atan2(midY - lineData.y1, midX - lineData.x1);
      const angle2 = angle1 + ((lineData.radius < 0 ? -1 : 1) * b) / a;

      cx = lineData.x1 + a * Math.cos(angle2);
      cy = lineData.y1 + a * Math.sin(angle2);
    }

    const fontSize = 12
    const lineText: PIXI.Text = new PIXI.Text({
      text: 1 + this.elementRendered.draw.mapObj.lineSelected.size,
      style: new PIXI.TextStyle({
        align: "center",
        fontSize: fontSize,
        fill: { color: "#FFF" },
      }),
    });
    lineText.pivot.set(0.5);
    lineText.anchor.set(0.5);
    lineText.position.set(cx, cy);

    const textBounds = lineText.getBounds()
    let bgRadius = textBounds.width <= fontSize ? fontSize : textBounds.width
    bgRadius = 2 + bgRadius / 2
    const bgCircle: PIXI.Graphics = new PIXI.Graphics();
    bgCircle.circle(0, 0, bgRadius);
    bgCircle.fill(this.elementConfig.draw.color.lineSelected);
    bgCircle.pivot.set(0.5);
    bgCircle.position.set(cx, cy);

    lineSelectedContainer.addChild(bgCircle);
    lineSelectedContainer.addChild(lineText);

    // 记录已经选中的线
    this.elementRendered.draw.mapObj.lineSelected.set(
      lineId,
      lineSelectedContainer
    );
    this.elementRendered.draw.containerObj.line.addChild(lineSelectedContainer);
  }

  /**
   * 选中多个线
   * @param ids
   */
  public selectLines(ids: string[]) {
    if (!ids || !Array.isArray(ids)) return;
    ids.forEach((id: string) => {
      this.selectLine(id);
    });
  }

  /**
   * 根据ID取消选中线
   * @param lineId
   * @returns
   */
  public cancelLine(lineId: string) {
    if (!this._renderSwitch.completed || !this.app || !lineId) return;

    lineId = String(lineId);
    // 判断该线是否存在
    if (!this.elementRendered.draw.mapObj.line.has(lineId)) return;

    // 判断该线是否已被选择
    if (!this.elementRendered.draw.mapObj.lineSelected.has(lineId)) return;

    // 取消选中
    this.elementRendered.draw.mapObj.lineSelected.get(lineId)?.destroy();
    this.elementRendered.draw.mapObj.lineSelected.delete(lineId);
  }

  /**
   * 根据ID批量取消选中线
   * @param ids
   * @returns
   */
  public cancelLines(ids: string[]) {
    if (!ids || !Array.isArray(ids)) return;
    ids.forEach((id: string) => {
      this.cancelLine(id);
    });
  }

  /**
   * 根据ID移除已经确定的线
   * @param lineId
   * @returns
   */
  public removeLine(lineId: string) {
    if (!this._renderSwitch.completed || !this.app || !lineId) return;

    lineId = String(lineId);
    // 判断该线是否存在
    if (!this.elementRendered.draw.mapObj.line.has(lineId)) return;
    // 移除线元素
    const lineGraphics = this.elementRendered.draw.mapObj.line.get(lineId)
    lineGraphics.destroy();
    this.elementRendered.draw.mapObj.line.delete(lineId);
    // 移除线数据
    this.elementRendered.draw.mapObj.lineData.delete(lineId);

    // 判断该线是否已被选择
    if (this.elementRendered.draw.mapObj.lineSelected.has(lineId)) {
      const lineSelectedGraphics = this.elementRendered.draw.mapObj.lineSelected.get(lineId)
      lineSelectedGraphics.destroy();
      this.elementRendered.draw.mapObj.lineSelected.delete(lineId);
    }
  }

  /**
   * 批量根据ID移除已经确定的线
   * @param ids
   * @returns
   */
  public removelLines(ids: string[]) {
    if (!ids || !Array.isArray(ids)) return;
    ids.forEach((id: string) => {
      this.removeLine(id);
    });
  }

  /**
   * 单个设置线元素
   * @param lineData
   * @returns
   */
  public setLine(lineData: ILineData, isBindEvent: boolean = true) {
    if (!this._renderSwitch.completed || !this.app || !lineData.id) return;

    let { id, x1, y1, x2, y2, radius } = lineData;
    id = String(id);
    x1 = this.getMapCoordiateX(x1);
    y1 = this.getMapCoordiateY(y1);
    x2 = this.getMapCoordiateX(x2);
    y2 = this.getMapCoordiateY(y2);
    radius = radius * this._unitZoom;
    const lineGraphics: PIXI.Graphics = this.drawLine(x1, y1, x2, y2, radius);
    this.elementRendered.draw.mapObj.line.set(id, lineGraphics);
    this.elementRendered.draw.containerObj.line.addChild(lineGraphics);
    this.elementRendered.draw.mapObj.lineData.set(id, {
      id,
      x1,
      y1,
      x2,
      y2,
      radius,
    });
    // 线已经保存成功了，需要绑定可选择事件
    if (isBindEvent) {
      lineGraphics.eventMode = "static";
      lineGraphics.cursor = "pointer";
      lineGraphics.on("pointerdown", () => {
        const selectedLineIds: string[] = Array.from(
          this.elementRendered.draw.mapObj.lineSelected.keys()
        );
        this._drawHook.lineSelect &&
          this._drawHook.lineSelect(id, selectedLineIds);
      });
    }
  }

  /**
   * 批量设置线元素
   * @param lineDatas
   * @returns
   */
  public setLines(lineDatas: ILineData[]) {
    if (!lineDatas || !Array.isArray(lineDatas)) return;
    lineDatas.forEach((lineData: ILineData) => {
      this.setLine(lineData);
    });
  }
}
