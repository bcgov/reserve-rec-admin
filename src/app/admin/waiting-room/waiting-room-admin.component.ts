import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, UntypedFormArray, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { BsModalService } from 'ngx-bootstrap/modal';

import { WaitingRoomAdminService, QueueSummary, QueueMetrics, OpeningTimeEntry } from '../../services/waiting-room-admin.service';
import { ToastService, ToastTypes } from '../../services/toast.service';
import { ConfirmationModalComponent } from '../../shared/components/confirmation-modal/confirmation-modal.component';

@Component({
  selector: 'app-waiting-room-admin',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  providers: [BsModalService],
  templateUrl: './waiting-room-admin.component.html',
  styleUrls: ['./waiting-room-admin.component.scss'],
})
export class WaitingRoomAdminComponent implements OnInit {
  loading = true;
  mode2Active = false;
  mode2Saving = false;
  mode2Releasing = false;
  mode2Queue: QueueSummary | null = null;

  // Mode 2 activation config inputs
  mode2BatchSize = 50;
  mode2IntervalMinutes = 5; // display in minutes; send as seconds
  mode2ReleaseMode: 'auto' | 'manual' = 'auto';

  queues: QueueSummary[] = [];
  expandedMetrics: Record<string, QueueMetrics | null> = {};
  loadingMetrics: Record<string, boolean> = {};
  actionInProgress: Record<string, boolean> = {};

  showCreateForm = false;
  createForm: UntypedFormGroup = new UntypedFormGroup({
    collectionId: new UntypedFormControl('', Validators.required),
    activityType: new UntypedFormControl('', Validators.required),
    activityId: new UntypedFormControl('', Validators.required),
    openingTimes: new UntypedFormArray([]),
  });
  creating = false;

  constructor(
    private wrService: WaitingRoomAdminService,
    private toastService: ToastService,
    private modalService: BsModalService,
  ) {}

  async ngOnInit(): Promise<void> {
    await this.load();
    this.loading = false;
  }

  async load(): Promise<void> {
    try {
      this.queues = await this.wrService.listQueues();
      this.mode2Queue = await this.wrService.getMode2Queue();
      this.mode2Active = this.mode2Queue !== null;
    } catch {
      this.toastService.addMessage('Failed to load queues', 'Error', ToastTypes.ERROR);
    }
  }

  // ── Mode 2 ────────────────────────────────────────────────────────────────

  async toggleMode2(): Promise<void> {
    const next = !this.mode2Active;
    const modalRef = this.modalService.show(ConfirmationModalComponent, {
      initialState: {
        title: next ? 'Activate Full-Site Gating (Mode 2)' : 'Deactivate Full-Site Gating',
        body: next
          ? `All visitors without an admission token will be queued. Batches of ${this.mode2BatchSize} will be admitted every ${this.mode2IntervalMinutes} minute(s). Activate?`
          : 'Normal browsing will resume. Deactivate Mode 2?',
        confirmText: next ? 'Activate' : 'Deactivate',
        confirmClass: next ? 'btn btn-warning' : 'btn btn-primary',
      },
    });
    modalRef.content?.confirmButton.subscribe(async () => {
      modalRef.hide();
      this.mode2Saving = true;
      try {
        const result = await this.wrService.toggleMode2(next, next ? {
          batchSize: this.mode2BatchSize,
          releaseIntervalSeconds: this.mode2IntervalMinutes * 60,
          releaseMode: this.mode2ReleaseMode,
        } : undefined);
        this.mode2Active = next;
        if (next && result?.queueId) {
          // Reload to get the fresh Mode 2 queue record
          this.mode2Queue = await this.wrService.getMode2Queue();
        } else {
          this.mode2Queue = null;
        }
        this.toastService.addMessage(
          next ? 'Mode 2 activated — all traffic queued' : 'Mode 2 deactivated',
          'Success',
          ToastTypes.SUCCESS,
        );
        await this.load();
      } catch {
        this.toastService.addMessage('Failed to toggle Mode 2', 'Error', ToastTypes.ERROR);
      } finally {
        this.mode2Saving = false;
      }
    });
  }

  // ── Mode 2 manual release ─────────────────────────────────────────────────

  async releaseMode2(): Promise<void> {
    this.mode2Releasing = true;
    try {
      const { admitted } = await this.wrService.releaseMode2Batch();
      this.toastService.addMessage(
        admitted > 0 ? `Released ${admitted} user(s)` : 'No users admitted (queue empty or all slots filled)',
        'Success',
        ToastTypes.SUCCESS,
      );
      this.mode2Queue = await this.wrService.getMode2Queue();
    } catch {
      this.toastService.addMessage('Failed to release batch', 'Error', ToastTypes.ERROR);
    } finally {
      this.mode2Releasing = false;
    }
  }

  // ── Metrics ───────────────────────────────────────────────────────────────

  async toggleMetrics(queueId: string): Promise<void> {
    if (this.expandedMetrics[queueId] !== undefined) {
      delete this.expandedMetrics[queueId];
      return;
    }
    this.loadingMetrics[queueId] = true;
    try {
      this.expandedMetrics[queueId] = await this.wrService.getQueueMetrics(queueId);
    } catch {
      this.toastService.addMessage('Failed to load metrics', 'Error', ToastTypes.ERROR);
      this.expandedMetrics[queueId] = null;
    } finally {
      delete this.loadingMetrics[queueId];
    }
  }

  isMetricsExpanded(queueId: string): boolean {
    return this.expandedMetrics[queueId] !== undefined;
  }

  // ── Close queue ───────────────────────────────────────────────────────────

  async closeQueue(queue: QueueSummary): Promise<void> {
    const modalRef = this.modalService.show(ConfirmationModalComponent, {
      initialState: {
        title: 'Force-Close Queue',
        body: `Close "${this.formatQueueId(queue.queueId)}"? All waiting users will be marked abandoned.`,
        confirmText: 'Close Queue',
        confirmClass: 'btn btn-warning',
      },
    });
    modalRef.content?.confirmButton.subscribe(async () => {
      modalRef.hide();
      this.actionInProgress[queue.queueId] = true;
      try {
        await this.wrService.closeQueue(queue.queueId);
        queue.queueStatus = 'closed';
        this.toastService.addMessage('Queue closed', 'Success', ToastTypes.SUCCESS);
      } catch {
        this.toastService.addMessage('Failed to close queue', 'Error', ToastTypes.ERROR);
      } finally {
        delete this.actionInProgress[queue.queueId];
      }
    });
  }

  // ── Delete queue ──────────────────────────────────────────────────────────

  async deleteQueue(queue: QueueSummary): Promise<void> {
    const modalRef = this.modalService.show(ConfirmationModalComponent, {
      initialState: {
        title: 'Delete Queue',
        body: `Permanently delete "${this.formatQueueId(queue.queueId)}" and all its entries?`,
        confirmText: 'Delete',
        confirmClass: 'btn btn-danger',
      },
    });
    modalRef.content?.confirmButton.subscribe(async () => {
      modalRef.hide();
      this.actionInProgress[queue.queueId] = true;
      try {
        await this.wrService.deleteQueue(queue.queueId);
        this.queues = this.queues.filter(q => q.queueId !== queue.queueId);
        delete this.expandedMetrics[queue.queueId];
        this.toastService.addMessage('Queue deleted', 'Success', ToastTypes.SUCCESS);
      } catch {
        this.toastService.addMessage('Failed to delete queue', 'Error', ToastTypes.ERROR);
      } finally {
        delete this.actionInProgress[queue.queueId];
      }
    });
  }

  // ── Create queue form ─────────────────────────────────────────────────────

  get openingTimesArray(): UntypedFormArray {
    return this.createForm.get('openingTimes') as UntypedFormArray;
  }

  addOpeningTimeRow(): void {
    this.openingTimesArray.push(new UntypedFormGroup({
      startDate: new UntypedFormControl('', Validators.required),
      openingTime: new UntypedFormControl('', Validators.required),
    }));
  }

  removeOpeningTimeRow(i: number): void {
    this.openingTimesArray.removeAt(i);
  }

  toggleCreateForm(): void {
    this.showCreateForm = !this.showCreateForm;
    if (this.showCreateForm && this.openingTimesArray.length === 0) {
      this.addOpeningTimeRow();
    }
  }

  async submitCreate(): Promise<void> {
    if (this.createForm.invalid) {
      this.createForm.markAllAsTouched();
      return;
    }
    this.creating = true;
    try {
      const v = this.createForm.value;
      const openingTimes: OpeningTimeEntry[] = v.openingTimes.map((row: any) => ({
        startDate: row.startDate,
        openingTime: new Date(row.openingTime).toISOString(),
      }));
      const result = await this.wrService.createQueues({
        collectionId: v.collectionId,
        activityType: v.activityType,
        activityId: v.activityId,
        openingTimes,
      });
      if (result.created.length) {
        this.toastService.addMessage(
          `Created ${result.created.length} queue(s)${result.errors.length ? `, ${result.errors.length} error(s)` : ''}`,
          'Success', ToastTypes.SUCCESS,
        );
      }
      if (result.errors.length && !result.created.length) {
        this.toastService.addMessage(
          result.errors.map((e: any) => `${e.startDate}: ${e.reason}`).join('; '),
          'Error', ToastTypes.ERROR,
        );
      }
      this.createForm.reset();
      this.openingTimesArray.clear();
      this.showCreateForm = false;
      await this.load();
    } catch (err: any) {
      this.toastService.addMessage(err?.message || 'Failed to create queues', 'Error', ToastTypes.ERROR);
    } finally {
      this.creating = false;
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  formatQueueId(queueId: string): string {
    // "QUEUE#golden-ears#camping#standard-sites#2026-07-01" → "golden-ears / camping / standard-sites / 2026-07-01"
    return queueId.replace(/^QUEUE#/, '').replace(/#/g, ' / ');
  }

  statusBadgeClass(status: string): string {
    return {
      'pre-open': 'bg-info text-dark',
      randomizing: 'bg-warning text-dark',
      releasing: 'bg-success',
      closed: 'bg-secondary',
    }[status] ?? 'bg-secondary';
  }

  canClose(status: string): boolean {
    return ['pre-open', 'randomizing', 'releasing'].includes(status);
  }

  formatTs(unix: number): string {
    if (!unix) return '—';
    return new Date(unix * 1000).toLocaleString();
  }

  formatIso(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString();
  }

  trackByQueueId(_: number, q: QueueSummary): string {
    return q.queueId;
  }
}
