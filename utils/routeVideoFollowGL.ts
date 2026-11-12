import type {FollowPose} from './routeVideoFollow';
interface Tile {x:number;y:number;image:HTMLCanvasElement;}
/** GPU ground plane. Texture coordinates are perspective-correct; imagery is uploaded once. */
export function createFollowGroundGL(tiles:Tile[]){
 const canvas=document.createElement('canvas');canvas.width=656;canvas.height=650;
 const gl=canvas.getContext('webgl',{alpha:true,antialias:false,preserveDrawingBuffer:true,premultipliedAlpha:false});if(!gl)return null;
 let program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null;const textures:WebGLTexture[]=[];
 try{
  const shader=(type:number,source:string)=>{const s=gl.createShader(type);if(!s)throw new Error('Shader unavailable');gl.shaderSource(s,source);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){gl.deleteShader(s);throw new Error('Shader unavailable');}return s;};
  const vertex=shader(gl.VERTEX_SHADER,`attribute vec2 a;
   uniform vec2 origin,forward,right,center,viewport,tilt;uniform float altitude,focal;
   varying vec2 uv;varying float depth;
   void main(){vec2 p=origin+a*256.0;depth=dot(p,forward);float r=dot(p,right);
    float z=depth*tilt.x+altitude*tilt.y;float y=altitude*tilt.x-depth*tilt.y;
    gl_Position=vec4((center.x*2.0/viewport.x-1.0)*z+2.0*focal*r/viewport.x,(1.0-center.y*2.0/viewport.y)*z-2.0*focal*y/viewport.y,z*.99-.02,z);uv=a;}`);
  const fragment=shader(gl.FRAGMENT_SHADER,`precision mediump float;uniform sampler2D image;uniform float farDistance;varying vec2 uv;varying float depth;
   void main(){if(depth<0.0||depth>farDistance)discard;vec4 c=texture2D(image,uv);float fog=clamp((depth/farDistance-.7)/.3,0.0,1.0)*.85;gl_FragColor=vec4(mix(c.rgb,vec3(.3294,.4941,.5333),fog),c.a);}`);
  program=gl.createProgram();if(!program)throw new Error('Program unavailable');gl.attachShader(program,vertex);gl.attachShader(program,fragment);gl.linkProgram(program);gl.deleteShader(vertex);gl.deleteShader(fragment);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Program unavailable');gl.useProgram(program);
  buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([0,0,1,0,0,1,0,1,1,0,1,1]),gl.STATIC_DRAW);
  const attribute=gl.getAttribLocation(program,'a');gl.enableVertexAttribArray(attribute);gl.vertexAttribPointer(attribute,2,gl.FLOAT,false,0,0);
  const uniforms=Object.fromEntries(['origin','forward','right','center','viewport','tilt','altitude','focal','farDistance','image'].map(name=>[name,gl.getUniformLocation(program!,name)]));
  const cached=tiles.map(tile=>{const texture=gl.createTexture();if(!texture)throw new Error('Texture unavailable');textures.push(texture);gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tile.image);return {...tile,texture};});
  gl.uniform1i(uniforms.image,0);gl.viewport(0,0,656,650);gl.clearColor(0,0,0,0);
  return {canvas,draw(p:FollowPose){if(gl.isContextLost())return false;gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(program);gl.uniform2f(uniforms.forward,p.forward.x,p.forward.y);gl.uniform2f(uniforms.right,p.right.x,p.right.y);gl.uniform2f(uniforms.center,p.cx,p.cy);gl.uniform2f(uniforms.viewport,p.width,p.height);gl.uniform2f(uniforms.tilt,Math.cos(p.pitch),Math.sin(p.pitch));gl.uniform1f(uniforms.altitude,p.h);gl.uniform1f(uniforms.focal,p.focal);gl.uniform1f(uniforms.farDistance,p.far);
   for(const tile of cached){const dx=tile.x*256+128-p.camera.x,dy=tile.y*256+128-p.camera.y;if(Math.hypot(dx,dy)>p.far*2+182)continue;gl.uniform2f(uniforms.origin,tile.x*256-p.camera.x,tile.y*256-p.camera.y);gl.bindTexture(gl.TEXTURE_2D,tile.texture);gl.drawArrays(gl.TRIANGLES,0,6);}return true;},dispose(){for(const texture of textures)gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();canvas.width=0;canvas.height=0;}};
 }catch{for(const texture of textures)gl.deleteTexture(texture);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program);gl.getExtension('WEBGL_lose_context')?.loseContext();canvas.width=0;canvas.height=0;return null;}
}
