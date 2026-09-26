attribute vec3 aOther; attribute float aSide; attribute float aT; attribute float aIdx;
uniform float uW;
varying float vT; varying float vIdx; varying float vSide;
void main(){
  vec3 dirL = normalize(aOther - position)*(aT < .5 ? 1. : -1.);
  vec3 side = normalize(cross(dirL, normalize(position)));
  vT = aT; vIdx = aIdx; vSide = aSide;
  gl_Position = projectionMatrix*modelViewMatrix*vec4(position + side*aSide*uW, 1.);
}
