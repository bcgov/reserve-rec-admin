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

  // Convert comma-separated string to array
  getSearchTermsArray(input: string): string[] {
    if (!input) return [];
    return input
      .replace(/\n/g, '')
      .split(',')
      .map(term => term.trim())
      .filter(term => term.length > 0);
  }

  // Add search terms
  onSearchTermAdd() {
    this.searchTermExists = false;
    this.searchTermSet = this.searchTermSet?.trim();

    if (this.searchTermSet == '' || this.searchTermSet == null) return;
    
    const strings = this.getSearchTermsArray(this.searchTermSet);

    if (strings.length > 1) {
      let duplicate = false;
      const toAdd: string[] = [];
      strings.forEach((string) => {
        if (string && !this.searchTerms.includes(string)) {
          toAdd.push(string);
        } else if (string) {
          duplicate = true;
        }
      });
      this.searchTerms = [...this.searchTerms, ...toAdd];
      this.searchTermExists = duplicate;
      this.searchTermSet = '';
      this.searchTermsChange.emit([...this.searchTerms]);
      this.searchTermDirty.emit();
      return;
    } else {
      if (!this.searchTerms.includes(this.searchTermSet)) {
        this.searchTerms = [...this.searchTerms, this.searchTermSet];
        this.searchTermSet = '';
        this.searchTermsChange.emit([...this.searchTerms]);
        this.searchTermDirty.emit();
      } else {
        this.searchTermExists = true;
      }
    }
  }

  removeSearchTerm(index: any) {
    this.searchTerms = this.searchTerms.filter((_, i) => i !== index);
    this.searchTermDirty.emit();
    this.searchTermsChange.emit([...this.searchTerms]);
  }
}
