import { Routes } from '@angular/router';
import { WebcamComponent } from './webcam/webcam.component';

export const routes: Routes = [
    {
        path: 'webcam',
        component: WebcamComponent,
    },
    {
        path: '',
        redirectTo: 'webcam',
        pathMatch: 'full',
    },
];
