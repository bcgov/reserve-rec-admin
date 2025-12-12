import { CommonModule, UpperCasePipe } from '@angular/common';
import { ChangeDetectorRef, Component, Directive, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { NgdsForms, NgdsFormsModule } from '@digitalspace/ngds-forms';
import { availableUnits } from './duration-picker-helpers';


@Component({
  selector: 'app-duration-picker',
  imports: [NgdsFormsModule, CommonModule, UpperCasePipe],
  templateUrl: './duration-picker.component.html',
  styleUrl: './duration-picker.component.scss'
})
export class DurationPickerComponent implements OnInit {
  @Input() durationForm: UntypedFormGroup;
  @Input() label: string = 'Duration';
  @Input() description: string = 'Select a duration using the fields below.';
  @Input() allowedUnits: string[] = [...availableUnits];
  @Input() currentUnits: string[] = ['days', 'hours', 'minutes'];

  @Output() durationChange = new EventEmitter<any>();

  constructor(
    protected cdr: ChangeDetectorRef
  ) { };

  ngOnInit() {
    // Check default allowed units
    for (const unit of this.currentUnits) {
      if (!this.allowedUnits.includes(unit)) {
        this.currentUnits = this.allowedUnits;
        break;
      }
    }

  }

  isUnitAllowed(unit: string): boolean {
    return this.allowedUnits.includes(unit);
  }

  canAddMoreUnits(before = true): boolean {
    if (before) {
      if (this.allowedUnits?.[0] !== this.currentUnits?.[0]) {
        return true;
      }
      return false;
    }
    if (this.allowedUnits?.[this.allowedUnits.length - 1] !== this.currentUnits?.[this.currentUnits.length - 1]) {
      return true;
    }
    return false;
  }

  getValueForUnit(unit: string): number {
    return this.durationForm.get(unit)?.value || 0;
  }

  addUnit(before = true) {
    if (before) {
      const unitToAdd = this.allowedUnits[
        this.allowedUnits.indexOf(this.currentUnits[0]) - 1
      ];
      if (unitToAdd) {
        this.currentUnits.unshift(unitToAdd);
      }
    } else {
      const unitToAdd = this.allowedUnits[
        this.allowedUnits.indexOf(this.currentUnits[this.currentUnits.length - 1]) + 1
      ];
      if (unitToAdd) {
        this.currentUnits.push(unitToAdd);
      }
    }
    this.cdr.detectChanges();
    console.log('this.currentUnits:', this.currentUnits);
  }

}