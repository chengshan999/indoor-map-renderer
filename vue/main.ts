import { createApp } from "vue";

import App from "./App.vue";
import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/index.vue"),
    },
    {
      path: "/map",
      name: "map",
      component: () => import("@/views/map.vue"),
    },
  ],
});

const app = createApp(App);

app.use(router).mount("#app");
