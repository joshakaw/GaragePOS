import { TestBed } from '@angular/core/testing';

import { DbService } from './db.service';

describe('PosService', () => {
  let service: DbService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DbService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a gridmenuitem', () => {
    const fixture = TestBed.createComponent(DbService);
    const app = fixture.componentInstance

    // This won't work because MySQL needs to be mocked.
    app.createGridMenuButton({
        GridMenuButtonID: 0,
        GridMenuID: 1,
        ImageID: null,
        Label: "Auto Generated",
        X: 0,
        Y: 0,
        W: 0,
        H: 0,
        OnClick_Script: '',
        OnClick_OpenGridMenuID: null,
        OnClick_AddProductID: null
    })
  });
});
