attribute vec3 aColor; attribute float aOwned; attribute float aHover; attribute float aSeed;
uniform float uPx; uniform float uFade;
varying vec3 vC; varying float vOwned; varying float vHover; varying float vSeed;
void main(){
  vC = aColor; vOwned = aOwned; vHover = aHover; vSeed = aSeed;
  vec4 mv = modelViewMatrix*vec4(position, 1.);
  gl_Position = projectionMatrix*mv;
  float s = mix(22., 44., aOwned)*(1. + aHover*.45);
  gl_PointSize = s*uPx*uFade;
}
