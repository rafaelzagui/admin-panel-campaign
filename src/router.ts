import { createRouter, createWebHistory } from 'vue-router'
import CampaignDashboardPage from '@/pages/CampaignDashboardPage.vue'

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/campaigns',
    },
    {
      path: '/login',
      name: 'login',
      component: CampaignDashboardPage,
    },
    {
      path: '/campaigns',
      name: 'campaigns',
      component: CampaignDashboardPage,
    },
    {
      path: '/campaigns/:campaignId/:tab?',
      name: 'campaign-detail',
      component: CampaignDashboardPage,
    },
    {
      path: '/rules',
      name: 'rules',
      component: CampaignDashboardPage,
    },
    {
      path: '/audiences',
      name: 'audiences',
      component: CampaignDashboardPage,
    },
    {
      path: '/templates',
      name: 'templates',
      component: CampaignDashboardPage,
    },
    {
      path: '/executions',
      name: 'executions',
      component: CampaignDashboardPage,
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/campaigns',
    },
  ],
})
