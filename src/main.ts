import { bootstrapApplication } from '@angular/platform-browser';
import {
    PreloadAllModules,
    RouteReuseStrategy,
    provideRouter,
    withPreloading,
} from '@angular/router';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';

import { importProvidersFrom } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';

bootstrapApplication(AppComponent, {
    providers: [
        { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
        provideIonicAngular(),
        provideRouter(routes, withPreloading(PreloadAllModules)),
        provideIonicAngular({}),
        importProvidersFrom(IonicModule.forRoot()),
    ],
});
