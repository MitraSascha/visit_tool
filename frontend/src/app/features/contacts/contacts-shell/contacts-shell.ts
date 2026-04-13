import {
  Component, ChangeDetectionStrategy, inject, computed, signal, effect
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-contacts-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './contacts-shell.html',
  styleUrl: './contacts-shell.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ContactsShell {
  private readonly auth   = inject(AuthService);
  private readonly router = inject(Router);

  readonly userEmail = computed(() => this.auth.user()?.email ?? '');
  readonly showMore  = signal(false);

  private readonly currentUrl = toSignal(
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      map(e => (e as NavigationEnd).urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  /** Hebt "Mehr"-Button hervor wenn man auf einer Mehr-Route ist */
  readonly isMoreRoute = computed(() => {
    const url = this.currentUrl();
    return ['/map', '/projects', '/groups', '/activity-log'].some(r => url.startsWith(r));
  });

  constructor() {
    // Mehr-Sheet beim Navigieren automatisch schließen
    effect(() => {
      this.currentUrl();
      this.showMore.set(false);
    });
  }

  logout(): void { this.auth.logout(); }
  toggleMore(): void { this.showMore.update(v => !v); }
}
