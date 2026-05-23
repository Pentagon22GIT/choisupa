"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { SplitText } from "gsap/SplitText";
import "./PackageScene.css";

gsap.registerPlugin(SplitText);

const TOP_TILT = {
  x: THREE.MathUtils.degToRad(45),
  y: THREE.MathUtils.degToRad(-5),
  z: THREE.MathUtils.degToRad(0),
};

const TASTE_TILT = {
  x: THREE.MathUtils.degToRad(40),
  y: THREE.MathUtils.degToRad(0),
  z: THREE.MathUtils.degToRad(0),
};

const BINMAP_TILT = {
  x: THREE.MathUtils.degToRad(54),
  y: THREE.MathUtils.degToRad(0),
  z: THREE.MathUtils.degToRad(0),
};

const FINAL_TILT = {
  x: THREE.MathUtils.degToRad(40),
  y: THREE.MathUtils.degToRad(0),
  z: THREE.MathUtils.degToRad(0),
};

const TASTE_SLIDE_X = 120;

const VIEW_SCALE = {
  top: 1,
  taste: 0.88,
};

const TOP_SPIN = {
  minSpeed: 0.18,
  maxSpeed: 3.85,
};

const RESPONSIVE_SCENE_SCALE_POINTS = [
  { width: 700, scale: 0.56 },
  { width: 1200, scale: 0.72 },
  { width: 1700, scale: 0.88 },
  { width: 2200, scale: 1 },
] as const;

function getResponsiveSceneScale(viewportWidth: number) {
  const points = RESPONSIVE_SCENE_SCALE_POINTS;

  if (viewportWidth <= points[0].width) {
    return points[0].scale;
  }

  if (viewportWidth >= points[points.length - 1].width) {
    return points[points.length - 1].scale;
  }

  for (let i = 0; i < points.length - 1; i += 1) {
    const current = points[i];
    const next = points[i + 1];

    if (viewportWidth >= current.width && viewportWidth <= next.width) {
      const t = (viewportWidth - current.width) / (next.width - current.width);

      return THREE.MathUtils.lerp(current.scale, next.scale, t);
    }
  }

  return 1;
}

const TRANSITION = {
  prepareSpinMaxSpeed: 3.85,
  prepareBoostMaxSpeed: 8,
  prepareBoostBrakeRangeDeg: 42,
  binmapDuration: 1.6,
  finalReturnDuration: 1.6,
  finalCloseDuration: 1.05,
  finalToTopDuration: 0.95,

  openStartAngleDeg: 240,
  openEndAngleDeg: 360,
};

const CAMERA_DEFAULT = {
  position: new THREE.Vector3(0, 150, 260),
  target: new THREE.Vector3(0, 0, 0),
  zoom: 1,
};

const CAMERA_RESET = {
  duration: TRANSITION.finalToTopDuration,
};

const BINMAP_ABSORB = {
  shrinkStartDistance: 16,
  hideDistance: 0.85,
  minScale: 1,
};

const BINMAP_PACKAGE_EXIT = {
  moveX: 0,
  moveY: -40,
  moveZ: 0,

  rotateXDeg: 0,
  rotateYDeg: 0,
  rotateZDeg: 0,
};

const BINMAP_DISPLAY = {
  duration: 1.05,

  moveX: -25,
  moveY: 0,
  moveZ: 0,

  scale: 1.5,

  rotateXDeg: -5,
  rotateYDeg: 0,
  rotateZDeg: -7,
};

const BINMAP_TEXT_SWAP = {
  exitDuration: 0.8,
  betweenDelay: 0.1,
  enterDuration: 1.05,
  buttonEnterDuration: 0.72,
  buttonOverlap: 0.36,
};

const BINMAP_TO_FINAL_RESET = {
  duration: 0.9,
};

const BINMAP_TITLE = "特徴的な小さな瓶";

const BINMAP_TEXT =
  "ちょいスパのために特別に開発された瓶。スパイスを出しやすく、そしてちょうど使い切りやすいサイズの瓶。香りが逃げるのを防ぐためにガラス瓶を採用しています。スパイスの鮮度と風味が落ちないことも、ちょいスパのウリです。";

const BINMAP_DETAIL_TITLE = "厳選したスパイス";

const BINMAP_DETAIL_TEXT =
  "今回ちょいスパには５つの種類のスパイスを詰め込みました。ゆず粉、山椒、カルダモン、スモークパプリカ、特製スパイスです。どれも個性のあるスパイスたちです。普段あまり使わないけど是非試して欲しいものから、使う時はあるけど少量しか使わない子達を集めました。今後様々なスパイスセットを展開していく予定です。";
const SCENE_BACKGROUND = {
  base: "#efe7dc",
};

const SCENE_LIGHTING = {
  ambientIntensity: 0.72,
  keyIntensity: 1.35,
  fillIntensity: 0.65,
};

const OUTLINE_LAYER = {
  bottle: 1,
  package: 2,
};

const SCREEN_SPACE_OUTLINE = {
  bottleRadiusPx: 2.6,
  packageRadiusPx: 5.2,

  bottleOpacity: 1,
  packageHideOpacityThreshold: 0.015,

  defaultColor: "#ffffff",

  bottleOcclusionExtraPx: 3.0,
};

const DEFAULT_BOTTLE_COLOR = "#ffffff";

const TOP_HINT_MESSAGES = [
  "クリックして開けてみない？",
  "なんかクリックしてみたいかも、、、",
] as const;

const TASTE_DESCRIPTION_TEXT =
  "たくさんのスパイスが入ったスパイスセット。使いたいけど量が多すぎて使いきれない、近場のスーパーなどでは売っていないスパイスが欲しい、そんな問題を解決してくれる商品です。料理にひと工夫、小さなお菓子作り、外出先でのスパイス使用など幅広くご使用いただけます。";

const FINAL_LEFT_TEXT =
  "この作品は、ビジュアルランゲージの授業で作成したスパイスセットのパッケージです。情報をただ並べるだけでなく、手に取りたくなる大きさや売り場で目立つデザインを心がけました。";

const FINAL_RIGHT_TEXT =
  "このページでは、パッケージを自由に回転できます。正面からだけではなく、角度を変えながら、箱、スリーブ、瓶がどのように関係しているかを見てみてください。";

const FINAL_SLEEVE_CONTROL = {
  duration: 0.72,
  openX: TASTE_SLIDE_X,
};

const FINAL_BOTTLE_RESTORE = {
  duration: 0.36,
};

const FINAL_COPY_ANIMATION = {
  enterDelay: 2.1,
  enterDuration: 1.9,
  enterStagger: 0,
  exitDuration: 0.34,
};

type Step = "top" | "taste" | "binmap" | "final";

type BinmapTextMode = "bottle" | "detail";

type FinalBottleRestoreMode = "instant" | "fade";

type MotionMode =
  | "top"
  | "prepareTaste"
  | "toTaste"
  | "taste"
  | "toBinmap"
  | "binmapFocus"
  | "binmap"
  | "binmapToFinalReset"
  | "toFinal"
  | "final"
  | "finalToTop";

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function getAbsorbScaleFactor(distanceX: number) {
  if (distanceX >= BINMAP_ABSORB.shrinkStartDistance) return 1;

  const shrinkT = THREE.MathUtils.clamp(
    1 - distanceX / BINMAP_ABSORB.shrinkStartDistance,
    0,
    1,
  );

  return THREE.MathUtils.lerp(
    1,
    BINMAP_ABSORB.minScale,
    easeInOutCubic(shrinkT),
  );
}

function getPathProgressX(x: number, startX: number, targetX: number) {
  const pathLengthX = targetX - startX;

  if (Math.abs(pathLengthX) < 0.0001) {
    return 0;
  }

  return (x - startX) / pathLengthX;
}

function hasPassedAbsorbTargetX({
  mainBottleX,
  targetBottleX,
  startX,
  endX,
  margin = 0.006,
}: {
  mainBottleX: number;
  targetBottleX: number;
  startX: number;
  endX: number;
  margin?: number;
}) {
  const mainBottlePathT = getPathProgressX(mainBottleX, startX, endX);
  const targetBottlePathT = getPathProgressX(targetBottleX, startX, endX);

  return mainBottlePathT >= targetBottlePathT - margin;
}

function getTopSpinSpeed(angle: number) {
  const sideFactor = 1 - Math.abs(Math.cos(angle));
  const smoothFactor = sideFactor * sideFactor * (3 - 2 * sideFactor);

  return THREE.MathUtils.lerp(
    TOP_SPIN.minSpeed,
    TOP_SPIN.maxSpeed,
    smoothFactor,
  );
}

function normalizeAngle(angle: number) {
  return THREE.MathUtils.euclideanModulo(angle, Math.PI * 2);
}

function getClockwiseTargetRotation(
  currentAngle: number,
  targetNormalizedAngle: number,
) {
  const currentNormalized = normalizeAngle(currentAngle);

  let diff = targetNormalizedAngle - currentNormalized;

  if (diff <= 0) {
    diff += Math.PI * 2;
  }

  return currentAngle + diff;
}

function advanceClockwiseToTarget(
  currentAngle: number,
  targetAngle: number,
  delta: number,
  speed: number,
) {
  const nextAngle = currentAngle + delta * speed;

  if (nextAngle >= targetAngle) {
    return {
      angle: targetAngle,
      reached: true,
    };
  }

  return {
    angle: nextAngle,
    reached: false,
  };
}

function setObjectOpacity(object: THREE.Object3D, opacity: number) {
  const nextOpacity = THREE.MathUtils.clamp(opacity, 0, 1);
  const nextDepthWrite = nextOpacity >= 0.98;

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      if (material.transparent !== true) {
        material.transparent = true;
        material.needsUpdate = true;
      }

      if (Math.abs(material.opacity - nextOpacity) > 0.0001) {
        material.opacity = nextOpacity;
      }

      if (material.depthWrite !== nextDepthWrite) {
        material.depthWrite = nextDepthWrite;
      }
    });
  });

  object.visible = nextOpacity > 0.01;
}

function isInsideRoot(object: THREE.Object3D, root: THREE.Object3D | null) {
  let current: THREE.Object3D | null = object;

  while (current) {
    if (current === root) return true;
    current = current.parent;
  }

  return false;
}

function isInsideAnyRoot(object: THREE.Object3D, roots: THREE.Object3D[]) {
  return roots.some((root) => isInsideRoot(object, root));
}

function getObjectOpacity(object: THREE.Object3D) {
  let opacityTotal = 0;
  let materialCount = 0;

  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;

    const materials = Array.isArray(child.material)
      ? child.material
      : [child.material];

    materials.forEach((material) => {
      opacityTotal += material.opacity;
      materialCount += 1;
    });
  });

  if (materialCount === 0) return object.visible ? 1 : 0;

  return opacityTotal / materialCount;
}

function getObjectsOpacity(objects: THREE.Object3D[]) {
  if (objects.length === 0) return 0;

  const opacityTotal = objects.reduce((total, object) => {
    return total + getObjectOpacity(object);
  }, 0);

  return opacityTotal / objects.length;
}

function ScreenSpaceOutline({
  packageOutlineOpacity,
}: {
  packageOutlineOpacity: number;
}) {
  const { gl, scene, camera, size } = useThree();

  const bottleMaskTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const packageMaskTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);

  const previousClearColorRef = useRef(new THREE.Color());

  const outlineWhite = useMemo(() => {
    return new THREE.Color(SCREEN_SPACE_OUTLINE.defaultColor);
  }, []);

  const maskMaterial = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: "#ffffff",
      transparent: false,
      opacity: 1,
      depthWrite: false,
      depthTest: false,
      side: THREE.DoubleSide,
    });
  }, []);

  const screenCamera = useMemo(() => {
    return new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  }, []);

  const screenScene = useMemo(() => {
    return new THREE.Scene();
  }, []);

  const outlineMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.NormalBlending,
      uniforms: {
        uMask: { value: null },
        uOcclusionMask: { value: null },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uRadiusPx: { value: 4 },
        uOcclusionRadiusPx: { value: 0 },
        uOcclusionStrength: { value: 0 },
        uUseOcclusion: { value: 0 },
        uColor: { value: new THREE.Color("#ffffff") },
        uOpacity: { value: 1 },
        uForceSolidAlpha: { value: 0 },
      },
      vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `,
      fragmentShader: `
      precision highp float;

      uniform sampler2D uMask;
      uniform sampler2D uOcclusionMask;

      uniform vec2 uResolution;
      uniform float uRadiusPx;
      uniform float uOcclusionRadiusPx;
      uniform float uOcclusionStrength;
      uniform float uUseOcclusion;

      uniform vec3 uColor;
      uniform float uOpacity;
      uniform float uForceSolidAlpha;

      varying vec2 vUv;

      float sampleExpandedMask(sampler2D tex, vec2 uv, vec2 px, float radiusPx) {
        float expanded = texture2D(tex, uv).a;

        const int SAMPLE_COUNT = 32;

        for (int i = 0; i < SAMPLE_COUNT; i++) {
          float angle = 6.28318530718 * float(i) / float(SAMPLE_COUNT);
          vec2 dir = vec2(cos(angle), sin(angle));

          expanded = max(
            expanded,
            texture2D(tex, uv + dir * px * radiusPx).a
          );

          expanded = max(
            expanded,
            texture2D(tex, uv + dir * px * radiusPx * 0.66).a
          );

          expanded = max(
            expanded,
            texture2D(tex, uv + dir * px * radiusPx * 0.33).a
          );
        }

        return expanded;
      }

      void main() {
        vec2 px = 1.0 / uResolution;

        float center = texture2D(uMask, vUv).a;
        float expanded = sampleExpandedMask(uMask, vUv, px, uRadiusPx);

        float outside = smoothstep(0.01, 0.12, expanded);
        float inside = smoothstep(0.01, 0.18, center);

        float outline = outside * (1.0 - inside);

        if (uUseOcclusion > 0.5 && uOcclusionStrength > 0.001) {
          float occlusion = sampleExpandedMask(
            uOcclusionMask,
            vUv,
            px,
            uOcclusionRadiusPx
          );

          float occlusionMask = smoothstep(0.01, 0.12, occlusion);

          outline *= 1.0 - occlusionMask * uOcclusionStrength;
        }

        if (outline <= 0.001 || uOpacity <= 0.001) {
          discard;
        }

        float alpha = outline * uOpacity;

        if (uForceSolidAlpha > 0.5) {
          alpha = smoothstep(0.001, 0.08, outline) * uOpacity;
        }

        gl_FragColor = vec4(uColor, alpha);
      }
    `,
    });
  }, []);

  useEffect(() => {
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, outlineMaterial);
    mesh.frustumCulled = false;

    screenScene.add(mesh);

    return () => {
      screenScene.remove(mesh);
      geometry.dispose();
    };
  }, [outlineMaterial, screenScene]);

  useEffect(() => {
    const pixelRatio = gl.getPixelRatio();

    const width = Math.max(1, Math.floor(size.width * pixelRatio));
    const height = Math.max(1, Math.floor(size.height * pixelRatio));

    const createTarget = () => {
      const target = new THREE.WebGLRenderTarget(width, height, {
        depthBuffer: false,
        stencilBuffer: false,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      });

      target.texture.name = "ScreenSpaceOutlineMask";

      return target;
    };

    bottleMaskTargetRef.current?.dispose();
    packageMaskTargetRef.current?.dispose();

    bottleMaskTargetRef.current = createTarget();
    packageMaskTargetRef.current = createTarget();

    outlineMaterial.uniforms.uResolution.value.set(width, height);

    return () => {
      bottleMaskTargetRef.current?.dispose();
      packageMaskTargetRef.current?.dispose();

      bottleMaskTargetRef.current = null;
      packageMaskTargetRef.current = null;
    };
  }, [gl, outlineMaterial, size.width, size.height]);

  useFrame(() => {
    const bottleMaskTarget = bottleMaskTargetRef.current;
    const packageMaskTarget = packageMaskTargetRef.current;

    if (!bottleMaskTarget || !packageMaskTarget) return;

    const previousRenderTarget = gl.getRenderTarget();
    const previousOverrideMaterial = scene.overrideMaterial;
    const previousAutoClear = gl.autoClear;

    const previousClearColor = previousClearColorRef.current;
    gl.getClearColor(previousClearColor);

    const previousClearAlpha = gl.getClearAlpha();

    const previousCameraLayerMask = camera.layers.mask;

    const pixelRatio = gl.getPixelRatio();

    const renderMainScene = () => {
      gl.setRenderTarget(null);
      gl.autoClear = true;
      gl.setClearColor(0x000000, 0);

      scene.overrideMaterial = null;
      camera.layers.set(0);

      gl.render(scene, camera);
    };

    const renderMask = (layer: number, target: THREE.WebGLRenderTarget) => {
      gl.setRenderTarget(target);
      gl.autoClear = true;
      gl.setClearColor(0x000000, 0);
      gl.clear(true, true, true);

      scene.overrideMaterial = maskMaterial;
      camera.layers.set(layer);

      gl.render(scene, camera);
    };

    const renderOutline = ({
      target,
      occlusionTarget,
      radiusPx,
      occlusionRadiusPx,
      occlusionStrength,
      color,
      opacity,
      forceSolidAlpha,
    }: {
      target: THREE.WebGLRenderTarget;
      occlusionTarget: THREE.WebGLRenderTarget | null;
      radiusPx: number;
      occlusionRadiusPx: number;
      occlusionStrength: number;
      color: THREE.Color;
      opacity: number;
      forceSolidAlpha: boolean;
    }) => {
      if (opacity <= 0.001) return;

      outlineMaterial.uniforms.uMask.value = target.texture;
      outlineMaterial.uniforms.uOcclusionMask.value =
        occlusionTarget?.texture ?? target.texture;

      outlineMaterial.uniforms.uRadiusPx.value = radiusPx * pixelRatio;
      outlineMaterial.uniforms.uOcclusionRadiusPx.value =
        occlusionRadiusPx * pixelRatio;

      outlineMaterial.uniforms.uOcclusionStrength.value = THREE.MathUtils.clamp(
        occlusionStrength,
        0,
        1,
      );

      outlineMaterial.uniforms.uUseOcclusion.value = occlusionTarget ? 1 : 0;

      outlineMaterial.uniforms.uColor.value.copy(color);
      outlineMaterial.uniforms.uOpacity.value = opacity;

      outlineMaterial.uniforms.uForceSolidAlpha.value = forceSolidAlpha ? 1 : 0;

      gl.setRenderTarget(null);
      gl.autoClear = false;

      gl.render(screenScene, screenCamera);
    };

    renderMainScene();

    renderMask(OUTLINE_LAYER.bottle, bottleMaskTarget);
    renderMask(OUTLINE_LAYER.package, packageMaskTarget);

    scene.overrideMaterial = null;

    const white = outlineWhite;

    const packageOpacity = THREE.MathUtils.clamp(packageOutlineOpacity, 0, 1);

    const packageOutlineColor = white;

    renderOutline({
      target: packageMaskTarget,
      occlusionTarget: null,
      radiusPx: SCREEN_SPACE_OUTLINE.packageRadiusPx,
      occlusionRadiusPx: 0,
      occlusionStrength: 0,
      color: packageOutlineColor,

      opacity:
        packageOpacity > SCREEN_SPACE_OUTLINE.packageHideOpacityThreshold
          ? packageOpacity
          : 0,

      forceSolidAlpha: false,
    });

    renderOutline({
      target: bottleMaskTarget,
      occlusionTarget: packageMaskTarget,
      radiusPx: SCREEN_SPACE_OUTLINE.bottleRadiusPx,
      occlusionRadiusPx:
        SCREEN_SPACE_OUTLINE.bottleRadiusPx +
        SCREEN_SPACE_OUTLINE.bottleOcclusionExtraPx,
      occlusionStrength: packageOpacity,
      color: white,
      opacity: SCREEN_SPACE_OUTLINE.bottleOpacity,
      forceSolidAlpha: false,
    });

    scene.overrideMaterial = previousOverrideMaterial;
    camera.layers.mask = previousCameraLayerMask;

    gl.setRenderTarget(previousRenderTarget);
    gl.autoClear = previousAutoClear;
    gl.setClearColor(previousClearColor, previousClearAlpha);
  }, 1);

  return null;
}

function SceneOrbitControls({ enabled }: { enabled: boolean }) {
  const controlsRef = useRef<any>(null);
  const { camera } = useThree();

  const wasEnabledRef = useRef(enabled);
  const resetTimeRef = useRef(0);
  const isResettingRef = useRef(false);

  const resetStartPositionRef = useRef(new THREE.Vector3());
  const resetStartTargetRef = useRef(new THREE.Vector3());
  const resetStartQuaternionRef = useRef(new THREE.Quaternion());
  const resetEndQuaternionRef = useRef(new THREE.Quaternion());

  useEffect(() => {
    const controls = controlsRef.current;

    if (!controls) return;

    const wasEnabled = wasEnabledRef.current;

    if (wasEnabled && !enabled) {
      resetTimeRef.current = 0;
      isResettingRef.current = true;

      resetStartPositionRef.current.copy(camera.position);
      resetStartTargetRef.current.copy(controls.target);
      resetStartQuaternionRef.current.copy(camera.quaternion);

      const tempCamera = camera.clone();
      tempCamera.position.copy(CAMERA_DEFAULT.position);
      tempCamera.lookAt(CAMERA_DEFAULT.target);
      resetEndQuaternionRef.current.copy(tempCamera.quaternion);
    }

    wasEnabledRef.current = enabled;
  }, [enabled, camera]);

  useFrame((_, delta) => {
    const controls = controlsRef.current;

    if (!controls) return;

    if (!isResettingRef.current) return;

    resetTimeRef.current += delta;

    const t = Math.min(resetTimeRef.current / CAMERA_RESET.duration, 1);
    const eased = easeInOutCubic(t);

    camera.position.lerpVectors(
      resetStartPositionRef.current,
      CAMERA_DEFAULT.position,
      eased,
    );

    camera.quaternion.slerpQuaternions(
      resetStartQuaternionRef.current,
      resetEndQuaternionRef.current,
      eased,
    );

    camera.zoom = THREE.MathUtils.lerp(camera.zoom, CAMERA_DEFAULT.zoom, eased);
    camera.updateProjectionMatrix();

    controls.target.lerpVectors(
      resetStartTargetRef.current,
      CAMERA_DEFAULT.target,
      eased,
    );

    controls.update();

    if (t >= 1) {
      camera.position.copy(CAMERA_DEFAULT.position);
      camera.zoom = CAMERA_DEFAULT.zoom;
      camera.lookAt(CAMERA_DEFAULT.target);
      camera.updateProjectionMatrix();

      controls.target.copy(CAMERA_DEFAULT.target);
      controls.update();

      isResettingRef.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enabled={enabled}
      enableDamping={enabled}
      enablePan={false}
      enableZoom={false}
      enableRotate={enabled}
      target={[0, 0, 0]}
    />
  );
}

function PackageModel({
  step,
  setStep,
  finalSleeveOpen,
  finalBottlesVisible,
  finalBottleRestoreMode,
  onFinalControlBusyChange,
  onMotionLockedChange,
  onPackageOutlineOpacityChange,
  onTopPackageHoverChange,
  onTopPackageClick,
  onBinmapFocusStart,
}: {
  step: Step;
  setStep: (step: Step) => void;
  finalSleeveOpen: boolean;
  finalBottlesVisible: boolean;
  finalBottleRestoreMode: FinalBottleRestoreMode;
  onFinalControlBusyChange: (busy: boolean) => void;
  onMotionLockedChange: (locked: boolean) => void;
  onPackageOutlineOpacityChange: (opacity: number) => void;
  onTopPackageHoverChange: (hovered: boolean) => void;
  onTopPackageClick: () => void;
  onBinmapFocusStart: () => void;
}) {
  const gltf = useGLTF("/models/package/package.glb");
  const matcapTexture = useTexture("/textures/matcap/binmaterial.jpg");

  const tiltRootRef = useRef<THREE.Group>(null);
  const spinRootRef = useRef<THREE.Group>(null);

  const boxRootRef = useRef<THREE.Object3D | null>(null);
  const sleeveRootRef = useRef<THREE.Object3D | null>(null);

  const mainBottleRootRef = useRef<THREE.Object3D | null>(null);
  const bottleRootsRef = useRef<THREE.Object3D[]>([]);
  const absorbBottleRootsRef = useRef<THREE.Object3D[]>([]);

  const mainBottleMatcapMaterialRef = useRef<THREE.MeshMatcapMaterial | null>(
    null,
  );

  const binmapExitTargetsRef = useRef<THREE.Object3D[]>([]);
  const binmapExitBaseStatesRef = useRef<
    {
      object: THREE.Object3D;
      position: THREE.Vector3;
      rotation: THREE.Euler;
    }[]
  >([]);

  const absorbBottleBaseStatesRef = useRef<
    {
      object: THREE.Object3D;
      position: THREE.Vector3;
      rotation: THREE.Euler;
      scale: THREE.Vector3;
    }[]
  >([]);

  const mainBottleStartPositionRef = useRef(new THREE.Vector3());
  const mainBottleStartRotationRef = useRef(new THREE.Euler());
  const mainBottleStartScaleRef = useRef(new THREE.Vector3());
  const mainBottleTargetPositionRef = useRef(new THREE.Vector3());

  const mainBottleDisplayStartPositionRef = useRef(new THREE.Vector3());
  const mainBottleDisplayStartRotationRef = useRef(new THREE.Euler());
  const mainBottleDisplayStartScaleRef = useRef(new THREE.Vector3());

  const mainBottleDisplayPositionRef = useRef(new THREE.Vector3());
  const mainBottleDisplayRotationRef = useRef(new THREE.Euler());
  const mainBottleDisplayScaleRef = useRef(new THREE.Vector3());

  const motionModeRef = useRef<MotionMode>("top");

  const prepareStartRotationZRef = useRef(0);
  const prepareTargetRotationZRef = useRef(0);
  const prepareStartSpeedRef = useRef(0);

  const motionTimeRef = useRef(0);

  const startRotationZRef = useRef(0);
  const targetRotationZRef = useRef(0);

  const startTiltRef = useRef(new THREE.Euler());
  const startSleeveXRef = useRef(0);
  const startViewScaleRef = useRef(1);

  const responsiveSceneScaleRef = useRef(1);

  const finalBottleTweenRef = useRef<gsap.core.Tween | null>(null);

  const getResponsiveViewScale = (baseScale: number) => {
    return baseScale * responsiveSceneScaleRef.current;
  };

  const getStableViewScaleForMotionMode = () => {
    if (
      motionModeRef.current === "taste" ||
      motionModeRef.current === "toBinmap" ||
      motionModeRef.current === "binmapFocus" ||
      motionModeRef.current === "binmap" ||
      motionModeRef.current === "binmapToFinalReset"
    ) {
      return getResponsiveViewScale(VIEW_SCALE.taste);
    }

    return getResponsiveViewScale(VIEW_SCALE.top);
  };

  useEffect(() => {
    const updateResponsiveScale = () => {
      responsiveSceneScaleRef.current = getResponsiveSceneScale(
        window.innerWidth,
      );

      const tiltRoot = tiltRootRef.current;

      if (!tiltRoot) return;

      const isAnimating =
        motionModeRef.current !== "top" &&
        motionModeRef.current !== "taste" &&
        motionModeRef.current !== "binmap" &&
        motionModeRef.current !== "final";

      if (isAnimating) return;

      tiltRoot.scale.setScalar(getStableViewScaleForMotionMode());
    };

    updateResponsiveScale();

    window.addEventListener("resize", updateResponsiveScale);

    return () => {
      window.removeEventListener("resize", updateResponsiveScale);
    };
  }, []);

  useEffect(() => {
    if (step !== "final") return;

    const sleeveRoot = sleeveRootRef.current;

    if (!sleeveRoot) return;

    const baseX = sleeveRoot.userData.basePositionX ?? 0;
    const targetX = baseX + (finalSleeveOpen ? FINAL_SLEEVE_CONTROL.openX : 0);

    if (Math.abs(sleeveRoot.position.x - targetX) < 0.01) {
      return;
    }

    onFinalControlBusyChange(true);

    gsap.killTweensOf(sleeveRoot.position);

    gsap.to(sleeveRoot.position, {
      x: targetX,
      duration: FINAL_SLEEVE_CONTROL.duration,
      ease: "power3.inOut",
      onComplete: () => {
        onFinalControlBusyChange(false);
      },
    });
  }, [step, finalSleeveOpen, onFinalControlBusyChange]);

  useEffect(() => {
    if (step !== "final") return;

    finalBottleTweenRef.current?.kill();
    finalBottleTweenRef.current = null;

    const bottleRoots = bottleRootsRef.current;

    if (bottleRoots.length === 0) return;

    onFinalControlBusyChange(true);

    if (!finalBottlesVisible) {
      bottleRoots.forEach((bottleRoot) => {
        bottleRoot.visible = false;
      });

      onFinalControlBusyChange(false);
      return;
    }

    bottleRoots.forEach((bottleRoot) => {
      bottleRoot.visible = true;
    });

    if (finalBottleRestoreMode === "instant") {
      bottleRoots.forEach((bottleRoot) => {
        setObjectOpacity(bottleRoot, 1);
      });

      onFinalControlBusyChange(false);
      return;
    }

    const fadeState = {
      opacity: 0,
    };

    bottleRoots.forEach((bottleRoot) => {
      setObjectOpacity(bottleRoot, 0);
      bottleRoot.visible = true;
    });

    finalBottleTweenRef.current = gsap.to(fadeState, {
      opacity: 1,
      duration: FINAL_BOTTLE_RESTORE.duration,
      ease: "power2.out",
      onUpdate: () => {
        bottleRoots.forEach((bottleRoot) => {
          setObjectOpacity(bottleRoot, fadeState.opacity);
        });
      },
      onComplete: () => {
        bottleRoots.forEach((bottleRoot) => {
          setObjectOpacity(bottleRoot, 1);
        });

        finalBottleTweenRef.current = null;
        onFinalControlBusyChange(false);
      },
    });
  }, [
    step,
    finalBottlesVisible,
    finalBottleRestoreMode,
    onFinalControlBusyChange,
  ]);

  useEffect(() => {
    const bottleMatcapMaterial = new THREE.MeshMatcapMaterial({
      matcap: matcapTexture,
      transparent: false,
      opacity: 1,
      color: "#ffffff",
    });

    const mainBottleMatcapMaterial = new THREE.MeshMatcapMaterial({
      matcap: matcapTexture,
      transparent: false,
      opacity: 1,
      color: DEFAULT_BOTTLE_COLOR,
    });

    mainBottleMatcapMaterialRef.current = mainBottleMatcapMaterial;

    const capMaterial = new THREE.MeshStandardMaterial({
      color: "#d8d8d8",
      metalness: 1,
      roughness: 0.5,
    });

    const whiteMaterial = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      roughness: 0.5,
      metalness: 0,
    });

    boxRootRef.current = gltf.scene.getObjectByName("BoxRoot") ?? null;
    sleeveRootRef.current = gltf.scene.getObjectByName("SleeveRoot") ?? null;
    mainBottleRootRef.current =
      gltf.scene.getObjectByName("Bottle_05_Root") ?? null;

    bottleRootsRef.current = [];
    absorbBottleRootsRef.current = [];

    const exitTargets: THREE.Object3D[] = [];

    if (boxRootRef.current) exitTargets.push(boxRootRef.current);
    if (sleeveRootRef.current) exitTargets.push(sleeveRootRef.current);

    binmapExitTargetsRef.current = exitTargets;

    for (let i = 1; i <= 5; i += 1) {
      const bottleRoot = gltf.scene.getObjectByName(`Bottle_0${i}_Root`);

      if (bottleRoot) {
        bottleRootsRef.current.push(bottleRoot);
      }
    }

    for (let i = 1; i <= 4; i += 1) {
      const bottleRoot = gltf.scene.getObjectByName(`Bottle_0${i}_Root`);

      if (bottleRoot) {
        absorbBottleRootsRef.current.push(bottleRoot);
      }
    }

    if (sleeveRootRef.current) {
      if (sleeveRootRef.current.userData.basePositionX === undefined) {
        sleeveRootRef.current.userData.basePositionX =
          sleeveRootRef.current.position.x;
      }
    }

    const packageRoots = [boxRootRef.current, sleeveRootRef.current].filter(
      (object): object is THREE.Object3D => object !== null,
    );

    gltf.scene.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;

      const name = object.name.toLowerCase();

      object.castShadow = true;
      object.receiveShadow = true;

      if (isInsideAnyRoot(object, bottleRootsRef.current)) {
        object.layers.enable(OUTLINE_LAYER.bottle);
      }

      if (isInsideAnyRoot(object, packageRoots)) {
        object.layers.enable(OUTLINE_LAYER.package);
      }

      if (name.includes("bottle") && name.includes("body")) {
        if (
          mainBottleRootRef.current &&
          isInsideRoot(object, mainBottleRootRef.current)
        ) {
          object.material = mainBottleMatcapMaterial;
        } else {
          object.material = bottleMatcapMaterial;
        }
      }

      if (name.includes("bottle") && name.includes("cap")) {
        object.material = capMaterial;
      }

      if (name.includes("box_panel")) {
        object.material = whiteMaterial;
      }
    });

    onPackageOutlineOpacityChange(
      getObjectsOpacity(binmapExitTargetsRef.current),
    );
  }, [gltf, matcapTexture, onPackageOutlineOpacityChange]);

  const updatePackageOutlineOpacityFromObjects = () => {
    onPackageOutlineOpacityChange(
      getObjectsOpacity(binmapExitTargetsRef.current),
    );
  };

  const showOnlyMainBottle = () => {
    if (boxRootRef.current) {
      boxRootRef.current.visible = false;
    }

    if (sleeveRootRef.current) {
      sleeveRootRef.current.visible = false;
    }

    bottleRootsRef.current.forEach((bottleRoot) => {
      bottleRoot.visible = bottleRoot.name === "Bottle_05_Root";
    });

    if (mainBottleRootRef.current) {
      mainBottleRootRef.current.visible = true;
    }

    updatePackageOutlineOpacityFromObjects();
  };

  const getFinalReverseSleeveX = () => {
    const sleeveRoot = sleeveRootRef.current;

    if (!sleeveRoot) return 0;

    const baseX = sleeveRoot.userData.basePositionX ?? 0;

    return baseX - TASTE_SLIDE_X;
  };

  const showTasteObjects = ({
    reverseSleeveForFinal = false,
  }: {
    reverseSleeveForFinal?: boolean;
  } = {}) => {
    binmapExitBaseStatesRef.current.forEach(
      ({ object, position, rotation }) => {
        object.visible = true;
        object.position.copy(position);
        object.rotation.copy(rotation);

        if (reverseSleeveForFinal && object === sleeveRootRef.current) {
          object.position.x = getFinalReverseSleeveX();
        }

        setObjectOpacity(object, 1);
      },
    );

    absorbBottleBaseStatesRef.current.forEach(
      ({ object, position, rotation, scale }) => {
        object.visible = true;
        object.position.copy(position);
        object.rotation.copy(rotation);
        object.scale.copy(scale);
      },
    );

    if (mainBottleRootRef.current) {
      mainBottleRootRef.current.visible = true;
      mainBottleRootRef.current.position.copy(
        mainBottleStartPositionRef.current,
      );
      mainBottleRootRef.current.rotation.copy(
        mainBottleStartRotationRef.current,
      );
      mainBottleRootRef.current.scale.copy(mainBottleStartScaleRef.current);
    }

    updatePackageOutlineOpacityFromObjects();
  };

  const prepareFinalObjects = () => {
    binmapExitBaseStatesRef.current.forEach(
      ({ object, position, rotation }) => {
        object.visible = true;

        object.position.x =
          object === sleeveRootRef.current
            ? getFinalReverseSleeveX()
            : position.x + BINMAP_PACKAGE_EXIT.moveX;
        object.position.y = position.y + BINMAP_PACKAGE_EXIT.moveY;
        object.position.z = position.z + BINMAP_PACKAGE_EXIT.moveZ;

        object.rotation.x =
          rotation.x + THREE.MathUtils.degToRad(BINMAP_PACKAGE_EXIT.rotateXDeg);

        object.rotation.y =
          rotation.y + THREE.MathUtils.degToRad(BINMAP_PACKAGE_EXIT.rotateYDeg);

        object.rotation.z =
          rotation.z + THREE.MathUtils.degToRad(BINMAP_PACKAGE_EXIT.rotateZDeg);

        setObjectOpacity(object, 0);
      },
    );

    absorbBottleBaseStatesRef.current.forEach(
      ({ object, position, rotation, scale }) => {
        object.visible = false;
        object.position.copy(position);
        object.rotation.copy(rotation);
        object.scale.copy(scale);
      },
    );

    if (mainBottleRootRef.current) {
      mainBottleRootRef.current.visible = true;
      mainBottleRootRef.current.position.copy(
        mainBottleTargetPositionRef.current,
      );
      mainBottleRootRef.current.rotation.copy(
        mainBottleStartRotationRef.current,
      );
      mainBottleRootRef.current.scale.copy(mainBottleStartScaleRef.current);
    }

    updatePackageOutlineOpacityFromObjects();
  };

  useEffect(() => {
    if (!tiltRootRef.current || !spinRootRef.current) return;

    if (step === "taste" && motionModeRef.current === "top") {
      onMotionLockedChange(true);
      motionModeRef.current = "prepareTaste";

      const openStartAngle = THREE.MathUtils.degToRad(
        TRANSITION.openStartAngleDeg,
      );

      prepareStartRotationZRef.current = spinRootRef.current.rotation.z;
      prepareTargetRotationZRef.current = getClockwiseTargetRotation(
        spinRootRef.current.rotation.z,
        openStartAngle,
      );

      prepareStartSpeedRef.current = getTopSpinSpeed(
        spinRootRef.current.rotation.z,
      );
    }

    if (step === "binmap" && motionModeRef.current === "taste") {
      onMotionLockedChange(true);
      motionModeRef.current = "toBinmap";
      motionTimeRef.current = 0;

      startTiltRef.current.copy(tiltRootRef.current.rotation);
      startViewScaleRef.current = tiltRootRef.current.scale.x;

      binmapExitBaseStatesRef.current = binmapExitTargetsRef.current.map(
        (object) => ({
          object,
          position: object.position.clone(),
          rotation: object.rotation.clone(),
        }),
      );

      absorbBottleBaseStatesRef.current = absorbBottleRootsRef.current.map(
        (object) => ({
          object,
          position: object.position.clone(),
          rotation: object.rotation.clone(),
          scale: object.scale.clone(),
        }),
      );

      const mainBottle = mainBottleRootRef.current;
      const bottle01 = gltf.scene.getObjectByName("Bottle_01_Root");

      if (mainBottle) {
        mainBottle.visible = true;
        mainBottleStartPositionRef.current.copy(mainBottle.position);
        mainBottleStartRotationRef.current.copy(mainBottle.rotation);
        mainBottleStartScaleRef.current.copy(mainBottle.scale);
      }

      if (bottle01) {
        mainBottleTargetPositionRef.current.copy(bottle01.position);
      }
    }

    if (step === "final" && motionModeRef.current === "binmap") {
      onMotionLockedChange(true);
      motionModeRef.current = "binmapToFinalReset";
      motionTimeRef.current = 0;

      startTiltRef.current.copy(tiltRootRef.current.rotation);
      startViewScaleRef.current = tiltRootRef.current.scale.x;

      startSleeveXRef.current =
        (sleeveRootRef.current?.position.x ?? 0) -
        (sleeveRootRef.current?.userData.basePositionX ?? 0);
    }

    if (step === "top" && motionModeRef.current === "final") {
      onMotionLockedChange(true);
      motionModeRef.current = "finalToTop";
      motionTimeRef.current = 0;

      startTiltRef.current.copy(tiltRootRef.current.rotation);
      startViewScaleRef.current = tiltRootRef.current.scale.x;
    }
  }, [step, gltf.scene]);

  useFrame((_, delta) => {
    const tiltRoot = tiltRootRef.current;
    const spinRoot = spinRootRef.current;

    if (!tiltRoot || !spinRoot) return;

    const setSleeveSlideX = (x: number) => {
      const sleeveRoot = sleeveRootRef.current;

      if (!sleeveRoot) return;

      const baseX = sleeveRoot.userData.basePositionX ?? 0;

      sleeveRoot.position.x = baseX + x;
    };

    if (motionModeRef.current === "top") {
      tiltRoot.scale.setScalar(getResponsiveViewScale(VIEW_SCALE.top));
      spinRoot.rotation.z += delta * getTopSpinSpeed(spinRoot.rotation.z);
      return;
    }

    if (motionModeRef.current === "prepareTaste") {
      const totalDistance =
        prepareTargetRotationZRef.current - prepareStartRotationZRef.current;

      const currentDistance =
        spinRoot.rotation.z - prepareStartRotationZRef.current;

      const progress = THREE.MathUtils.clamp(
        currentDistance / totalDistance,
        0,
        1,
      );

      const speedProgress = THREE.MathUtils.clamp(progress / 0.82, 0, 1);
      const easedSpeedProgress = easeOutCubic(speedProgress);

      const remainingAngle =
        prepareTargetRotationZRef.current - spinRoot.rotation.z;

      const boostBrakeRange = THREE.MathUtils.degToRad(
        TRANSITION.prepareBoostBrakeRangeDeg,
      );

      const boostBrakeFactor = THREE.MathUtils.clamp(
        remainingAngle / boostBrakeRange,
        0,
        1,
      );

      const boostSpeed = THREE.MathUtils.lerp(
        TRANSITION.prepareSpinMaxSpeed,
        TRANSITION.prepareBoostMaxSpeed,
        boostBrakeFactor,
      );

      const speed = THREE.MathUtils.lerp(
        prepareStartSpeedRef.current,
        boostSpeed,
        easedSpeedProgress,
      );

      const result = advanceClockwiseToTarget(
        spinRoot.rotation.z,
        prepareTargetRotationZRef.current,
        delta,
        speed,
      );

      spinRoot.rotation.z = result.angle;

      if (result.reached) {
        motionModeRef.current = "toTaste";
        motionTimeRef.current = 0;

        startRotationZRef.current = spinRoot.rotation.z;
        targetRotationZRef.current = getClockwiseTargetRotation(
          spinRoot.rotation.z,
          THREE.MathUtils.degToRad(TRANSITION.openEndAngleDeg),
        );

        startTiltRef.current.copy(tiltRoot.rotation);
        startViewScaleRef.current = tiltRoot.scale.x;

        startSleeveXRef.current =
          (sleeveRootRef.current?.position.x ?? 0) -
          (sleeveRootRef.current?.userData.basePositionX ?? 0);
      }

      return;
    }

    if (motionModeRef.current === "toTaste") {
      motionTimeRef.current += delta;

      const remainingAngle = targetRotationZRef.current - spinRoot.rotation.z;

      const totalTasteAngle =
        targetRotationZRef.current - startRotationZRef.current;

      const angleProgress = THREE.MathUtils.clamp(
        1 - remainingAngle / totalTasteAngle,
        0,
        1,
      );

      const eased = easeInOutCubic(angleProgress);

      const brakeRange = THREE.MathUtils.degToRad(28);

      const brakeFactor = THREE.MathUtils.clamp(
        remainingAngle / brakeRange,
        0,
        1,
      );

      const spinSpeed = THREE.MathUtils.lerp(
        0.18,
        TRANSITION.prepareSpinMaxSpeed,
        brakeFactor,
      );

      const result = advanceClockwiseToTarget(
        spinRoot.rotation.z,
        targetRotationZRef.current,
        delta,
        spinSpeed,
      );

      spinRoot.rotation.z = result.angle;

      tiltRoot.rotation.x = THREE.MathUtils.lerp(
        startTiltRef.current.x,
        TASTE_TILT.x,
        eased,
      );

      tiltRoot.rotation.y = THREE.MathUtils.lerp(
        startTiltRef.current.y,
        TASTE_TILT.y,
        eased,
      );

      tiltRoot.rotation.z = THREE.MathUtils.lerp(
        startTiltRef.current.z,
        TASTE_TILT.z,
        eased,
      );

      const viewScale = THREE.MathUtils.lerp(
        startViewScaleRef.current,
        getResponsiveViewScale(VIEW_SCALE.taste),
        eased,
      );

      tiltRoot.scale.setScalar(viewScale);

      setSleeveSlideX(
        THREE.MathUtils.lerp(startSleeveXRef.current, TASTE_SLIDE_X, eased),
      );

      if (result.reached) {
        motionModeRef.current = "taste";
        setStep("taste");
        onMotionLockedChange(false);
      }

      return;
    }

    if (motionModeRef.current === "taste") {
      tiltRoot.scale.setScalar(getResponsiveViewScale(VIEW_SCALE.taste));
      return;
    }

    if (motionModeRef.current === "toBinmap") {
      motionTimeRef.current += delta;

      const t = Math.min(motionTimeRef.current / TRANSITION.binmapDuration, 1);
      const eased = easeInOutCubic(t);

      tiltRoot.rotation.x = THREE.MathUtils.lerp(
        startTiltRef.current.x,
        BINMAP_TILT.x,
        eased,
      );

      tiltRoot.rotation.y = THREE.MathUtils.lerp(
        startTiltRef.current.y,
        BINMAP_TILT.y,
        eased,
      );

      tiltRoot.rotation.z = THREE.MathUtils.lerp(
        startTiltRef.current.z,
        BINMAP_TILT.z,
        eased,
      );

      binmapExitBaseStatesRef.current.forEach(
        ({ object, position, rotation }) => {
          object.visible = true;

          object.position.x = position.x + BINMAP_PACKAGE_EXIT.moveX * eased;

          object.position.y = position.y + BINMAP_PACKAGE_EXIT.moveY * eased;

          object.position.z = position.z + BINMAP_PACKAGE_EXIT.moveZ * eased;

          object.rotation.x =
            rotation.x +
            THREE.MathUtils.degToRad(BINMAP_PACKAGE_EXIT.rotateXDeg) * eased;

          object.rotation.y =
            rotation.y +
            THREE.MathUtils.degToRad(BINMAP_PACKAGE_EXIT.rotateYDeg) * eased;

          object.rotation.z =
            rotation.z +
            THREE.MathUtils.degToRad(BINMAP_PACKAGE_EXIT.rotateZDeg) * eased;

          setObjectOpacity(object, 1 - eased);
        },
      );

      updatePackageOutlineOpacityFromObjects();

      const mainBottle = mainBottleRootRef.current;

      if (mainBottle) {
        const moveT = easeInOutCubic(t);

        mainBottle.visible = true;

        mainBottle.position.x = THREE.MathUtils.lerp(
          mainBottleStartPositionRef.current.x,
          mainBottleTargetPositionRef.current.x,
          moveT,
        );

        mainBottle.position.y = mainBottleStartPositionRef.current.y;
        mainBottle.position.z = mainBottleStartPositionRef.current.z;

        mainBottle.rotation.copy(mainBottleStartRotationRef.current);
        mainBottle.scale.copy(mainBottleStartScaleRef.current);

        absorbBottleBaseStatesRef.current.forEach(
          ({ object, position, rotation, scale }) => {
            if (!object.visible) return;

            const distanceX = Math.abs(mainBottle.position.x - position.x);

            const scaleFactor = getAbsorbScaleFactor(distanceX);

            object.position.copy(position);
            object.rotation.copy(rotation);
            object.scale.set(
              scale.x * scaleFactor,
              scale.y * scaleFactor,
              scale.z * scaleFactor,
            );

            const hideDistance =
              object.name === "Bottle_01_Root"
                ? 0.16
                : BINMAP_ABSORB.hideDistance;

            const passMargin = object.name === "Bottle_01_Root" ? 0.002 : 0.006;

            const hasPassed = hasPassedAbsorbTargetX({
              mainBottleX: mainBottle.position.x,
              targetBottleX: position.x,
              startX: mainBottleStartPositionRef.current.x,
              endX: mainBottleTargetPositionRef.current.x,
              margin: passMargin,
            });

            if (hasPassed || distanceX < hideDistance) {
              object.visible = false;
            }
          },
        );
      }

      if (t >= 1) {
        absorbBottleRootsRef.current.forEach((bottleRoot) => {
          bottleRoot.visible = false;
        });

        showOnlyMainBottle();

        const mainBottle = mainBottleRootRef.current;

        if (mainBottle) {
          mainBottleDisplayStartPositionRef.current.copy(mainBottle.position);
          mainBottleDisplayStartRotationRef.current.copy(mainBottle.rotation);
          mainBottleDisplayStartScaleRef.current.copy(mainBottle.scale);

          mainBottleDisplayPositionRef.current.set(
            mainBottle.position.x + BINMAP_DISPLAY.moveX,
            mainBottle.position.y + BINMAP_DISPLAY.moveY,
            mainBottle.position.z + BINMAP_DISPLAY.moveZ,
          );

          mainBottleDisplayRotationRef.current.set(
            mainBottle.rotation.x +
              THREE.MathUtils.degToRad(BINMAP_DISPLAY.rotateXDeg),
            mainBottle.rotation.y +
              THREE.MathUtils.degToRad(BINMAP_DISPLAY.rotateYDeg),
            mainBottle.rotation.z +
              THREE.MathUtils.degToRad(BINMAP_DISPLAY.rotateZDeg),
          );

          mainBottleDisplayScaleRef.current.set(
            mainBottle.scale.x * BINMAP_DISPLAY.scale,
            mainBottle.scale.y * BINMAP_DISPLAY.scale,
            mainBottle.scale.z * BINMAP_DISPLAY.scale,
          );
        }

        motionModeRef.current = "binmapFocus";
        motionTimeRef.current = 0;
        setStep("binmap");
        onBinmapFocusStart();
      }

      return;
    }

    if (motionModeRef.current === "binmapFocus") {
      motionTimeRef.current += delta;

      const t = Math.min(motionTimeRef.current / BINMAP_DISPLAY.duration, 1);
      const eased = easeInOutCubic(t);

      const mainBottle = mainBottleRootRef.current;

      if (mainBottle) {
        mainBottle.visible = true;

        mainBottle.position.lerpVectors(
          mainBottleDisplayStartPositionRef.current,
          mainBottleDisplayPositionRef.current,
          eased,
        );

        mainBottle.rotation.x = THREE.MathUtils.lerp(
          mainBottleDisplayStartRotationRef.current.x,
          mainBottleDisplayRotationRef.current.x,
          eased,
        );

        mainBottle.rotation.y = THREE.MathUtils.lerp(
          mainBottleDisplayStartRotationRef.current.y,
          mainBottleDisplayRotationRef.current.y,
          eased,
        );

        mainBottle.rotation.z = THREE.MathUtils.lerp(
          mainBottleDisplayStartRotationRef.current.z,
          mainBottleDisplayRotationRef.current.z,
          eased,
        );

        mainBottle.scale.lerpVectors(
          mainBottleDisplayStartScaleRef.current,
          mainBottleDisplayScaleRef.current,
          eased,
        );
      }

      if (t >= 1) {
        if (mainBottle) {
          mainBottle.position.copy(mainBottleDisplayPositionRef.current);
          mainBottle.rotation.copy(mainBottleDisplayRotationRef.current);
          mainBottle.scale.copy(mainBottleDisplayScaleRef.current);
        }

        motionModeRef.current = "binmap";
        setStep("binmap");
        onMotionLockedChange(false);
      }

      return;
    }

    if (motionModeRef.current === "binmap") {
      tiltRoot.scale.setScalar(getResponsiveViewScale(VIEW_SCALE.taste));
      return;
    }

    if (motionModeRef.current === "binmapToFinalReset") {
      motionTimeRef.current += delta;

      const t = Math.min(
        motionTimeRef.current / BINMAP_TO_FINAL_RESET.duration,
        1,
      );

      const eased = easeInOutCubic(t);

      showOnlyMainBottle();

      const mainBottle = mainBottleRootRef.current;

      if (mainBottle) {
        mainBottle.visible = true;

        mainBottle.position.lerpVectors(
          mainBottleDisplayPositionRef.current,
          mainBottleTargetPositionRef.current,
          eased,
        );

        mainBottle.rotation.x = THREE.MathUtils.lerp(
          mainBottleDisplayRotationRef.current.x,
          mainBottleStartRotationRef.current.x,
          eased,
        );

        mainBottle.rotation.y = THREE.MathUtils.lerp(
          mainBottleDisplayRotationRef.current.y,
          mainBottleStartRotationRef.current.y,
          eased,
        );

        mainBottle.rotation.z = THREE.MathUtils.lerp(
          mainBottleDisplayRotationRef.current.z,
          mainBottleStartRotationRef.current.z,
          eased,
        );

        mainBottle.scale.lerpVectors(
          mainBottleDisplayScaleRef.current,
          mainBottleStartScaleRef.current,
          eased,
        );
      }

      if (t >= 1) {
        if (mainBottle) {
          mainBottle.position.copy(mainBottleTargetPositionRef.current);
          mainBottle.rotation.copy(mainBottleStartRotationRef.current);
          mainBottle.scale.copy(mainBottleStartScaleRef.current);
        }

        prepareFinalObjects();

        motionModeRef.current = "toFinal";
        motionTimeRef.current = 0;
      }

      return;
    }

    if (motionModeRef.current === "toFinal") {
      motionTimeRef.current += delta;
      const returnDuration = TRANSITION.finalReturnDuration;
      const closeDuration = TRANSITION.finalCloseDuration;
      const totalDuration = returnDuration + closeDuration;

      const totalT = Math.min(motionTimeRef.current / totalDuration, 1);

      const returnT = THREE.MathUtils.clamp(
        motionTimeRef.current / returnDuration,
        0,
        1,
      );

      const closeT = THREE.MathUtils.clamp(
        (motionTimeRef.current - returnDuration) / closeDuration,
        0,
        1,
      );

      const returnEased = easeInOutCubic(returnT);
      const reverseReturnEased = 1 - returnEased;
      const closeEased = easeInOutCubic(closeT);

      binmapExitBaseStatesRef.current.forEach(
        ({ object, position, rotation }) => {
          object.visible = true;

          const isSleeve = object === sleeveRootRef.current;

          object.position.x = isSleeve
            ? getFinalReverseSleeveX()
            : position.x + BINMAP_PACKAGE_EXIT.moveX * reverseReturnEased;

          object.position.y =
            position.y + BINMAP_PACKAGE_EXIT.moveY * reverseReturnEased;

          object.position.z =
            position.z + BINMAP_PACKAGE_EXIT.moveZ * reverseReturnEased;

          object.rotation.x =
            rotation.x +
            THREE.MathUtils.degToRad(BINMAP_PACKAGE_EXIT.rotateXDeg) *
              reverseReturnEased;

          object.rotation.y =
            rotation.y +
            THREE.MathUtils.degToRad(BINMAP_PACKAGE_EXIT.rotateYDeg) *
              reverseReturnEased;

          object.rotation.z =
            rotation.z +
            THREE.MathUtils.degToRad(BINMAP_PACKAGE_EXIT.rotateZDeg) *
              reverseReturnEased;

          setObjectOpacity(object, returnEased);
        },
      );

      updatePackageOutlineOpacityFromObjects();

      const mainBottle = mainBottleRootRef.current;

      if (mainBottle) {
        mainBottle.visible = true;

        mainBottle.position.x = THREE.MathUtils.lerp(
          mainBottleTargetPositionRef.current.x,
          mainBottleStartPositionRef.current.x,
          returnEased,
        );

        mainBottle.position.y = mainBottleStartPositionRef.current.y;
        mainBottle.position.z = mainBottleStartPositionRef.current.z;

        mainBottle.rotation.copy(mainBottleStartRotationRef.current);
        mainBottle.scale.copy(mainBottleStartScaleRef.current);

        absorbBottleBaseStatesRef.current.forEach(
          ({ object, position, rotation, scale }) => {
            const startX = mainBottleStartPositionRef.current.x;
            const targetX = mainBottleTargetPositionRef.current.x;
            const pathLengthX = targetX - startX;

            const bottlePathT =
              Math.abs(pathLengthX) < 0.0001
                ? 0
                : (position.x - startX) / pathLengthX;

            const mainBottlePathT =
              Math.abs(pathLengthX) < 0.0001
                ? 0
                : (mainBottle.position.x - startX) / pathLengthX;

            const releaseMargin = 0.015;

            if (mainBottlePathT > bottlePathT - releaseMargin) {
              object.visible = false;
              return;
            }

            object.visible = true;

            const distanceX = Math.abs(mainBottle.position.x - position.x);
            const scaleFactor = getAbsorbScaleFactor(distanceX);

            object.position.copy(position);
            object.rotation.copy(rotation);
            object.scale.set(
              scale.x * scaleFactor,
              scale.y * scaleFactor,
              scale.z * scaleFactor,
            );
          },
        );
      }

      tiltRoot.rotation.x = THREE.MathUtils.lerp(
        BINMAP_TILT.x,
        TASTE_TILT.x,
        returnEased,
      );

      tiltRoot.rotation.y = THREE.MathUtils.lerp(
        BINMAP_TILT.y,
        TASTE_TILT.y,
        returnEased,
      );

      tiltRoot.rotation.z = THREE.MathUtils.lerp(
        BINMAP_TILT.z,
        TASTE_TILT.z,
        returnEased,
      );

      if (returnT >= 1) {
        showTasteObjects({ reverseSleeveForFinal: true });

        setSleeveSlideX(THREE.MathUtils.lerp(-TASTE_SLIDE_X, 0, closeEased));

        const viewScale = THREE.MathUtils.lerp(
          getResponsiveViewScale(VIEW_SCALE.taste),
          getResponsiveViewScale(VIEW_SCALE.top),
          closeEased,
        );

        tiltRoot.scale.setScalar(viewScale);

        tiltRoot.rotation.x = THREE.MathUtils.lerp(
          TASTE_TILT.x,
          FINAL_TILT.x,
          closeEased,
        );

        tiltRoot.rotation.y = THREE.MathUtils.lerp(
          TASTE_TILT.y,
          FINAL_TILT.y,
          closeEased,
        );

        tiltRoot.rotation.z = THREE.MathUtils.lerp(
          TASTE_TILT.z,
          FINAL_TILT.z,
          closeEased,
        );
      }

      if (totalT >= 1) {
        showTasteObjects({ reverseSleeveForFinal: true });

        setSleeveSlideX(0);

        tiltRoot.rotation.set(FINAL_TILT.x, FINAL_TILT.y, FINAL_TILT.z);
        tiltRoot.scale.setScalar(getResponsiveViewScale(VIEW_SCALE.top));

        motionModeRef.current = "final";
        setStep("final");
        onMotionLockedChange(false);
      }

      return;
    }

    if (motionModeRef.current === "final") {
      tiltRoot.rotation.set(FINAL_TILT.x, FINAL_TILT.y, FINAL_TILT.z);
      tiltRoot.scale.setScalar(getResponsiveViewScale(VIEW_SCALE.top));

      return;
    }

    if (motionModeRef.current === "finalToTop") {
      motionTimeRef.current += delta;

      const t = Math.min(
        motionTimeRef.current / TRANSITION.finalToTopDuration,
        1,
      );

      const eased = easeInOutCubic(t);

      tiltRoot.rotation.x = THREE.MathUtils.lerp(
        startTiltRef.current.x,
        TOP_TILT.x,
        eased,
      );

      tiltRoot.rotation.y = THREE.MathUtils.lerp(
        startTiltRef.current.y,
        TOP_TILT.y,
        eased,
      );

      tiltRoot.rotation.z = THREE.MathUtils.lerp(
        startTiltRef.current.z,
        TOP_TILT.z,
        eased,
      );

      tiltRoot.scale.setScalar(
        THREE.MathUtils.lerp(
          startViewScaleRef.current,
          getResponsiveViewScale(VIEW_SCALE.top),
          eased,
        ),
      );

      setSleeveSlideX(0);

      if (t >= 1) {
        tiltRoot.rotation.set(TOP_TILT.x, TOP_TILT.y, TOP_TILT.z);
        tiltRoot.scale.setScalar(getResponsiveViewScale(VIEW_SCALE.top));

        motionModeRef.current = "top";
        setStep("top");
        onMotionLockedChange(false);
      }

      return;
    }
  });

  return (
    <group
      ref={tiltRootRef}
      rotation={[TOP_TILT.x, TOP_TILT.y, TOP_TILT.z]}
      position={[0, 6, 0]}
    >
      <group ref={spinRootRef}>
        <primitive object={gltf.scene} />

        <mesh
          visible={false}
          position={[0, 0, 0]}
          onPointerOver={(event) => {
            event.stopPropagation();

            if (motionModeRef.current !== "top") return;

            document.body.style.cursor = "pointer";
            onTopPackageHoverChange(true);
          }}
          onPointerOut={(event) => {
            event.stopPropagation();

            document.body.style.cursor = "";
            onTopPackageHoverChange(false);
          }}
          onClick={(event) => {
            event.stopPropagation();

            if (motionModeRef.current !== "top") return;

            document.body.style.cursor = "";
            onTopPackageHoverChange(false);
            onTopPackageClick();
          }}
        >
          <boxGeometry args={[145, 145, 72]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}

export function PackageScene() {
  const [step, setStep] = useState<Step>("top");
  const [isMotionLocked, setIsMotionLocked] = useState(false);
  const [packageOutlineOpacity, setPackageOutlineOpacity] = useState(1);
  const [binmapCopyVisible, setBinmapCopyVisible] = useState(false);
  const [binmapTextMode, setBinmapTextMode] =
    useState<BinmapTextMode>("bottle");
  const [isFinalControlBusy, setIsFinalControlBusy] = useState(false);
  const [finalSleeveOpen, setFinalSleeveOpen] = useState(false);
  const [finalBottlesVisible, setFinalBottlesVisible] = useState(true);
  const [finalBottleRestoreMode, setFinalBottleRestoreMode] =
    useState<FinalBottleRestoreMode>("instant");

  const [isTopPackageHovered, setIsTopPackageHovered] = useState(false);
  const [topHintMessage, setTopHintMessage] = useState<
    (typeof TOP_HINT_MESSAGES)[number]
  >(TOP_HINT_MESSAGES[0]);

  const topHintRef = useRef<HTMLDivElement | null>(null);
  const topHintTextRef = useRef<HTMLSpanElement | null>(null);
  const topHintHideTimerRef = useRef<number | null>(null);
  const topHintSplitRef = useRef<SplitText | null>(null);
  const topHintTimelineRef = useRef<gsap.core.Timeline | null>(null);

  const rakudaTrackRef = useRef<HTMLDivElement | null>(null);

  const logoGroupRef = useRef<HTMLDivElement | null>(null);
  const logoMarkRef = useRef<HTMLImageElement | null>(null);
  const logoTextRef = useRef<HTMLImageElement | null>(null);

  const tasteTitleTargetRef = useRef<HTMLDivElement | null>(null);
  const tasteTextRef = useRef<HTMLParagraphElement | null>(null);
  const tasteNextButtonRef = useRef<HTMLButtonElement | null>(null);

  const binmapCopyRef = useRef<HTMLDivElement | null>(null);
  const binmapTitleRef = useRef<HTMLHeadingElement | null>(null);
  const binmapBodyRef = useRef<HTMLParagraphElement | null>(null);
  const binmapNextButtonRef = useRef<HTMLButtonElement | null>(null);
  const finalCopyRef = useRef<HTMLDivElement | null>(null);
  const finalLeftRef = useRef<HTMLElement | null>(null);
  const finalRightRef = useRef<HTMLElement | null>(null);
  const finalActionPanelRef = useRef<HTMLDivElement | null>(null);
  const finalControlsRef = useRef<HTMLDivElement | null>(null);
  const finalNextButtonRef = useRef<HTMLButtonElement | null>(null);
  const tasteCopyRef = useRef<HTMLDivElement | null>(null);

  const sceneStyle = {
    "--package-bg-base": SCENE_BACKGROUND.base,
  } as CSSProperties;

  const currentBinmapTitle =
    binmapTextMode === "bottle" ? BINMAP_TITLE : BINMAP_DETAIL_TITLE;

  const currentBinmapText =
    binmapTextMode === "bottle" ? BINMAP_TEXT : BINMAP_DETAIL_TEXT;

  useEffect(() => {
    const binmapCopy = binmapCopyRef.current;
    const binmapNextButton = binmapNextButtonRef.current;

    if (!binmapCopy || !binmapNextButton) return;

    gsap.killTweensOf([binmapCopy, binmapNextButton]);

    if (!binmapCopyVisible) {
      gsap.set(binmapCopy, {
        visibility: "visible",
        opacity: 0,
        x: 18,
        clipPath: "inset(0 100% 0 0)",
      });

      gsap.set(binmapNextButton, {
        visibility: "visible",
        clipPath: "inset(0 100% 0 0)",
        opacity: 0,
        pointerEvents: "none",
      });

      return;
    }

    gsap.set(binmapCopy, {
      visibility: "visible",
      opacity: 0,
      x: 18,
      clipPath: "inset(0 100% 0 0)",
    });

    gsap.set(binmapNextButton, {
      visibility: "visible",
      clipPath: "inset(0 100% 0 0)",
      opacity: 0,
      pointerEvents: "none",
    });

    const timeline = gsap.timeline();

    timeline.to(binmapCopy, {
      visibility: "visible",
      opacity: 1,
      x: 0,
      clipPath: "inset(0 0% 0 0)",
      duration: 1.05,
      delay: 0.25,
      ease: "power3.inOut",
    });

    timeline.to(
      binmapNextButton,
      {
        clipPath: "inset(0 0% 0 0)",
        opacity: 1,
        duration: 0.72,
        ease: "power2.inOut",
        onComplete: () => {
          gsap.set(binmapNextButton, {
            pointerEvents: "auto",
          });
        },
      },
      "-=0.36",
    );

    return () => {
      timeline.kill();
    };
  }, [binmapCopyVisible]);

  useEffect(() => {
    const finalCopy = finalCopyRef.current;
    const finalLeft = finalLeftRef.current;
    const finalRight = finalRightRef.current;
    const finalActionPanel = finalActionPanelRef.current;
    const finalControls = finalControlsRef.current;
    const finalNextButton = finalNextButtonRef.current;

    if (
      !finalCopy ||
      !finalLeft ||
      !finalRight ||
      !finalActionPanel ||
      !finalControls ||
      !finalNextButton
    ) {
      return;
    }

    const finalSlideTargets = [finalControls, finalNextButton];

    gsap.killTweensOf([
      finalCopy,
      finalLeft,
      finalRight,
      finalActionPanel,
      finalControls,
      finalNextButton,
    ]);

    if (step !== "final") {
      gsap.set(finalCopy, {
        opacity: 0,
        pointerEvents: "none",
      });

      gsap.set([finalLeft, finalRight], {
        opacity: 0,
        clipPath: "inset(0 100% 0 0)",
      });

      gsap.set(finalActionPanel, {
        opacity: 0,
        pointerEvents: "none",
      });

      gsap.set(finalSlideTargets, {
        opacity: 0,
        clipPath: "inset(0 100% 0 0)",
        pointerEvents: "none",
      });

      return;
    }

    gsap.set(finalCopy, {
      opacity: 1,
      pointerEvents: "none",
    });

    gsap.set([finalLeft, finalRight], {
      opacity: 0,
      clipPath: "inset(0 100% 0 0)",
    });

    gsap.set(finalActionPanel, {
      opacity: 1,
      pointerEvents: "none",
    });

    gsap.set(finalSlideTargets, {
      opacity: 0,
      clipPath: "inset(0 100% 0 0)",
      pointerEvents: "none",
    });

    const timeline = gsap.timeline();

    const finalEnterStart = FINAL_COPY_ANIMATION.enterDelay;

    timeline.to(
      [finalLeft, finalRight],
      {
        opacity: 1,
        clipPath: "inset(0 0% 0 0)",
        duration: FINAL_COPY_ANIMATION.enterDuration,
        stagger: FINAL_COPY_ANIMATION.enterStagger,
        ease: "power3.inOut",
      },
      finalEnterStart,
    );

    timeline.to(
      finalControls,
      {
        opacity: 1,
        clipPath: "inset(0 0% 0 0)",
        duration: FINAL_COPY_ANIMATION.enterDuration,
        ease: "power3.inOut",
      },
      finalEnterStart,
    );

    timeline.to(
      finalNextButton,
      {
        opacity: 1,
        clipPath: "inset(0 0% 0 0)",
        duration: FINAL_COPY_ANIMATION.enterDuration,
        ease: "power3.inOut",
        onComplete: () => {
          gsap.set([finalControls, finalNextButton], {
            pointerEvents: "auto",
          });

          gsap.set(finalActionPanel, {
            pointerEvents: "auto",
          });
        },
      },
      finalEnterStart,
    );

    return () => {
      timeline.kill();
    };
  }, [step]);

  useEffect(() => {
    const hint = topHintRef.current;
    const text = topHintTextRef.current;

    if (!hint || !text) return;

    const clearTopHint = () => {
      if (topHintHideTimerRef.current !== null) {
        window.clearTimeout(topHintHideTimerRef.current);
        topHintHideTimerRef.current = null;
      }

      topHintTimelineRef.current?.kill();
      topHintTimelineRef.current = null;

      topHintSplitRef.current?.revert();
      topHintSplitRef.current = null;
    };

    const hideTopHint = (softCloudOut = false) => {
      if (topHintHideTimerRef.current !== null) {
        window.clearTimeout(topHintHideTimerRef.current);
        topHintHideTimerRef.current = null;
      }

      topHintTimelineRef.current?.kill();
      topHintTimelineRef.current = null;

      gsap.killTweensOf(hint);

      gsap.to(hint, {
        opacity: 0,
        x: 0,
        y: softCloudOut ? -24 : 12,
        filter: softCloudOut ? "blur(12px)" : "blur(0px)",
        scale: softCloudOut ? 1.04 : 0.96,
        duration: softCloudOut ? 0.9 : 0.28,
        ease: softCloudOut ? "power2.inOut" : "power3.out",
        pointerEvents: "none",
        onComplete: () => {
          topHintSplitRef.current?.revert();
          topHintSplitRef.current = null;
        },
      });
    };

    if (step !== "top" || isMotionLocked) {
      hideTopHint(false);
      return () => clearTopHint();
    }

    if (!isTopPackageHovered) {
      hideTopHint(false);
      return () => clearTopHint();
    }

    clearTopHint();

    const nextMessage =
      TOP_HINT_MESSAGES[Math.floor(Math.random() * TOP_HINT_MESSAGES.length)];

    setTopHintMessage(nextMessage);

    requestAnimationFrame(() => {
      if (!topHintRef.current || !topHintTextRef.current) return;

      const currentHint = topHintRef.current;
      const currentText = topHintTextRef.current;

      topHintSplitRef.current?.revert();

      const split = new SplitText(currentText, {
        type: "chars",
        charsClass: "package-scene__top-hint-char",
      });

      topHintSplitRef.current = split;

      gsap.set(currentHint, {
        opacity: 1,
        x: 0,
        y: 0,
        scale: 1,
        filter: "blur(0px)",
      });

      gsap.set(split.chars, {
        opacity: 0,
        y: 10,
        scale: 1.04,
        filter: "blur(0px)",
      });

      const timeline = gsap.timeline({
        onComplete: () => {
          topHintHideTimerRef.current = window.setTimeout(() => {
            hideTopHint(true);
          }, 1800);
        },
      });

      topHintTimelineRef.current = timeline;

      timeline.to(split.chars, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.72,
        ease: "power3.out",
        stagger: {
          each: 0.065,
          from: "start",
        },
      });
    });

    return () => clearTopHint();
  }, [isTopPackageHovered, isMotionLocked, step]);

  const playRakudaTransition = () => {
    const track = rakudaTrackRef.current;

    if (!track) return;

    const viewportWidth = window.innerWidth;

    gsap.killTweensOf(track);

    gsap.set(track, {
      x: 0,
    });

    gsap.to(track, {
      x: -viewportWidth,
      duration: 1.8,
      ease: "power2.inOut",
      onComplete: () => {
        gsap.set(track, {
          x: 0,
        });
      },
    });
  };

  useEffect(() => {
    const logoGroup = logoGroupRef.current;

    if (!logoGroup) return;

    gsap.to(logoGroup, {
      scale: step === "top" ? 1 : 0.76,
      duration: 0.55,
      ease: "power3.out",
    });
  }, [step]);

  useEffect(() => {
    const logoGroup = logoGroupRef.current;
    const logoText = logoTextRef.current;
    const titleTarget = tasteTitleTargetRef.current;
    const tasteText = tasteTextRef.current;
    const tasteNextButton = tasteNextButtonRef.current;

    if (
      !logoGroup ||
      !logoText ||
      !titleTarget ||
      !tasteText ||
      !tasteNextButton
    ) {
      return;
    }

    gsap.killTweensOf([tasteText, tasteNextButton]);

    if (step !== "taste") {
      gsap.set(tasteText, {
        visibility: "visible",
        clipPath: "inset(0 100% 0 0)",
        opacity: 1,
      });

      gsap.set(tasteNextButton, {
        visibility: "visible",
        clipPath: "inset(0 100% 0 0)",
        opacity: 1,
        pointerEvents: "none",
      });

      return;
    }

    gsap.killTweensOf(logoText);

    requestAnimationFrame(() => {
      if (tasteCopyRef.current) {
        gsap.set(tasteCopyRef.current, {
          opacity: 1,
          y: 0,
        });
      }
      const textRect = logoText.getBoundingClientRect();
      const targetRect = titleTarget.getBoundingClientRect();

      const groupScale = Number(gsap.getProperty(logoGroup, "scale")) || 1;

      const tasteLogoScale = 1.12;

      const moveX = (targetRect.left - textRect.left) / groupScale;
      const moveY = (targetRect.top - textRect.top) / groupScale;

      gsap.set(tasteText, {
        clipPath: "inset(0 100% 0 0)",
        opacity: 1,
      });

      gsap.set(tasteNextButton, {
        clipPath: "inset(0 100% 0 0)",
        opacity: 1,
        pointerEvents: "none",
      });

      const tasteTextStartDelay = 0.9;

      const timeline = gsap.timeline();

      timeline.to(
        logoText,
        {
          x: moveX,
          y: moveY,
          scale: tasteLogoScale,
          duration: 1.05,
          ease: "power3.inOut",
        },
        tasteTextStartDelay,
      );

      timeline.to(
        tasteText,
        {
          clipPath: "inset(0 0% 0 0)",
          duration: 1.05,
          ease: "power2.inOut",
        },
        tasteTextStartDelay,
      );

      timeline.to(
        tasteNextButton,
        {
          clipPath: "inset(0 0% 0 0)",
          duration: 0.72,
          ease: "power2.inOut",
          onComplete: () => {
            gsap.set(tasteNextButton, {
              pointerEvents: "auto",
            });
          },
        },
        tasteTextStartDelay + 0.38,
      );
    });
  }, [step]);

  const returnLogoTextToDefault = () => {
    const logoText = logoTextRef.current;

    if (!logoText) return;

    gsap.killTweensOf(logoText);

    gsap.to(logoText, {
      x: 0,
      y: 0,
      scale: 1,
      duration: 0.48,
      ease: "power3.out",
    });
  };

  const swapBinmapTextOnly = () => {
    const binmapCopy = binmapCopyRef.current;
    const title = binmapTitleRef.current;
    const body = binmapBodyRef.current;
    const nextButton = binmapNextButtonRef.current;

    if (!binmapCopy || !title || !body) {
      setBinmapTextMode("detail");
      return Promise.resolve();
    }

    gsap.killTweensOf([binmapCopy, title, body, nextButton].filter(Boolean));

    setIsMotionLocked(true);

    return new Promise<void>((resolve) => {
      const timeline = gsap.timeline({
        onComplete: () => {
          if (nextButton) {
            gsap.set(nextButton, {
              pointerEvents: "auto",
            });
          }

          setIsMotionLocked(false);
          resolve();
        },
      });

      if (nextButton) {
        gsap.set(nextButton, {
          pointerEvents: "none",
          x: 0,
          y: 0,
        });
      }

      timeline.to(
        nextButton,
        {
          opacity: 0,
          duration: BINMAP_TEXT_SWAP.exitDuration,
          ease: "power2.out",
          overwrite: "auto",
        },
        0,
      );

      timeline.to(
        binmapCopy,
        {
          opacity: 0,
          duration: BINMAP_TEXT_SWAP.exitDuration,
          ease: "power2.out",
          overwrite: "auto",
        },
        0,
      );

      timeline.call(() => {
        setBinmapTextMode("detail");
      });

      timeline.to(
        {},
        {
          duration: BINMAP_TEXT_SWAP.betweenDelay,
        },
      );

      timeline.call(() => {
        gsap.set(binmapCopy, {
          visibility: "visible",
          opacity: 0,
          x: 18,
          clipPath: "inset(0 100% 0 0)",
        });

        gsap.set([title, body], {
          opacity: 1,
        });

        if (nextButton) {
          gsap.set(nextButton, {
            visibility: "visible",
            opacity: 0,
            x: 0,
            y: 0,
            clipPath: "inset(0 100% 0 0)",
            pointerEvents: "none",
          });
        }
      });

      timeline.to(binmapCopy, {
        opacity: 1,
        x: 0,
        clipPath: "inset(0 0% 0 0)",
        duration: BINMAP_TEXT_SWAP.enterDuration,
        ease: "power3.inOut",
        overwrite: "auto",
      });

      if (nextButton) {
        timeline.to(
          nextButton,
          {
            opacity: 1,
            clipPath: "inset(0 0% 0 0)",
            duration: BINMAP_TEXT_SWAP.buttonEnterDuration,
            ease: "power2.inOut",
            overwrite: "auto",
          },
          `-=${BINMAP_TEXT_SWAP.buttonOverlap}`,
        );
      }
    });
  };

  const fadeOutCurrentPageUI = () => {
    const targets: HTMLElement[] = [];

    if (step === "taste") {
      if (tasteTextRef.current) {
        targets.push(tasteTextRef.current);
      }

      if (tasteNextButtonRef.current) {
        targets.push(tasteNextButtonRef.current);
      }
    }

    if (step === "binmap" && binmapCopyRef.current) {
      targets.push(binmapCopyRef.current);
    }

    if (step === "final") {
      if (finalLeftRef.current) {
        targets.push(finalLeftRef.current);
      }

      if (finalRightRef.current) {
        targets.push(finalRightRef.current);
      }

      if (finalControlsRef.current) {
        targets.push(finalControlsRef.current);
      }

      if (finalNextButtonRef.current) {
        targets.push(finalNextButtonRef.current);
      }
    }

    if (targets.length === 0) {
      return Promise.resolve();
    }

    targets.forEach((target) => {
      target.style.pointerEvents = "none";
    });

    gsap.killTweensOf(targets);

    return new Promise<void>((resolve) => {
      gsap.to(targets, {
        opacity: 0,
        duration: step === "final" ? FINAL_COPY_ANIMATION.exitDuration : 0.34,
        ease: "power2.out",
        onComplete: resolve,
      });
    });
  };

  const wait = (durationMs: number) => {
    return new Promise<void>((resolve) => {
      window.setTimeout(resolve, durationMs);
    });
  };

  const restoreFinalStateBeforeTop = async () => {
    const shouldRestoreBottles = !finalBottlesVisible;
    const shouldCloseSleeve = finalSleeveOpen;

    if (!shouldRestoreBottles && !shouldCloseSleeve) {
      return;
    }

    setIsMotionLocked(true);

    if (shouldRestoreBottles) {
      setFinalBottleRestoreMode("fade");
      setFinalBottlesVisible(true);
      await wait(FINAL_BOTTLE_RESTORE.duration * 1000 + 80);
      setFinalBottleRestoreMode("instant");
    }

    if (shouldCloseSleeve) {
      setFinalSleeveOpen(false);
      await wait(FINAL_SLEEVE_CONTROL.duration * 1000 + 80);
    }

    setIsMotionLocked(false);
  };

  const goNext = async () => {
    if (isMotionLocked) return;

    if (step === "top") {
      playRakudaTransition();
      setStep("taste");
      return;
    }

    if (step === "taste") {
      returnLogoTextToDefault();

      await fadeOutCurrentPageUI();

      playRakudaTransition();
      setBinmapTextMode("bottle");
      setBinmapCopyVisible(false);
      setStep("binmap");
      return;
    }

    if (step === "binmap") {
      if (binmapTextMode === "bottle") {
        await swapBinmapTextOnly();
        return;
      }

      await fadeOutCurrentPageUI();

      playRakudaTransition();
      setBinmapCopyVisible(false);
      setFinalSleeveOpen(false);
      setFinalBottlesVisible(true);
      setFinalBottleRestoreMode("instant");
      setIsFinalControlBusy(false);
      setStep("final");
      return;
    }

    if (step === "final") {
      await restoreFinalStateBeforeTop();
      await fadeOutCurrentPageUI();

      playRakudaTransition();
      setBinmapCopyVisible(false);
      setBinmapTextMode("bottle");

      setFinalSleeveOpen(false);
      setFinalBottlesVisible(true);
      setFinalBottleRestoreMode("instant");

      setStep("top");
    }
  };

  return (
    <div className="package-scene" style={sceneStyle}>
      <div ref={logoGroupRef} className="package-scene__logo" aria-label="logo">
        <img
          ref={logoMarkRef}
          src="/logo1.svg"
          alt=""
          className="package-scene__logo-mark"
        />

        <img
          ref={logoTextRef}
          src="/logo2.svg"
          alt=""
          className="package-scene__logo-text"
        />
      </div>

      <div className="package-scene__rakuda-viewport" aria-hidden="true">
        <div ref={rakudaTrackRef} className="package-scene__rakuda-track">
          <img
            src="/webrakuda.png"
            alt=""
            className="package-scene__rakuda-image"
            draggable={false}
          />
          <img
            src="/webrakuda.png"
            alt=""
            className="package-scene__rakuda-image"
            draggable={false}
          />
        </div>
      </div>

      <div
        ref={tasteCopyRef}
        className={[
          "package-scene__taste-copy",
          step === "taste" ? "is-active" : "",
        ].join(" ")}
        aria-hidden={step !== "taste"}
      >
        <div
          ref={tasteTitleTargetRef}
          className="package-scene__taste-title-target"
        />

        <div className="package-scene__taste-body-wrap">
          <p ref={tasteTextRef} className="package-scene__taste-body">
            {TASTE_DESCRIPTION_TEXT}
          </p>
        </div>

        <button
          ref={tasteNextButtonRef}
          type="button"
          onClick={goNext}
          disabled={isMotionLocked}
          className="package-scene__taste-next"
        >
          次のページへ
        </button>
      </div>

      <div
        ref={binmapCopyRef}
        className={[
          "package-scene__binmap-copy",
          binmapCopyVisible ? "is-active" : "",
        ].join(" ")}
        aria-hidden={!binmapCopyVisible}
      >
        <h2 ref={binmapTitleRef} className="package-scene__binmap-title">
          {currentBinmapTitle}
        </h2>

        <p ref={binmapBodyRef} className="package-scene__binmap-body">
          {currentBinmapText}
        </p>

        <button
          ref={binmapNextButtonRef}
          type="button"
          onClick={goNext}
          disabled={isMotionLocked}
          className="package-scene__binmap-next"
        >
          次のページへ
        </button>
      </div>

      {step === "final" ? (
        <>
          <div ref={finalCopyRef} className="package-scene__final-copy">
            <section ref={finalLeftRef} className="package-scene__final-left">
              <p className="package-scene__final-kicker">
                VISUAL
                <br />
                LANGUAGE
              </p>
              <p className="package-scene__final-body">{FINAL_LEFT_TEXT}</p>
            </section>

            <section ref={finalRightRef} className="package-scene__final-right">
              <p className="package-scene__final-body">{FINAL_RIGHT_TEXT}</p>
            </section>
          </div>

          <div
            ref={finalActionPanelRef}
            className="package-scene__final-action-panel"
          >
            <div
              ref={finalControlsRef}
              className="package-scene__final-controls"
            >
              <div className="package-scene__final-control-group">
                <p className="package-scene__final-control-label">スリーブ</p>

                <div
                  className="package-scene__final-radio-row"
                  onClick={() => {
                    if (isMotionLocked || isFinalControlBusy) return;
                    setFinalSleeveOpen((current) => !current);
                  }}
                >
                  <label
                    className="package-scene__final-radio"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <input
                      type="radio"
                      name="final-sleeve"
                      checked={!finalSleeveOpen}
                      disabled={isMotionLocked || isFinalControlBusy}
                      onChange={() => {
                        setFinalSleeveOpen(false);
                      }}
                    />
                    <span>閉じる</span>
                  </label>

                  <label
                    className="package-scene__final-radio"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <input
                      type="radio"
                      name="final-sleeve"
                      checked={finalSleeveOpen}
                      disabled={isMotionLocked || isFinalControlBusy}
                      onChange={() => {
                        setFinalSleeveOpen(true);
                      }}
                    />
                    <span>開く</span>
                  </label>
                </div>
              </div>

              <div className="package-scene__final-control-group">
                <p className="package-scene__final-control-label">瓶</p>

                <div
                  className="package-scene__final-radio-row"
                  onClick={() => {
                    if (isMotionLocked || isFinalControlBusy) return;

                    setFinalBottleRestoreMode("instant");
                    setFinalBottlesVisible((current) => !current);
                  }}
                >
                  <label
                    className="package-scene__final-radio"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <input
                      type="radio"
                      name="final-bottles"
                      checked={finalBottlesVisible}
                      disabled={isMotionLocked || isFinalControlBusy}
                      onChange={() => {
                        setFinalBottleRestoreMode("instant");
                        setFinalBottlesVisible(true);
                      }}
                    />
                    <span>表示</span>
                  </label>

                  <label
                    className="package-scene__final-radio"
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                  >
                    <input
                      type="radio"
                      name="final-bottles"
                      checked={!finalBottlesVisible}
                      disabled={isMotionLocked || isFinalControlBusy}
                      onChange={() => {
                        setFinalBottleRestoreMode("instant");
                        setFinalBottlesVisible(false);
                      }}
                    />
                    <span>非表示</span>
                  </label>
                </div>
              </div>
            </div>

            <button
              ref={finalNextButtonRef}
              type="button"
              onClick={goNext}
              disabled={isMotionLocked}
              className="package-scene__final-next"
            >
              トップに戻る
            </button>
          </div>
        </>
      ) : null}

      <Canvas
        frameloop="always"
        camera={{ position: [0, 150, 260], fov: 34 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.NoToneMapping;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.setClearColor(0x000000, 0);
        }}
        className="package-scene__canvas"
      >
        <ambientLight intensity={SCENE_LIGHTING.ambientIntensity} />

        <directionalLight
          position={[120, 180, 120]}
          intensity={SCENE_LIGHTING.keyIntensity}
          color="#ffffff"
        />

        <directionalLight
          position={[-120, 80, 180]}
          intensity={SCENE_LIGHTING.fillIntensity}
          color="#ffffff"
        />
        <PackageModel
          step={step}
          setStep={setStep}
          finalSleeveOpen={finalSleeveOpen}
          finalBottlesVisible={finalBottlesVisible}
          finalBottleRestoreMode={finalBottleRestoreMode}
          onFinalControlBusyChange={setIsFinalControlBusy}
          onMotionLockedChange={setIsMotionLocked}
          onPackageOutlineOpacityChange={setPackageOutlineOpacity}
          onTopPackageHoverChange={setIsTopPackageHovered}
          onTopPackageClick={goNext}
          onBinmapFocusStart={() => {
            setBinmapCopyVisible(true);
          }}
        />

        <ScreenSpaceOutline packageOutlineOpacity={packageOutlineOpacity} />

        <SceneOrbitControls enabled={step === "final"} />
      </Canvas>

      <div
        ref={topHintRef}
        className="package-scene__top-hint"
        aria-hidden={step !== "top"}
      >
        <span ref={topHintTextRef} className="package-scene__top-hint-text">
          {topHintMessage}
        </span>
      </div>
    </div>
  );
}

useGLTF.preload("/models/package/package.glb");
