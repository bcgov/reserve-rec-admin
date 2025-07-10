import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProtectedAreaService } from './protected-area-details.component';

describe('ProtectedAreaService', () => {
  let component: ProtectedAreaService;
  let fixture: ComponentFixture<ProtectedAreaService>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProtectedAreaService]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProtectedAreaService);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
