
import { Injectable, signal } from '@angular/core';
import { LoggerService } from './logger.service';

@Injectable({
    providedIn: 'root',
})
export class LoadingService {
    public fetchList = signal({});
    public loading = signal(false);

    constructor(private logger: LoggerService) { }

    addToFetchList(id, attributes = { loading: true }) {
        this.logger.debug(`addToFetchList: ${id} ${JSON.stringify(attributes)}`);
        const obj = { ...this.fetchList() };
        obj[id] = attributes;
        this.fetchList.set(obj);
        this.updateLoadingStatus();
    }

    removeFromFetchList(id) {
        this.logger.debug(`removeFromFetchList: ${id}`);
        const obj = { ...this.fetchList() };
        delete obj[id];
        this.fetchList.set(obj);
        this.updateLoadingStatus();
    }

    updateLoadingStatus() {
        this.logger.debug(`updateLoadingStatus`);
        // We have these extra checks so we don't constantly spam the subscribers.
        if (Object.keys(this.fetchList()).length > 0 && !this.loading()) {
            this.loading.set(true);
        } else if (Object.keys(this.fetchList()).length <= 0 && this.loading()) {
            this.loading.set(false);
        }
    }

    isLoading(): boolean {
        return this.loading() || false;
    }

    getFetchList() {
        return this.fetchList();
    }

    getLoadingStatus() {
        return this.loading();
    }
}
