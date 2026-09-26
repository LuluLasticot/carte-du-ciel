uniform sampler2D tScene; uniform sampler2D tBloom;
uniform vec2 uRes; uniform float uTime; uniform float uExposure; uniform float uBloomK; uniform float uVig; uniform float uGrain;
uniform float uCA; uniform float uFlash; uniform vec3 uFlashCol; uniform float uBars; uniform float uZoomBlur; uniform float uSat;
uniform vec4 uShock; uniform vec4 uLens;
varying vec2 vUv;
vec3 aces(vec3 x){ return clamp((x*(2.51*x + .03))/(x*(2.43*x + .59) + .14), 0., 1.); }
vec3 toSRGB(vec3 c){ return mix(c*12.92, 1.055*pow(c, vec3(1./2.4)) - .055, step(.0031308, c)); }
void main(){
  vec2 uv = vUv;
  float asp = uRes.x/uRes.y;
  if (uLens.w > 0.) {
    vec2 d = (uv - uLens.xy)*vec2(asp, 1.);
    float r = length(d);
    float def = uLens.w*uLens.z*uLens.z/max(r, uLens.z*.5);
    uv -= normalize(d + 1e-5)*def/vec2(asp, 1.);
  }
  if (uShock.w > 0.) {
    vec2 d = (uv - uShock.xy)*vec2(asp, 1.);
    float r = length(d);
    float k = exp(-pow((r - uShock.z)/.07, 2.))*uShock.w;
    uv -= normalize(d + 1e-5)*k*.045/vec2(asp, 1.);
  }
  vec3 col;
  vec2 dc = uv - .5;
  if (uZoomBlur > .001) {
    col = vec3(0.);
    float jit = hash12(vUv*uRes + fract(uTime)*31.);
    for (int i = 0; i < 16; i++){ float s = 1. - uZoomBlur*(float(i) + jit)/16.*.3; col += texture2D(tScene, .5 + dc*s).rgb; }
    col /= 16.;
  } else if (uCA > .0005) {
    vec2 off = dc*uCA;
    col = vec3(texture2D(tScene, uv + off).r, texture2D(tScene, uv).g, texture2D(tScene, uv - off).b);
  } else col = texture2D(tScene, uv).rgb;
  col += texture2D(tBloom, uv).rgb*uBloomK;
  if (uLens.w > 0.) {
    vec2 d = (vUv - uLens.xy)*vec2(asp, 1.);
    float r = length(d);
    col *= smoothstep(uLens.z*.94, uLens.z*1.04, r);
    col += vec3(1., .9, .78)*exp(-pow((r - uLens.z*1.07)/(uLens.z*.045), 2.))*uLens.w*5.;
  }
  col += uFlashCol*uFlash;
  col *= uExposure;
  col = aces(col);
  float l = dot(col, vec3(.2126, .7152, .0722));
  col = mix(vec3(l), col, uSat);
  vec2 vq = (vUv - .5)*vec2(asp, 1.);
  col *= 1. - uVig*smoothstep(.35, 1.15, length(vq));
  col = toSRGB(col);
  col += (hash12(vUv*uRes + fract(uTime*7.13)*97.) - .5)*uGrain;
  float bar = step(vUv.y, uBars) + step(1. - uBars, vUv.y);
  col = mix(col, vec3(0.), clamp(bar, 0., 1.));
  gl_FragColor = vec4(col, 1.);
}
