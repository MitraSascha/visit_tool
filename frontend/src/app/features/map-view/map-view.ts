import {
  Component, OnDestroy, AfterViewInit, ElementRef, ViewChild,
  ChangeDetectionStrategy, inject, signal, computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { GeoApiService } from '../../core/services/geo-api.service';
import { GeoContact } from '../../core/models/geo.model';

@Component({
  selector: 'app-map-view',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './map-view.html',
  styleUrl: './map-view.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MapView implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainerRef!: ElementRef<HTMLDivElement>;

  private readonly geoApi = inject(GeoApiService);

  readonly contacts = signal<GeoContact[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly withCoords = computed(() => this.contacts().filter(c => c.lat && c.lng));
  readonly withoutCoords = computed(() => this.contacts().filter(c => !c.lat || !c.lng));

  private map: any = null;
  private L: any = null;

  async ngAfterViewInit(): Promise<void> {
    // Leaflet dynamisch importieren (analog zum Three.js-Pattern im CardViewer)
    this.L = await import('leaflet');

    this.initMap();
    this.loadContacts();
  }

  private initMap(): void {
    const L = this.L.default || this.L;

    this.map = L.map(this.mapContainerRef.nativeElement, {
      center: [51.1657, 10.4515], // Mitte Deutschland
      zoom: 6,
      zoomControl: true,
    });

    // OpenStreetMap Tiles (DSGVO-konform, kein API-Key nötig)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 18,
    }).addTo(this.map);
  }

  private loadContacts(): void {
    this.geoApi.getGeoContacts().subscribe({
      next: (contacts) => {
        this.contacts.set(contacts);
        this.loading.set(false);
        this.addMarkers(contacts.filter(c => c.lat && c.lng));
      },
      error: () => {
        this.error.set('Kontakte konnten nicht geladen werden.');
        this.loading.set(false);
      },
    });
  }

  private addMarkers(contacts: GeoContact[]): void {
    const L = this.L.default || this.L;

    contacts.forEach(c => {
      if (!c.lat || !c.lng) return;

      // Grüner Custom-Marker (passend zum Design)
      const icon = L.divIcon({
        className: 'map-marker',
        html: `<div class="map-marker__dot" title="${c.company_name || ''}"></div>`,
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      const marker = L.marker([c.lat, c.lng], { icon });
      marker.addTo(this.map);
      marker.bindPopup(`
        <div class="map-popup">
          <strong>${c.company_name || '—'}</strong><br>
          <span>${c.city || ''}</span><br>
          <span class="map-popup__cat">${c.category || ''}</span><br>
          <a href="/contacts/${c.id}" class="map-popup__link">Details öffnen →</a>
        </div>
      `);
    });

    // Zoom auf alle Marker wenn vorhanden
    if (contacts.length > 0) {
      const group = L.featureGroup(contacts.map(c => L.marker([c.lat!, c.lng!])));
      this.map.fitBounds(group.getBounds().pad(0.1));
    }
  }

  geocodeContact(contactId: number): void {
    this.geoApi.geocodeContact(contactId).subscribe({
      next: (updated) => {
        this.contacts.update(list => list.map(c => c.id === contactId ? updated : c));
        if (updated.lat && updated.lng) {
          this.addMarkers([updated]);
        }
      },
    });
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
      this.map = null;
    }
  }
}
