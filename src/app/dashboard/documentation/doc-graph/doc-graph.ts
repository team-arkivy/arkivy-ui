import {
  AfterViewInit, Component, ElementRef, Inject, PLATFORM_ID, ViewChild, effect, inject,
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { IconComponent } from '../../../shared/icon/icon.component';
import { ContentService } from '../../../shared/content.service';
import { GraphEdge, GraphNode } from '../../../shared/api.service';

interface LayoutNode extends GraphNode {
  x: number;
  y: number;
}

const ITERATIONS = 300;
const NODE_RADIUS = 8;
const HOVER_RADIUS = 16;

/**
 * Vista de grafo de nodos (RF-NODE-04) — nodos = páginas del Espacio actual,
 * aristas = page_links reales. El layout de fuerzas (Fruchterman-Reingold)
 * corre una sola vez, síncrono, al recibir los datos — no hay una
 * simulación en vivo cuadro a cuadro, así que no hace falta un loop de
 * requestAnimationFrame continuo como el de la animación decorativa de
 * dashboard.ts (esa es solo estética: partículas random conectadas por
 * proximidad, sin aristas reales ni fuerzas de atracción).
 *
 * hoveredId/layoutNodes son propiedades planas a propósito: solo controlan
 * el redibujado imperativo del canvas (no hay bindings de plantilla sobre
 * ellas), así que la trampa zoneless de ContentService no aplica acá.
 */
@Component({
  selector: 'app-doc-graph',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './doc-graph.html',
  styleUrls: ['./doc-graph.css'],
})
export class DocGraphComponent implements AfterViewInit {
  content = inject(ContentService);
  private router = inject(Router);

  @ViewChild('graphCanvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D;
  private layoutNodes: LayoutNode[] = [];
  private edges: GraphEdge[] = [];
  private hoveredId: string | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: object) {
    effect(() => {
      const nodes = this.content.graphNodes();
      const edges = this.content.graphEdges();
      this.edges = edges;
      this.layoutNodes = this.computeLayout(nodes, edges);
      this.draw();
    });
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    this.canvas = this.canvasRef?.nativeElement;
    const ctx = this.canvas?.getContext('2d');
    if (!this.canvas || !ctx) return;
    this.ctx = ctx;
    // El propio canvas ya está posicionado por flexbox (flex:1 dentro de
    // .doc-graph-overlay) — medirlo a él, no a su padre, para que el buffer
    // de dibujo coincida exactamente con su tamaño renderizado (si no, el
    // hit-testing del mouse se desalinea contra el layout calculado).
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width || 800;
    this.canvas.height = rect.height || 600;
    this.draw();
  }

  close(): void {
    this.content.toggleGraph();
  }

  onMouseMove(event: MouseEvent): void {
    const hit = this.nodeAt(event);
    const newId = hit?.id ?? null;
    if (newId === this.hoveredId) return;
    this.hoveredId = newId;
    if (this.canvas) this.canvas.style.cursor = newId ? 'pointer' : 'default';
    this.draw();
  }

  onClick(event: MouseEvent): void {
    const hit = this.nodeAt(event);
    if (!hit) return;
    this.close();
    void this.router.navigate(['/dashboard/documentation', hit.id]);
  }

  private nodeAt(event: MouseEvent): LayoutNode | undefined {
    if (!this.canvas) return undefined;
    const rect = this.canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    return this.layoutNodes.find(n => Math.hypot(n.x - x, n.y - y) <= HOVER_RADIUS);
  }

  /** Fruchterman-Reingold simplificado: repulsión entre todo par de nodos + atracción a lo largo de cada arista, con temperatura que enfría linealmente. */
  private computeLayout(nodes: GraphNode[], edges: GraphEdge[]): LayoutNode[] {
    const width = this.canvas?.width ?? 800;
    const height = this.canvas?.height ?? 600;
    const positioned: LayoutNode[] = nodes.map(n => ({
      ...n,
      x: Math.random() * width,
      y: Math.random() * height,
    }));
    if (positioned.length <= 1) return positioned;

    const byId = new Map(positioned.map(n => [n.id, n]));
    const k = Math.sqrt((width * height) / positioned.length);
    let temperature = width / 10;
    const cooling = temperature / ITERATIONS;
    const margin = 30;

    for (let iter = 0; iter < ITERATIONS; iter++) {
      const disp = new Map<string, { x: number; y: number }>(positioned.map(n => [n.id, { x: 0, y: 0 }]));

      for (let i = 0; i < positioned.length; i++) {
        for (let j = i + 1; j < positioned.length; j++) {
          const a = positioned[i], b = positioned[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const force = (k * k) / dist;
          const fx = (dx / dist) * force, fy = (dy / dist) * force;
          const da = disp.get(a.id)!, db = disp.get(b.id)!;
          da.x += fx; da.y += fy;
          db.x -= fx; db.y -= fy;
        }
      }

      for (const e of edges) {
        const a = byId.get(e.source), b = byId.get(e.target);
        if (!a || !b || a.id === b.id) continue;
        const dx = a.x - b.x, dy = a.y - b.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const force = (dist * dist) / k;
        const fx = (dx / dist) * force, fy = (dy / dist) * force;
        const da = disp.get(a.id)!, db = disp.get(b.id)!;
        da.x -= fx; da.y -= fy;
        db.x += fx; db.y += fy;
      }

      for (const n of positioned) {
        const d = disp.get(n.id)!;
        const dist = Math.sqrt(d.x * d.x + d.y * d.y) || 0.01;
        const capped = Math.min(dist, temperature);
        n.x = Math.max(margin, Math.min(width - margin, n.x + (d.x / dist) * capped));
        n.y = Math.max(margin, Math.min(height - margin, n.y + (d.y / dist) * capped));
      }

      temperature -= cooling;
    }

    return positioned;
  }

  private draw(): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const byId = new Map(this.layoutNodes.map(n => [n.id, n]));

    for (const e of this.edges) {
      const a = byId.get(e.source), b = byId.get(e.target);
      if (!a || !b) continue;
      const highlighted = this.hoveredId === a.id || this.hoveredId === b.id;
      ctx.beginPath();
      ctx.strokeStyle = highlighted ? 'rgba(167, 139, 250, 0.85)' : 'rgba(139, 92, 246, 0.25)';
      ctx.lineWidth = highlighted ? 2 : 1;
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    for (const n of this.layoutNodes) {
      const hovered = this.hoveredId === n.id;
      const r = hovered ? NODE_RADIUS * 1.4 : NODE_RADIUS;

      const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, r * 2.5);
      grad.addColorStop(0, 'rgba(200, 150, 255, 0.95)');
      grad.addColorStop(0.45, 'rgba(124, 200, 255, 0.3)');
      grad.addColorStop(1, 'rgba(168, 85, 247, 0)');
      ctx.beginPath();
      ctx.fillStyle = grad;
      ctx.arc(n.x, n.y, r * 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = hovered ? 'rgba(230, 210, 255, 1)' : 'rgba(230, 210, 255, 0.85)';
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();

      ctx.font = '11px Inter, sans-serif';
      ctx.fillStyle = hovered ? 'rgba(255, 255, 255, 0.95)' : 'rgba(220, 215, 255, 0.65)';
      ctx.textAlign = 'center';
      const label = n.title.length > 22 ? n.title.slice(0, 21) + '…' : n.title;
      ctx.fillText(label || 'Sin título', n.x, n.y + r + 14);
    }
  }
}
