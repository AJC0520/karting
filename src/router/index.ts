import type { RouteRecordRaw } from 'vue-router'

import HomeView from '@/views/HomeView.vue'
import TournamentsView from '@/views/TournamentsView.vue'
import HowToUseView from '@/views/HowToUseView.vue'
import CreateTournamentView from '@/views/CreateTournamentView.vue'
import LeaderboardView from '@/views/LeaderboardView.vue'
import RacesView from '@/views/RacesView.vue'
import AddRaceView from '@/views/AddRaceView.vue'
import PlayersView from '@/views/PlayersView.vue'
import MapView from '@/views/MapView.vue'
import LoginView from '@/views/LoginView.vue'
import SignupView from '@/views/SignupView.vue'
import BeerikartView from '@/views/BeerikartView.vue'

export const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { requiresGuest: true },
  },
  {
    path: '/signup',
    name: 'signup',
    component: SignupView,
    meta: { requiresGuest: true },
  },
  {
    path: '/',
    name: 'home',
    component: HomeView,
    meta: { requiresAuth: true },
  },
  {
    path: '/tournaments',
    name: 'tournaments',
    component: TournamentsView,
    meta: { requiresAuth: true },
  },
  {
    path: '/how-to-use',
    name: 'how-to-use',
    component: HowToUseView,
    meta: { requiresAuth: true },
  },
  {
    path: '/create-tournament',
    name: 'create-tournament',
    component: CreateTournamentView,
    meta: { requiresAuth: true },
  },
  {
    path: '/beeriokart',
    name: 'beeriokart',
    component: BeerikartView,
    meta: { requiresAuth: true },
  },
  {
    path: '/t/:id/leaderboard',
    name: 'leaderboard',
    component: LeaderboardView,
    meta: { requiresAuth: true },
  },
  {
    path: '/t/:id/races',
    name: 'races',
    component: RacesView,
    meta: { requiresAuth: true },
  },
  {
    path: '/t/:id/add-race',
    name: 'add-race',
    component: AddRaceView,
    meta: { requiresAuth: true },
  },
  {
    path: '/t/:id/players',
    name: 'players',
    component: PlayersView,
    meta: { requiresAuth: true },
  },
  {
    path: '/t/:id/map',
    name: 'map',
    component: MapView,
    meta: { requiresAuth: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
]
