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
import {AuthService} from '../shared/auth.service';

interface LoginCredentials {
  username: string;
  password: string;
}

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class LoginComponent implements AfterViewInit, OnDestroy {
  @ViewChild('networkCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  credentials: LoginCredentials = { username: '', password: '' };

  showPassword = false;
  isLoading = false;
  shakeCard = false;
  loginError = '';

  private animFrameId = 0;
  private nodes: NetworkNode[] = [];
  private ctx!: CanvasRenderingContext2D;
  private canvas!: HTMLCanvasElement;

  private readonly onResize = (): void => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.buildNodes();
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) private platformId: object,
  ) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initNetworkCanvas();
    }
  }

  ngOnDestroy(): void {
    if (isPlatformBrowser(this.platformId)) {
      cancelAnimationFrame(this.animFrameId);
      window.removeEventListener('resize', this.onResize);
    }
  }

  onSubmit(): void {
    this.authService.login();
  }

  onForgotPassword(event: Event): void {
    event.preventDefault();
    void this.router.navigate(['/forgot-password']);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  loginWithGoogle(): void {
    this.authService.login();
  }

  loginWithGitHub(): void {
    this.authService.login();
  }

  private triggerShake(): void {
    this.shakeCard = true;
    setTimeout(() => {
      this.shakeCard = false;
    }, 500);
  }

  private initNetworkCanvas(): void {
    try {
      this.canvas = this.canvasRef.nativeElement;
      const ctx = this.canvas.getContext('2d');
      if (!ctx) {
        return;
      }
      this.ctx = ctx;

      window.addEventListener('resize', this.onResize);
      this.onResize();
      this.animate();
    } catch {
      /* Sin canvas 2D (p. ej. algunos entornos de prueba). */
    }
  }

  private buildNodes(): void {
    const count = Math.floor((this.canvas.width * this.canvas.height) / 14000);
    this.nodes = Array.from({ length: count }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      radius: Math.random() * 2.5 + 1,
    }));
  }

  private animate(): void {
    const { ctx, canvas, nodes } = this;
    const W = canvas.width;
    const H = canvas.height;
    const MAX_DIST = 140;

    ctx.clearRect(0, 0, W, H);

    nodes.forEach((n) => {
      n.x += n.vx;
      n.y += n.vy;
      if (n.x < 0 || n.x > W) n.vx *= -1;
      if (n.y < 0 || n.y > H) n.vy *= -1;
    });

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < MAX_DIST) {
          const t = 1 - dist / MAX_DIST;
          const alpha = t * 0.58;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(196, 165, 255, ${alpha})`;
          ctx.lineWidth = 1.05;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    nodes.forEach((n) => {
      ctx.beginPath();
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * 2.5);
      grad.addColorStop(0, 'rgba(200, 150, 255, 0.98)');
      grad.addColorStop(0.45, 'rgba(124, 200, 255, 0.35)');
      grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.fillStyle = grad;
      ctx.arc(n.x, n.y, n.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = 'rgba(230, 210, 255, 0.95)';
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    this.animFrameId = requestAnimationFrame(() => this.animate());
  }
}
