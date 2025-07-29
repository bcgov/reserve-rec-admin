import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Utils } from '../../../utils/utils';
import { CommonModule } from '@angular/common';
import { FormsModule, NgModel } from '@angular/forms';

export interface ModalRowSpec {
  label: string;
  value: any;
  eitherOr?: (value: any) => string;
}

@Component({
  imports: [CommonModule, FormsModule],
  selector: 'app-search-terms',
  templateUrl: './search-terms.component.html',
  styleUrls: ['./search-terms.component.scss'],
  standalone: true
})

export class SearchTermsComponent {
  @Input() searchTermSet!: string;
  @Input() searchTerms: string[] = [];
  @Input() searchTermExists = false;
  @Output() searchTermsChange = new EventEmitter<string[]>();
  @Output() searchTermDirty = new EventEmitter<void>();

  public utils = new Utils();

  // Add search terms
  onSearchTermAdd() {
    this.searchTermExists = false;
    this.searchTermSet = this.searchTermSet?.trim();
    this.searchTermSet = this.searchTermSet?.replace(/\n/g, "");

    if (this.searchTermSet == '' || this.searchTermSet == null) return;
    const strings = this.searchTermSet?.split(',');

    if (strings.length > 1) {
      let duplicate = false;
      strings.forEach((string) => {
        string = string.trim();
        if (string && !this.searchTerms.includes(string)) {
          this.searchTerms.push(string);
        } else if (string) {
          duplicate = true;
        }
      });
      this.searchTermExists = duplicate;
      this.searchTermSet = '';
      this.searchTermsChange.emit([...this.searchTerms]);
      this.searchTermDirty.emit();
      return;
    } else {
      if (!this.searchTerms.includes(this.searchTermSet)) {
        this.searchTerms.push(this.searchTermSet);
        this.searchTermSet = '';
        this.searchTermsChange.emit([...this.searchTerms]);
        this.searchTermDirty.emit();
      } else {
        this.searchTermExists = true;
      }
    }
  }

  removeSearchTerm(index: any) {
    this.searchTerms.splice(index, 1);
    this.searchTermsChange.emit([...this.searchTerms]);
  }
}
