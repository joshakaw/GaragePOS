import { TestBed, waitForAsync } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { TranslateModule } from '@ngx-translate/core';
import { ElectronService } from './core/services';
import { provideRouter } from '@angular/router';
import { importProvidersFrom } from '@angular/core';
import { LoggerModule, NgxLoggerLevel } from 'ngx-logger';
import { DbService } from './core/services/db/db.service';

describe('AppComponent', () => {
  beforeEach(waitForAsync(() => {
    const mockDbService = {
      getCashboxAmount: jest.fn(() => {return 100;}),
    };

    void TestBed.configureTestingModule({
      declarations: [],
      imports: [AppComponent, TranslateModule.forRoot()],
      providers: [
        provideRouter([]),
        ElectronService,
        importProvidersFrom(
          LoggerModule.forRoot({
            level: NgxLoggerLevel.TRACE,
          }),
        ),
        { provide: DbService, useValue: mockDbService },
      ],
    }).compileComponents();

    jest.spyOn(window, 'alert').mockImplementation(function () {
      console.log('Alert called!');
    });
  }));

  it('should create the app', waitForAsync(() => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.debugElement.componentInstance;
    expect(app).toBeTruthy();
  }));
});
