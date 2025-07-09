import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateInventorySelectorComponent } from './create-inventory-selector.component';
import { provideRouter } from '@angular/router';

describe('CreateInventorySelectorComponent', () => {
  let component: CreateInventorySelectorComponent;
  let fixture: ComponentFixture<CreateInventorySelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateInventorySelectorComponent],
      providers: [provideRouter([])]
    })
      .compileComponents();

    fixture = TestBed.createComponent(CreateInventorySelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
