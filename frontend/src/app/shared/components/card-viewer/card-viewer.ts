import {
  Component, OnDestroy, AfterViewInit,
  ElementRef, ViewChild, Input, effect, signal,
  ChangeDetectionStrategy, NgZone, inject, HostListener
} from '@angular/core';
import { CARD_VERTEX_SHADER, CARD_FRAGMENT_SHADER } from './card-viewer.shaders';

@Component({
  selector: 'app-card-viewer',
  standalone: true,
  templateUrl: './card-viewer.html',
  styleUrl: './card-viewer.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CardViewer implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() set frontImageUrl(url: string | null | undefined) {
    this._frontUrl.set(url ?? null);
  }
  @Input() set backImageUrl(url: string | null | undefined) {
    this._backUrl.set(url ?? null);
  }

  private readonly _frontUrl = signal<string | null>(null);
  private readonly _backUrl  = signal<string | null>(null);
  readonly expanded          = signal(false);

  private readonly ngZone = inject(NgZone);

  // Three.js Objekte — via lazy import gesetzt
  private three:    typeof import('three') | null = null;
  private renderer: import('three').WebGLRenderer | null = null;
  private scene:    import('three').Scene | null = null;
  private camera:   import('three').PerspectiveCamera | null = null;
  private cardMesh: import('three').Mesh | null = null;
  private material: import('three').ShaderMaterial | null = null;
  private animId:   number | null = null;

  // Drag-State
  private isDragging  = false;
  private prevMouseX  = 0;
  private prevMouseY  = 0;
  private velocityX   = 0;
  private velocityY   = 0;

  // Kamera-Zoom (Fullscreen animiert näher ran)
  private readonly CAMERA_Z_NORMAL = 2.8;
  // Auf Mobile (< 480px) 10% kleiner als Desktop-Fullscreen
  private get CAMERA_Z_EXPANDED(): number {
    return window.innerWidth < 480 ? 1.67 : 1.5;
  }
  private targetCameraZ = 2.8;

  // Resize
  private resizeObserver: ResizeObserver | null = null;

  // Cleanup
  private readonly abortCtrl = new AbortController();

  constructor() {
    effect(() => {
      const front = this._frontUrl();
      const back  = this._backUrl();
      if (this.material && this.three) {
        this.updateTextures(front, back);
      }
    });
  }

  async ngAfterViewInit(): Promise<void> {
    await this.initThree();
  }

  // ── Fullscreen Toggle ────────────────────────────────────────────────────

  toggleExpanded(): void {
    this.expanded.update(v => !v);
    this.targetCameraZ = this.expanded()
      ? this.CAMERA_Z_EXPANDED
      : this.CAMERA_Z_NORMAL;
    this.applyResize();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (!this.expanded()) return;
    this.expanded.set(false);
    this.targetCameraZ = this.CAMERA_Z_NORMAL;
    this.applyResize();
  }

  /**
   * Called by toggle/escape. Pauses the ResizeObserver to prevent feedback
   * loops while the renderer re-sizes, then restores observation after the
   * browser has applied the new CSS dimensions.
   */
  private applyResize(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (this.resizeObserver && canvas) {
      this.resizeObserver.unobserve(canvas);
    }
    // Two-step: first frame lets Angular/CSS settle, second reads stable size.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.onResize();
        if (this.resizeObserver && canvas) {
          this.resizeObserver.observe(canvas);
        }
      });
    });
  }

  private onResize(): void {
    if (!this.renderer || !this.camera) return;
    let width: number;
    let height: number;
    if (this.expanded()) {
      // In fullscreen the canvas fills the viewport — use window dimensions directly
      width  = window.innerWidth;
      height = window.innerHeight;
    } else {
      // Use the parent container width so the canvas shrinks back correctly
      const container = this.canvasRef.nativeElement.parentElement;
      const rect = container
        ? container.getBoundingClientRect()
        : this.canvasRef.nativeElement.getBoundingClientRect();
      width  = rect.width;
      // Echte Container-Höhe nutzen (z.B. 100svh auf Mobile), sonst CSS-Defaults
      height = rect.height || (window.innerWidth >= 640 ? 320 : window.innerWidth >= 480 ? 260 : 220);
    }
    if (!width || !height) return;
    this.renderer.setSize(width, height, false); // false = don't override CSS size
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  // ── Three.js Setup ──────────────────────────────────────────────────────

  private async initThree(): Promise<void> {
    const [THREE, { GLTFLoader }] = await Promise.all([
      import('three'),
      import('three/addons/loaders/GLTFLoader.js'),
    ]);
    this.three = THREE;

    const canvas  = this.canvasRef.nativeElement;
    const { width, height } = canvas.getBoundingClientRect();

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(width || 600, height || 320);

    this.scene  = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(38, (width || 600) / (height || 320), 0.01, 100);
    this.camera.position.set(0, 0, 2.8);

    const ambient  = new THREE.AmbientLight(0xffffff, 0.55);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(1.5, 2, 3);
    this.scene.add(ambient, dirLight);

    const loader = new GLTFLoader();
    const gltf   = await loader.loadAsync('/assets/models/Visitenkarte.glb');
    const root   = gltf.scene;

    this.material = new THREE.ShaderMaterial({
      vertexShader:   CARD_VERTEX_SHADER,
      fragmentShader: CARD_FRAGMENT_SHADER,
      uniforms: {
        frontMap:  { value: null },
        backMap:   { value: null },
        hasFront:  { value: false },
        hasBack:   { value: false },
        edgeColor: { value: new THREE.Color(0xf7f7f5) },
        faceAxis:  { value: new THREE.Vector3(1, 0, 0) },
        uAxis:     { value: new THREE.Vector3(0, 0, 1) },
        vAxis:     { value: new THREE.Vector3(0, 1, 0) },
        minPos:    { value: new THREE.Vector3(-0.5, -0.5, -0.5) },
        maxPos:    { value: new THREE.Vector3( 0.5,  0.5,  0.5) },
      },
      side: THREE.DoubleSide,
    });

    root.traverse(obj => {
      if ((obj as import('three').Mesh).isMesh) {
        this.cardMesh = obj as import('three').Mesh;
        this.cardMesh.geometry.computeBoundingBox();
        const bb   = this.cardMesh.geometry.boundingBox!;
        const size = new THREE.Vector3();
        bb.getSize(size);

        const minDim = Math.min(size.x, size.y, size.z);
        let faceAxis: import('three').Vector3;
        let uAxis:    import('three').Vector3;
        let vAxis:    import('three').Vector3;

        if (minDim === size.x) {
          faceAxis = new THREE.Vector3(1, 0, 0);
          uAxis    = new THREE.Vector3(0, 0, 1);
          vAxis    = new THREE.Vector3(0, 1, 0);
        } else if (minDim === size.y) {
          faceAxis = new THREE.Vector3(0, 1, 0);
          uAxis    = new THREE.Vector3(1, 0, 0);
          vAxis    = new THREE.Vector3(0, 0, 1);
        } else {
          faceAxis = new THREE.Vector3(0, 0, 1);
          uAxis    = new THREE.Vector3(1, 0, 0);
          vAxis    = new THREE.Vector3(0, 1, 0);
        }

        this.material!.uniforms['faceAxis'].value = faceAxis;
        this.material!.uniforms['uAxis'].value    = uAxis;
        this.material!.uniforms['vAxis'].value    = vAxis;
        this.material!.uniforms['minPos'].value   = bb.min;
        this.material!.uniforms['maxPos'].value   = bb.max;
        this.cardMesh.material = this.material!;
      }
    });

    const faceAxis = this.material.uniforms['faceAxis'].value as import('three').Vector3;
    const q = new THREE.Quaternion().setFromUnitVectors(faceAxis, new THREE.Vector3(0, 0, 1));
    root.setRotationFromQuaternion(q);
    root.rotation.x += -0.08;
    this.scene.add(root);

    this.updateTextures(this._frontUrl(), this._backUrl());
    this.registerDragEvents(canvas);

    // ResizeObserver passt Renderer bei Größenänderung an.
    // Der Observer wird während Fullscreen-Übergängen vorübergehend pausiert
    // (siehe applyResize), um Feedback-Schleifen zu vermeiden.
    this.resizeObserver = new ResizeObserver(() => {
      // Only react when NOT in an expanded state — fullscreen sizing is
      // handled explicitly by applyResize/onResize.
      if (!this.expanded()) {
        this.onResize();
      }
    });
    this.resizeObserver.observe(canvas);

    this.ngZone.runOutsideAngular(() => this.renderLoop());
  }

  // ── Render Loop ─────────────────────────────────────────────────────────

  private renderLoop(): void {
    if (!this.renderer || !this.scene || !this.camera) return;

    // Kamera sanft zum Ziel-Z interpolieren (Zoom-Animation)
    const dz = this.targetCameraZ - this.camera.position.z;
    if (Math.abs(dz) > 0.001) {
      this.camera.position.z += dz * 0.1;
    }

    // Trägheit nach Loslassen
    if (!this.isDragging && this.cardMesh?.parent) {
      const parent = this.cardMesh.parent;
      if (Math.abs(this.velocityX) > 0.0001 || Math.abs(this.velocityY) > 0.0001) {
        parent.rotation.y += this.velocityX;
        parent.rotation.x += this.velocityY;
        this.velocityX *= 0.92;
        this.velocityY *= 0.92;
      }
    }

    this.renderer.render(this.scene, this.camera);
    this.animId = requestAnimationFrame(() => this.renderLoop());
  }

  // ── Textur-Update ───────────────────────────────────────────────────────

  private async updateTextures(frontUrl: string | null, backUrl: string | null): Promise<void> {
    if (!this.material || !this.three) return;
    const loader = new this.three.TextureLoader();

    if (frontUrl) {
      try {
        const tex = await loader.loadAsync(frontUrl);
        this.material.uniforms['frontMap'].value = tex;
        this.material.uniforms['hasFront'].value = true;
      } catch (e) {
        console.error('[CardViewer] Vorderseite konnte nicht geladen werden:', frontUrl, e);
      }
    } else {
      this.material.uniforms['frontMap'].value = null;
      this.material.uniforms['hasFront'].value = false;
    }

    if (backUrl) {
      try {
        const tex = await loader.loadAsync(backUrl);
        this.material.uniforms['backMap'].value = tex;
        this.material.uniforms['hasBack'].value = true;
      } catch (e) {
        console.error('[CardViewer] Rückseite konnte nicht geladen werden:', backUrl, e);
      }
    } else {
      this.material.uniforms['backMap'].value = null;
      this.material.uniforms['hasBack'].value = false;
    }

    this.material.needsUpdate = true;
  }

  // ── Drag-Rotation ────────────────────────────────────────────────────────

  private registerDragEvents(canvas: HTMLCanvasElement): void {
    const signal = this.abortCtrl.signal;
    const opts   = { signal, passive: true } as AddEventListenerOptions;

    canvas.addEventListener('mousedown',  e => this.onDragStart(e.clientX, e.clientY), opts);
    canvas.addEventListener('mousemove',  e => this.onDragMove(e.clientX,  e.clientY), opts);
    canvas.addEventListener('mouseup',    () => this.onDragEnd(), opts);
    canvas.addEventListener('mouseleave', () => this.onDragEnd(), opts);

    canvas.addEventListener('touchstart', e => {
      const t = e.touches[0];
      this.onDragStart(t.clientX, t.clientY);
    }, opts);
    canvas.addEventListener('touchmove', e => {
      const t = e.touches[0];
      this.onDragMove(t.clientX, t.clientY);
    }, opts);
    canvas.addEventListener('touchend', () => this.onDragEnd(), opts);
  }

  private onDragStart(x: number, y: number): void {
    this.isDragging = true;
    this.prevMouseX = x;
    this.prevMouseY = y;
    this.velocityX  = 0;
    this.velocityY  = 0;
  }

  private onDragMove(x: number, y: number): void {
    if (!this.isDragging || !this.cardMesh?.parent) return;
    const parent = this.cardMesh.parent;
    const dx = (x - this.prevMouseX) * 0.007;
    const dy = (y - this.prevMouseY) * 0.007;
    parent.rotation.y += dx;
    parent.rotation.x += dy;
    parent.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, parent.rotation.x));
    this.velocityX  = dx;
    this.velocityY  = dy;
    this.prevMouseX = x;
    this.prevMouseY = y;
  }

  private onDragEnd(): void {
    this.isDragging = false;
  }

  // ── Cleanup ──────────────────────────────────────────────────────────────

  ngOnDestroy(): void {
    this.abortCtrl.abort();
    if (this.animId !== null) cancelAnimationFrame(this.animId);
    this.resizeObserver?.disconnect();
    this.renderer?.dispose();
    this.material?.dispose();
  }
}
