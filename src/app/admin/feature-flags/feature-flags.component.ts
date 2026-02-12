import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, UntypedFormGroup, UntypedFormControl } from '@angular/forms';
import { BsModalService } from 'ngx-bootstrap/modal';
import { NgdsFormsModule } from '@digitalspace/ngds-forms';

import { FeatureFlagService, FeatureFlagAdminResponse } from '../../services/feature-flag.service';
import { ToastService, ToastTypes } from '../../services/toast.service';
import { LoadingService } from '../../services/loading.service';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';

interface FlagDefinition {
  key: string;
  displayName: string;
  description: string;
}

@Component({
  selector: 'app-feature-flags',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgdsFormsModule],
  providers: [BsModalService],
  templateUrl: './feature-flags.component.html',
  styleUrls: ['./feature-flags.component.scss']
})
export class FeatureFlagsComponent implements OnInit {
  loading = signal<boolean>(true);
  saving = signal<boolean>(false);
  
  flagData = signal<FeatureFlagAdminResponse | null>(null);
  form: UntypedFormGroup = new UntypedFormGroup({});
  
  // Define available flags with metadata
  flagDefinitions: FlagDefinition[] = [
    {
      key: 'enablePayments',
      displayName: 'Enable Payments',
      description: 'Toggle global payment functionality throughout the application'
    }
    // Add new flags here as they are created
  ];

  constructor(
    private featureFlagService: FeatureFlagService,
    private toastService: ToastService,
    private loadingService: LoadingService,
    private modalService: BsModalService
  ) {}

  async ngOnInit(): Promise<void> {
    await this.loadFlags();
    this.loading.set(false);
  }

  async loadFlags(): Promise<void> {
    try {
      const data = await this.featureFlagService.getFeatureFlagsAdmin();
      this.flagData.set(data);
      this.buildForm(data.flags);
    } catch (error) {
      // Build form with defaults on error
      this.buildForm(undefined);
      this.toastService.addMessage(
        'Failed to load feature flags',
        'Error',
        ToastTypes.ERROR
      );
    }
  }

  buildForm(flags: Record<string, boolean> | undefined): void {
    const controls: Record<string, UntypedFormControl> = {};
    
    for (const def of this.flagDefinitions) {
      controls[def.key] = new UntypedFormControl(flags?.[def.key] ?? false);
    }
    
    this.form = new UntypedFormGroup(controls);
  }

  async saveFlags(): Promise<void> {
    // Show confirmation modal
    const modalRef = this.modalService.show(ConfirmationModalComponent, {
      initialState: {
        title: 'Confirm Feature Flag Changes',
        body: 'Are you sure you want to update the feature flags? This will affect all users immediately.',
        confirmText: 'Save Changes',
        confirmClass: 'btn btn-primary'
      }
    });

    modalRef.content?.confirmButton.subscribe(async () => {
      modalRef.hide();
      await this.performSave();
    });
  }

  private async performSave(): Promise<void> {
    this.saving.set(true);
    
    try {
      const flags: Record<string, boolean> = {};
      
      for (const def of this.flagDefinitions) {
        flags[def.key] = this.form.get(def.key)?.value ?? false;
      }
      
      const response = await this.featureFlagService.updateFeatureFlags(flags);
      this.flagData.set(response);
      
      // Reset form dirty state after successful save
      this.form.markAsPristine();
      
      this.toastService.addMessage(
        'Feature flags updated successfully',
        'Success',
        ToastTypes.SUCCESS
      );
    } catch (error: any) {
      this.toastService.addMessage(
        error?.message || 'Failed to update feature flags',
        'Error',
        ToastTypes.ERROR
      );
    } finally {
      this.saving.set(false);
    }
  }

  cancelChanges(): void {
    // Reload flags to reset form to original values
    const data = this.flagData();
    if (data?.flags) {
      this.buildForm(data.flags);
    }
  }
}
