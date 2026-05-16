import {
  Component,
  OnDestroy,
  AfterViewInit,
  ViewChild,
  ElementRef,
  HostListener,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent } from '../shared/icon/icon.component';
import { DocumentationService } from '../shared/documentation.service';
import { AuthService } from '../shared/auth.service';

interface UserClaims {
  name?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
}

interface NetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, IconComponent],
  templateUrl: './dashboard.html',
  styleUrls: ['./dashboard.css'],
})
export class DashboardComponent implements AfterViewInit, OnDestroy {
  @ViewChild('networkCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private animFrameId = 0;
  private nodes: NetworkNode[] = [];
  private ctx!: CanvasRenderingContext2D;
  private canvas!: HTMLCanvasElement;

  private readonly onResize = (): void => {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.buildNodes();
  };

  sidebarOpen = true;
  userMenuOpen = false;

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  toggleUserMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.userMenuOpen = !this.userMenuOpen;
  }

  @HostListener('document:click')
  closeUserMenu(): void {
    this.userMenuOpen = false;
  }

  get userClaims(): UserClaims {
    return (this.authService.getUserInfo() as UserClaims) ?? {};
  }

  get userName(): string {
    const c = this.userClaims;
    if (c.name) return c.name;
    const parts = [c.given_name, c.family_name].filter(Boolean);
    return parts.length ? parts.join(' ') : 'User';
  }

  get userEmail(): string {
    return this.userClaims.email ?? '';
  }

  get userInitials(): string {
    return this.userName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }

  constructor(
    @Inject(PLATFORM_ID) private platformId: object,
    public docService: DocumentationService,
    public authService: AuthService,
  ) {}

  ngAfterViewInit(): void {
    if (isPlatformBrowser(this.platformId)) {
      this.initNetworkCanvas();
    }
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animFrameId);
    if (isPlatformBrowser(this.platformId)) {
      window.removeEventListener('resize', this.onResize);
    }
  }

  private initNetworkCanvas(): void {
    try {
      this.canvas = this.canvasRef.nativeElement;
      const ctx = this.canvas.getContext('2d');
      if (!ctx) return;
      this.ctx = ctx;
      window.addEventListener('resize', this.onResize);
      this.onResize();
      this.animate();
    } catch {
      /* Canvas no disponible en entorno SSR o tests */
    }
  }

  private buildNodes(): void {
    const count = Math.floor((this.canvas.width * this.canvas.height) / 20000);
    this.nodes = Array.from({ length: count }, () => ({
      x: Math.random() * this.canvas.width,
      y: Math.random() * this.canvas.height,
      vx: (Math.random() - 0.5) * 0.32,
      vy: (Math.random() - 0.5) * 0.32,
      radius: Math.random() * 2 + 1,
    }));
  }

  private animate(): void {
    const { ctx, canvas, nodes } = this;
    const W = canvas.width;
    const H = canvas.height;
    const MAX_DIST = 130;

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
          const alpha = (1 - dist / MAX_DIST) * 0.38;
          ctx.beginPath();
          ctx.strokeStyle = `rgba(196, 165, 255, ${alpha})`;
          ctx.lineWidth = 0.85;
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }
    }

    nodes.forEach((n) => {
      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.radius * 2.5);
      grad.addColorStop(0, 'rgba(200, 150, 255, 0.95)');
      grad.addColorStop(0.45, 'rgba(124, 200, 255, 0.3)');
      grad.addColorStop(1, 'rgba(168, 85, 247, 0)');

      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(n.x, n.y, n.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = 'rgba(230, 210, 255, 0.92)';
      ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
      ctx.fill();
    });

    this.animFrameId = requestAnimationFrame(() => this.animate());
  }
}
