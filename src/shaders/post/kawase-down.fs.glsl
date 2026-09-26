uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThreshold; uniform float uPrefilter;
varying vec2 vUv;
void main(){
  vec2 o = uTexel*.5;
  vec3 c = texture2D(tSrc, vUv).rgb*4.;
  c += texture2D(tSrc, vUv - o).rgb + texture2D(tSrc, vUv + o).rgb;
  c += texture2D(tSrc, vUv + vec2(o.x, -o.y)).rgb + texture2D(tSrc, vUv - vec2(o.x, -o.y)).rgb;
  c /= 8.;
  if (uPrefilter > .5) {
    float br = max(c.r, max(c.g, c.b));
    float knee = uThreshold*.6;
    float rq = clamp(br - uThreshold + knee, 0., 2.*knee);
    rq = rq*rq/(4.*knee + 1e-4);
    c *= max(rq, br - uThreshold)/max(br, 1e-4);
    c = min(c, vec3(40.));
  }
  gl_FragColor = vec4(c, 1.);
}
