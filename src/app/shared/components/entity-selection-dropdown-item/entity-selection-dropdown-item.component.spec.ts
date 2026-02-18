// import { ComponentFixture, TestBed } from '@angular/core/testing';

// import { EntitySelectionDropdownItemComponent } from './entity-selection-dropdown-item.component';

// describe('EntitySelectionDropdownItemComponent', () => {
//   let component: EntitySelectionDropdownItemComponent;
//   let fixture: ComponentFixture<EntitySelectionDropdownItemComponent>;

//   beforeEach(async () => {
//     await TestBed.configureTestingModule({
//       imports: [EntitySelectionDropdownItemComponent]
//     })
//     .compileComponents();
    
//     fixture = TestBed.createComponent(EntitySelectionDropdownItemComponent);
//     component = fixture.componentInstance;
//     fixture.detectChanges();
//   });

//   it('should create', () => {
//     expect(component).toBeTruthy();
//   });

//   it('should display entity name', () => {
//     component.entity = { displayName: 'Test Facility' };
//     fixture.detectChanges();
//     const compiled = fixture.nativeElement;
//     expect(compiled.textContent).toContain('Test Facility');
//   });

//   it('should show selected state', () => {
//     component.isSelected = true;
//     fixture.detectChanges();
//     const element = fixture.nativeElement.querySelector('.entity-select');
//     expect(element.classList.contains('selected')).toBeTruthy();
//   });

//   it('should get correct identifier for facility', () => {
//     component.entity = { facilityId: '123' };
//     component.entityType = 'facility';
//     expect(component.identifier).toBe('123');
//   });

//   it('should get correct identifier for geozone', () => {
//     component.entity = { geozoneId: '456' };
//     component.entityType = 'geozone';
//     expect(component.identifier).toBe('456');
//   });

//   it('should fallback to N/A if no identifier', () => {
//     component.entity = {};
//     expect(component.identifier).toBe('N/A');
//   });

//   it('should get correct specific type', () => {
//     component.entity = { facilityType: 'dayUse' };
//     component.entityType = 'facility';
//     expect(component.specificType).toBe('dayUse');
//   });
// });

xdescribe('loadal.component legacy placeholder', () => {
  it('skipped', () => {});
});
