import { Routes } from '@angular/router';

import { requireTokenGuard } from './core/auth/require-token.guard';
import { TokenSetupPage } from './features/auth/token-setup.page';
import { RevisionTodayPage } from './features/revision-session/revision-today.page';

export const routes: Routes = [
  {
    path: 'setup',
    component: TokenSetupPage,
    title: 'Access token setup',
  },
  {
    path: '',
    pathMatch: 'full',
    component: RevisionTodayPage,
    title: "Today's Revision",
    canActivate: [requireTokenGuard],
  },
];
