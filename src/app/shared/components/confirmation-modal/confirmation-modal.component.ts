import { Component, Input, Output, EventEmitter, Optional } from '@angular/core';
import { BsModalRef } from 'ngx-bootstrap/modal';
import { Utils } from '../../../utils/utils';
import { NgFor, NgIf } from '@angular/common';

export interface ModalRowSpec {
  label: string;
  value: any;
  eitherOr?: (value: any) => string;
}

@Component({
  imports: [NgFor, NgIf],
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

  // The modal is shown via BsModalService, so it can close itself. Optional so
  // the component still works if ever rendered outside the modal service.
  constructor(@Optional() private bsModalRef?: BsModalRef) {}

  // Close the modal on cancel and notify any subscribers. Previously cancel only
  // emitted the event, so callers that didn't subscribe to cancelButton (e.g.
  // the waiting-room Mode 2 deactivate dialog) had a Cancel button that did
  // nothing. See #262.
  onCancel(): void {
    this.cancelButton.emit();
    this.bsModalRef?.hide();
  }

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
