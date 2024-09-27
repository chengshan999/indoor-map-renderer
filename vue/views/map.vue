<template>
  <div
    ref="mapContentRef"
    class="map-box"
  >
  </div>
</template>
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import Renderer from '../../src/canvas/Index'
import bgMapImg from "../images/map.png";
import vnlL from "../vnl/mapL.ts";
import vnlLarge from "../vnl/largeMap.ts";
// import * as CryptoJS from 'crypto-js'

// 定义引用
const mapContentRef = ref() // 地图渲染容器

const mapRender = new Renderer()


onMounted(() => {
  // console.log('CryptoJS.sha256-vnlLarge', CryptoJS.SHA256(vnlLarge?.json).toString(CryptoJS.enc.Hex))
  // const result = vnlLarge
  const result = vnlL
  // return
  const _dataParam = {
    vnlData: result?.json,
    rectangle: result?.rectangle,
    rectangleCustom: result?.rectangleCustom,
    bagroundImgUrl: 'http://10.10.30.251:24311/api/services/file/Object/GetFile?Id=135',
    backgroundImgArgs: {
        "image": "map.png",
        "resolution": "0.020000",
        "origin": [
            "-26.739998",
            "-21.820000",
            "0.000000"
        ],
        "occupied_thresh": "0.65",
        "free_thresh": "0.196",
        "negate": "1"
    },
  }
  const _renderEle = {
    backgroundImg: true, // 是否渲染分区地图底图
    vnl: true, // 是否渲染分区地图
    path: true, // 是否渲染路径
    park: true, // 是否渲染库位
    parkId: true, // 是否渲染库位编号
    point: true, // 是否渲染点位
  }
  console.log('_dataParam', _dataParam.rectangle)
  mapRender.render(mapContentRef.value, _dataParam, _renderEle, {
    parkSelect: true,
    pointSelect: true,
    // areaDraw: true,
  })

  mapRender.eventCondition.parkSelectMultiple = true

})
</script>

<style scoped>
.map-box {
  width: 98vw;
  height: 98vh;
  border: 1px solid #f5f5f5;
}
</style>