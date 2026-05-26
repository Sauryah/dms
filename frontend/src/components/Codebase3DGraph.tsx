import React, { useRef, useEffect, useState } from 'react';

export interface CodeNode {
  id: string;
  label: string;
  file_type: string;
  source_file: string;
  source_location?: string;
  community?: number;
  norm_label?: string;
}

export interface CodeLink {
  source: string;
  target: string;
  relation?: string;
}

interface Codebase3DGraphProps {
  nodes: CodeNode[];
  links: CodeLink[];
  highlightQuery: string;
  onNodeClick: (node: CodeNode) => void;
}

interface SimNode {
  id: string;
  label: string;
  file_type: string;
  source_file: string;
  source_location?: string;
  community?: number;
  isFunction: boolean;
  category: 'backend' | 'frontend' | 'config' | 'other';
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

const Codebase3DGraph: React.FC<Codebase3DGraphProps> = ({
  nodes,
  links,
  highlightQuery,
  onNodeClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const simNodesRef = useRef<SimNode[]>([]);
  const simLinksRef = useRef<CodeLink[]>([]);
  
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const angleXRef = useRef<number>(0.3);
  const angleYRef = useRef<number>(0.0);
  const zoomRef = useRef<number>(0.72);
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastInteractionRef = useRef<number>(Date.now());

  // Code packet flows along codebase links
  const packetRef = useRef<{ linkIndex: number; progress: number; speed: number }[]>([]);

  // Synchronize React nodes/links into our active physics loop
  useEffect(() => {
    const existing = new Map<string, SimNode>();
    simNodesRef.current.forEach(n => existing.set(n.id, n));

    const newSimNodes = nodes.map(n => {
      const nodeLabel = n.label || '';
      const nodeSourceFile = n.source_file || '';

      if (existing.has(n.id)) {
        return {
          ...existing.get(n.id)!,
          label: nodeLabel,
          source_file: nodeSourceFile,
        };
      }

      // Categorize nodes
      const isFunction = nodeLabel.endsWith('()') || nodeLabel.includes('(');
      let category: 'backend' | 'frontend' | 'config' | 'other' = 'other';
      
      const fileLower = nodeSourceFile.toLowerCase();
      if (fileLower.includes('config') || fileLower.endsWith('.json')) {
        category = 'config';
      } else if (fileLower.includes('backend')) {
        category = 'backend';
      } else if (fileLower.includes('frontend')) {
        category = 'frontend';
      }

      // Initial shell placements: files form larger spaced networks, functions orbit their parents
      let radius = 360;
      if (!isFunction) {
        radius = category === 'backend' ? 190 : category === 'frontend' ? 320 : category === 'config' ? 130 : 220;
      } else {
        radius = 500;
      }

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      return {
        id: n.id,
        label: nodeLabel,
        file_type: n.file_type || '',
        source_file: nodeSourceFile,
        source_location: n.source_location,
        community: n.community,
        isFunction,
        category,
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.sin(phi) * Math.sin(theta),
        z: radius * Math.cos(phi),
        vx: 0,
        vy: 0,
        vz: 0,
      };
    });

    simNodesRef.current = newSimNodes;
    simLinksRef.current = links;
  }, [nodes, links]);

  // Handle drag controls
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDraggingRef.current = true;
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    lastInteractionRef.current = Date.now();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (isDraggingRef.current) {
      const deltaX = e.clientX - dragStartRef.current.x;
      const deltaY = e.clientY - dragStartRef.current.y;
      
      angleYRef.current += deltaX * 0.004;
      angleXRef.current += deltaY * 0.004;
      angleXRef.current = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, angleXRef.current));

      dragStartRef.current = { x: e.clientX, y: e.clientY };
      lastInteractionRef.current = Date.now();
    } else {
      // Hover snap calculations
      const nodesCopy = [...simNodesRef.current];
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const focalLength = 350;

      const cosY = Math.cos(angleYRef.current);
      const sinY = Math.sin(angleYRef.current);
      const cosX = Math.cos(angleXRef.current);
      const sinX = Math.sin(angleXRef.current);

      let foundHover: SimNode | null = null;
      let minDistance = 14;

      nodesCopy.forEach(n => {
        let x1 = n.x * cosY - n.z * sinY;
        let z1 = n.x * sinY + n.z * cosY;
        let y2 = n.y * cosX - z1 * sinX;
        let z2 = n.y * sinX + z1 * cosX;

        const distance = focalLength * 1.5 * zoomRef.current;
        const denominator = z2 + distance;
        const scale = denominator > 12 ? focalLength / denominator : 0;
        const sx = cx + x1 * scale;
        const sy = cy + y2 * scale;

        const dx = mouseX - sx;
        const dy = mouseY - sy;
        const d = Math.sqrt(dx * dx + dy * dy);

        const nodeRadius = !n.isFunction ? 11 : 5;
        if (d < nodeRadius + 4 && d < minDistance) {
          minDistance = d;
          foundHover = n;
        }
      });

      setHoveredNode(foundHover);
    }
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    // Logarithmic scroll step: zoom faster when far away, slower when close for high-precision orbit piloting
    const zoomStep = zoomRef.current * 0.085;
    const direction = e.deltaY > 0 ? 1 : -1;
    
    zoomRef.current += direction * zoomStep;
    // Lower bound at 0.002 (essentially 0 distance/fly-through) and upper bound at 8.0 (deep space view)
    zoomRef.current = Math.max(0.002, Math.min(8.0, zoomRef.current));
    lastInteractionRef.current = Date.now();
  };

  const handleCanvasClick = () => {
    if (hoveredNode) {
      onNodeClick({
        id: hoveredNode.id,
        label: hoveredNode.label,
        file_type: hoveredNode.file_type,
        source_file: hoveredNode.source_file,
        source_location: hoveredNode.source_location,
        community: hoveredNode.community,
      });
    }
  };

  // Main 3D render loop with physics solvers
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const resizeCanvas = () => {
      if (containerRef.current && canvasRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    const tick = () => {
      const w = canvas.width;
      const h = canvas.height;
      if (w === 0 || h === 0) {
        animationId = requestAnimationFrame(tick);
        return;
      }

      ctx.clearRect(0, 0, w, h);

      const simNodes = simNodesRef.current;
      const simLinks = simLinksRef.current;

      // Force variables optimized for high density (150+ nodes)
      const repulsion = 7200;
      const springStrength = 0.015;
      const gravity = 0.0035;
      const friction = 0.82;

      // Force 1: Repulsion (coulombs push)
      for (let i = 0; i < simNodes.length; i++) {
        const u = simNodes[i];
        for (let j = i + 1; j < simNodes.length; j++) {
          const v = simNodes[j];
          const dx = u.x - v.x;
          const dy = u.y - v.y;
          const dz = u.z - v.z;
          const distSq = dx * dx + dy * dy + dz * dz + 0.1;
          const dist = Math.sqrt(distSq);

          if (dist < 280) {
            // Functions repel less to keep clusters compact around parent files
            const strengthFactor = (u.isFunction ? 0.3 : 1.0) * (v.isFunction ? 0.3 : 1.0);
            const force = (repulsion * strengthFactor) / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            const fz = (dz / dist) * force;

            u.vx += fx; u.vy += fy; u.vz += fz;
            v.vx -= fx; v.vy -= fy; v.vz -= fz;
          }
        }
      }

      // Force 2: Spring Attraction along dependencies (contains / imports)
      simLinks.forEach(link => {
        const u = simNodes.find(n => n.id === link.source);
        const v = simNodes.find(n => n.id === link.target);
        if (!u || !v) return;

        const dx = u.x - v.x;
        const dy = u.y - v.y;
        const dz = u.z - v.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;

        const desiredLength = u.isFunction || v.isFunction ? 78 : 135;
        const force = (dist - desiredLength) * springStrength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        u.vx -= fx; u.vy -= fy; u.vz -= fz;
        v.vx += fx; v.vy += fy; v.vz += fz;
      });

      // Force 3: Damping gravity bounds
      simNodes.forEach(u => {
        u.vx -= u.x * gravity;
        u.vy -= u.y * gravity;
        u.vz -= u.z * gravity;

        u.x += u.vx;
        u.y += u.vy;
        u.z += u.vz;

        u.vx *= friction;
        u.vy *= friction;
        u.vz *= friction;
      });

      // Camera calculations & auto-orbit rotation
      const isIdle = Date.now() - lastInteractionRef.current > 4000;
      if (isIdle && !isDraggingRef.current) {
        angleYRef.current += 0.0015; // Idle rotation
      }

      const cx = w / 2;
      const cy = h / 2;
      const focalLength = 350;

      const cosY = Math.cos(angleYRef.current);
      const sinY = Math.sin(angleYRef.current);
      const cosX = Math.cos(angleXRef.current);
      const sinX = Math.sin(angleXRef.current);

      const cameraDistance = focalLength * 1.5 * zoomRef.current;

      // Project nodes in 2D coordinates
      const projectedNodes = simNodes.map(n => {
        let x1 = n.x * cosY - n.z * sinY;
        let z1 = n.x * sinY + n.z * cosY;
        let y2 = n.y * cosX - z1 * sinX;
        let z2 = n.y * sinX + z1 * cosX;

        const denominator = z2 + cameraDistance;
        const scale = denominator > 12 ? focalLength / denominator : 0;
        const sx = cx + x1 * scale;
        const sy = cy + y2 * scale;

        const isHighlighted = highlightQuery.trim() !== '' && (
          (n.label || '').toLowerCase().includes(highlightQuery.toLowerCase()) ||
          (n.source_file || '').toLowerCase().includes(highlightQuery.toLowerCase())
        );

        return {
          id: n.id,
          label: n.label,
          file_type: n.file_type,
          source_file: n.source_file,
          source_location: n.source_location,
          community: n.community,
          isFunction: n.isFunction,
          category: n.category,
          rx: x1,
          ry: y2,
          rz: z2,
          sx,
          sy,
          scale,
          isHighlighted
        };
      });

      // Inject data packet flows
      if (packetRef.current.length < simLinks.length && Math.random() < 0.1) {
        packetRef.current.push({
          linkIndex: Math.floor(Math.random() * simLinks.length),
          progress: 0,
          speed: 0.01 + Math.random() * 0.015
        });
      }
      packetRef.current.forEach(p => p.progress += p.speed);
      packetRef.current = packetRef.current.filter(p => p.progress < 1.0);

      // Depth sorted render items
      interface RenderItem {
        type: 'link' | 'node' | 'packet';
        depth: number;
        draw: () => void;
      }

      const items: RenderItem[] = [];

      // Link draw actions
      simLinks.forEach((link, lIndex) => {
        const u = projectedNodes.find(n => n.id === link.source);
        const v = projectedNodes.find(n => n.id === link.target);
        if (!u || !v) return;

        const depth = (u.rz + v.rz) / 2;

        items.push({
          type: 'link',
          depth,
          draw: () => {
            const alpha = Math.max(0.08, Math.min(0.38, u.scale * v.scale * 0.5));
            ctx.beginPath();
            ctx.moveTo(u.sx, u.sy);
            ctx.lineTo(v.sx, v.sy);

            const highlightActive = highlightQuery.trim() !== '';
            if (highlightActive && (u.isHighlighted || v.isHighlighted)) {
              ctx.strokeStyle = `rgba(34, 211, 238, ${Math.min(0.95, alpha * 2.4)})`;
              ctx.lineWidth = 1.5;
            } else if (u.isFunction || v.isFunction) {
              ctx.strokeStyle = `rgba(167, 139, 250, ${alpha * 0.46})`;
              ctx.lineWidth = 0.5;
            } else {
              ctx.strokeStyle = `rgba(148, 163, 184, ${alpha})`;
              ctx.lineWidth = 0.75;
            }
            ctx.stroke();
          }
        });

        // Packets draw actions
        const matchingPackets = packetRef.current.filter(p => p.linkIndex === lIndex);
        matchingPackets.forEach(p => {
          const px = u.sx + (v.sx - u.sx) * p.progress;
          const py = u.sy + (v.sy - u.sy) * p.progress;
          const packetDepth = u.rz + (v.rz - u.rz) * p.progress;

          items.push({
            type: 'packet',
            depth: packetDepth,
            draw: () => {
              const pulseSize = 1.5 + Math.sin(p.progress * Math.PI) * 1.5;
              const opacity = Math.sin(p.progress * Math.PI) * 0.6;
              ctx.beginPath();
              ctx.arc(px, py, pulseSize, 0, Math.PI * 2);
              ctx.fillStyle = `rgba(34, 211, 238, ${opacity})`;
              ctx.fill();
            }
          });
        });
      });

      // Node draw actions
      projectedNodes.forEach(n => {
        const radius = !n.isFunction ? 11 : 5;
        const projectedRadius = radius * n.scale;

        items.push({
          type: 'node',
          depth: n.rz,
          draw: () => {
            const highlightActive = highlightQuery.trim() !== '';
            let opacity = 1.0;
            
            if (highlightActive && !n.isHighlighted) {
              opacity = 0.2;
            }

            const grad = ctx.createRadialGradient(
              n.sx - projectedRadius * 0.3,
              n.sy - projectedRadius * 0.3,
              projectedRadius * 0.05,
              n.sx,
              n.sy,
              projectedRadius
            );

            // Shading color themes
            let colorCore = '#8b5cf6'; // Violet Purple (Function)
            let colorGlow = 'rgba(139, 92, 246, 0.4)';

            if (!n.isFunction) {
              if (n.category === 'backend') {
                colorCore = '#06b6d4'; // Cyan
                colorGlow = 'rgba(6, 182, 212, 0.4)';
              } else if (n.category === 'frontend') {
                colorCore = '#10b981'; // Emerald Green
                colorGlow = 'rgba(16, 185, 129, 0.4)';
              } else if (n.category === 'config') {
                colorCore = '#f59e0b'; // Amber Gold
                colorGlow = 'rgba(245, 158, 11, 0.4)';
              } else {
                colorCore = '#9ca3af'; // Gray (General file)
                colorGlow = 'rgba(156, 163, 175, 0.3)';
              }
            }

            grad.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
            grad.addColorStop(0.3, `rgba(${colorCore === '#06b6d4' ? '6, 182, 212' : colorCore === '#10b981' ? '16, 185, 129' : colorCore === '#f59e0b' ? '245, 158, 11' : colorCore === '#8b5cf6' ? '139, 92, 246' : '156, 163, 175'}, ${opacity})`);
            grad.addColorStop(1, `rgba(${colorCore === '#06b6d4' ? '8, 145, 178' : colorCore === '#10b981' ? '4, 120, 87' : colorCore === '#f59e0b' ? '217, 119, 6' : colorCore === '#8b5cf6' ? '124, 58, 237' : '107, 114, 128'}, ${opacity})`);

            ctx.beginPath();
            ctx.arc(n.sx, n.sy, projectedRadius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

            // Glow Aura ring on select or match
            const isHovered = hoveredNode && hoveredNode.id === n.id;
            if (n.isHighlighted || isHovered) {
              ctx.beginPath();
              ctx.arc(n.sx, n.sy, projectedRadius + 5, 0, Math.PI * 2);
              ctx.strokeStyle = colorCore;
              ctx.lineWidth = isHovered ? 2.2 : 1.2;
              ctx.stroke();

              ctx.beginPath();
              ctx.arc(n.sx, n.sy, projectedRadius + 10, 0, Math.PI * 2);
              ctx.fillStyle = colorGlow;
              ctx.fill();
            }

            // Labels - draw files and hovered functions
            if (!n.isFunction || isHovered || n.isHighlighted) {
              const fontSize = !n.isFunction ? 10 : 8;
              ctx.font = `${!n.isFunction ? '600' : '400'} ${Math.max(8, Math.min(12, fontSize * n.scale))}px Inter, system-ui`;
              ctx.fillStyle = isHovered ? '#f8fafc' : '#cbd5e1';
              ctx.textAlign = 'center';

              ctx.fillText(n.label, n.sx, n.sy + projectedRadius + 11);
            }
          }
        });
      });

      // Painter's algorithm sort
      items.sort((a, b) => b.depth - a.depth);
      items.forEach(item => item.draw());

      animationId = requestAnimationFrame(tick);
    };

    tick();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, [highlightQuery, hoveredNode]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100%', 
        position: 'relative', 
        overflow: 'hidden',
        background: 'transparent',
        cursor: hoveredNode ? 'pointer' : isDraggingRef.current ? 'grabbing' : 'grab'
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* Floating Instructions UI Overlay */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: '1rem', 
          left: '1rem', 
          background: 'rgba(9, 14, 22, 0.78)', 
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(148, 163, 184, 0.22)', 
          borderRadius: '8px', 
          padding: '0.5rem 0.75rem', 
          pointerEvents: 'none',
          fontSize: '0.675rem',
          color: '#94a3b8',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          fontFamily: 'Inter, system-ui'
        }}
      >
        <span style={{ fontWeight: 700, color: '#f8fafc' }}>3D Navigation Controls</span>
        <span>• Click + Drag to rotate orbit</span>
        <span>• Scroll wheel to zoom</span>
        <span>• Click sphere to inspect file/function</span>
      </div>

      {/* Sphere Type Legend */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: '1rem', 
          right: '1rem', 
          background: 'rgba(9, 14, 22, 0.78)', 
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(148, 163, 184, 0.22)', 
          borderRadius: '8px', 
          padding: '0.5rem 0.75rem', 
          pointerEvents: 'none',
          fontSize: '0.675rem',
          color: '#e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontFamily: 'Inter, system-ui'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#06b6d4', boxShadow: '0 0 6px rgba(6, 182, 212, 0.4)' }} />
          <span>Backend Files</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px rgba(16, 185, 129, 0.4)' }} />
          <span>Frontend Components</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 6px rgba(245, 158, 11, 0.4)' }} />
          <span>Configs & Meta</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#a855f7', boxShadow: '0 0 6px rgba(168, 85, 247, 0.4)' }} />
          <span>Functions / Declarations</span>
        </div>
      </div>
    </div>
  );
};

export default Codebase3DGraph;
