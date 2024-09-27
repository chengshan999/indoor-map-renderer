import * as PIXI from "pixi.js";
import Statics from "./2Statics";
import {
  IOutline,
  IOrderArea,
  IOutlineEleData,
  IParkTag,
  IPoint,
  IRuleArea,
  ITruckArea,
  ITruckPark,
} from "./Interface";
import TRUCK_HEADER from "../images/truckBase64";
import PARK_TAGS from "../images/parkBase64";
import POINT_TAGS from "../images/pointBase64";

export default class Covers extends Statics {
  /**
   * 覆盖层元素图层
   */
  constructor() {
    super();
    // 添加覆盖层图层
    this.elementRendered.covers.container.zIndex =
      this.elementConfig.covers.zIndex.container;
    this.mainContainer.addChild(this.elementRendered.covers.container);
    this.elementRendered.regress.container.zIndex =
      this.elementConfig.regress.zIndex.container;
    this.mainContainer.addChild(this.elementRendered.regress.container);
    // this.elementRendered.candidateRange.container.zIndex = 10
    this.mainContainer.addChild(this.elementRendered.candidateRange.container);
  }
  // 渲染库位标记
  protected renderParksNumTag(
    parkTag: IParkTag[],
    forceRender: boolean = false
  ) {
    // 当前已经展示编号的库位
    let currentParkIds: string[] = Array.from(
      this.elementRendered.Park.mapObj.numTag.keys()
    ).map((id) => String(id));

    // 获取对应的图层
    let parkNumTagContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.numTag;
    parkNumTagContainer.zIndex = this.elementConfig.Park.zIndex.numTag;

    // 定义创建编号标识方法
    const createNewTag = (item: IParkTag) => {
      const parkId = String(item.parkId);
      const tag = String(item.tag);
      // 当前没有标识的才需要去标识
      if (this.elementRendered.Park.mapObj.numTag.has(parkId)) return;
      // 获取数据
      if (this.elementRendered.Park.mapObj.data.has(parkId)) {
        const parkData = this.elementRendered.Park.mapObj.data.get(parkId);
        // 创建编号元素集合
        const numTagStyle = new PIXI.TextStyle({
          align: "center",
          fontSize: 20,
          fontWeight: "bold",
          fill: { color: "#FFFFFF" },
          stroke: { color: "#EB2829", width: 5, join: "round" },
        });
        const numTagText = new PIXI.Text({
          text: tag,
          style: numTagStyle,
        });
        numTagText.x = parkData.lX;
        numTagText.y = parkData.lY;
        // 添加元素到图层
        parkNumTagContainer.addChild(numTagText);
        // 保存当前元素
        this.elementRendered.Park.mapObj.numTag.set(parkId, numTagText);
      }
    };
    // 处理是否渲染
    if (forceRender) {
      // 强制重新渲染
      parkNumTagContainer.removeChildren();
      this.elementRendered.Park.mapObj.numTag.forEach((numTagText) => {
        numTagText.destroy();
      });
      this.elementRendered.Park.mapObj.numTag.clear();
      // 全量重新渲染
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
        if (this.elementRendered.Park.mapObj.numTag.has(parkId)) {
          const numTagText =
            this.elementRendered.Park.mapObj.numTag.get(parkId);
          parkNumTagContainer.removeChild(numTagText);
          numTagText.destroy();
          this.elementRendered.Park.mapObj.numTag.delete(parkId);
        }
      });

      // 对存留标签进行新增/更新
      parkTag.forEach((item: IParkTag) => {
        createNewTag(item);
      });
    }
  }

  // 渲染推断标记
  protected renderParksInferTag(
    parkTag: IParkTag[],
    forceRender: boolean = false
  ) {
    // 获取当前推断结果库位数组
    let currentParkIds: string[] = Array.from(
      this.elementRendered.Park.mapObj.inferTag.keys()
    ).map((id) => String(id));

    // 获取对应的图层
    let parkInferTagContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.inferTag;
    parkInferTagContainer.zIndex = this.elementConfig.Park.zIndex.inferTag;

    const createNewTag = (item: IParkTag) => {
      const parkId = String(item.parkId);
      const tag = String(item.tag);
      let source = "";
      switch (tag) {
        case "1": // success
          source = PARK_TAGS["ok"];
          break;
        case "2": // fail
          source = PARK_TAGS["warn"];
          break;
      }
      const createNewInferTagSprite = () => {
        const parkData = this.elementRendered.Park.mapObj.data.get(parkId);
        if (source && parkData) {
          // 创建推导状态sprite
          PIXI.Assets.load(source).then((inferTagTexture) => {
            const inferTagSprite: PIXI.Sprite = new PIXI.Sprite(
              inferTagTexture
            );
            inferTagSprite.setSize(30);
            inferTagSprite.anchor.set(0.5);
            inferTagSprite.x = parkData.rX;
            inferTagSprite.y = parkData.rY;
            // 添加到库位集合中
            parkInferTagContainer.addChild(inferTagSprite);
            // 保存当前元素
            this.elementRendered.Park.mapObj.inferTag.set(
              parkId,
              inferTagSprite
            );
          });
        }
      };
      if (this.elementRendered.Park.mapObj.inferTag.has(parkId)) {
        // 已存在判断类型是否正确
        const inferTagSprite: PIXI.Sprite =
          this.elementRendered.Park.mapObj.inferTag.get(parkId);
        if (inferTagSprite) {
          // 当前库位集合已存在推到结果标记，则覆盖式的更换纹理
          PIXI.Assets.load(source).then((inferTagTexture) => {
            inferTagSprite.texture = inferTagTexture;
          });
        } else {
          // 当前库位集合不存在推到结果标记，新建
          createNewInferTagSprite();
        }
      } else {
        // 不存在该元素，需要新建
        createNewInferTagSprite();
      }
    };

    // 判断是否需要强制刷新
    if (forceRender) {
      // 强制重新渲染
      parkInferTagContainer.removeChildren();
      this.elementRendered.Park.mapObj.inferTag.forEach((inferTagSprite) => {
        inferTagSprite.destroy();
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
          const inferTagSprite =
            this.elementRendered.Park.mapObj.inferTag.get(parkId);
          parkInferTagContainer.removeChild(inferTagSprite);
          inferTagSprite.destroy();
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
  protected renderParksStock(parkIds: string[], forceRender: boolean = false) {
    if (forceRender) {
      // 获取对应的图层
      let parkStockContainer: PIXI.Container =
        this.elementRendered.Park.containerObj.stock;
      parkStockContainer.zIndex = this.elementConfig.Park.zIndex.stock;

      // 强制全部重新渲染
      parkStockContainer.removeChildren();
      this.elementRendered.Park.mapObj.stock.forEach((parkStockGraphics) => {
        parkStockGraphics.destroy();
      });
      this.elementRendered.Park.mapObj.stock.clear();

      parkIds.forEach((parkId: string) => {
        this.signParkStock(parkId);
      });
    } else {
      // 只渲染/删除差集
      const hasFullParkIds: string[] = Array.from(
        this.elementRendered.Park.mapObj.stock.keys()
      ).map((id) => String(id));
      // 计算有货变无货的库位
      const emptyParkIds: string[] = hasFullParkIds.filter(
        (id: string) => !parkIds.includes(id)
      );
      // 计算无货变有货的库位
      const fullParkIds = parkIds.filter(
        (id: string) => !hasFullParkIds.includes(id)
      );
      // 标识有货变无货的库位
      emptyParkIds.forEach((parkId: string) => {
        this.signParkEmpty(parkId);
      });
      // 标识无货变有货的库位
      fullParkIds.forEach((parkId: string) => {
        this.signParkStock(parkId);
      });
    }
  }
  /**
   * 根据库位ID标记单个库位有货
   * @param parkId
   */
  protected signParkStock(parkId: string) {
    // 获取对应的图层
    let parkStockContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.stock;

    const parkData = this.elementRendered.Park.mapObj.data.get(parkId);
    if (parkData && !this.elementRendered.Park.mapObj.stock.has(parkId)) {
      // 创建库位有无货状态标识
      const parkStockGraphics = new PIXI.Graphics();
      parkStockGraphics.rect(0, 0, parkData.l, parkData.w - 20);
      parkStockGraphics.stroke({ color: this.elementConfig.Park.color.stock });
      parkStockGraphics.fill({ color: this.elementConfig.Park.color.stock });
      parkStockGraphics.pivot.set(0.5, 0.5);
      parkStockGraphics.position.set(parkData.x, parkData.y);
      parkStockGraphics.rotation = parkData.rotate;
      // 添加到库位集合中
      parkStockContainer.addChild(parkStockGraphics);
      // 记录当前有货的库位ID
      this.elementRendered.Park.mapObj.stock.set(parkId, parkStockGraphics);
    }
  }
  /**
   * 根据库位ID标记单个库位无货
   * @param parkId
   */
  protected signParkEmpty(parkId: string) {
    // 获取对应的图层
    let parkStockContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.stock;

    // 删除
    if (this.elementRendered.Park.mapObj.stock.has(parkId)) {
      const parkStockGraphics =
        this.elementRendered.Park.mapObj.stock.get(parkId);
      parkStockGraphics.destroy();
      parkStockContainer.removeChild(parkStockGraphics);
      this.elementRendered.Park.mapObj.stock.delete(parkId);
    }
  }
  /**
   * 标记所有库位无货
   */
  protected signAllParkEmpty() {
    // 获取对应的图层
    let parkStockContainer: PIXI.Container =
      this.elementRendered.Park.containerObj.stock;

    // 删除
    parkStockContainer.removeChildren();
    this.elementRendered.Park.mapObj.stock.forEach(
      (parkStockGraphics: PIXI.Graphics, parkId: string) => {
        parkStockGraphics.destroy();
      }
    );
    this.elementRendered.Park.mapObj.stock.clear();
  }

  // 渲染订单选中区域
  protected renderOrderAreas(areas: IOrderArea[]) {
    // 获取对应的图层
    let orderAreasContainer: PIXI.Container =
      this.elementRendered.orderArea.container;
    // 设置图层层级
    orderAreasContainer.zIndex = this.elementConfig.Area.zIndex.order;
    this.mainContainer.addChild(this.elementRendered.orderArea.container);
    // 先清理存量数据
    orderAreasContainer.children.forEach((orderAreaElement) => {
      orderAreaElement.destroy();
    });
    orderAreasContainer.removeChildren();

    // 再重新渲染区域数据
    areas.forEach((area: IOrderArea) => {
      const x = this.getMapCoordiateX(area.x);
      const y = this.getMapCoordiateY(area.y);
      const width = area.width * this._unitZoom;
      const height = area.height * this._unitZoom;

      const areaEle: PIXI.Graphics = new PIXI.Graphics();
      areaEle.rect(x, y, width, height);
      areaEle.stroke({
        color: area.color,
        width: 4,
        alpha: 0.1,
      });
      areaEle.fill({
        color: area.bgColor,
        alpha: 0.1,
      });

      const areaTitle: PIXI.Text = new PIXI.Text({
        text: area.text,
        style: new PIXI.TextStyle({
          align: "center",
          fontSize: 30,
          fill: area.color,
          stroke: { color: area.color },
        }),
      });
      areaTitle.pivot.set(0.5, 0.5);
      areaTitle.position.set(x + width / 2, y - 30);

      orderAreasContainer.addChild(areaEle);
      orderAreasContainer.addChild(areaTitle);
    });
  }

  // 渲染规则区域
  protected renderRuleAreas(areas: IRuleArea[] = []) {
    let color = "#E5E5E5";
    let borderColor = "#E5E5E5";
    let bgColor = "#F5F5F5";
    let fontColor = "#8C8C8C";

    // 获取对应的图层
    let ruleAreasContainer: PIXI.Container =
      this.elementRendered.ruleArea.container;
    // 设置图层层级
    ruleAreasContainer.zIndex = this.elementConfig.Area.zIndex.rule;
    this.mainContainer.addChild(this.elementRendered.ruleArea.container);
    // 先清理存量数据
    this.elementRendered.ruleArea.mapObj.area.forEach((ruleAreaElement) => {
      ruleAreaElement.destroy();
    });
    this.elementRendered.ruleArea.mapObj.area.clear();
    this.elementRendered.ruleArea.mapObj.data.clear();

    if (!areas || areas.length <= 0) return;

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
        // 处理颜色
        color = area?.color || color;
        borderColor = area?.borderColor || borderColor;
        bgColor = area?.bgColor || bgColor;
        fontColor = area?.fontColor || fontColor;
        // 处理区域宽高
        const x = coordinatesArr[2].x;
        const y = coordinatesArr[2].y;
        const width = coordinatesArr[0].x - coordinatesArr[2].x;
        const height = coordinatesArr[0].y - coordinatesArr[2].y;
        const titleTextSize = 24;
        const descTextSize = 20;
        let wordWrapWidth = width;
        let textX = width - textSpaceSize ? (width - textSpaceSize) / 2 : 0;
        let textY = textSpaceSize;
        if (width > textSpaceSize * 2 + titleTextSize) {
          wordWrapWidth = width - textSpaceSize * 2;
          textX = textSpaceSize;
        }

        // 基本的坐标数据完整，可以渲染区域
        // 区域矩形元素，数量 1
        const areaEle = new PIXI.Graphics();
        areaEle.rect(0, 0, width, height);
        areaEle.stroke({
          color: borderColor,
          alpha: 0.5,
        });
        areaEle.fill({
          color: bgColor,
          alpha: 0.5,
        });
        areaEle.zIndex = -2;

        // 区域编号元素，数量 2
        const noText = area?.no || 0;
        const titleText = area?.title || "unknown";
        const titleTextEle: PIXI.Text = new PIXI.Text({
          text: `${noText}    ${titleText}`,
          style: new PIXI.TextStyle({
            fontSize: titleTextSize,
            // fontWeight: "bold",
            fill: color,
            stroke: { color: color },
            wordWrap: true,
            wordWrapWidth: wordWrapWidth,
            // align: "center",
          }),
        });
        const titleTextEleBound = titleTextEle.getBounds();
        titleTextEle.position.set(textX, textY);

        // 区域描述/名称，文字元素，数量 1
        let descText = area?.desc || "";
        const descTextEle = new PIXI.Text({
          text: descText,
          style: new PIXI.TextStyle({
            fontSize: descTextSize,
            fill: fontColor,
            stroke: { color: fontColor },
            wordWrap: true,
            wordWrapWidth: wordWrapWidth,
          }),
        });
        descTextEle.position.set(
          textX,
          textY + titleTextEleBound.height + textSpaceSize
        );

        // 创建区域容器
        const orderAreaContainer: PIXI.Container = new PIXI.Container();
        orderAreaContainer.addChild(areaEle);
        orderAreaContainer.addChild(titleTextEle);
        orderAreaContainer.addChild(descTextEle);
        orderAreaContainer.position.set(x, y);

        // 保存当前区域容器
        ruleAreasContainer.addChild(orderAreaContainer);
        const uuid = area?.uuid;
        this.elementRendered.ruleArea.mapObj.area.set(uuid, orderAreaContainer);
        this.elementRendered.ruleArea.mapObj.data.set(uuid, {
          left: coordinatesArr[2].x,
          right: coordinatesArr[0].x,
          top: coordinatesArr[2].y,
          bottom: coordinatesArr[0].y,
        });
      }
    });
  }

  // 渲染货柜车
  protected renderTruckAreas(areas: ITruckArea[]) {
    // 获取对应的图层
    let truckAreasContainer: PIXI.Container =
      this.elementRendered.truckArea.container;
    // 设置图层层级
    truckAreasContainer.zIndex = this.elementConfig.Area.zIndex.truck;
    this.mainContainer.addChild(this.elementRendered.truckArea.container);
    // 先清理存量数据
    truckAreasContainer.children.forEach((truckAreaElement) => {
      truckAreaElement.destroy();
    });
    truckAreasContainer.removeChildren();

    if (areas.length) {
      // 渲染新货柜车信息
      areas.forEach((area: ITruckArea) => {
        area.x = this.getMapCoordiateX(area.x);
        area.y = this.getMapCoordiateY(area.y);
        area.length = this.getMapCoordiateX(area.length);
        area.width = this.getMapCoordiateX(area.width);

        // 创建货柜车容器
        const truckContainer: PIXI.Container = new PIXI.Container();

        // 绘制货柜车区域
        const truckRect: PIXI.Graphics = new PIXI.Graphics();
        truckRect.rect(0, 0, area.length, area.width);
        truckRect.stroke({
          color: this.elementConfig.Truck.color.default,
          width: this.elementConfig.Truck.width.default,
        });
        truckContainer.addChild(truckRect);

        // 绘制车头
        PIXI.Assets.load(TRUCK_HEADER["truck"]).then((img) => {
          const truckHeader: PIXI.Sprite = new PIXI.Sprite(img);
          truckHeader.width = area.width;
          truckHeader.height = area.width;
          truckHeader.position.set(area.length, 0);
          truckContainer.addChild(truckHeader);

          truckContainer.position.set(area.x, area.y);
          truckContainer.rotation = this.piToRotate(area.theta);
        });

        // 保存数据
        this.elementRendered.truckArea.container.addChild(truckContainer);
      });
    }
  }

  // 货柜车动态库位
  protected renderTruckParks(truckParks: ITruckPark[]) {
    if (truckParks.length) {
      // 有数据需要处理
      truckParks.forEach((item: ITruckPark) => {
        const truckPark = Object.assign({}, item);
        truckPark.x = this.getMapCoordiateX(truckPark.x);
        truckPark.y = this.getMapCoordiateY(truckPark.y);
        const id = truckPark.parkId;
        const parkId = Number(id);
        this.moveTruckParkById(parkId, truckPark);
      });
    }
  }
  /**
   * 根据库位信息移动货车库位
   * @param parkId
   * @param truckPark
   */
  private moveTruckParkById(parkId: string, truckPark: ITruckPark) {
    if (!this.elementRendered.Park.mapObj.data.has(parkId)) return;

    const parkData = this.elementRendered.Park.mapObj.data.get(parkId);
    parkData.x = truckPark.x;
    parkData.y = truckPark.y;
    parkData.pi = this.thetaToAngle(truckPark.theta);
    parkData.rotate = this.thetaToRotate(truckPark.theta);
    parkData.tX = truckPark.x;
    (parkData.tY = truckPark.y - parkData.halfW / 2),
      (parkData.bX = truckPark.x),
      (parkData.bY = truckPark.y + parkData.halfW / 2),
      (parkData.lX = truckPark.x - parkData.halfL / 2),
      (parkData.lY = truckPark.y),
      (parkData.rX = truckPark.x + parkData.halfL / 2),
      (parkData.rY = truckPark.y);

    // 有无货状态容器
    if (this.elementRendered.Park.mapObj.stock.has(parkId)) {
      const parkStockGraphics =
        this.elementRendered.Park.mapObj.stock.get(parkId);
      parkStockGraphics?.position.set(parkData.x, parkData.y);
      parkStockGraphics.rotation = parkData.rotate;
    }

    // 库位候选状态容器
    if (this.elementRendered.Park.mapObj.candidate.has(parkId)) {
      const parkCandidateGraphics =
        this.elementRendered.Park.mapObj.candidate.get(parkId);
      parkCandidateGraphics.position.set(parkData.x, parkData.y);
      parkCandidateGraphics.rotation = parkData.rotate;
    }

    // 库位ID容器
    if (this.elementRendered.Park.mapObj.parkId.has(parkId)) {
      const parkIdText = this.elementRendered.Park.mapObj.parkId.get(parkId);
      parkIdText.position.set(parkData.tX, parkData.tY);
    }

    // 库位图形容器
    if (this.elementRendered.Park.mapObj.park.has(parkId)) {
      const parkGraphics = this.elementRendered.Park.mapObj.park.get(parkId);
      parkGraphics.position.set(parkData.x, parkData.y);
      parkGraphics.rotation = parkData.rotate;
    }

    // 库位类型容器
    if (this.elementRendered.Park.mapObj.typeTag.has(parkId)) {
      const parkTypeSprite =
        this.elementRendered.Park.mapObj.typeTag.get(parkId);
      parkTypeSprite.x = parkData.bX;
      parkTypeSprite.y = parkData.bY;
    }

    // 库位类型容器
    if (this.elementRendered.Park.mapObj.numTag.has(parkId)) {
      const numTagText = this.elementRendered.Park.mapObj.numTag.get(parkId);
      numTagText.x = parkData.lX;
      numTagText.y = parkData.lY;
    }

    // 库位类型容器
    if (this.elementRendered.Park.mapObj.inferTag.has(parkId)) {
      const inferTagSprite =
        this.elementRendered.Park.mapObj.inferTag.get(parkId);
      inferTagSprite.x = parkData.rX;
      inferTagSprite.y = parkData.rY;
    }
  }

  /**
   * 标识单个途经点
   * @param point
   */
  protected renderPathwayPoint(point: IPoint) {
    // 先清理现有途经点元素，重新生成
    this.elementRendered.AGVPathPoint.mapObj.pathway.forEach(
      (pathwayEle: PIXI.Container) => {
        pathwayEle.destroy();
      }
    );
    this.elementRendered.AGVPathPoint.mapObj.pathway.clear();

    const pointSideLen = this.elementConfig.AGVPathPoint.size.r;
    if (
      point &&
      point.hasOwnProperty("x") &&
      point.hasOwnProperty("y") &&
      this.isNumber(point.x) &&
      this.isNumber(point.y)
    ) {
      // 有途经点数据，处理标记
      PIXI.Assets.load(POINT_TAGS["pathway"]).then((img) => {
        const pathwaySprite = new PIXI.Sprite(img);
        const x = this.getMapCoordiateX(point?.x);
        const y = this.getMapCoordiateY(point?.y);

        pathwaySprite.width = 50;
        pathwaySprite.height = 50;
        pathwaySprite.anchor.set(0.5, 1);
        pathwaySprite.position.set(x, y - pointSideLen);

        const pathwayGraphics = new PIXI.Graphics();
        pathwayGraphics.circle(x, y, this.elementConfig.AGVPathPoint.size.r);
        pathwayGraphics.stroke({
          color: this.elementConfig.AGVPathPoint.color.select,
        });
        pathwayGraphics.fill({
          color: this.elementConfig.AGVPathPoint.color.select,
        });
        const pathwayContainer: PIXI.Container = new PIXI.Container({
          isRenderGroup: true,
        });
        pathwayContainer.addChild(pathwaySprite);
        pathwayContainer.addChild(pathwayGraphics);

        const key = this.createPathPointTextureKey(x, y);
        this.elementRendered.AGVPathPoint.mapObj.pathway.set(
          key,
          pathwayContainer
        );
        this.elementRendered.covers.container.addChild(pathwayContainer);
      });
    }
  }
  /**
   * 渲染途经点数据
   * @param points IPoint
   */
  protected renderPathwayPoints(points: IPoint[]) {
    // 先清理现有途经点元素，重新生成
    this.elementRendered.AGVPathPoint.mapObj.pathway.forEach(
      (pathwayEle: PIXI.Container) => {
        pathwayEle.destroy();
      }
    );
    this.elementRendered.AGVPathPoint.mapObj.pathway.clear();

    // 渲染新数据
    if (points.length) {
      // 有途经点数据，处理标记
      // 新增途经点元素
      points.forEach((point: IPoint, index: number) => {
        let x = this.getMapCoordiateX(point?.x);
        let y = this.getMapCoordiateY(point?.y);
        let num = ++index;
        // let text = '途径' + num

        const pathwayText: PIXI.Text = new PIXI.Text({
          text: num,
          style: new PIXI.TextStyle({
            fontSize: 42,
            align: "center",
            fontWeight: "bold",
            fill: "#FFFFFF",
            stroke: { color: "#ED7B00", width: 5, join: "round" },
            dropShadow: {
              color: "#000000",
              blur: 4,
              angle: Math.PI / 6,
              distance: 6,
            },
          }),
        });
        pathwayText.anchor.set(0.5, 1);
        pathwayText.position.set(x, y);

        const pathwayGraphics = new PIXI.Graphics();
        pathwayGraphics.circle(x, y, this.elementConfig.AGVPathPoint.size.r);
        pathwayGraphics.stroke({
          color: this.elementConfig.AGVPathPoint.color.select,
        });
        pathwayGraphics.fill({
          color: this.elementConfig.AGVPathPoint.color.select,
        });
        const pathwayContainer: PIXI.Container = new PIXI.Container({
          isRenderGroup: true,
        });
        pathwayContainer.addChild(pathwayText);
        pathwayContainer.addChild(pathwayGraphics);

        const key = this.createPathPointTextureKey(x, y);
        this.elementRendered.AGVPathPoint.mapObj.pathway.set(
          key,
          pathwayContainer
        );
        this.elementRendered.covers.container.addChild(pathwayContainer);
      });
    }
  }

  /**
   * 渲染开始点位
   * @param point IPoint
   */
  protected renderStartPoint(point: IPoint) {
    // 清理现有开始点位数据
    this.elementRendered.AGVPathPoint.mapObj.start.forEach(
      (startSprite: PIXI.Container) => {
        startSprite.destroy();
      }
    );
    this.elementRendered.AGVPathPoint.mapObj.start.clear();
    // 清理现有闭合点位数据
    this.elementRendered.AGVPathPoint.mapObj.close.forEach(
      (closeSprite: PIXI.Container) => {
        closeSprite.destroy();
      }
    );
    this.elementRendered.AGVPathPoint.mapObj.close.clear();

    // 判断当前点位数据是否有效
    if (
      !point ||
      !point.hasOwnProperty("x") ||
      !point.hasOwnProperty("y") ||
      !this.isNumber(point.x) ||
      !this.isNumber(point.y)
    )
      return;

    const pointSideLen = this.elementConfig.AGVPathPoint.size.r;
    PIXI.Assets.load(POINT_TAGS["start"]).then((img) => {
      const startSprite = new PIXI.Sprite(img);
      const x = this.getMapCoordiateX(point?.x);
      const y = this.getMapCoordiateY(point?.y);

      startSprite.width = 50;
      startSprite.height = 50;
      startSprite.anchor.set(0.5, 1);
      startSprite.position.set(x, y - pointSideLen);

      const startGraphics = new PIXI.Graphics();
      startGraphics.circle(x, y, this.elementConfig.AGVPathPoint.size.r);
      startGraphics.stroke({
        color: this.elementConfig.AGVPathPoint.color.select,
      });
      startGraphics.fill({
        color: this.elementConfig.AGVPathPoint.color.select,
      });

      const startContainer: PIXI.Container = new PIXI.Container({
        isRenderGroup: true,
      });
      startContainer.addChild(startSprite);
      startContainer.addChild(startGraphics);

      const key = this.createPathPointTextureKey(x, y);
      this.elementRendered.AGVPathPoint.mapObj.start.set(key, startContainer);
      this.elementRendered.covers.container.addChild(startContainer);

      // 判断是否有闭合路径
      setTimeout(() => {
        this.checkClosePoint()
      }, 500)
    });
  }
  /**
   * 渲染结束点位
   * @param point IPoint
   */
  protected renderEndPoint(point: IPoint) {
    // 清理现有结束点位数据
    this.elementRendered.AGVPathPoint.mapObj.end.forEach(
      (startSprite: PIXI.Container) => {
        startSprite.destroy();
      }
    );
    this.elementRendered.AGVPathPoint.mapObj.end.clear();
    // 清理现有闭合点位数据
    this.elementRendered.AGVPathPoint.mapObj.close.forEach(
      (startSprite: PIXI.Container) => {
        startSprite.destroy();
      }
    );
    this.elementRendered.AGVPathPoint.mapObj.close.clear();

    // 判断当前点位数据是否有效
    if (
      !point ||
      !point.hasOwnProperty("x") ||
      !point.hasOwnProperty("y") ||
      !this.isNumber(point.x) ||
      !this.isNumber(point.y)
    )
      return;

    const pointSideLen = this.elementConfig.AGVPathPoint.size.r;
    PIXI.Assets.load(POINT_TAGS["end"]).then((img) => {
      const endSprite = new PIXI.Sprite(img);
      const x = this.getMapCoordiateX(point?.x);
      const y = this.getMapCoordiateY(point?.y);

      endSprite.width = 50;
      endSprite.height = 50;
      endSprite.anchor.set(0.5, 1);
      endSprite.position.set(x, y - pointSideLen);

      const endGraphics = new PIXI.Graphics();
      endGraphics.circle(x, y, this.elementConfig.AGVPathPoint.size.r);
      endGraphics.stroke({
        color: this.elementConfig.AGVPathPoint.color.select,
      });
      endGraphics.fill({
        color: this.elementConfig.AGVPathPoint.color.select,
      });

      const endContainer: PIXI.Container = new PIXI.Container({
        isRenderGroup: true,
      });
      endContainer.addChild(endSprite);
      endContainer.addChild(endGraphics);

      const key = this.createPathPointTextureKey(x, y);
      this.elementRendered.AGVPathPoint.mapObj.end.set(key, endContainer);
      this.elementRendered.covers.container.addChild(endContainer);

      // 判断是否有闭合路径
      setTimeout(() => {
        this.checkClosePoint()
      }, 500)
    });
  }

  /**
   * 校验是否有闭合回路
   */
  private checkClosePoint() {
    const startPoint = this._markerRendered.startPoint;
    const endPoint = this._markerRendered.endPoint;
    if (
      startPoint &&
      typeof startPoint === "object" &&
      startPoint.hasOwnProperty("x") &&
      startPoint.hasOwnProperty("y") &&
      endPoint &&
      typeof endPoint === "object" &&
      endPoint.hasOwnProperty("x") &&
      endPoint.hasOwnProperty("y")
    ) {
      // 起终点都有，需要判断是否相同
      if (
        Number(startPoint.x) === Number(endPoint.x) &&
        Number(startPoint.y) === Number(endPoint.y)
      ) {
        // 相同，启动闭合标识
        // 清理现有开始点位数据
        this.elementRendered.AGVPathPoint.mapObj.start.forEach(
          (startSprite: PIXI.Container) => {
            startSprite.destroy();
          }
        );
        this.elementRendered.AGVPathPoint.mapObj.start.clear();
        // 清理现有结束点位数据
        this.elementRendered.AGVPathPoint.mapObj.end.forEach(
          (startSprite: PIXI.Container) => {
            startSprite.destroy();
          }
        );
        this.elementRendered.AGVPathPoint.mapObj.end.clear();

        // 渲染闭合点位标识
        this.renderClosePoint(startPoint);
      }
    }
  }
  /**
   * 渲染闭合点位，即开始和结束点位重合
   * @param point IPoint
   */
  private renderClosePoint(point: IPoint) {
    const pointSideLen = this.elementConfig.AGVPathPoint.size.r;
    PIXI.Assets.load(POINT_TAGS["close"]).then((img) => {
      const closeSprite = new PIXI.Sprite(img);
      const x = this.getMapCoordiateX(point?.x);
      const y = this.getMapCoordiateY(point?.y);

      closeSprite.width = 50;
      closeSprite.height = 50;
      closeSprite.anchor.set(0.5, 1);
      closeSprite.position.set(x, y - pointSideLen);

      const closeGraphics = new PIXI.Graphics();
      closeGraphics.circle(x, y, this.elementConfig.AGVPathPoint.size.r);
      closeGraphics.stroke({
        color: this.elementConfig.AGVPathPoint.color.select,
      });
      closeGraphics.fill({
        color: this.elementConfig.AGVPathPoint.color.select,
      });

      const endContainer: PIXI.Container = new PIXI.Container({
        isRenderGroup: true,
      });
      endContainer.addChild(closeSprite);
      endContainer.addChild(closeGraphics);

      const key = this.createPathPointTextureKey(x, y);
      this.elementRendered.AGVPathPoint.mapObj.close.set(key, endContainer);
      this.elementRendered.covers.container.addChild(endContainer);
    });
  }

  /**
   * 临时库位标识
   * @param param
   * @returns
   */
  protected renderTempPark(param) {
    // 判断是否包含必要字段
    if (
      !param.hasOwnProperty("id") ||
      !param.hasOwnProperty("x") ||
      !param.hasOwnProperty("y") ||
      !param.hasOwnProperty("pi")
    )
      return;
    const id = param.id;
    const x = this.getMapCoordiateX(param.x);
    const y = this.getMapCoordiateY(param.y);
    const rotate = this.piToRotate(param.pi);
    const l = (param?.l || 2) * this._unitZoom;
    const w = (param?.w || 1.5) * this._unitZoom;

    let tempParkGraphics: PIXI.Graphics = new PIXI.Graphics();
    // 判断是否已经有这个元素了
    if (this.elementRendered.Park.mapObj.temp.has(id)) {
      tempParkGraphics = this.elementRendered.Park.mapObj.temp.get(id);
      tempParkGraphics.clear();
    } else {
      this.elementRendered.Park.mapObj.temp.set(id, tempParkGraphics);
      // 添加到浮动层
      this.elementRendered.covers.container.addChild(tempParkGraphics);
    }
    tempParkGraphics.moveTo(l, 0);
    tempParkGraphics.lineTo(0, 0);
    tempParkGraphics.lineTo(0, w);
    tempParkGraphics.lineTo(l, w);
    tempParkGraphics.pivot.set(l / 2, w / 2);
    tempParkGraphics.position.set(x, y);
    tempParkGraphics.rotation = rotate;
    tempParkGraphics.stroke({
      color: 0xba28eb,
      width: this.elementConfig.Park.width.selected,
    });
  }

  /**
   * 渲染候选元素范围框，矩形
   * @param x 左上点x
   * @param y 左上点y
   * @param w 宽
   * @param h 高
   */
  protected renderCandidateRange(
    x: number,
    y: number,
    w: number = 10,
    h: number = 10,
    width: number = 3,
    color: string = "#EB2829"
  ) {
    this.clearCandidateRange();

    const candidateGraphics: PIXI.Graphics = new PIXI.Graphics();
    candidateGraphics.rect(x, y, w, h);
    candidateGraphics.stroke({
      color: color,
      width: width,
    });
    candidateGraphics.pivot.set(0, 0);
    this.elementRendered.candidateRange.container.addChild(candidateGraphics);
    return candidateGraphics;
  }
  protected clearCandidateRange() {
    this.elementRendered.candidateRange.container.children.forEach(
      (candidateGraphics) => {
        candidateGraphics.destroy();
      }
    );
    this.elementRendered.candidateRange.container.removeChildren();
  }

  /**
   * 创建 VnlOutline 轮廓赋值代理
   * 处理轮廓元素跟随数值移动
   */
  protected createOutlineProxy(
    outlineName: string,
    outlineEleData: IOutlineEleData
  ) {
    // 判断是否预制了这个数据类型
    if (!Object.keys(this._outlineData).includes(outlineName))
      return Proxy.revocable(
        {
          left: 0,
          right: 0,
          bottom: 0,
          top: 0,
          width: 0,
          height: 0,
        },
        {}
      );
    const proxyObj = Proxy.revocable(
      this._outlineData[outlineName as keyof typeof this._outlineData],
      {
        set: (target: any, prop: string, value: number) => {
          // 判断当前值是否变更
          if (target[prop] === value) return true;
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
              target["height"] = target["bottom"] - target["top"];
              break;
            case "top":
              target["height"] = target["bottom"] - target["top"];
              break;
          }
          this.setOutlineCoordinate(target, outlineEleData);
          return true;
        },
      }
    );
    this.outlineData[outlineName as keyof typeof this.outlineData] =
      proxyObj.proxy;
    return proxyObj;
  }
  /**
   * 设置轮廓元素新位置
   */
  private setOutlineCoordinate(
    outlineData: IOutline,
    outlineEles: IOutlineEleData
  ) {
    // 处理主矩形元素
    const MainEleStrokeStyle = outlineEles.MainEle.strokeStyle;
    const MainEleFillStyle = outlineEles.MainEle.fillStyle;
    outlineEles.MainEle.clear();
    outlineEles.MainEle.rect(0, 0, outlineData.width, outlineData.height);
    outlineEles.MainEle.stroke(MainEleStrokeStyle);
    outlineEles.MainEle.fill(MainEleFillStyle);
    outlineEles.MainEle.position.set(outlineData.left, outlineData.top);

    // 处理四个中心点元素
    outlineEles.TopPointEle.x = (outlineData.left + outlineData.right) / 2;
    outlineEles.TopPointEle.y = outlineData.top;

    outlineEles.RightPointEle.x = outlineData.right;
    outlineEles.RightPointEle.y = (outlineData.top + outlineData.bottom) / 2;

    outlineEles.BootomPointEle.x = (outlineData.left + outlineData.right) / 2;
    outlineEles.BootomPointEle.y = outlineData.bottom;

    outlineEles.LeftPointEle.x = outlineData.left;
    outlineEles.LeftPointEle.y = (outlineData.top + outlineData.bottom) / 2;

    // 处理四个顶点元素
    outlineEles.LeftTopPointEle.position.set(outlineData.left, outlineData.top);
    this.updateOutlineCoordinateText(
      "leftTop",
      outlineEles.LeftTopTextEle,
      outlineData.left,
      outlineData.top
    );

    outlineEles.RightTopPointEle.position.set(
      outlineData.right,
      outlineData.top
    );
    this.updateOutlineCoordinateText(
      "rightTop",
      outlineEles.RightTopTextEle,
      outlineData.right,
      outlineData.top
    );

    outlineEles.RightBottomPointEle.position.set(
      outlineData.right,
      outlineData.bottom
    );
    this.updateOutlineCoordinateText(
      "rightBottom",
      outlineEles.RightBottomTextEle,
      outlineData.right,
      outlineData.bottom
    );

    outlineEles.LeftBottomPointEle.position.set(
      outlineData.left,
      outlineData.bottom
    );
    this.updateOutlineCoordinateText(
      "leftBottom",
      outlineEles.LeftBottomTextEle,
      outlineData.left,
      outlineData.bottom
    );
  }

  /**
   * 渲染AGV行驶轨迹
   * @param pathParam
   * @returns
   */
  protected renderRailway(pathParam: string) {
    // 清理现有的
    this.elementRendered.railway.mapObj.railway.forEach((pathGraphics) => {
      pathGraphics.destroy();
    });
    this.elementRendered.railway.mapObj.railway.clear();
    this.elementRendered.railway.mapObj.path.forEach((pathGraphics) => {
      pathGraphics.destroy();
    });
    this.elementRendered.railway.mapObj.path.clear();

    if (!pathParam) return;
    // 生成字串数据
    const pathDataArr = this.formatAgvPath(pathParam);
    if (!pathDataArr || pathDataArr.length <= 0) return;

    // 获取当前AGV的宽度尺寸
    let railwayWidthLine = 160;
    let railwayWidthArc = 160;
    const agvAnimationArr = Object.values(this._agvConfig);
    if (Array.isArray(agvAnimationArr) && agvAnimationArr.length === 1) {
      const agvConfig = agvAnimationArr[0].agvConfig;
      railwayWidthLine = agvConfig.vehicleWidth;
      railwayWidthArc = agvConfig.vehicleFrontLength * 2;
    }

    pathDataArr.forEach((pathData) => {
      const { id, x1, y1, x2, y2, radius, forward } = pathData;

      // 画轨道
      // 计算选段长度
      const sectionLength = Math.sqrt(
        Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)
      );
      if (sectionLength >= 10) {
        const railwayGraphics: PIXI.Graphics = new PIXI.Graphics();
        if (radius == 0) {
          railwayGraphics.moveTo(x1, y1);
          railwayGraphics.lineTo(x2, y2);
          railwayGraphics.stroke({
            width: railwayWidthArc,
            alpha: 0.6,
            color: "#84E0BD",
          });
        } else {
          railwayGraphics.moveTo(x1, y1);
          const radiusABS = Math.abs(radius);
          const sweepFlag = radius > 0 ? 0 : 1;
          const lineAngle = this.lineAngle(x1, y1, x2, y2);
          railwayGraphics.arcToSvg(
            radiusABS,
            radiusABS,
            lineAngle,
            0,
            sweepFlag,
            x2,
            y2
          );
          railwayGraphics.stroke({
            width: railwayWidthArc,
            alpha: 0.6,
            color: "#84E0BD",
          });
        }
        this.elementRendered.railway.mapObj.railway.set(id, railwayGraphics);
        this.elementRendered.regress.container.addChild(railwayGraphics);
      }

      // 画路径
      let AGVPathAttr = {};
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
      const pathGraphics: PIXI.Graphics = this.drawLineWithArrow(
        pathData,
        AGVPathAttr
      );
      this.elementRendered.railway.mapObj.path.set(id, pathGraphics);
      this.elementRendered.regress.container.addChild(pathGraphics);
    });
  }

  /**
   * 标记回归路径终点
   * @param pathParam
   * @returns
   */
  protected renderRegressTag(pathParam: string | IPoint) {
    // 清理现有的
    this.elementRendered.railway.mapObj.agv.forEach((agvSprite) => {
      agvSprite.destroy();
    });
    this.elementRendered.railway.mapObj.agv.clear();
    if (!pathParam) return;

    let lastPointInfo: IPoint;
    // 判断是否是字符串
    if (typeof pathParam === "string") {
      // 生成字串数据
      const pathDataArr = this.formatAgvPath(pathParam);
      if (!pathDataArr || pathDataArr.length <= 0) return;
      // 获取终点信息，并设置终点图标
      const lastPath = pathDataArr[pathDataArr.length - 1];
      if (!lastPath) return;
      lastPointInfo = {
        x: lastPath.x2,
        y: lastPath.y2,
        theta: this.pathToTheta(lastPath.theta2, lastPath.forward),
      };
    } else {
      if (
        !(
          typeof pathParam === "object" &&
          pathParam.hasOwnProperty("x") &&
          pathParam.hasOwnProperty("y") &&
          pathParam.hasOwnProperty("theta")
        )
      )
        return;
      lastPointInfo = {
        x: this.getMapCoordiateX(pathParam.x),
        y: this.getMapCoordiateY(pathParam.y),
        theta: pathParam.theta,
      };
    }

    const tempAgvEle: PIXI.Sprite = new PIXI.Sprite({
      texture: PIXI.Texture.EMPTY,
      width: 120,
      height: 160,
    })
    tempAgvEle.anchor.set(0.5)
    tempAgvEle.position.set(lastPointInfo.x, lastPointInfo.y)
    tempAgvEle.rotation = this.thetaToRotate(Number.parseFloat(lastPointInfo.theta))
    tempAgvEle.alpha = 0.6
    this.elementRendered.railway.mapObj.agv.set(pathParam, tempAgvEle)
    this.elementRendered.regress.container.addChild(tempAgvEle);

    // 获取当前AGV的宽度尺寸
    let count = 0
    const getAgvTexture = () => {
      count++
      const agvAnimationArr = Object.values(this._agvConfig)
      if (Array.isArray(agvAnimationArr) && agvAnimationArr.length === 1) {
        const agvTexture: PIXI.Texture | undefined = agvAnimationArr[0].agvTexture
        const agvConfig = agvAnimationArr[0].agvConfig
        if (agvTexture) {
          tempAgvEle.texture = agvTexture
          tempAgvEle.width = agvConfig.length
          tempAgvEle.height = agvConfig.width
          tempAgvEle.anchor.set(agvConfig.anchorX, agvConfig.anchorY)
          return
        }
      }
      // 最多重新获取三次
      if (count <= 3) {
        setTimeout(() => {
          getAgvTexture()
        }, 1000)
      }
    }
    getAgvTexture()
  }
}
