import {
  Component,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../shared/auth.service';

interface RegisterCredentials {
  username: string;
  password: string;
  confirmPassword: string;
}

@Component({
  selector: 'app-sing-up',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './sing-up.html',
  styleUrls: ['./sing-up.css'],
})
export class SingUp implements AfterViewInit, OnDestroy {
  @ViewChild('waveCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  credentials: RegisterCredentials = {
    username: '',
    password: '',
    confirmPassword: '',
  };

  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  shakeCard = false;
  registerError = '';

  private animFrameId = 0;
  private ctx!: CanvasRenderingContext2D;
  private canvas!: HTMLCanvasElement;
  private startTime = Date.now();

  private readonly onResize = (): void => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initWaveCanvas();
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.onResize);
    }
  }

  onSubmit(): void {
    if (
      !this.credentials.username ||
      !this.credentials.password ||
      !this.credentials.confirmPassword
    ) {
      this.triggerShake();
      return;
    }
    if (this.credentials.password !== this.credentials.confirmPassword) {
      this.registerError = 'Las contraseñas no coinciden';
      this.triggerShake();
      return;
    }

    this.isLoading = true;
    this.registerError = '';

    this.authService.register({ username: this.credentials.username, password: this.credentials.password }).subscribe({
      next: () => {
        this.isLoading = false;
        void this.router.navigate(['/login']);
      },
      error: (err: { error?: { message?: string } }) => {
        this.isLoading = false;
        this.registerError = err?.error?.message ?? 'Error al crear la cuenta';
        this.triggerShake();
      },
    });
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  registerWithGoogle(): void {
    // Same Zitadel IDP flow as login — a new user is created on first sign-in.
    this.authService.loginWithGoogle();
  }

  private triggerShake(): void {
    this.shakeCard = true;
    setTimeout(() => (this.shakeCard = false), 500);
  }

  private initWaveCanvas(): void {
    try {
      this.canvas = this.canvasRef.nativeElement;
      const ctx = this.canvas.getContext('2d');
      if (!ctx) return;
      this.ctx = ctx;
      window.addEventListener('resize', this.onResize);
      this.onResize();
      this.animate();
    } catch {
      /* canvas no disponible */
    }
  }

  private animate(): void {
    const { ctx, canvas } = this;
    const W = canvas.width;
    const H = canvas.height;
    const t = (Date.now() - this.startTime) / 1000;

    ctx.clearRect(0, 0, W, H);

    const waves = [
      // Capas externas: mayor amplitud, menor opacidad, línea más fina
      { amp: 140, freq: 0.008, speed: 0.45, phase: 0.0, y: H * 0.5, color: 'rgba(139, 92, 246, 0.15)', lw: 1.0 },
      { amp: 120, freq: 0.008, speed: 0.45, phase: 0.2, y: H * 0.5, color: 'rgba(147, 51, 234, 0.25)', lw: 1.2 },
      { amp: 100, freq: 0.008, speed: 0.45, phase: 0.4, y: H * 0.5, color: 'rgba(168, 85, 247, 0.40)', lw: 1.4 },
      
      // Capas internas: menor amplitud, mayor opacidad, línea más gruesa (núcleo brillante)
      { amp: 80,  freq: 0.008, speed: 0.45, phase: 0.6, y: H * 0.5, color: 'rgba(192, 132, 252, 0.60)', lw: 1.6 },
      { amp: 60,  freq: 0.008, speed: 0.45, phase: 0.8, y: H * 0.5, color: 'rgba(216, 180, 254, 0.80)', lw: 1.8 },
      { amp: 40,  freq: 0.008, speed: 0.45, phase: 1.0, y: H * 0.5, color: 'rgba(233, 213, 255, 1.00)', lw: 2.0 },
    ];

    // Línea diagonal: de (0, H) → (W, 0), con offset por onda
    waves.forEach((wave) => {
      ctx.beginPath();
      for (let x = 0; x <= W; x += 2) {
        const diagonalY = H * 0.85 - (x / W) * (H * 0.55) + wave.phase * 60 - (waves.length * 60) / 2;
        const y = diagonalY + wave.amp * Math.sin(wave.freq * x + t * wave.speed + wave.phase);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = wave.color;
      ctx.lineWidth = wave.lw;
      ctx.stroke();
    });

    this.animFrameId = requestAnimationFrame(() => this.animate());
  }
}