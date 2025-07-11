import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Utils } from '../../../utils/utils';
import { NgFor } from '@angular/common';

export interface ModalRowSpec {
  label: string;
  value: any;
  eitherOr?: (value: any) => string;
}

@Component({
  imports: [NgFor],
  selector: 'app-confirmation-modal',
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.scss'],
  standalone: true
})

export class ConfirmationModalComponent {
  @Input() title: string;
  @Input() body: string;
  @Input() confirmText = 'Confirm';
  @Input() cancelText = 'Cancel';
  @Input() confirmClass = 'btn btn-primary';
  @Input() cancelClass = 'btn btn-outline-secondary';
  @Input() details: ModalRowSpec[];

  @Output() confirmButton = new EventEmitter<void>();
  @Output() cancelButton = new EventEmitter<void>();

  public utils = new Utils();

  // This constructs the modal from the provided rows using the ModalRowSpec format.
  // It filters out rows with undefined or null values and formats them
  // with the value, or using the eitherOr function if provided.
  // e.g. { label: 'Park Status', value: true, eitherOr: v => v ? 'Open' : 'Closed' }]
  constructModalBodyFromSpec(rows: ModalRowSpec[]): string {
    return rows
      .filter(row => row.value !== undefined && row.value !== null)
      .map(row => {
        const value = row.eitherOr ? row.eitherOr(row.value) : row.value;
        return this.utils.buildInnerHTMLRow([
          `<strong>${row.label}:</strong><br>${value}`
        ]);
      })
      .join('');
  }
}
