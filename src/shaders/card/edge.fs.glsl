uniform vec3 uEdge; uniform float uEdgeHolo; uniform float uGlow; uniform vec3 uGlowCol; uniform float uDim;
varying vec3 vPosV; varying vec3 vNrmV;
void main(){
  vec3 V = normalize(-vPosV); vec3 N = normalize(vNrmV);
  vec3 e = envMap(reflect(-V, N));
  vec3 c = uEdge*(.3 + .9*e.g);
  c = mix(c, spectrum(dot(N.xy, vec2(2., 1.5)) + vPosV.y*1.5)*(.3 + e), uEdgeHolo);
  c += uGlowCol*uGlow*1.5;
  gl_FragColor = vec4(c*(1. - uDim*.7), 1.);
}
