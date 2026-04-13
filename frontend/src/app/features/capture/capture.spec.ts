import { TestBed, ComponentFixture, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { Capture } from './capture';
import { OcrApiService, OcrResult } from '../../core/services/ocr-api.service';
import { ContactApiService } from '../../core/services/contact-api.service';
import { AssetApiService } from '../../core/services/asset-api.service';
import { PartnerContact } from '../../core/models/contact.model';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeBlob(content = 'fake'): Blob {
  return new Blob([content], { type: 'image/jpeg' });
}

function makeFileEvent(file: File): Event {
  const input = document.createElement('input');
  input.type  = 'file';
  Object.defineProperty(input, 'files', { value: [file], writable: false });
  return { target: input } as unknown as Event;
}

const MOCK_OCR: OcrResult = {
  company_name:        'OCR Firma',
  contact_name:        'Hans Huber',
  job_title:           'Techniker',
  phone:               '0123456789',
  mobile:              '0170111222',
  email:               'hans@ocr.de',
  website:             'ocr.de',
  street:              'Testweg 1',
  zip_code:            '99999',
  city:                'München',
  category:            'Elektriker',
  trade:               'Elektro',
  service_description: 'Elektroinstallation',
  service_area:        'Bayern',
  tags:                'schnell, günstig',
  raw_text:            'raw',
};

const MOCK_CONTACT: PartnerContact = {
  id: 77,
  company_name: 'OCR Firma',
  contact_name: 'Hans Huber',
  job_title: 'Techniker',
  phone: '0123456789',
  mobile: '0170111222',
  email: 'hans@ocr.de',
  website: 'ocr.de',
  street: 'Testweg 1',
  zip_code: '99999',
  city: 'München',
  category: 'Elektriker',
  trade: 'Elektro',
  service_description: '',
  service_area: 'Bayern',
  tags: [],
  note: '',
  recommended_by: '',
  has_worked_with_us: 'not_yet',
  internal_rating: null,
  last_project: '',
  response_speed: null,
  priority: 'medium',
  known_by: '',
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

// ── Spec ─────────────────────────────────────────────────────────────────────

describe('Capture', () => {
  let fixture: ComponentFixture<Capture>;
  let component: Capture;
  let ocrSpy:     jasmine.SpyObj<OcrApiService>;
  let contactSpy: jasmine.SpyObj<ContactApiService>;
  let assetSpy:   jasmine.SpyObj<AssetApiService>;
  let router:     Router;

  beforeEach(async () => {
    ocrSpy     = jasmine.createSpyObj('OcrApiService',     ['extractFromBlob']);
    contactSpy = jasmine.createSpyObj('ContactApiService', ['create']);
    assetSpy   = jasmine.createSpyObj('AssetApiService',   ['upload']);

    ocrSpy.extractFromBlob.and.returnValue(of(MOCK_OCR));
    contactSpy.create.and.returnValue(of(MOCK_CONTACT));
    assetSpy.upload.and.returnValue(of({} as any));

    await TestBed.configureTestingModule({
      imports: [Capture],
      providers: [
        provideRouter([]),
        { provide: OcrApiService,     useValue: ocrSpy     },
        { provide: ContactApiService, useValue: contactSpy },
        { provide: AssetApiService,   useValue: assetSpy   },
      ],
    }).compileComponents();

    fixture   = TestBed.createComponent(Capture);
    component = fixture.componentInstance;
    router    = TestBed.inject(Router);

    // Provide stub ElementRefs for hidden file inputs
    (component as any).frontInputRef = { nativeElement: { click: () => {}, value: '' } };
    (component as any).backInputRef  = { nativeElement: { click: () => {}, value: '' } };

    fixture.detectChanges();
  });

  // ── should create ─────────────────────────────────────────────────────────

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // ── initial state ─────────────────────────────────────────────────────────

  it('starts on the front step', () => {
    expect(component.step()).toBe('front');
  });

  it('form is invalid initially (company_name required)', () => {
    expect(component.form.invalid).toBeTrue();
  });

  // ── front image selection ─────────────────────────────────────────────────

  describe('onFrontSelected', () => {
    it('sets frontBlob and triggers OCR with front only', () => {
      const file = new File([makeBlob()], 'front.jpg', { type: 'image/jpeg' });
      component.onFrontSelected(makeFileEvent(file));

      expect(component.frontBlob()).toBeTruthy();
      expect(ocrSpy.extractFromBlob).toHaveBeenCalledWith(file, null);
    });

    it('does nothing when no file is in the event', () => {
      const input = document.createElement('input');
      Object.defineProperty(input, 'files', { value: null, writable: false });
      component.onFrontSelected({ target: input } as unknown as Event);

      expect(component.frontBlob()).toBeNull();
      expect(ocrSpy.extractFromBlob).not.toHaveBeenCalled();
    });
  });

  // ── back image selection ──────────────────────────────────────────────────

  describe('onBackSelected', () => {
    it('sets backBlob but does NOT call OCR directly', () => {
      const file = new File([makeBlob()], 'back.jpg', { type: 'image/jpeg' });
      component.onBackSelected(makeFileEvent(file));

      expect(component.backBlob()).toBeTruthy();
      // OCR is NOT triggered by onBackSelected alone — only by confirmBack()
      expect(ocrSpy.extractFromBlob).not.toHaveBeenCalled();
    });
  });

  // ── navigation ────────────────────────────────────────────────────────────

  describe('confirmFront', () => {
    it('advances to back step', () => {
      component.confirmFront();
      expect(component.step()).toBe('back');
    });
  });

  describe('confirmBack with both images', () => {
    it('triggers combined OCR call with both blobs', () => {
      const front = new File([makeBlob('f')], 'front.jpg', { type: 'image/jpeg' });
      const back  = new File([makeBlob('b')], 'back.jpg',  { type: 'image/jpeg' });

      component.onFrontSelected(makeFileEvent(front));
      ocrSpy.extractFromBlob.calls.reset(); // clear the first OCR call

      component.onBackSelected(makeFileEvent(back));
      component.confirmBack();

      expect(ocrSpy.extractFromBlob).toHaveBeenCalledWith(front, back);
    });
  });

  describe('skipBack', () => {
    it('goes to form step when OCR is not running', () => {
      component.skipBack();
      expect(component.step()).toBe('form');
    });

    it('goes to ocr step when OCR is running', () => {
      // Simulate a running OCR by making extractFromBlob return an Observable
      // that never completes within this tick
      const neverComplete = new Promise<never>(() => {});
      ocrSpy.extractFromBlob.and.returnValue(
        new (require('rxjs').Observable)(() => {})
      );
      const front = new File([makeBlob()], 'front.jpg', { type: 'image/jpeg' });
      component.onFrontSelected(makeFileEvent(front));
      // ocrRunning should be true now
      expect(component.ocrRunning()).toBeTrue();
      component.skipBack();
      expect(component.step()).toBe('ocr');
    });
  });

  // ── OCR prefill ───────────────────────────────────────────────────────────

  describe('prefillForm (via OCR success)', () => {
    it('fills form fields with OCR result after front image', fakeAsync(() => {
      const file = new File([makeBlob()], 'front.jpg', { type: 'image/jpeg' });
      ocrSpy.extractFromBlob.and.returnValue(of(MOCK_OCR));

      component.onFrontSelected(makeFileEvent(file));
      tick();

      expect(component.form.value.company_name).toBe('OCR Firma');
      expect(component.form.value.contact_name).toBe('Hans Huber');
      expect(component.form.value.email).toBe('hans@ocr.de');
      expect(component.form.value.city).toBe('München');
    }));

    it('sets ocrWarning on OCR error', fakeAsync(() => {
      ocrSpy.extractFromBlob.and.returnValue(throwError(() => new Error('OCR failed')));
      const file = new File([makeBlob()], 'front.jpg', { type: 'image/jpeg' });

      component.onFrontSelected(makeFileEvent(file));
      tick();

      expect(component.ocrWarning()).toBeTrue();
      expect(component.ocrRunning()).toBeFalse();
    }));

    it('null OCR fields are replaced with empty strings', fakeAsync(() => {
      const partialOcr: OcrResult = { ...MOCK_OCR, mobile: null, website: null };
      ocrSpy.extractFromBlob.and.returnValue(of(partialOcr));

      const file = new File([makeBlob()], 'front.jpg', { type: 'image/jpeg' });
      component.onFrontSelected(makeFileEvent(file));
      tick();

      expect(component.form.value.mobile).toBe('');
      expect(component.form.value.website).toBe('');
    }));
  });

  // ── setRating ─────────────────────────────────────────────────────────────

  it('setRating updates internal_rating form control', () => {
    component.setRating(4);
    expect(component.form.controls.internal_rating.value).toBe(4);
  });

  // ── save ──────────────────────────────────────────────────────────────────

  describe('save', () => {
    beforeEach(() => {
      // Make form valid
      component.form.controls.company_name.setValue('Test GmbH');
    });

    it('does not call contactApi.create when form is invalid', async () => {
      component.form.controls.company_name.setValue('');
      await component.save();
      expect(contactSpy.create).not.toHaveBeenCalled();
    });

    it('calls contactApi.create with form data and navigates on success', async () => {
      const navSpy = spyOn(router, 'navigate');

      await component.save();

      expect(contactSpy.create).toHaveBeenCalled();
      expect(navSpy).toHaveBeenCalledWith(['/contacts', 77]);
    });

    it('uploads front and back assets when both blobs are present', async () => {
      const front = new File([makeBlob('f')], 'front.jpg', { type: 'image/jpeg' });
      const back  = new File([makeBlob('b')], 'back.jpg',  { type: 'image/jpeg' });
      component.frontBlob.set(front);
      component.backBlob.set(back);

      await component.save();

      expect(assetSpy.upload).toHaveBeenCalledTimes(2);
      expect(assetSpy.upload.calls.allArgs().map((a: unknown[]) => a[2])).toEqual(
        jasmine.arrayContaining(['front', 'back'])
      );
    });

    it('sets saveError and clears saving flag on contactApi error', async () => {
      contactSpy.create.and.returnValue(throwError(() => new Error('fail')));

      await component.save();

      expect(component.saveError()).toBe('Speichern fehlgeschlagen. Bitte erneut versuchen.');
      expect(component.saving()).toBeFalse();
    });
  });

  // ── cleanup ───────────────────────────────────────────────────────────────

  it('revokes object URLs on destroy', () => {
    const revokeSpy = spyOn(URL, 'revokeObjectURL');
    component.frontPreviewUrl.set('blob:front');
    component.backPreviewUrl.set('blob:back');

    component.ngOnDestroy();

    expect(revokeSpy).toHaveBeenCalledWith('blob:front');
    expect(revokeSpy).toHaveBeenCalledWith('blob:back');
  });
});
