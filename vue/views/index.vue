<template>
  <div class="container">
    <div class="left"></div>
    <div class="main" ref="mainRef" id="main"></div>
  </div>
</template>
<script setup lang="ts">
import { ref } from "vue";
import * as PIXI from "pixi.js";
import sampleImg from "../images/sample.png";
import bgMapImg from "../images/map.png";
import vnlL from "../vnl/mapL.ts";
import svgCharging from "../images/charging.svg";
import svgStop from "../images/stop.svg";


const mainRef = ref();

const app = new PIXI.Application();

app
  .init({
    background: "#f5f5f5",
    // background: "#1099bb",
    antialias: true,
    resizeTo: mainRef.value,
    width: 1024,
    height: 850,
  })
  .then(() => {
    mainRef.value.appendChild(app.canvas);

    // 主容器，装着主要元素
    const contain1 = new PIXI.Container()
    const contain2 = new PIXI.Container()

    const vnl1 = new PIXI.Graphics()
    vnl1.moveTo(200, 100)
    vnl1.lineTo(100, 100)
    vnl1.lineTo(100, 200)
    vnl1.lineTo(200, 200)
    vnl1.stroke({ color: 0xFF0000, width: 4 })
    vnl1.pivot = 0.5
    // vnl1.rotation = 0
    vnl1.angle = 0

    const vnl2 = new PIXI.Graphics()
    vnl2.moveTo(400, 250)
    vnl2.lineTo(300, 250)
    vnl2.lineTo(300, 350)
    vnl2.lineTo(400, 350)
    vnl2.stroke({ color: 0xFFFF00, width: 4 })
    vnl2.pivot = 0.5
    // vnl2.rotation = Math.PI * 0.5
    vnl2.angle = 90

    const vnl3 = new PIXI.Graphics()
    vnl3.moveTo(200, 400)
    vnl3.lineTo(100, 400)
    vnl3.lineTo(100, 500)
    vnl3.lineTo(200, 500)
    vnl3.stroke({ color: 0x0000FF, width: 4 })
    vnl3.pivot = 0.5
    // vnl3.rotation = Math.PI
    vnl3.angle = 180

    const vnl4 = new PIXI.Graphics()
    vnl4.moveTo(400, 550)
    vnl4.lineTo(300, 550)
    vnl4.lineTo(300, 650)
    vnl4.lineTo(400, 650)
    vnl4.stroke({ color: 0x00FF00, width: 4 })
    vnl4.pivot = 0.5
    // vnl4.rotation = Math.PI * 1.5
    vnl4.angle = 270

    for(let l = 1; l <= 5; l++) {
      const lineG = new PIXI.Graphics()
      lineG.moveTo(Math.random() * 500, Math.random() * 500)
      lineG.lineTo(Math.random() * 1000, Math.random() * 1000)
      lineG.stroke({ color: 0xffffff, width: 2 })
      contain1.addChild(lineG)
    }
    contain2.addChild(vnl1)
    contain2.addChild(vnl2)
    contain2.addChild(vnl3)
    contain2.addChild(vnl4)

    const contain = new PIXI.Container()
    contain.addChild(contain1)
    contain.addChild(contain2)

    // 导入静态文件
    /* PIXI.Assets.load(bgMapImg).then((backgroundImgTexture) => {
      console.log('Assets.load-bgMapImg', backgroundImgTexture)
      // 渲染背景图精灵
      const backgroundImgSprite = PIXI.Sprite.from(backgroundImgTexture)
        // 摆正精灵位置和大小
        backgroundImgSprite.width = app.screen.width
        backgroundImgSprite.height = app.screen.height
        const containImg = new PIXI.Container()
        containImg.addChild(backgroundImgSprite)
        // 设置背景精灵到最底图层 0
        containImg.zIndex = 0
        // 设置透明度
        containImg.alpha = 0.5
        // 处理背景色
        const filter1 = new PIXI.ColorMatrixFilter()
        filter1.negative(true)
        containImg.filters = [filter1]

        
        contain.addChild(containImg)
    }) */
    
    contain.x = 0
    contain.y = 0
    contain.width = app.screen.width
    contain.height = app.screen.height
    contain.pivot.set(app.screen.width / 2, app.screen.height / 2)
    // contain.rotation = Math.PI / 2
    contain.position.set(app.screen.width / 2 , app.screen.height / 2)

    contain.eventMode = 'static'
    contain.hitArea = new PIXI.Rectangle(0, 0, app.screen.width, app.screen.height);
    contain.onwheel  = (event) => {
      // contain.pivot.set(event.screenX, event.screenY)
      // 向上滚，负数，需要放大
      // 向下滚，正数，需要缩小
      const deltaY = event.deltaY
      if (deltaY > 0) {
        contain.scale = contain.scale.x - 0.1
      } else {
        contain.scale = contain.scale.x + 0.1
      }
      console.log('contain', event, contain.width, contain.height)
    }
    
    
    // 第二个容器 底层
    const c1 = new PIXI.Container()
    const c1Texture = new PIXI.GraphicsContext().circle(0, 0, 50).fill('red')
    for(let i = 1; i <= 3; i++) {
      const c1G = new PIXI.Graphics(c1Texture)
      c1G.x = Math.random() * 500
      c1G.y = Math.random() * 500
      c1.addChild(c1G)
    }
    c1.pivot.set(c1.width / 2, c1.height / 2)
    c1.position.set(app.screen.width / 2 , app.screen.height / 2)
    /* const sampleI = PIXI.Assets.load(sampleImg)
    sampleI.then((textures) => {
      const sprit = PIXI.Sprite.from(textures)
      contain.addChild(sprit)
    }) */
    c1.zIndex = 0
    contain.zIndex = 1

    const maskRect = new PIXI.Graphics().rect(0, 0, app.screen.width, app.screen.height)
    .fill({ color: 0xf5f5f5, alpha: 0 })
    app.stage.addChild(maskRect)

    contain.mask = maskRect
    // app.stage.mask = maskRect
    
    /* PIXI.Assets.load({
      src: svgCharging,
      data: {
          parseAsGraphicsContext: true,
      },
    }).then((svgChargingTexture) => {
    }) */
    /* const svgChargingGraphic = new PIXI.Graphics().svg(`<svg width="12px" height="12px" viewBox="0 0 12 12" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <g id="1.9版本08月15" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="库位样式说明" transform="translate(-600.000000, -724.000000)">
            <g id="充电" transform="translate(600.000000, 724.000000)">
                <rect id="矩形" x="0" y="0" width="12" height="12"></rect>
                <path d="M11.4021739,1 C11.7323444,1 12,1.32920209 12,1.73529412 L12,10.2647059 C12,10.6707979 11.7323444,11 11.4021739,11 L1.35869565,11 C1.16059342,11 1,10.8024787 1,10.5588235 L1,8 L2.4492936e-16,7 L3.6739404e-16,5 L1,4 L1,1.44117645 C1,1.19752125 1.16059337,1 1.35869565,1 L11.4021739,1 Z M11.4021739,1.5 L1.5,1.5 L1.5,4.20710678 L0.5,5.207 L0.5,6.794 L1.5,7.79289322 L1.5,10.5 L11.4021739,10.5 C11.4250302,10.5 11.4739251,10.4454842 11.4925688,10.3468199 L11.5,10.2647059 L11.5,1.73529412 C11.5,1.61520354 11.4556763,1.53666965 11.4233188,1.51005972 L11.4021739,1.5 Z M6.42776271,3.91059596 L6.51752511,3.925941 L9.62656242,6.65029933 C9.87123014,6.88238922 9.62656242,7.03949338 9.62656242,7.03949338 L9.62656242,7.03949338 L6.78787622,7.03949338 L6.78787622,8.07734417 C6.72028845,8.17152913 6.51752515,8.07734417 6.51752515,8.07734417 L6.51752515,8.07734417 L3.27331231,5.22325451 C3.25709124,4.89892614 3.54366337,4.96379181 3.54366337,4.96379181 L3.54366337,4.96379181 L6.24717404,4.96379181 L6.24717404,3.92594103 C6.33569554,3.90292344 6.42900375,3.90292344 6.51752511,3.925941 Z" id="形状结合" fill="#08B562" fill-rule="nonzero"></path>
            </g>
        </g>
    </g>
</svg>`);
    svgChargingGraphic.position.set(app.screen.width / 2, app.screen.height / 2)
    app.stage.addChild(svgChargingGraphic); */

    // const pathGSvg = new PIXI.GraphicsContext().svg('M100,100 A50,50 0 0 0 150,50')
    function lineAngle(x1: number, y1: number, x2: number, y2: number) {
    const diffX = x2 - x1
    const diffY = y2 - y1
    // 如果都是0，说明是一个点，不是一条线，直接返回0
    if (diffX === 0 && diffY === 0) return 0
    // 是一条直线时
    if (diffX === 0) {
      // 竖线
      if (diffY > 0) {
        return 270
      } else {
        return 90
      }
    } else if (diffY === 0) {
      // 横线
      if (diffX > 0) {
        return 180
      } else {
        return 0
      }
    } else {
      // 斜线
      const a = (Math.atan(Math.abs(diffY) / Math.abs(diffX)) / Math.PI) * 180
      if (diffX > 0) {
        if (diffY > 0) {
          return 180 + a
        } else {
          return 180 - a
        }
      } else {
        if (diffY > 0) {
          return 360 - a
        } else {
          return a
        }
      }
    }
  }
    const pathG = new PIXI.Graphics()
    pathG.moveTo(100, 100)
    pathG.arcToSvg(50,50,lineAngle(100, 100, 100,200),0 ,1 ,100,200)

    pathG.moveTo(300, 200)
    pathG.arcToSvg(50,50,lineAngle(300, 200, 300,100),0 ,0 ,300,100)
    
    pathG.stroke({color: 0xFF0000, width: 5})
    const pathC = new PIXI.Container()
    pathC.addChild(pathG)
    // pathC.pivot.set(pathC.width / 2, pathC.height / 2)
    const localBounds = pathC.getLocalBounds()
    // pathC.position.set(localBounds.x, localBounds.y)
    pathC.x = localBounds.x
    pathC.y = localBounds.y
    pathC.zIndex = 2

    app.stage.addChild(contain);
    app.stage.addChild(c1);
    app.stage.addChild(pathC);
    // app.stage.addChild(pathG);

    console.log('pathC-getBounds', pathC.getBounds(), pathC.getLocalBounds(),pathC.boundsArea)
    // app.stage.x = -10000000
    // app.stage.y = -10000000
    // console.log('app.stage', app.stage)
  });

// spritesheet测试
/* app.init({resizeTo: window }).then(() => {
  document.body.appendChild(app.canvas);

  // Create object to store sprite sheet data
  const atlasData = {
      frames: {
          enemy1: {
              frame: { x: 0, y:0, w:32, h:32 },
              sourceSize: { w: 32, h: 32 },
              spriteSourceSize: { x: 0, y: 0, w: 32, h: 32 }
          },
          enemy2: {
              frame: { x: 32, y:0, w:32, h:32 },
              sourceSize: { w: 32, h: 32 },
              spriteSourceSize: { x: 0, y: 0, w: 32, h: 32 }
          },
      },
      meta: {
          image: 'images/spritesheet.png',
          format: 'RGBA8888',
          size: { w: 128, h: 32 },
          scale: 1
      },
      animations: {
          enemy: ['enemy1','enemy2'] //array of frames by name
      }
  }
  
  
  // Create the SpriteSheet from data and image
  const spritesheet = new PIXI.Spritesheet(
    PIXI.Texture.from(atlasData.meta.image),
      atlasData
  );
  
  // Generate all the Textures asynchronously
  spritesheet.parse().then(() => {
    // spritesheet is ready to use!
    const anim = new PIXI.AnimatedSprite(spritesheet.animations.enemy);
    
    // set the animation speed
    anim.animationSpeed = 0.1666;
    // play the animation on a loop
    anim.play();
    // add it to the stage to render
    app.stage.addChild(anim);
  })
  
}) */

// mask示例
/* app.init({resizeTo: window }).then(() => {
  document.body.appendChild(app.canvas);

  // Create window frame
  let frame = new PIXI.Graphics({
    x:320 - 104,
    y:180 - 104
  })
  .rect(0, 0, 208, 208)
  .fill(0x666666)
  .stroke({ color: 0xffffff, width: 4, alignment: 0 })
  
  app.stage.addChild(frame);
  
  // Create a graphics object to define our mask
  let mask = new PIXI.Graphics()
  // Add the rectangular area to show
   .rect(0,0,200,200)
   .fill(0xffffff);
  
  // Add container that will hold our masked content
  let maskContainer = new PIXI.Container();
  // Set the mask to use our graphics object from above
  maskContainer.mask = mask;
  // Add the mask as a child, so that the mask is positioned relative to its parent
  maskContainer.addChild(mask);
  // Offset by the window's frame width
  maskContainer.position.set(4,4);
  // And add the container to the window!
  frame.addChild(maskContainer);
  
  // Create contents for the masked container
  let text = new PIXI.Text({
    text:'This text will scroll up and be masked, so you can see how masking works.  Lorem ipsum and all that.\n\n' +
    'You can put anything in the container and it will be masked!',
    style: {
      fontSize: 24,
      fill: 0x1010ff,
      wordWrap: true,
      wordWrapWidth: 180
    },
    x:10
  });
  
  maskContainer.addChild(text);
  
  // Add a ticker callback to scroll the text up and down
  let elapsed = 0.0;
  app.ticker.add(({deltaTime}) => {
    // Update the text's y coordinate to scroll it
    elapsed += deltaTime;
    text.y = 10 + -100.0 + Math.cos(elapsed/50.0) * 100.0;
  });
}) */

// backgroundLoad
/* async function init()
{
    // Initialize the application
    await app.init({ background: '#1099bb', resizeTo: window });

    // Append the application canvas to the document body
    document.body.appendChild(app.canvas);

    // Manifest example
    const manifestExample = {
        bundles: [
            {
                name: 'load-screen',
                assets: [
                    {
                        alias: 'flowerTop',
                        src: 'https://pixijs.com/assets/flowerTop.png',
                    },
                ],
            },
            {
                name: 'game-screen',
                assets: [
                    {
                        alias: 'eggHead',
                        src: 'https://pixijs.com/assets/eggHead.png',
                    },
                ],
            },
        ],
    };

    await PIXI.Assets.init({ manifest: manifestExample });

    // Bundles can be loaded in the background too!
    PIXI.Assets.backgroundLoadBundle(['load-screen', 'game-screen']);
}

init(); */

// 预加载多个静态资源
/* app.init({ background: '#1099bb', resizeTo: window }).then(() => {
  document.body.appendChild(app.canvas);

  // 预加载多个静态资源
  PIXI.Assets.add({ alias: 'flowerTop', src: 'https://pixijs.com/assets/flowerTop.png' });
  PIXI.Assets.add({ alias: 'eggHead', src: 'https://pixijs.com/assets/eggHead.png' });
  // Load the assets and get a resolved promise once both are loaded
  const texturesPromise = PIXI.Assets.load(['flowerTop', 'eggHead']); // => Promise<{flowerTop: Texture, eggHead: Texture}>
  // When the promise resolves, we have the texture!
  texturesPromise.then((textures) =>
  {
      // Create a new Sprite from the resolved loaded Textures
      const flower = PIXI.Sprite.from(textures.flowerTop);
      flower.anchor.set(0.5);
      flower.x = app.screen.width * 0.25;
      flower.y = app.screen.height / 2;
      app.stage.addChild(flower);
      const egg = PIXI.Sprite.from(textures.eggHead);
      egg.anchor.set(0.5);
      egg.x = app.screen.width * 0.75;
      egg.y = app.screen.height / 2;
      app.stage.addChild(egg);
  });
}) */

// 载入静态资源
/* app.init({ background: '#1099bb', resizeTo: window }).then(() => {
  document.body.appendChild(app.canvas);
  
  // Start loading right away and create a promise
  const texturePromise = PIXI.Assets.load('https://pixijs.com/assets/bunny.png');
  
  // When the promise resolves, we have the texture!
  texturePromise.then((resolvedTexture) =>
  {
      // create a new Sprite from the resolved loaded Texture
      const bunny = PIXI.Sprite.from(resolvedTexture);
  
      // center the sprite's anchor point
      bunny.anchor.set(0.5);
  
      // move the sprite to the center of the screen
      bunny.x = app.screen.width / 2;
      bunny.y = app.screen.height / 2;
  
      app.stage.addChild(bunny);
  });
}) */

// 树状ABCD结构演示
/* app.init({ width: 640, height: 360 }).then(() => {
  document.body.appendChild(app.canvas);
  // Label showing scene graph hierarchy
  const label = new PIXI.Text({
    text:'Scene Graph:\n\napp.stage\n  ┗ A\n     ┗ B\n     ┗ C\n  ┗ D',
    style:{fill: '#ffffff'},
    position: {x: 300, y: 100}
  });

  app.stage.addChild(label);

  // Helper function to create a block of color with a letter
  const letters = [];
  function addLetter(letter, parent, color, pos) {
    const bg = new PIXI.Sprite(PIXI.Texture.WHITE);
    bg.width = 100;
    bg.height = 100;
    bg.tint = color;

    const text = new PIXI.Text({
      text:letter,
      style:{fill: "#ffffff"}
    });

    text.anchor.set(0.5);
    text.position = {x: 50, y: 50};

    const container = new PIXI.Container();
    container.position = pos;
    container.visible = false;
    container.addChild(bg, text);
    parent.addChild(container);

    letters.push(container);
    return container;
  }

  // Define 4 letters
  let a = addLetter('A', app.stage, 0xff0000, {x: 100, y: 100});
  let b = addLetter('B', a,         0x00ff00, {x: 20,  y: 20});
  let c = addLetter('C', a,         0x0000ff, {x: 20,  y: 40});
  let d = addLetter('D', app.stage, 0xff8800, {x: 140, y: 100});

  // Display them over time, in order
  let elapsed = 0.0;
  app.ticker.add((ticker) => {
    elapsed += ticker.deltaTime / 60.0;
    if (elapsed >= letters.length) { elapsed = 0.0; }
    for (let i = 0; i < letters.length; i ++) {
      letters[i].visible = elapsed >= i;
    }
  });
}) */

// 父子关系相对运动
/* app.init({ width: 640, height: 360 }).then(() => {
  document.body.appendChild(app.canvas);

  // Add a container to center our sprite stack on the page
  const container = new PIXI.Container({
    x:app.screen.width / 2,
    y:app.screen.height / 2
  });
  
  app.stage.addChild(container);
  // load the texture
  PIXI.Assets.load(sampleImg).then(() => {
    // Create the 3 sprites, each a child of the last
    const sprites = [];
    let parent = container;
    for (let i = 0; i < 3; i++) {
      let wrapper = new PIXI.Container();
      let sprite = PIXI.Sprite.from(sampleImg);
      sprite.anchor.set(0.5);
      wrapper.addChild(sprite);
      parent.addChild(wrapper);
      sprites.push(wrapper);
      parent = wrapper;
    }

    // Set all sprite's properties to the same value, animated over time
    let elapsed = 0.0;
    app.ticker.add((ticker) => {
      elapsed += ticker.deltaTime / 60;
      const amount = Math.sin(elapsed);
      const scale = 1.0 + 0.25 * amount;
      const alpha = 0.75 + 0.25 * amount;
      const angle = 40 * amount;
      const x = 75 * amount;
      for (let i = 0; i < sprites.length; i++) {
        const sprite = sprites[i];
        sprite.scale.set(scale);
        sprite.alpha = alpha;
        sprite.angle = angle;
        sprite.x = x;
      }
    });
  })
}) */

// 单个sprite运动
/* app.init({ width: 640, height: 360 }).then(() => {
  document.body.appendChild(app.canvas);
  // Create the sprite and add it to the stage
  PIXI.Assets.load(sampleImg).then(() => {
    let sprite = PIXI.Sprite.from(sampleImg);
    app.stage.addChild(sprite);
    // Add a ticker callback to move the sprite back and forth
    let elapsed = 0.0;
    app.ticker.add((ticker) => {
      elapsed += ticker.deltaTime;
      sprite.x = 100.0 + Math.cos(elapsed/50.0) * 100.0;
    });
  })
}) */
</script>
<style>
.container {
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  width: 90vw;
  height: 90vh;
}
.left {
  height: 100%;
  width: 20vw;
}
.main {
  height: 100%;
  width: 80vw;
  border: 1px solid #000;
}
</style>
