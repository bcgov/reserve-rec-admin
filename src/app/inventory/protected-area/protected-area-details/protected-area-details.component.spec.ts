import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProtectedAreaDetailsComponent } from './protected-area-details.component';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideToastr } from 'ngx-toastr';

describe('ProtectedAreaDetailsComponent', () => {
  let component: ProtectedAreaDetailsComponent;
  let fixture: ComponentFixture<ProtectedAreaDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProtectedAreaDetailsComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideToastr(),
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProtectedAreaDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
