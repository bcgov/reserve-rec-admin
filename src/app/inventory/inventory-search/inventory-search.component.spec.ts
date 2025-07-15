import { ComponentFixture, TestBed } from '@angular/core/testing';

import { InventorySearchComponent } from './inventory-search.component';
import { ConfigService } from '../../services/config.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideToastr } from 'ngx-toastr';

describe('InventorySearchComponent', () => {
  let component: InventorySearchComponent;
  let fixture: ComponentFixture<InventorySearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InventorySearchComponent],
      providers: [
        ConfigService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideToastr()
      ]
    })
      .compileComponents();

    fixture = TestBed.createComponent(InventorySearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
