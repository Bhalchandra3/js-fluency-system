import { Routes } from '@angular/router';

import { requireTokenGuard } from './core/auth/require-token.guard';
import { TokenSetupPage } from './features/auth/token-setup.page';
import { DashboardPage } from './features/dashboard/dashboard.page';
import { DeepDiveQueuePage } from './features/deep-dive/deep-dive-queue.page';
import { MistakeDetailPage } from './features/mistakes/mistake-detail.page';
import { MistakesListPage } from './features/mistakes/mistakes-list.page';
import { RevisionTodayPage } from './features/revision-session/revision-today.page';

export const routes: Routes = [
  {
    path: 'setup',
    component: TokenSetupPage,
    title: 'Access token setup',
  },
  {
    path: 'dashboard',
    component: DashboardPage,
    title: 'Dashboard',
    canActivate: [requireTokenGuard],
  },
  {
    path: 'mistakes',
    component: MistakesListPage,
    title: 'Mistake Log',
    canActivate: [requireTokenGuard],
  },
  {
    path: 'mistakes/:id',
    component: MistakeDetailPage,
    title: 'Mistake detail',
    canActivate: [requireTokenGuard],
  },
  {
    path: 'deep-dive',
    component: DeepDiveQueuePage,
    title: 'Deep Dive Queue',
    canActivate: [requireTokenGuard],
  },
  {
    path: '',
    pathMatch: 'full',
    component: RevisionTodayPage,
    title: "Today's Revision",
    canActivate: [requireTokenGuard],
  },
];
