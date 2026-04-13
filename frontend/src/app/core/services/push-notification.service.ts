import { Injectable, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PushNotificationService {
  private readonly swPush = inject(SwPush);
  private readonly http   = inject(HttpClient);

  /** true wenn Service Worker + Push unterstützt wird */
  readonly isSupported = this.swPush.isEnabled;

  /** aktueller Abo-Status */
  readonly subscribed = signal(false);

  constructor() {
    // Beim Start prüfen ob bereits abonniert
    this.swPush.subscription.subscribe(sub => {
      this.subscribed.set(sub !== null);
    });
  }

  async requestAndSubscribe(): Promise<'ok' | 'denied' | 'unsupported'> {
    if (!this.isSupported) return 'unsupported';

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    try {
      const { public_key } = await firstValueFrom(
        this.http.get<{ public_key: string }>(`${environment.apiUrl}/push/vapid-key`)
      );

      const sub = await this.swPush.requestSubscription({ serverPublicKey: public_key });

      const subJson = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await firstValueFrom(
        this.http.post(`${environment.apiUrl}/push/subscribe`, {
          endpoint: subJson.endpoint,
          keys:     subJson.keys,
        })
      );

      this.subscribed.set(true);
      return 'ok';
    } catch (e) {
      console.error('[push] Fehler beim Abonnieren:', e);
      return 'unsupported';
    }
  }

  async unsubscribe(): Promise<void> {
    if (!this.isSupported) return;
    try {
      const sub = await firstValueFrom(this.swPush.subscription);
      if (sub) {
        await firstValueFrom(
          this.http.delete(`${environment.apiUrl}/push/unsubscribe`, {
            body: { endpoint: sub.endpoint },
          })
        );
        await this.swPush.unsubscribe();
      }
      this.subscribed.set(false);
    } catch (e) {
      console.error('[push] Fehler beim Abmelden:', e);
    }
  }
}
