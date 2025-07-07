import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HomeComponent } from './home.component';
import { ConfigService } from '../services/config.service';
describe('HomeComponent', () => {
  let component: HomeComponent;
  let fixture: ComponentFixture<HomeComponent>;

  beforeEach(async () => {
  await TestBed.configureTestingModule({
    imports: [HomeComponent],
    providers: [
      { provide: ConfigService, useValue: {} }
    ]
  })
  .compileComponents();

  fixture = TestBed.createComponent(HomeComponent);
  component = fixture.componentInstance;
  fixture.detectChanges();
});
  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
