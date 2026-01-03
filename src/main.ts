import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';

import { AppComponent } from './app/app.component';
import { APP_CONFIG } from './environments/environment';
import { CoreModule } from './app/core/core.module';
import { SharedModule } from './app/shared/shared.module';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { HttpClient } from '@angular/common/http';
import { PageNotFoundComponent } from './app/shared/components';
import { HomeComponent } from './app/home/home.component';
import { DetailComponent } from './app/detail/detail.component';
import { ConfigureComponent } from './app/configure/configure.component';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { PresetGridComponent } from './app/preset-area/preset-grid/preset-grid.component';

// AoT requires an exported function for factories
const httpLoaderFactory = (http: HttpClient): TranslateHttpLoader => new TranslateHttpLoader(http, './assets/i18n/', '.json');

if (APP_CONFIG.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter([
      {
        path: '',
        redirectTo: 'grid',
        pathMatch: 'full'
      },
      {
        path: 'configure',
        component: ConfigureComponent
      },
      {
        path: 'grid',
        component: PresetGridComponent
      },
      {
        path: 'detail',
        component: DetailComponent
      },
      {
        path: '**',
        component: PageNotFoundComponent
      }

      // TODO: Add an edit mode component that allows modifying the grid
    ]),
    importProvidersFrom(
      CoreModule,
      SharedModule,
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: httpLoaderFactory,
          deps: [HttpClient]
        }
      }),
      // Creates the NGX Logger - you can set level of what shows here.
      LoggerModule.forRoot({
        level: NgxLoggerLevel.TRACE
      })
    )
  ]
}).catch(err => console.error(err));
