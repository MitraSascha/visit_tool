import {
  Component, ChangeDetectionStrategy, inject, computed
} from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
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
  private readonly auth = inject(AuthService);
  readonly userEmail = computed(() => this.auth.user()?.email ?? '');

  logout(): void {
    this.auth.logout();
  }
}
