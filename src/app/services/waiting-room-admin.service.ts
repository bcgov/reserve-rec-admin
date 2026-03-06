import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { ApiService } from './api.service';

export interface QueueSummary {
  queueId: string;
  queueStatus: 'pre-open' | 'randomizing' | 'releasing' | 'closed';
  openingTime: string;
  totalEntries: number;
  admittedCount: number;
  updatedAt: number;
  abandonedCount?: number;
  // Mode 2 extra fields
  batchSize?: number;
  releaseIntervalSeconds?: number;
  releaseMode?: 'auto' | 'manual';
  lastReleasedAt?: number;
}

export interface QueueMetrics extends QueueSummary {
  counts: {
    waiting: number;
    admitting: number;
    admitted: number;
    expired: number;
    abandoned: number;
  };
}

export interface OpeningTimeEntry {
  startDate: string;   // YYYY-MM-DD
  openingTime: string; // ISO 8601
}

export interface CreateQueuesPayload {
  collectionId: string;
  activityType: string;
  activityId: string;
  openingTimes: OpeningTimeEntry[];
}

export interface Mode2Options {
  batchSize?: number;
  releaseIntervalSeconds?: number;
  releaseMode?: 'auto' | 'manual';
}

@Injectable({ providedIn: 'root' })
export class WaitingRoomAdminService {
  constructor(private apiService: ApiService) {}

  async listQueues(): Promise<QueueSummary[]> {
    const resp: any = await lastValueFrom(this.apiService.get('waiting-room/queues'));
    return resp?.data?.queues ?? [];
  }

  async createQueues(payload: CreateQueuesPayload): Promise<{ created: any[]; errors: any[] }> {
    const resp: any = await lastValueFrom(this.apiService.post('waiting-room/queues', payload));
    return resp?.data ?? { created: [], errors: [] };
  }

  async closeQueue(queueId: string): Promise<void> {
    await lastValueFrom(this.apiService.post(`waiting-room/queues/${encodeURIComponent(queueId)}/close`, {}));
  }

  async deleteQueue(queueId: string): Promise<void> {
    await lastValueFrom(this.apiService.delete(`waiting-room/queues/${encodeURIComponent(queueId)}`));
  }

  async getQueueMetrics(queueId: string): Promise<QueueMetrics> {
    const resp: any = await lastValueFrom(this.apiService.get(`waiting-room/queues/${encodeURIComponent(queueId)}/metrics`));
    return resp?.data;
  }

  async toggleMode2(active: boolean, options?: Mode2Options): Promise<any> {
    const payload: any = { active };
    if (active && options) {
      if (options.batchSize != null) payload.batchSize = options.batchSize;
      if (options.releaseIntervalSeconds != null) payload.releaseIntervalSeconds = options.releaseIntervalSeconds;
      if (options.releaseMode != null) payload.releaseMode = options.releaseMode;
    }
    const resp: any = await lastValueFrom(this.apiService.post('waiting-room/mode2', payload));
    return resp?.data;
  }

  /** Returns the active Mode 2 queue (releasing state, queueId starts with QUEUE#MODE2), or null. */
  async getMode2Queue(): Promise<QueueSummary | null> {
    const queues = await this.listQueues();
    return queues.find(q => q.queueId.startsWith('QUEUE#MODE2') && q.queueStatus === 'releasing') ?? null;
  }

  /** Manually release one batch from the active Mode 2 queue. Returns admitted count. */
  async releaseMode2Batch(): Promise<{ admitted: number }> {
    const resp: any = await lastValueFrom(this.apiService.post('waiting-room/mode2/release', {}));
    return { admitted: resp?.data?.admitted ?? 0 };
  }
}
