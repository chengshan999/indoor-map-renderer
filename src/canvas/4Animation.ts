import * as PIXI from "pixi.js";
import Covers from "./3Covers";
import { IAgvConfig, IAgvEntry, IPoint } from "./Interface";
import AGV_IMGS from "../images/agvBase64";

export default class Animation extends Covers {
  /**
   * 锚定AGV模式
   * 此模式会始终保持当前AGV在视口中心
   */
  protected _anchorState: boolean = false;

  /**
   * 锚定AGV模式需要锚定的AGV编号
   */
  protected _anchorSerial: string = "";

  /**
   * 被锚定的AGV容器
   */
  protected _anchorContainer: PIXI.Container | null = null;

  private _anchorTimer: any = null;

  /**
   * 开/关AGV锚定状态
   */
  set anchorState(value: boolean) {
    this._anchorState = value;
    if (!this._renderSwitch.completed || !this.app) return;
    if (value) {
      // 锚定跟随模式
      if (!this._anchorContainer) {
        const keys = Object.keys(this._agvConfig);
        if (keys.length >= 1) {
          this._anchorSerial = keys[0];
          this._anchorContainer = this._agvConfig[keys[0]].animateContainer;
        }
      }
      // 创建矫正镜头
      this._anchorTimer && clearInterval(this._anchorTimer);
      this._anchorTimer = setInterval(() => {
        // 判断是否有锚定模式
        if (this._anchorContainer) {
          const agvX = this._anchorContainer.x;
          const agvY = this._anchorContainer.y;
          // this.mainContainer.scale.x = 1;
          // this.mainContainer.scale.y = 1;

          // 判断当前点位是否超出视口
          const rect = this.getViewportRect();
          const bufferSize = 200;
          if (
            agvX < rect.left + bufferSize ||
            agvX > rect.right - bufferSize ||
            agvY < rect.top + bufferSize ||
            agvY > rect.bottom - bufferSize
          ) {
            this.panCoordinateToCenter(agvX, agvY);
          }
        }
      }, 1000);
    } else {
      this._anchorTimer && clearInterval(this._anchorTimer);
      this._anchorContainer = null;
    }
  }
  /**
   * 设置需要锚定的AGV编号
   */
  set anchorSerial(serial: string) {
    this._anchorSerial = serial;
    // 寻找锚定的容器
    if (serial && this._agvConfig.hasOwnProperty(serial)) {
      this._anchorContainer = this._agvConfig[serial].animateContainer;
    }
  }

  /**
   * AGV状态对应的关键字
   */
  private _agvStateMap: any = {
    0: "", // 未知 Unknown = 0,
    1: "", // 初始化 Prepare = 1,
    2: "", // 待命 StandBy = 2,
    3: "mission", // 自动运行 Auto = 3,
    4: "", // 定位矫正 Adjust = 4,
    5: "manual", // 手动状态 Manual = 5,
    6: "abnormal", // 异常 Breakdown = 6,
    7: "", // 休眠 Sleep = 7,
    8: "offline", // 关机 Halt = 8,
    9: "", // 开机自检状态 PowerOnSelfVerify = 9,
    10: "", // 手工自检 ManualSelfVerify = 10
  };

  /**
   * 获取AGV背景图
   * @param model
   * @param state
   * @returns
   */
  private getAgvBgImgs(state: number | string) {
    state = String(state);
    switch (state) {
      case "3":
        return AGV_IMGS["mission"];
        break;
      case "6":
        return AGV_IMGS["abnormal"];
        break;
      default:
        return "";
        break;
    }
  }
  /**
   * 获取AGV图标
   * @param state
   * @returns
   */
  private getAgvTagImgs(state: number | string) {
    state = String(state);
    switch (state) {
      case "5":
        return AGV_IMGS["manual"];
        break;
      case "8":
        return AGV_IMGS["offline"];
        break;
      default:
        return "";
        break;
    }
  }
  /**
   * 获取充电图片
   * @returns
   */
  private getChargingImgs() {
    return AGV_IMGS["charging"];
  }
  /**
   * 获取货物图片
   * @returns
   */
  private getLoadingImgs() {
    return AGV_IMGS["freight"];
  }

  /**
   * agv图标数据 Object
   * Object 的 key: AGV的编号或唯一标识
   * Object 的 value: <Proxy>{
   *  unique String: AGV的编号或唯一标识, 必填 require
   *  state String | Number: AGV状态,
   *  model String: AGV型号,
   *  taskType String: 任务类型,
   *  loading Boolean: 当前车上是否有货
   *  animateQueue Proxy: 代理模式存储AGV移动坐标数据的数组，数组元素为{ x, y , speed, theta, timestamp }
   *  clickCallback: () => {}, // 点击AGV图标的回调事件
   *  destroy: () => {}, // 销毁当前AGV代理资源的方法
   *  anchorOnce: IPoint, // 传入坐标，创建完成之后执行一次锚定，即把当前AGV位置移动到视口中央
   * } 的 Proxy
   */
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
          this._anchorTimer && clearInterval(this._anchorTimer);
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
    if (!this._renderSwitch.completed || !this.app) return;
    if (!prop) return;
    const unique = prop;
    // 定义初始target对象
    const model = value?.model || "default";
    // 处理AGV尺寸数据
    const agvConfig = {
      // 整体尺寸数据
      length: 200, // 车体长度（包含货叉）
      width: 100, // 车体宽度
      anchorX: 0.5, // X轴方向上的锚定点比例
      anchorY: 0.5, // Y轴方向上的锚定点比例
      // 车体尺寸数据
      vehicleLength: 50, // 车体长度（不包含货叉部分）
      vehicleWidth: 100, // 车体宽度
      vehicleLeftWidth: 50, // 车体左面最外沿到车体坐标系原点的距离
      vehicleRightWidth: 50, // 车体右面最外沿到车体坐标系原点的距离
      vehicleFrontLength: 100, // 车体前面最外沿到车体坐标系原点的距离
      vehicleRearLength: 100, // 车体后面最外沿到车体坐标系原点的距离
      vehicleX: 0, // 车体图标x方向坐标（固定）
      vehicleY: 50, // 车体图标y方向坐标
      vehicleAnchorX: 0, // 车体图标锚定点比例（固定）
      vehicleAnchorY: 0.5, // 车体图标锚定点比例（固定）
      // 货叉尺寸数据
      forkCount: 2, // 货叉数量
      forkLength: 150, // 货叉长度
      forkWidth: 15, // 货叉宽度
      forkThickness: 4, // 货叉厚度
      forkDistance: 30, // 相邻货叉内宽
      forkX: 0, // 货叉X轴坐标（固定）
      forkAnchorX: 1, // 货叉锚定点比例（固定）
      forkAnchorY: 0.5, // 货叉锚定点比例（固定）
      // 货物尺寸数据
      freightOffset: 10, // 货物便宜量（固定）
      freightLength: 130, // 货物尺寸，约等于车体宽度
      freightWidth: 100, // 货物尺寸, 约等于货叉长度
      freightX: -90, // 货物图标x方向坐标
      freightY: 0, // 货物图标y方向坐标（固定）
      freightAnchorX: 0, // 货物锚定点比例（固定）
      freightAnchorY: 0.5, // 货物锚定点比例（固定）
      // 图标尺寸数据
      tagLength: 40, // 设置充电、手动、异常等表示图标长度（固定）
      tagWidth: 40, // 设置充电、手动、异常等表示图标宽度（固定）
      tagX: 25, // 设置充电、手动、异常等表示图标x方向坐标
      tagY1: -30, // 设置充电、手动、异常等表示图标y方向坐标（固定）
      tagY2: 30, // 设置充电、手动、异常等表示图标y方向坐标（固定）
      tagAnchorX: 0.5, // 图标锚定点比例（固定）
      tagAnchorY: 0.5, // 图标锚定点比例（固定）
      // 背景图尺寸数据
      bgWidth: 200, // 背景图宽度
      bgLength: 200, // 背景图长度
      bgX: 100, // 背景图定位点坐标x
      bgY: 0, // 背景图定位点坐标y（固定）
      bgAnchorX: 0.8, // 背景锚定点比例（固定）
      bgAnchorY: 0.5, // 背景锚定点比例（固定）
    };
    // 如有传入车型数据尺寸数据，则重新计算
    if (value?.agvConfig) {
      if (
        value?.agvConfig?.forkCount &&
        this.isNumber(value?.agvConfig?.forkCount)
      )
        agvConfig.forkCount = Number(value?.agvConfig?.forkCount)
      if (
        value?.agvConfig?.forkWidth &&
        this.isNumber(value?.agvConfig?.forkWidth)
      )
        agvConfig.forkWidth = value?.agvConfig?.forkWidth * this._unitZoom;
      if (
        value?.agvConfig?.forkLength &&
        this.isNumber(value?.agvConfig?.forkLength)
      )
        agvConfig.forkLength = value?.agvConfig?.forkLength * this._unitZoom;
      if (
        value?.agvConfig?.forkThickness &&
        this.isNumber(value?.agvConfig?.forkThickness)
      )
        agvConfig.forkThickness =
          value?.agvConfig?.forkThickness * this._unitZoom;
      if (
        value?.agvConfig?.vehicleLeftWidth &&
        this.isNumber(value?.agvConfig?.vehicleLeftWidth)
      )
        agvConfig.vehicleLeftWidth =
          value?.agvConfig?.vehicleLeftWidth * this._unitZoom;
      if (
        value?.agvConfig?.vehicleRightWidth &&
        this.isNumber(value?.agvConfig?.vehicleRightWidth)
      )
        agvConfig.vehicleRightWidth =
          value?.agvConfig?.vehicleRightWidth * this._unitZoom;
      if (
        value?.agvConfig?.vehicleFrontLength &&
        this.isNumber(value?.agvConfig?.vehicleFrontLength)
      )
        agvConfig.vehicleFrontLength =
          value?.agvConfig?.vehicleFrontLength * this._unitZoom;
      if (
        value?.agvConfig?.vehicleRearLength &&
        this.isNumber(value?.agvConfig?.vehicleRearLength)
      )
        agvConfig.vehicleRearLength =
          value?.agvConfig?.vehicleRearLength * this._unitZoom;
      // 计算车体总尺寸（包含货叉）
      agvConfig.length =
        agvConfig.vehicleFrontLength + agvConfig.vehicleRearLength;
      agvConfig.width =
        agvConfig.vehicleLeftWidth + agvConfig.vehicleRightWidth;
      agvConfig.anchorX = agvConfig.vehicleRearLength / agvConfig.length;
      agvConfig.anchorY = agvConfig.vehicleLeftWidth / agvConfig.width;
      // 计算车体尺寸（不包含货叉部分）
      agvConfig.vehicleWidth =
        agvConfig.vehicleLeftWidth + agvConfig.vehicleRightWidth;
      const vehicleLength =
        agvConfig.vehicleFrontLength +
        agvConfig.vehicleRearLength -
        agvConfig.forkLength;
      if (vehicleLength > 0) agvConfig.vehicleLength = vehicleLength;
      agvConfig.vehicleY = agvConfig.vehicleWidth / 2
      // 计算货叉数据
      agvConfig.freightLength = agvConfig.forkLength - (agvConfig.freightOffset * 2);
      agvConfig.freightWidth = agvConfig.width;
      agvConfig.freightX = agvConfig.freightOffset - agvConfig.vehicleRearLength;
      // 计算图标数据
      agvConfig.tagX = agvConfig.vehicleFrontLength - agvConfig.vehicleLength / 2;
      // 计算背景数据
      agvConfig.bgWidth = agvConfig.length;
      agvConfig.bgLength = agvConfig.length;
      agvConfig.bgX = agvConfig.vehicleFrontLength;
    }
    console.log("agvConfig", agvConfig);
    // 处理状态数据
    const state = value?.state ? value.state : 0;
    const charging = value?.charging ? value?.charging : false;
    const loading = value?.loading ? value.loading : false;
    const agvSerial = value?.serial ? value?.serial : "";
    if (
      value.hasOwnProperty("anchorOnce") &&
      this.isNumber(value["anchorOnce"]["x"]) &&
      this.isNumber(value["anchorOnce"]["y"])
    ) {
      const x = this.getMapCoordiateX(value["anchorOnce"]["x"]);
      const y = this.getMapCoordiateY(value["anchorOnce"]["y"]);
      // 判断当前AGV点位是否在VNL轮廓内，在轮廓内需要把视口移动到AGV位置
      if (
        x >= this._outlineData.vnlOutline.left &&
        x <= this._outlineData.vnlOutline.right &&
        y >= this._outlineData.vnlOutline.top &&
        y <= this._outlineData.vnlOutline.bottom
      ) {
        this.panCoordinateToCenter(x, y);
      }
    }

    // 创建动画容器，容器主要容纳AGV图标，以及各种标识图标
    const animateContainer = new PIXI.Container({ isRenderGroup: true });

    // 创建背景图Sprite
    const bgSprite: PIXI.Sprite = new PIXI.Sprite({
      texture: PIXI.Texture.EMPTY,
      width: agvConfig.bgWidth,
      height: agvConfig.bgLength,
    });
    bgSprite.anchor.set(agvConfig.bgAnchorX, agvConfig.bgAnchorY);
    // bgSprite.pivot.set(agvConfig.bgAnchorX, agvConfig.bgAnchorY);
    bgSprite.position.set(agvConfig.bgX, agvConfig.bgY);
    animateContainer.addChild(bgSprite);
    const bgImg = this.getAgvBgImgs(state);
    if (bgImg) {
      PIXI.Assets.load(bgImg).then((img) => {
        bgSprite.texture = img;
      });
    }

    // 创建主AGV元素
    const agvSprite: PIXI.Sprite = new PIXI.Sprite({
      texture: PIXI.Texture.EMPTY,
      width: agvConfig.length,
      height: agvConfig.width,
    });
    agvSprite.anchor.set(agvConfig.anchorX, agvConfig.anchorY);
    animateContainer.addChild(agvSprite)
    // 添加容器到覆盖图层
    this.elementRendered.covers.container.addChild(animateContainer);
    // 设置容器中心点
    animateContainer.pivot.set(agvConfig.anchorX, agvConfig.anchorY);


    let agvTexture
    const templeteContainer = new PIXI.Container({ isRenderGroup: true });
    // 创建主AGV图标
    const vehicleSprite: PIXI.Sprite = new PIXI.Sprite({
      texture: PIXI.Texture.EMPTY,
      width: agvConfig.vehicleLength,
      height: agvConfig.vehicleWidth,
    });
    vehicleSprite.anchor.set(agvConfig.vehicleAnchorX, agvConfig.vehicleAnchorY);
    // vehicleSprite.pivot.set(agvConfig.vehicleAnchorX, agvConfig.vehicleAnchorY);
    vehicleSprite.position.set(agvConfig.vehicleX, agvConfig.vehicleY);
    templeteContainer.addChild(vehicleSprite);
    PIXI.Assets.load(AGV_IMGS["vehicle"]).then((img) => {
      vehicleSprite.texture = img;
      // 创建货叉图标，多个
      const forkYArr = []
      switch(agvConfig.forkCount) {
        case 1:
          forkYArr[1] = agvConfig.vehicleLeftWidth
          break
        case 2:
          const forkOffset = (agvConfig.forkWidth / 2) + (agvConfig.forkDistance / 2)
          forkYArr[1] = agvConfig.vehicleLeftWidth - forkOffset
          forkYArr[2] = agvConfig.vehicleLeftWidth + forkOffset
          break
        case 3:
          forkYArr[1] = agvConfig.vehicleLeftWidth - agvConfig.forkWidth - agvConfig.forkDistance
          forkYArr[2] = agvConfig.vehicleLeftWidth
          forkYArr[3] = agvConfig.vehicleLeftWidth + agvConfig.forkWidth + agvConfig.forkDistance
          break
        case 4:
          forkYArr[1] = agvConfig.vehicleLeftWidth - (3 * agvConfig.forkWidth / 2) - (3 * agvConfig.forkDistance / 2)
          forkYArr[2] = agvConfig.vehicleLeftWidth - (agvConfig.forkWidth / 2) - (agvConfig.forkDistance / 2)
          forkYArr[3] = agvConfig.vehicleLeftWidth + (agvConfig.forkWidth / 2) + (agvConfig.forkDistance / 2)
          forkYArr[4] = agvConfig.vehicleLeftWidth + (3 * agvConfig.forkWidth / 2) + (3 * agvConfig.forkDistance / 2)
          break
        default:
          // 兼容少数场景和处理异常配置数据情况
          if (agvConfig.forkCount > 4) {
            // 判断货叉排布宽度是否超过车辆宽度
            const forksTotalWidth = agvConfig.forkDistance * (agvConfig.forkCount - 1) + agvConfig.forkWidth * agvConfig.forkCount
            if (forksTotalWidth <= agvConfig.vehicleWidth) {
              // 总货叉宽度和间距不大于车宽度，按照间距排列
              for (let i = 1; i <= agvConfig.forkCount; i++) {
                forkYArr[i] = agvConfig.vehicleLeftWidth + (-1 * (agvConfig.forkCount - 1) / 2 + (i - 1)) * (agvConfig.forkWidth + agvConfig.forkDistance)
              }
            } else {
              // 大于车辆宽度，数据有问题，等距排列
              const forkDistance = agvConfig.vehicleWidth / (agvConfig.forkCount + 1)
              for (let i = 1; i <= agvConfig.forkCount; i++) {
                forkYArr[i] = forkDistance * i
              }
            }
          }
          break
      }
      for (let i = 1; i <= agvConfig.forkCount; i++) {
        const forkSprite: PIXI.Sprite = new PIXI.Sprite({
          texture: PIXI.Texture.EMPTY,
          width: agvConfig.forkLength,
          height: agvConfig.forkWidth,
        });
        const currentForkY = forkYArr[i];
        forkSprite.anchor.set(agvConfig.forkAnchorX, agvConfig.forkAnchorY);
        // forkSprite.pivot.set(agvConfig.forkAnchorX, agvConfig.forkAnchorY);
        forkSprite.position.set(agvConfig.forkX, currentForkY);
        templeteContainer.addChild(forkSprite);
        PIXI.Assets.load(AGV_IMGS["fork"]).then((img) => {
          forkSprite.texture = img;
          if (i === agvConfig.forkCount) {
            // 最后一个货叉装上后
            // 添加容器到覆盖图层
            this.elementRendered.covers.container.addChild(templeteContainer);
            templeteContainer.width = agvConfig.length
            templeteContainer.height = agvConfig.width
            // 生成container纹理
            agvTexture = this.app.renderer.generateTexture(templeteContainer);
            agvSprite.texture = agvTexture
            _agvEntryTarget.agvTexture = agvTexture

            // 清除组装前的元素
            templeteContainer.destroy()
          }
        });
      }
    });
    
    // 创建状态图标
    const agvStatusSprite: PIXI.Sprite = new PIXI.Sprite({
      texture: PIXI.Texture.EMPTY,
      width: agvConfig.tagLength,
      height: agvConfig.tagWidth,
    });
    agvStatusSprite.anchor.set(agvConfig.tagAnchorX, agvConfig.tagAnchorY);
    // agvStatusSprite.pivot.set(agvConfig.tagAnchorX, agvConfig.tagAnchorY);
    agvStatusSprite.position.set(agvConfig.tagX, agvConfig.tagY2);
    animateContainer.addChild(agvStatusSprite);
    const statusImg = this.getAgvTagImgs(state);
    if (statusImg) {
      PIXI.Assets.load(statusImg).then((img) => {
        agvStatusSprite.texture = img;
      });
    }
    // 创建充电图标
    const chargingSprite: PIXI.Sprite = new PIXI.Sprite({
      texture: PIXI.Texture.EMPTY,
      width: agvConfig.tagLength,
      height: agvConfig.tagWidth,
    });
    chargingSprite.anchor.set(agvConfig.tagAnchorX, agvConfig.tagAnchorY);
    // chargingSprite.pivot.set(agvConfig.tagAnchorX, agvConfig.tagAnchorY);
    chargingSprite.position.set(agvConfig.tagX, agvConfig.tagY1);
    animateContainer.addChild(chargingSprite);
    const chargingImg = this.getChargingImgs();
    if (charging && chargingImg) {
      PIXI.Assets.load(chargingImg).then((img) => {
        chargingSprite.texture = img;
      });
    }
    // 创建取货图标
    const loadingSprite: PIXI.Sprite = new PIXI.Sprite({
      texture: PIXI.Texture.EMPTY,
      width: agvConfig.freightLength,
      height: agvConfig.freightWidth,
    });
    loadingSprite.anchor.set(
      agvConfig.freightAnchorX,
      agvConfig.freightAnchorY
    );
    // loadingSprite.pivot.set(agvConfig.freightAnchorX, agvConfig.freightAnchorY);
    loadingSprite.position.set(agvConfig.freightX, agvConfig.freightY);
    animateContainer.addChild(loadingSprite);
    const loadingImg = this.getLoadingImgs();
    if (loading && loadingImg) {
      PIXI.Assets.load(loadingImg).then((img) => {
        loadingSprite.texture = img;
      });
    }

    // 创建编号元素
    let serialText = new PIXI.Text({
      text: "",
      style: new PIXI.TextStyle({
        align: "center",
        fontSize: 20,
        fontWeight: "bold",
        fill: { color: "#EB2829" },
        stroke: { color: "#EB2829" },
      }),
    });
    serialText.anchor.set(0.5, 1);
    // serialText.pivot.set(0.5, 1);
    if (agvSerial) {
      serialText.text = agvSerial;
      this.elementRendered.covers.container.addChild(serialText);
    }

    // 判断是否已经开启锚定状态
    if (
      this._anchorState &&
      this._anchorSerial &&
      this._anchorSerial === unique
    ) {
      this._anchorContainer = animateContainer;
    }

    // 实例目标
    const _agvEntryTarget: IAgvEntry = {
      unique: unique, // AGV编号，唯一标识
      agvConfig: agvConfig, // AGV图标尺寸和中心点偏移值，与车型相关
      agvTexture: agvSprite.texture, // AGV图标纹理
      model: model, // AGV型号
      state: state, // AGV状态
      charging: charging, // 当前车是否在充电
      loading: loading, // 当前车上是否有货
      serial: agvSerial, // AGV编号
      serialText: serialText, // 编号元素
      taskType: "", // 任务类型，暂时闲置，不会触发任何
      animateContainer: animateContainer, // 动画容器
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
      animateContainer.cursor = "pointer";
      animateContainer.on("pointerdown", agvEleClickEvent);
    }

    // 实例回调
    const _agvEntryHandle = {
      set: (obj: any, prop: any, value: any) => {
        switch (prop) {
          case "model":
            obj[prop] = value;
            break;
          case "state":
            if (obj[prop] !== value) {
              // 新设置的值不同于旧的值才触发
              obj[prop] = value;
              // 更新BG图
              const bgImg = this.getAgvBgImgs(obj["state"]);
              if (bgImg) {
                PIXI.Assets.load(bgImg).then((img) => {
                  bgSprite.texture = img;
                });
              } else {
                bgSprite.texture = PIXI.Texture.EMPTY;
              }
              // 更新状态图标
              const statusImg = this.getAgvTagImgs(obj["state"]);
              if (statusImg) {
                PIXI.Assets.load(statusImg).then((img) => {
                  agvStatusSprite.texture = img;
                });
              } else {
                agvStatusSprite.texture = PIXI.Texture.EMPTY;
              }
            }
            break;
          case "charging":
            if (obj[prop] !== value) {
              // 新设置的值不同于旧的值才触发
              obj[prop] = value;
              // 更新充电图标
              const chargingImg = this.getChargingImgs();
              if (value && chargingImg) {
                PIXI.Assets.load(chargingImg).then((img) => {
                  chargingSprite.texture = img;
                });
              } else {
                chargingSprite.texture = PIXI.Texture.EMPTY;
              }
            }
            break;
          case "loading":
            if (obj[prop] !== value) {
              // 新设置的值不同于旧的值才触发
              obj[prop] = value;
              // 更新货载图
              const loadingImg = this.getLoadingImgs();
              if (value && loadingImg) {
                PIXI.Assets.load(loadingImg).then((img) => {
                  loadingSprite.texture = img;
                });
              } else {
                loadingSprite.texture = PIXI.Texture.EMPTY;
              }
            }
            break;
          case "serial":
            if (obj[prop] !== value) {
              // 新设置的值不同于旧的值才触发
              obj[prop] = value;
              // 设置编号
              serialText.text = value;
            }
            break;
          case "taskType":
            if (obj[prop] !== value) {
              // 新设置的值不同于旧的值才触发
              obj[prop] = value;
              // 任务状态暂时不影响车辆图标
            }
            break;
        }
        return true;
      },
    };
    // 实体代理
    const targetProxy = Proxy.revocable(_agvEntryTarget, _agvEntryHandle);
    // 定义AGV动画代理
    const animateProxy = this.createAnimateProxy(_agvEntryTarget);
    _agvEntryTarget.animateQueue = animateProxy.proxy;
    // 创建销毁代理的方法
    _agvEntryTarget.destroy = () => {
      target[prop] = _agvEntryTarget;
      _agvEntryTarget.animateQueue = [];
      // 销毁元素
      bgSprite.destroy();
      agvSprite.destroy();
      agvStatusSprite.destroy();
      chargingSprite.destroy();
      loadingSprite.destroy();
      animateContainer.destroy();
      serialText.destroy();
      targetProxy.revoke();
      animateProxy.revoke();
    };
    return targetProxy.proxy;
  }
  /**
   * 创建动画代理
   * @param agvEntry
   * @returns
   */
  private createAnimateProxy(agvEntry: IAgvEntry) {
    const movingPoints: IPoint[] = [];
    const handler: any = {
      set: (target: any, prop: any, value: any) => {
        if (prop === "length") {
          // 数组形式的object，set第二步才后设置长度
          return Reflect.set(target, prop, value);
        } else {
          // 数组形式的object，set第一步先设置值
          const { x, y, theta } = value || { x: 0, y: 0, theta: 0 };
          const point = {
            x: this.getMapCoordiateX(Number.parseFloat(x)),
            y: this.getMapCoordiateY(Number.parseFloat(y)),
            theta: this.piToRotate(Number.parseFloat(theta)),
          };
          return Reflect.set(target, prop, point);
        }
      },
    };
    const proxyRevocable = Proxy.revocable(movingPoints, handler);
    // 开启动画循环
    const animateLoop = () => {
      if (movingPoints.length) {
        const point: IPoint = movingPoints.shift();
        const x = agvEntry.animateContainer.x;
        const y = agvEntry.animateContainer.y;
        const rotation = agvEntry.animateContainer.rotation;
        // 位姿不同才动画
        if (point.x !== x || point.y !== y || point.theta !== rotation) {
          // 移动AGV
          agvEntry.animateContainer.position.set(point.x, point.y);
          agvEntry.animateContainer.rotation = point.theta || 0;
          // 移动编号
          if (agvEntry.serial && agvEntry.serialText) {
            const serialX = point.y - 100;
            agvEntry.serialText.position.set(point.x, serialX);
          }
        }
      }
    };
    if (this.app.ticker) {
      this.app.ticker.maxFPS = 10;
      this.app.ticker.add(animateLoop);
    }

    // 返回动画代理对象
    return {
      proxy: proxyRevocable.proxy,
      revoke: () => {
        // 销毁代理
        proxyRevocable.revoke;
        // 移除ticker
        this.app?.ticker?.remove(animateLoop);
      },
    };
  }
}
