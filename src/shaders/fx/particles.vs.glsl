attribute float aSize; attribute float aAlpha; attribute vec3 aColor;
uniform float uPx;
varying vec3 vC; varying float vA;
void main(){
  vec4 mv = modelViewMatrix*vec4(position, 1.);
  gl_Position = projectionMatrix*mv;
  gl_PointSize = aAlpha > .001 ? clamp(aSize*uPx/max(-mv.z, .1), 1., 180.) : 0.;
  vC = aColor; vA = aAlpha*smoothstep(1.2, 4., -mv.z);
}
