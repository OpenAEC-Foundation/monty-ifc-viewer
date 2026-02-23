import { onMount, onCleanup, createEffect } from 'solid-js';
import { initThreeScene, zoomFitCamera } from '@/services/three-service';
import { CameraController } from '@/services/camera-controller';
import { updateMeshVisibility } from '@/services/material-service';
import { updateMouse, pickMesh, applyHoverEffect, clearHoverEffect } from '@/services/raycaster-service';
import * as viewer from '@/state/viewer-store';
import {
  selectedExpressIds, setSelectedExpressIds,
  hiddenExpressIds,
  isolatedExpressIds, setIsolatedExpressIds,
  selectedValueIndices, setSelectedValueIndices,
  setLastClickedIndex,
} from '@/state/selection-store';
import { currentIndex, sortedValues, valueGroups } from '@/state/player-store';
import {
  setPropertyPanelOpen, setPropertyPanelData,
  setContextMenuVisible, setContextMenuPos, setContextMenuTarget,
  contextMenuTarget,
} from '@/state/ui-store';
import { elementProperties } from '@/state/ifc-store';

export function useThreeCanvas(
  canvasRef: () => HTMLCanvasElement | undefined,
  containerRef: () => HTMLElement | undefined,
) {
  let animationId = 0;

  onMount(() => {
    const canvas = canvasRef();
    const container = containerRef();
    if (!canvas || !container) return;

    const ctx = initThreeScene(canvas, container);
    viewer.setScene(ctx.scene);
    viewer.setCamera(ctx.camera);
    viewer.setRenderer(ctx.renderer);

    const camCtrl = new CameraController(ctx.camera);
    viewer.setCameraController(camCtrl);
    camCtrl.updateCamera();

    // Resize handling
    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      ctx.camera.aspect = width / height;
      ctx.camera.updateProjectionMatrix();
      ctx.renderer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // Mouse controls
    let isDragging = false;
    let isRightDrag = false;
    let prevX = 0, prevY = 0;
    let mouseDownTime = 0;
    let mouseDownPos = { x: 0, y: 0 };

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      isDragging = true;
      isRightDrag = e.button === 2;
      prevX = e.clientX;
      prevY = e.clientY;
      mouseDownTime = Date.now();
      mouseDownPos = { x: e.clientX, y: e.clientY };
    });

    canvas.addEventListener('mouseup', (e: MouseEvent) => {
      const timeDiff = Date.now() - mouseDownTime;
      const distMoved = Math.sqrt(
        Math.pow(e.clientX - mouseDownPos.x, 2) +
        Math.pow(e.clientY - mouseDownPos.y, 2)
      );

      if (timeDiff < 200 && distMoved < 5 && e.button === 0) {
        handleClick(e);
      }

      isDragging = false;
    });

    canvas.addEventListener('mouseleave', () => {
      isDragging = false;
      clearHoverEffect(viewer.hoveredMesh);
      viewer.setHoveredMesh(null);
      canvas.style.cursor = 'default';
    });

    canvas.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
      const timeDiff = Date.now() - mouseDownTime;
      const distMoved = Math.sqrt(
        Math.pow(e.clientX - mouseDownPos.x, 2) +
        Math.pow(e.clientY - mouseDownPos.y, 2)
      );
      if (timeDiff < 300 && distMoved < 10) {
        showContextMenu(e);
      }
    });

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      updateMouse(e.clientX, e.clientY, rect);

      if (!isDragging) {
        handleHover(canvas);
        return;
      }

      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;

      if (isRightDrag) {
        camCtrl.pan(dx, dy);
      } else {
        camCtrl.rotate(dx, dy);
      }

      prevX = e.clientX;
      prevY = e.clientY;
    });

    canvas.addEventListener('wheel', (e: WheelEvent) => {
      e.preventDefault();
      camCtrl.zoom(e.deltaY);
    }, { passive: false });

    // Close context menu on click outside
    const handleDocClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('[data-context-menu]')) {
        setContextMenuVisible(false);
      }
    };
    document.addEventListener('click', handleDocClick);

    // Animation loop
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      ctx.renderer.render(ctx.scene, ctx.camera);
    };
    animate();

    onCleanup(() => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      resizeObserver.disconnect();
      document.removeEventListener('click', handleDocClick);
      ctx.renderer.dispose();
    });
  });

  // Reactive effect: update visibility when selection/player state changes
  createEffect(() => {
    // Access reactive signals to track them
    const selIds = selectedExpressIds();
    const hidIds = hiddenExpressIds();
    const isoIds = isolatedExpressIds();
    const curIdx = currentIndex();
    const sorted = sortedValues();
    const groups = valueGroups();

    if (viewer.meshes.size === 0) return;

    updateMeshVisibility(viewer.meshes, {
      hiddenExpressIds: hidIds,
      selectedExpressIds: selIds,
      isolatedExpressIds: isoIds,
      currentIndex: curIdx,
      sortedValues: sorted,
      valueGroups: groups,
    });
  });

  function handleHover(canvas: HTMLCanvasElement) {
    if (!viewer.camera) return;
    const hitMesh = pickMesh(viewer.camera, viewer.allMeshes, hiddenExpressIds());

    if (hitMesh !== viewer.hoveredMesh) {
      clearHoverEffect(viewer.hoveredMesh);
      viewer.setHoveredMesh(null);
      canvas.style.cursor = 'default';

      if (hitMesh) {
        viewer.setHoveredMesh(hitMesh);
        applyHoverEffect(hitMesh);
        canvas.style.cursor = 'pointer';
      }
    }
  }

  function handleClick(event: MouseEvent) {
    if (!viewer.camera) return;
    const hitMesh = pickMesh(viewer.camera, viewer.allMeshes, hiddenExpressIds());

    if (hitMesh) {
      const expressId = hitMesh.userData.expressId;
      const current = new Set(selectedExpressIds());

      if (event.ctrlKey || event.metaKey) {
        if (current.has(expressId)) {
          current.delete(expressId);
        } else {
          current.add(expressId);
        }
      } else {
        current.clear();
        current.add(expressId);
      }

      setSelectedExpressIds(current);

      if (current.size === 1) {
        const props = elementProperties.get(expressId);
        setPropertyPanelData(props || null);
        setPropertyPanelOpen(true);
      } else {
        setPropertyPanelOpen(false);
      }
    } else {
      if (!event.ctrlKey && !event.metaKey) {
        setSelectedExpressIds(new Set<number>());
        setSelectedValueIndices(new Set<number>());
        setIsolatedExpressIds(new Set<number>());
        setPropertyPanelOpen(false);
      }
    }
  }

  function showContextMenu(event: MouseEvent) {
    if (!viewer.camera) return;
    const hitMesh = pickMesh(viewer.camera, viewer.allMeshes, hiddenExpressIds());

    if (hitMesh) {
      const expressId = hitMesh.userData.expressId;
      setContextMenuTarget(expressId);

      if (!selectedExpressIds().has(expressId)) {
        setSelectedExpressIds(new Set<number>([expressId]));
      }

      setContextMenuPos({ x: event.clientX, y: event.clientY });
      setContextMenuVisible(true);
    }
  }

  return {
    zoomFit: () => {
      if (viewer.cameraController) {
        zoomFitCamera(
          viewer.allMeshes,
          viewer.cameraController.target,
          viewer.cameraController.spherical,
          () => viewer.cameraController!.updateCamera(),
        );
      }
    },
    resetView: () => {
      viewer.cameraController?.resetView();
    },
  };
}
