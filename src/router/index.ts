import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Editor',
    component: () => import('@/components/VideoEditor.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
