// internet-monitor.service.ts
import { Injectable, NgZone } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class InternetMonitorService {
  public isOnline$ = new BehaviorSubject<boolean>(navigator.onLine);

  constructor(private zone: NgZone) {
    window.addEventListener('online', () => this.updateOnlineStatus(true));
    window.addEventListener('offline', () => this.updateOnlineStatus(false));
  }

  private updateOnlineStatus(status: boolean) {
    this.zone.run(() => this.isOnline$.next(status));
  }
}
