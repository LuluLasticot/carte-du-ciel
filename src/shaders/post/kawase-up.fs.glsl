uniform sampler2D tSrc; uniform sampler2D tAdd; uniform vec2 uTexel;
varying vec2 vUv;
void main(){
  vec2 o = uTexel*.5;
  vec3 c = texture2D(tSrc, vUv + vec2(-o.x*2., 0.)).rgb;
  c += texture2D(tSrc, vUv + vec2(-o.x, o.y)).rgb*2.;
  c += texture2D(tSrc, vUv + vec2(0., o.y*2.)).rgb;
  c += texture2D(tSrc, vUv + vec2(o.x, o.y)).rgb*2.;
  c += texture2D(tSrc, vUv + vec2(o.x*2., 0.)).rgb;
  c += texture2D(tSrc, vUv + vec2(o.x, -o.y)).rgb*2.;
  c += texture2D(tSrc, vUv + vec2(0., -o.y*2.)).rgb;
  c += texture2D(tSrc, vUv + vec2(-o.x, -o.y)).rgb*2.;
  gl_FragColor = vec4(c/12. + texture2D(tAdd, vUv).rgb, 1.);
}
