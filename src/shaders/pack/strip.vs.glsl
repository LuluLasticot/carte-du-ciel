uniform vec2 uPS; uniform float uCurl;
varying vec2 vUv; varying vec3 vPosV; varying vec3 vNrmV; varying vec3 vTanV; varying vec3 vBitV;
vec3 peel(vec3 pos, vec2 uv){
  float d = uTearOn > .5 ? (uDir > 0. ? (uFront - uv.x) : (uv.x - uFront))*uPS.x : 0.;
  if (d <= 0.) return pos;
  float lineY = (tearBase(uv.x) - .5)*uPS.y;
  float k = max(uCurl, .0005);
  float xf = (uFront - .5)*uPS.x;
  float phi = k*d;
  float hy = pos.y - lineY;
  float tiltA = min(d*1.1, 1.3)*.6;
  return vec3(xf - uDir*sin(phi)/k, lineY + hy*cos(tiltA) + d*d*.05, pos.z + (1. - cos(phi))/k + hy*sin(tiltA));
}
void main(){
  vUv = uv;
  vec3 p0 = vec3(position.xy, puff(uv));
  vec3 P = peel(p0, uv);
  vec3 Px = peel(p0 + vec3(.01*uPS.x, 0., 0.), uv + vec2(.01, 0.));
  vec3 Py = peel(p0 + vec3(0., .01*uPS.y, 0.), uv + vec2(0., .01));
  vec3 nL = normalize(cross(Px - P, Py - P));
  vec4 mv = modelViewMatrix*vec4(P, 1.);
  vPosV = mv.xyz;
  mat3 m3 = mat3(modelViewMatrix);
  vNrmV = normalize(m3*nL);
  vTanV = normalize(m3*normalize(Px - P));
  vBitV = normalize(m3*normalize(Py - P));
  gl_Position = projectionMatrix*mv;
}
