import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GeozoneListItemComponent } from './geozone-list-item.component';

describe('GeozoneListItemComponent', () => {
  let component: GeozoneListItemComponent;
  let fixture: ComponentFixture<GeozoneListItemComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GeozoneListItemComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GeozoneListItemComponent);
    component = fixture.componentInstance;
  
    component.geozone = {
      collectionId: 'test-collection',
      geozoneType: 'trail',
      geozoneId: 'test-geozone-123',
      displayName: 'Test Geozone'
    };
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
