import { AfterViewChecked, ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';
import { CollectionService } from '../../../services/collection.service';
import { Constants } from '../../../app.constants';
import { DataService } from '../../../services/data.service';

@Component({
  selector: 'app-collection-selector',
  imports: [CommonModule, ReactiveFormsModule, NgdsFormsModule],
  templateUrl: './collection-selector.component.html',
  styleUrl: './collection-selector.component.scss'
})
export class CollectionSelectorComponent implements OnInit, AfterViewChecked {
  @Input() control: AbstractControl;
  @Input() disabled = false;
  @Input() label = 'Collection';
  @Input() hint = '';

  public collectionOptions: { display: string; value: string }[] = [];
  public loading = false;

  constructor(
    protected collectionService: CollectionService,
    protected dataService: DataService,
    private cdr: ChangeDetectorRef
  ) { }

  async ngOnInit(): Promise<void> {
    // Try cache first
    const cached = this.dataService.getItemValue(Constants.dataIds.COLLECTIONS_RESULT);
    if (cached?.items?.length) {
      this.setOptions(cached.items);
      return;
    }
    this.loading = true;
    this.control?.disable();
    try {
      const res = await this.collectionService.getAllCollections();
      this.setOptions(res?.items ?? []);
    } finally {
      this.loading = false;
      this.control?.enable();
      this.control?.markAsUntouched();
      this.control?.markAsPristine();
    }
  }

  ngAfterViewChecked(): void {
    this.cdr.detectChanges()
  }

  setOptions(collections: any[]) {
    this.collectionOptions = collections.map(c => ({
      display: c.displayName ? `${c.displayName} (${c.collectionId})` : c.collectionId,
      value: c.collectionId,
    }));
  }
}
