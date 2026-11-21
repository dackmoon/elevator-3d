import * as THREE from 'three';

/**
 * 观光后窗动态雨夜水珠 GLSL Shader 材质
 * 在玻璃表面渲染细腻滑落的雨滴与微弱霓虹反光，极低 GPU 消耗，支持实时调节雨量开关
 */
export function createRainGlassMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    uniforms: {
      uTime: { value: 0 },
      uRainStrength: { value: 0.85 }, // 0 = 晴夜, 0.85 = 浪漫微雨夜
    },
    vertexShader: /* glsl */ `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform float uRainStrength;
      varying vec2 vUv;

      float hash21(vec2 p) {
        p = fract(p * vec2(123.34, 456.21));
        p += dot(p, p + 45.32);
        return fract(p.x * p.y);
      }

      // Single raindrop layer returning (dropMask, trailMask)
      vec2 rainLayer(vec2 uv, float t, float scale) {
        vec2 aspect = vec2(2.2, 1.0);
        vec2 st = uv * scale * aspect;
        st.y += t * 0.24;

        vec2 gv = fract(st) - 0.5;
        vec2 id = floor(st);

        float n = hash21(id);
        t += n * 6.2831;

        float w = uv.y * 8.0;
        float x = (n - 0.5) * 0.72;
        x += (0.4 - abs(x)) * sin(3.0 * w) * pow(sin(w), 6.0) * 0.42;

        float y = -sin(t + sin(t + sin(t) * 0.5)) * 0.42;
        y -= (gv.x - x) * (gv.x - x);

        vec2 dropPos = (gv - vec2(x, y)) / aspect;
        float drop = smoothstep(0.052, 0.022, length(dropPos));

        vec2 trailPos = (gv - vec2(x, t * 0.24)) / aspect;
        trailPos.y = (fract(trailPos.y * 8.0) - 0.5) / 8.0;
        float trail = smoothstep(0.026, 0.01, length(trailPos));
        float fogTrail = smoothstep(-0.05, 0.05, dropPos.y);
        fogTrail *= smoothstep(0.45, y, gv.y);
        trail *= fogTrail;

        float streak = smoothstep(0.04, 0.01, abs(dropPos.x)) * fogTrail * 0.35;
        return vec2(drop + trail * 0.65, streak);
      }

      void main() {
        // Base subtle tempered glass reflection & edge vignette
        float edge = smoothstep(0.32, 0.52, max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)));
        vec3 baseTint = vec3(0.55, 0.75, 0.96);
        float baseAlpha = 0.07 + edge * 0.10;

        // Raindrops + wet trails
        vec2 r1 = rainLayer(vUv, uTime * 0.75, 11.0);
        vec2 r2 = rainLayer(vUv + vec2(0.37, 0.19), uTime * 0.52, 19.0);

        float drops = clamp(r1.x + r2.x * 0.75, 0.0, 1.0) * uRainStrength;
        float trails = clamp(r1.y + r2.y * 0.6, 0.0, 1.0) * uRainStrength;

        // City neon glint caught inside raindrops (warm amber + cool cyan)
        vec3 dropColor = mix(vec3(0.72, 0.88, 1.0), vec3(1.0, 0.86, 0.65), smoothstep(0.2, 0.85, vUv.y));
        vec3 color = mix(baseTint, dropColor * 1.45, clamp(drops * 0.95 + trails * 0.35, 0.0, 1.0));

        float alpha = clamp(baseAlpha + drops * 0.42 + trails * 0.14, 0.0, 0.68);
        gl_FragColor = vec4(color, alpha);
      }
    `,
  });
}
