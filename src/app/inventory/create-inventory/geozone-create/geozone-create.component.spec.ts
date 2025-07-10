import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeozoneCreateComponent } from './geozone-create.component';
import { ConfigService } from '../../../services/config.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('GeozoneCreateComponent', () => {
  let component: GeozoneCreateComponent;
  let fixture: ComponentFixture<GeozoneCreateComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeozoneCreateComponent],
      providers: [
        ConfigService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeozoneCreateComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
