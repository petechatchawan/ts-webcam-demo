import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: 'webcam',
        loadComponent: () => import('./webcam/webcam.component').then((m) => m.WebcamComponent),
    },
    {
        path: '',
        redirectTo: 'webcam',
        pathMatch: 'full',
    },
];
