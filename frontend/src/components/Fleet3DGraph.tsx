import React, { useRef, useEffect, useState } from 'react';
import { RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';

export interface GraphNode {
  id: string;
  name: string;
  type: 'machine' | 'set' | 'die';
  val?: string; // e.g. size or details
}

export interface GraphLink {
  source: string;
  target: string;
}

interface Fleet3DGraphProps {
  nodes: GraphNode[];
  links: GraphLink[];
  highlightQuery: string;
  onNodeClick: (node: GraphNode) => void;
}

interface SimNode {
  id: string;
  name: string;
  type: 'machine' | 'set' | 'die';
  val?: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

const Fleet3DGraph: React.FC<Fleet3DGraphProps> = ({
  nodes,
  links,
  highlightQuery,
  onNodeClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Core Simulation States (Refs so the animation loops has instant access without stale React closures)
  const simNodesRef = useRef<SimNode[]>([]);
  const simLinksRef = useRef<GraphLink[]>([]);
  
  // Camera & Interaction parameters
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const angleXRef = useRef<number>(0.2); // Pitch angle
  const angleYRef = useRef<number>(0.0); // Yaw angle
  const zoomRef = useRef<number>(1.0);  // Camera distance multiplier
  const isDraggingRef = useRef<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastInteractionRef = useRef<number>(Date.now()); // For idle auto-rotate

  // Dynamic light particles flow along links
  const packetRef = useRef<{ linkIndex: number; progress: number; speed: number }[]>([]);

  // Synchronize React node/link props into our WebGL-style physics solver
  useEffect(() => {
    const existing = new Map<string, SimNode>();
    simNodesRef.current.forEach(n => existing.set(n.id, n));

    // Initialize/sync nodes
    const newSimNodes = nodes.map(n => {
      if (existing.has(n.id)) {
        return {
          ...existing.get(n.id)!,
          name: n.name,
          val: n.val,
        };
      }
      
      // Smart spatial distribution: place node groups in shells
      // Machines at the core, Sets in the middle sphere, Dies on the outer boundary
      let radius = 200;
      if (n.type === 'machine') radius = 40;
      else if (n.type === 'set') radius = 120;

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);

      return {
        id: n.id,
        name: n.name,
        type: n.type,
        val: n.val,
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

  // Handle Drag to Orbit
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
      
      // Update Orbit angles
      angleYRef.current += deltaX * 0.005;
      angleXRef.current += deltaY * 0.005;

      // Cap pitch to avoid flipping upside down
      angleXRef.current = Math.max(-Math.PI / 2.1, Math.min(Math.PI / 2.1, angleXRef.current));

      dragStartRef.current = { x: e.clientX, y: e.clientY };
      lastInteractionRef.current = Date.now();
    } else {
      // Hover detection in projected 2D coordinates
      const nodesCopy = [...simNodesRef.current];
      
      // Calculate active center
      const cx = canvas.width / 2;
      const cy = canvas.height / 2;
      const focalLength = 400;

      const cosY = Math.cos(angleYRef.current);
      const sinY = Math.sin(angleYRef.current);
      const cosX = Math.cos(angleXRef.current);
      const sinX = Math.sin(angleXRef.current);

      let foundHover: SimNode | null = null;
      let minDistance = 15; // Hover snap boundary radius

      nodesCopy.forEach(n => {
        // Apply 3D camera rotation matrix
        let x1 = n.x * cosY - n.z * sinY;
        let z1 = n.x * sinY + n.z * cosY;
        let y2 = n.y * cosX - z1 * sinX;
        let z2 = n.y * sinX + z1 * cosX;

        // Apply Zoom scale and Focal perspective
        const distance = focalLength * 1.5 * zoomRef.current;
        const denominator = z2 + distance;
        const scale = denominator > 12 ? Math.min(6.5, focalLength / denominator) : 0;
        const sx = cx + x1 * scale;
        const sy = cy + y2 * scale;

        // Radial hit detection
        const dx = mouseX - sx;
        const dy = mouseY - sy;
        const d = Math.sqrt(dx * dx + dy * dy);

        const nodeRadius = n.type === 'machine' ? 14 : n.type === 'set' ? 9 : 6;
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
    zoomRef.current *= Math.exp(e.deltaY * 0.0012);
    zoomRef.current = Math.max(0.08, Math.min(6.0, zoomRef.current));
    lastInteractionRef.current = Date.now();
  };

  const zoomBy = (factor: number) => {
    zoomRef.current = Math.max(0.08, Math.min(6.0, zoomRef.current * factor));
    lastInteractionRef.current = Date.now();
  };

  const resetCamera = () => {
    angleXRef.current = 0.2;
    angleYRef.current = 0;
    zoomRef.current = 1;
    lastInteractionRef.current = Date.now();
  };

  const handleCanvasClick = () => {
    if (hoveredNode) {
      onNodeClick({
        id: hoveredNode.id,
        name: hoveredNode.name,
        type: hoveredNode.type,
        val: hoveredNode.val,
      });
    }
  };

  // Main 3D Canvas Rendering & Physics solver loop
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
        resizeCanvas();
        animationId = requestAnimationFrame(tick);
        return;
      }

      ctx.clearRect(0, 0, w, h);

      // --- 1. PHYSICS SOLVER (3D Spring Force Layout) ---
      const simNodes = simNodesRef.current;
      const simLinks = simLinksRef.current;

      const repulsion = 4000;
      const springStrength = 0.015;
      const gravity = 0.008;
      const friction = 0.85;

      // Force 1: Coulomb Repulsion (push nodes apart)
      for (let i = 0; i < simNodes.length; i++) {
        const u = simNodes[i];
        for (let j = i + 1; j < simNodes.length; j++) {
          const v = simNodes[j];
          const dx = u.x - v.x;
          const dy = u.y - v.y;
          const dz = u.z - v.z;
          const distSq = dx * dx + dy * dy + dz * dz + 0.1;
          const dist = Math.sqrt(distSq);

          if (dist < 350) {
            const force = repulsion / distSq;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;
            const fz = (dz / dist) * force;

            u.vx += fx; u.vy += fy; u.vz += fz;
            v.vx -= fx; v.vy -= fy; v.vz -= fz;
          }
        }
      }

      // Force 2: Hooke's Link Attraction (pull parents & children)
      simLinks.forEach(link => {
        const u = simNodes.find(n => n.id === link.source);
        const v = simNodes.find(n => n.id === link.target);
        if (!u || !v) return;

        const dx = u.x - v.x;
        const dy = u.y - v.y;
        const dz = u.z - v.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.1;

        // Custom lengths: Machines to Sets are slightly further apart than Sets to Dies
        const desiredLength = u.type === 'machine' && v.type === 'set' ? 80 : 50;
        const force = (dist - desiredLength) * springStrength;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        u.vx -= fx; u.vy -= fy; u.vz -= fz;
        v.vx += fx; v.vy += fy; v.vz += fz;
      });

      // Force 3: Damping gravity and bounding positioning updates & NaN safety safeguards
      simNodes.forEach(u => {
        // Centripetal force pulling back to coordinates origin (0,0,0)
        u.vx -= u.x * gravity;
        u.vy -= u.y * gravity;
        u.vz -= u.z * gravity;

        u.x += u.vx;
        u.y += u.vy;
        u.z += u.vz;

        u.vx *= friction;
        u.vy *= friction;
        u.vz *= friction;

        // Prevent coordinates from blowing up to NaN/Infinity
        if (isNaN(u.x) || isNaN(u.y) || isNaN(u.z) || !isFinite(u.x) || !isFinite(u.y) || !isFinite(u.z)) {
          u.x = (Math.random() - 0.5) * 100;
          u.y = (Math.random() - 0.5) * 100;
          u.z = (Math.random() - 0.5) * 100;
          u.vx = 0; u.vy = 0; u.vz = 0;
        }
      });

      // --- 2. CAMERA CALCULATION & AUTO-ORBIT ROTATION ---
      // Auto rotate slowly if user has been idle for more than 4 seconds
      const isIdle = Date.now() - lastInteractionRef.current > 4000;
      if (isIdle && !isDraggingRef.current) {
        angleYRef.current += 0.002; // Slow orbital rotation
      }

      const cx = w / 2;
      const cy = h / 2;
      const focalLength = 400;

      const cosY = Math.cos(angleYRef.current);
      const sinY = Math.sin(angleYRef.current);
      const cosX = Math.cos(angleXRef.current);
      const sinX = Math.sin(angleXRef.current);

      const cameraDistance = focalLength * 1.5 * zoomRef.current;

      // Project Nodes to 2D Screen Space
      const projectedNodes = simNodes.map(n => {
        // 3D rotation projection around Y then X axes
        let x1 = n.x * cosY - n.z * sinY;
        let z1 = n.x * sinY + n.z * cosY;
        let y2 = n.y * cosX - z1 * sinX;
        let z2 = n.y * sinX + z1 * cosX;

        // Apply scale factors based on depth
        const denominator = z2 + cameraDistance;
        const scale = denominator > 12 ? Math.min(6.5, focalLength / denominator) : 0;
        const sx = cx + x1 * scale;
        const sy = cy + y2 * scale;

        // Determine if highlighted by search query
        const isHighlighted = highlightQuery.trim() !== '' && (
          n.name.toLowerCase().includes(highlightQuery.toLowerCase()) ||
          n.id.toLowerCase().includes(highlightQuery.toLowerCase()) ||
          (n.val && n.val.toLowerCase().includes(highlightQuery.toLowerCase()))
        );

        return {
          id: n.id,
          name: n.name,
          type: n.type,
          val: n.val,
          rx: x1,
          ry: y2,
          rz: z2,
          sx,
          sy,
          scale,
          isHighlighted
        };
      });

      // Maintain flowing data-flow packets on links
      if (packetRef.current.length < simLinks.length && Math.random() < 0.15) {
        // Inject a flowing packet
        packetRef.current.push({
          linkIndex: Math.floor(Math.random() * simLinks.length),
          progress: 0,
          speed: 0.008 + Math.random() * 0.012
        });
      }
      packetRef.current.forEach(p => {
        // Find link details to adjust speed thermodynamically based on load
        const link = simLinks[p.linkIndex];
        let mult = 1.0;
        if (link) {
          const u = projectedNodes.find(n => n.id === link.source);
          const v = projectedNodes.find(n => n.id === link.target);
          let machineNode = (u && u.type === 'machine') ? u : ((v && v.type === 'machine') ? v : null);
          if (machineNode) {
            const phaseOffset = machineNode.rx * 0.05 + machineNode.ry * 0.03;
            const loadValue = 62 + Math.sin(Date.now() * 0.0012 + phaseOffset) * 32;
            if (loadValue > 82) mult = 2.4;
            else if (loadValue < 42) mult = 0.45;
          }
        }
        p.progress += p.speed * mult;
      });
      packetRef.current = packetRef.current.filter(p => p.progress < 1.0);

      // --- 3. DEPTH SORTING & RENDERING (Painter's Algorithm) ---
      interface RenderItem {
        type: 'link' | 'node' | 'packet';
        depth: number;
        draw: () => void;
      }

      const items: RenderItem[] = [];

      // Link draw instructions
      simLinks.forEach((link, lIndex) => {
        const u = projectedNodes.find(n => n.id === link.source);
        const v = projectedNodes.find(n => n.id === link.target);
        if (!u || !v) return;

        // Average depth of the link
        const depth = (u.rz + v.rz) / 2;

        items.push({
          type: 'link',
          depth,
          draw: () => {
            // Fades lines in distance
            const alpha = Math.max(0.05, Math.min(0.35, u.scale * v.scale * 0.45));
            ctx.beginPath();
            ctx.moveTo(u.sx, u.sy);
            ctx.lineTo(v.sx, v.sy);

            // Find parent machine to check load (Thermodynamic heatmaps)
            let isLinkActive = false;
            let machineNode = u.type === 'machine' ? u : (v.type === 'machine' ? v : null);
            if (!machineNode && u.type === 'set') {
              const setParentLink = simLinks.find(l => l.target === u.id);
              if (setParentLink) {
                const parentProj = projectedNodes.find(pn => pn.id === setParentLink.source);
                if (parentProj && parentProj.type === 'machine') machineNode = parentProj;
              }
            }
            
            if (machineNode) {
              const phaseOffset = machineNode.rx * 0.05 + machineNode.ry * 0.03;
              const loadValue = 62 + Math.sin(Date.now() * 0.0012 + phaseOffset) * 32;
              if (loadValue > 82) {
                isLinkActive = true;
              }
            }

            // Highlight connections if either node matches search query or active load heatmap
            const highlightActive = highlightQuery.trim() !== '';
            if (isLinkActive) {
              ctx.strokeStyle = `rgba(16, 185, 129, ${alpha * 2.2})`;
              ctx.lineWidth = 1.6;
            } else if (highlightActive && (u.isHighlighted || v.isHighlighted)) {
              ctx.strokeStyle = `rgba(37, 99, 235, ${alpha * 2.5})`;
              ctx.lineWidth = 2.0;
            } else {
              ctx.strokeStyle = `rgba(156, 163, 175, ${alpha})`;
              ctx.lineWidth = 1.0;
            }
            ctx.stroke();
          }
        });

        // Flowing particle indicators
        const matchingPackets = packetRef.current.filter(p => p.linkIndex === lIndex);
        matchingPackets.forEach(p => {
          const px = u.sx + (v.sx - u.sx) * p.progress;
          const py = u.sy + (v.sy - u.sy) * p.progress;
          const packetDepth = u.rz + (v.rz - u.rz) * p.progress;

          items.push({
            type: 'packet',
            depth: packetDepth,
            draw: () => {
              // Find if link is active (connected to machine with load > 82)
              let isLinkActive = false;
              let machineNode = u.type === 'machine' ? u : (v.type === 'machine' ? v : null);
              if (!machineNode && u.type === 'set') {
                const setParentLink = simLinks.find(l => l.target === u.id);
                if (setParentLink) {
                  const parentProj = projectedNodes.find(pn => pn.id === setParentLink.source);
                  if (parentProj && parentProj.type === 'machine') machineNode = parentProj;
                }
              }
              if (machineNode) {
                const phaseOffset = machineNode.rx * 0.05 + machineNode.ry * 0.03;
                const loadValue = 62 + Math.sin(Date.now() * 0.0012 + phaseOffset) * 32;
                if (loadValue > 82) isLinkActive = true;
              }

              const pulseSize = (isLinkActive ? 3.0 : 2.0) + Math.sin(p.progress * Math.PI) * (isLinkActive ? 3.0 : 2.0);
              const opacity = Math.sin(p.progress * Math.PI) * (isLinkActive ? 0.95 : 0.8);
              ctx.beginPath();
              ctx.arc(px, py, pulseSize, 0, Math.PI * 2);
              ctx.fillStyle = isLinkActive ? `rgba(16, 185, 129, ${opacity})` : `rgba(37, 99, 235, ${opacity})`;
              ctx.fill();
            }
          });
        });
      });

      projectedNodes.forEach(n => {
        const radius = n.type === 'machine' ? 14 : n.type === 'set' ? 9 : 6;
        let finalRadius = radius;
        
        // Theme colors & load variables
        let colorCore = '#2563eb'; // Royal Blue (Machine)
        let colorGlow = 'rgba(37, 99, 235, 0.4)';
        let isHighLoad = false;

        if (n.type === 'machine') {
          const phaseOffset = n.rx * 0.05 + n.ry * 0.03;
          const loadValue = 62 + Math.sin(Date.now() * 0.0012 + phaseOffset) * 32;
          
          if (loadValue > 82) {
            isHighLoad = true;
            colorCore = '#10b981'; // Emerald Green (Heatmap overload)
            const auraGlowVal = 0.4 + Math.sin(Date.now() * 0.008) * 0.15;
            colorGlow = `rgba(16, 185, 129, ${auraGlowVal})`;
            finalRadius = radius * (1.1 + Math.sin(Date.now() * 0.006) * 0.06);
          } else if (loadValue < 42) {
            colorCore = '#475569'; // Charcoal (Heatmap idle)
            colorGlow = 'rgba(71, 85, 105, 0.15)';
            finalRadius = radius * 0.9;
          } else {
            colorCore = '#2563eb';
            colorGlow = 'rgba(37, 99, 235, 0.35)';
          }
        } else if (n.type === 'set') {
          colorCore = '#10b981'; // Forest Emerald (Set)
          colorGlow = 'rgba(16, 185, 129, 0.4)';
          
          // Thermodynamic scaling based on parent machine load
          const parentLink = simLinks.find(l => l.target === n.id);
          if (parentLink) {
            const parentNode = projectedNodes.find(pn => pn.id === parentLink.source);
            if (parentNode) {
              const parentPhaseOffset = parentNode.rx * 0.05 + parentNode.ry * 0.03;
              const parentLoad = 62 + Math.sin(Date.now() * 0.0012 + parentPhaseOffset) * 32;
              if (parentLoad > 82) {
                finalRadius = radius * (1.2 + Math.sin(Date.now() * 0.004) * 0.08);
                colorCore = '#059669'; // Deeper emerald green
                colorGlow = 'rgba(5, 150, 105, 0.45)';
              }
            }
          }
        } else if (n.type === 'die') {
          colorCore = '#8b5cf6'; // Violet Purple (Die)
          colorGlow = 'rgba(139, 92, 246, 0.4)';
        }

        const projectedRadius = finalRadius * n.scale;

        items.push({
          type: 'node',
          depth: n.rz,
          draw: () => {
            const highlightActive = highlightQuery.trim() !== '';
            let opacity = 1.0;
            
            // Dim nodes that don't match the spotlight filter
            if (highlightActive && !n.isHighlighted) {
              opacity = 0.25;
            }

            ctx.beginPath();
            const drawRadius = Math.max(0.5, projectedRadius);
            ctx.arc(n.sx, n.sy, drawRadius, 0, Math.PI * 2);

            if (projectedRadius < 1.5) {
              ctx.fillStyle = `rgba(${colorCore === '#10b981' ? '16, 185, 129' : colorCore === '#2563eb' ? '37, 99, 235' : colorCore === '#475569' ? '71, 85, 105' : colorCore === '#059669' ? '5, 150, 105' : '139, 92, 246'}, ${opacity})`;
              ctx.fill();
            } else {
              const grad = ctx.createRadialGradient(
                n.sx - projectedRadius * 0.3,
                n.sy - projectedRadius * 0.3,
                projectedRadius * 0.05,
                n.sx,
                n.sy,
                projectedRadius
              );

              grad.addColorStop(0, `rgba(255, 255, 255, ${opacity})`);
              grad.addColorStop(0.3, `rgba(${colorCore === '#10b981' ? '16, 185, 129' : colorCore === '#2563eb' ? '37, 99, 235' : colorCore === '#475569' ? '71, 85, 105' : colorCore === '#059669' ? '5, 150, 105' : '139, 92, 246'}, ${opacity})`);
              grad.addColorStop(1, `rgba(${colorCore === '#10b981' ? '4, 120, 87' : colorCore === '#2563eb' ? '30, 64, 175' : colorCore === '#475569' ? '30, 41, 59' : colorCore === '#059669' ? '4, 120, 87' : '124, 58, 237'}, ${opacity})`);

              ctx.fillStyle = grad;
              ctx.fill();
            }

            // Glow Aura Ring on search match or cursor hover or thermodynamic overload
            const isHovered = hoveredNode && hoveredNode.id === n.id;
            const hasGlowRing = n.isHighlighted || isHovered || isHighLoad;
            
            if (hasGlowRing) {
              ctx.beginPath();
              ctx.arc(n.sx, n.sy, projectedRadius + 6, 0, Math.PI * 2);
              ctx.strokeStyle = colorCore;
              ctx.lineWidth = isHovered ? 2.5 : (isHighLoad ? 2.0 : 1.5);
              ctx.stroke();
              
              // Soft background glow
              ctx.beginPath();
              ctx.arc(n.sx, n.sy, projectedRadius + 12, 0, Math.PI * 2);
              ctx.fillStyle = colorGlow;
              ctx.fill();
            }

            // Sleek node labels (only show text for Machines and Sets, or hovered items, to prevent cluster text clutter)
            if (n.type !== 'die' || isHovered || n.isHighlighted) {
              ctx.font = `600 ${Math.max(10, Math.min(14, 11 * n.scale))}px Inter, system-ui`;
              ctx.fillStyle = isHovered ? '#f8fafc' : '#cbd5e1';
              ctx.textAlign = 'center';
              
              // Place label slightly below node
              ctx.fillText(n.name, n.sx, n.sy + projectedRadius + 14);
            }
          }
        });
      });

      // Sort items: elements with larger rz (furthest away) are rendered first
      items.sort((a, b) => b.depth - a.depth);

      // Execute projected draw calls
      items.forEach(item => item.draw());

      // --- 4. FLOATING RAYCAST HUD STATS (ON TOP OF EVERYTHING) ---
      if (hoveredNode) {
        const hNode = projectedNodes.find(n => n.id === hoveredNode.id);
        if (hNode) {
          let colorCore = '#2563eb'; // Royal Blue (Machine)
          
          if (hNode.type === 'machine') {
            const phaseOffset = hNode.rx * 0.05 + hNode.ry * 0.03;
            const parentLoad = 62 + Math.sin(Date.now() * 0.0012 + phaseOffset) * 32;
            if (parentLoad > 82) {
              colorCore = '#10b981';
            } else if (parentLoad < 42) {
              colorCore = '#475569';
            }
          } else if (hNode.type === 'set') {
            colorCore = '#10b981'; // Forest Emerald (Set)
          } else if (hNode.type === 'die') {
            colorCore = '#8b5cf6'; // Violet Purple (Die)
          }

          // Neon line anchor
          ctx.beginPath();
          ctx.setLineDash([4, 3]);
          ctx.moveTo(hNode.sx, hNode.sy);
          
          const cardX = hNode.sx + 50;
          const cardY = hNode.sy - 80;
          
          ctx.lineTo(cardX, cardY + 50); // Anchor to the card bottom-left
          ctx.strokeStyle = colorCore;
          ctx.lineWidth = 1.2;
          ctx.stroke();
          ctx.setLineDash([]); // Reset dash
          
          // Draw HUD box
          const boxW = 190;
          const boxH = 95;
          
          let bx = cardX;
          let by = cardY;
          if (bx + boxW > w) bx = hNode.sx - 50 - boxW;
          if (by < 10) by = hNode.sy + 30;
          
          // Draw backing glow
          ctx.shadowColor = colorCore;
          ctx.shadowBlur = 15;
          ctx.fillStyle = 'rgba(8, 16, 24, 0.94)';
          
          const drawRoundedRect = (cx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radiusRad: number) => {
            cx.beginPath();
            cx.moveTo(x + radiusRad, y);
            cx.lineTo(x + width - radiusRad, y);
            cx.quadraticCurveTo(x + width, y, x + width, y + radiusRad);
            cx.lineTo(x + width, y + height - radiusRad);
            cx.quadraticCurveTo(x + width, y + height, x + width - radiusRad, y + height);
            cx.lineTo(x + radiusRad, y + height);
            cx.quadraticCurveTo(x, y + height, x, y + height - radiusRad);
            cx.lineTo(x, y + radiusRad);
            cx.quadraticCurveTo(x, y, x + radiusRad, y);
            cx.closePath();
          };
          
          drawRoundedRect(ctx, bx, by, boxW, boxH, 8);
          ctx.fill();
          
          // Disable shadow for text/borders
          ctx.shadowBlur = 0;
          
          ctx.strokeStyle = colorCore;
          ctx.lineWidth = 1.5;
          drawRoundedRect(ctx, bx, by, boxW, boxH, 8);
          ctx.stroke();
          
          // Title HUD
          ctx.font = '800 10px Inter, system-ui';
          ctx.fillStyle = '#f8fafc';
          ctx.textAlign = 'left';
          ctx.fillText(`${hNode.name.toUpperCase()} HUD`, bx + 12, by + 18);
          
          // Subtitle
          ctx.font = '600 8px Inter, system-ui';
          ctx.fillStyle = '#94a3b8';
          ctx.fillText(hNode.type.toUpperCase() + ' TELEMETRY', bx + 12, by + 28);
          
          // Line separator
          ctx.beginPath();
          ctx.moveTo(bx + 12, by + 34);
          ctx.lineTo(bx + boxW - 12, by + 34);
          ctx.strokeStyle = 'rgba(148, 163, 184, 0.15)';
          ctx.lineWidth = 1;
          ctx.stroke();
          
          // Stats
          ctx.font = '500 8px Inter, system-ui';
          ctx.fillStyle = '#cbd5e1';
          if (hNode.type === 'machine') {
            const phaseOffset = hNode.rx * 0.05 + hNode.ry * 0.03;
            const loadValue = Math.round(62 + Math.sin(Date.now() * 0.0012 + phaseOffset) * 32);
            
            ctx.fillText(`Operator: OP-402 (Active)`, bx + 12, by + 46);
            ctx.fillText(`Location: ${hNode.val || 'Unassigned'}`, bx + 12, by + 57);
            
            // Live Load percentage
            ctx.fillText(`Live Load:`, bx + 12, by + 68);
            const barW = 70;
            ctx.fillStyle = '#334155';
            ctx.fillRect(bx + 68, by + 62, barW, 6);
            
            ctx.fillStyle = loadValue > 82 ? '#10b981' : (loadValue < 42 ? '#94a3b8' : '#2563eb');
            ctx.fillRect(bx + 68, by + 62, barW * (loadValue / 100), 6);
            
            ctx.fillStyle = '#f8fafc';
            ctx.fillText(`${loadValue}%`, bx + 68 + barW + 6, by + 68);
            
            const statusMsg = loadValue > 82 ? 'OVERLOAD TELEMETRY' : (loadValue < 42 ? 'STANDBY MODE' : 'OPTIMAL LANE');
            const statusCol = loadValue > 82 ? '#10b981' : (loadValue < 42 ? '#94a3b8' : '#2563eb');
            ctx.fillStyle = statusCol;
            ctx.fillText(statusMsg, bx + 12, by + 83);
          } else if (hNode.type === 'set') {
            ctx.fillText(`Desc: ${hNode.val ? (hNode.val.length > 25 ? hNode.val.substring(0, 22) + '...' : hNode.val) : 'N/A'}`, bx + 12, by + 46);
            ctx.fillText(`Dies Connected: 12 units`, bx + 12, by + 57);
            ctx.fillText(`Duty Cycle: Active`, bx + 12, by + 68);
            ctx.fillText(`Uptime: 240 hrs`, bx + 12, by + 79);
          } else {
            ctx.fillText(`Specs: ${hNode.val || 'Standard Casing'}`, bx + 12, by + 46);
            ctx.fillText(`Casing: Steel Alloy`, bx + 12, by + 57);
            ctx.fillText(`Condition: Optimal`, bx + 12, by + 68);
            ctx.fillText(`Status: Mounted`, bx + 12, by + 79);
          }
        }
      }

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
        background: '#071018',
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

      <div 
        style={{
          position: 'absolute',
          bottom: '1rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '0.35rem',
          background: 'rgba(8, 16, 24, 0.78)',
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(148, 163, 184, 0.24)',
          borderRadius: '8px',
          padding: '0.35rem',
        }}
      >
        <button type="button" onClick={() => zoomBy(0.62)} title="Zoom in" className="fleet-canvas-button">
          <ZoomIn size={15} />
        </button>
        <button type="button" onClick={() => zoomBy(1.62)} title="Zoom out" className="fleet-canvas-button">
          <ZoomOut size={15} />
        </button>
        <button type="button" onClick={resetCamera} title="Reset camera" className="fleet-canvas-button">
          <RotateCcw size={15} />
        </button>
      </div>

      {/* Floating Instructions UI Overlay */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: '1rem', 
          left: '1rem', 
          background: 'rgba(8, 16, 24, 0.78)', 
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(148, 163, 184, 0.24)', 
          borderRadius: '8px', 
          padding: '0.5rem 0.75rem', 
          pointerEvents: 'none',
          fontSize: '0.7rem',
          color: '#94a3b8',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
          fontFamily: 'Inter, system-ui'
        }}
      >
        <span style={{ fontWeight: 700, color: '#f8fafc' }}>3D Navigation</span>
        <span>Drag to rotate</span>
        <span>Wheel or trackpad to deep zoom</span>
        <span>Click a node to inspect</span>
      </div>

      {/* Sphere Type Legend */}
      <div 
        style={{ 
          position: 'absolute', 
          bottom: '1rem', 
          right: '1rem', 
          background: 'rgba(8, 16, 24, 0.78)', 
          backdropFilter: 'blur(8px)',
          border: '1px solid rgba(148, 163, 184, 0.24)', 
          borderRadius: '8px', 
          padding: '0.5rem 0.75rem', 
          pointerEvents: 'none',
          fontSize: '0.7rem',
          color: '#e2e8f0',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px',
          fontFamily: 'Inter, system-ui'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2563eb', boxShadow: '0 0 8px rgba(37, 99, 235, 0.4)' }} />
          <span>Machine Nodes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', boxShadow: '0 0 8px rgba(16, 185, 129, 0.4)' }} />
          <span>Set Nodes</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#8b5cf6', boxShadow: '0 0 8px rgba(139, 92, 246, 0.4)' }} />
          <span>Die Nodes</span>
        </div>
      </div>

      <style>{`
        .fleet-canvas-button {
          width: 32px;
          height: 32px;
          border: 1px solid rgba(148, 163, 184, 0.24);
          border-radius: 7px;
          background: rgba(15, 23, 42, 0.78);
          color: #e2e8f0;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .fleet-canvas-button:hover {
          border-color: rgba(34, 211, 238, 0.55);
          background: rgba(20, 31, 46, 0.94);
        }
      `}</style>
    </div>
  );
};

export default Fleet3DGraph;
