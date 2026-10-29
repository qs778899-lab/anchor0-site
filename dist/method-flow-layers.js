import {METHOD_IMAGE, METHOD_FLOWS} from './method-flow-paths.js';

function segmentsFor(path) {
  const tokens = path.match(/[MHV]|-?\d+(?:\.\d+)?/g);
  const segments = [];let x = 0,y = 0;
  for(let i=0;i<tokens.length;){
    const command=tokens[i++];
    if(command==='M'){x=+tokens[i++];y=+tokens[i++];continue;}
    const nextX=command==='H'?+tokens[i++]:x, nextY=command==='V'?+tokens[i++]:y;
    segments.push({x,y,nextX,nextY,horizontal:command==='H'});x=nextX;y=nextY;
  }
  return segments;
}

// Only arrow pixels are recolored in this transient layer. The supplied PNG is never rewritten.
// Sampling on both sides of each line preserves local panel colors and borders underneath it.
export async function buildMethodLayers(url) {
  const image=new Image();image.src=url;await image.decode();
  const {width,height}=METHOD_IMAGE;
  if(image.naturalWidth!==width||image.naturalHeight!==height)throw new Error('METHOD image dimensions changed');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);
  const source=context.getImageData(0,0,width,height).data;
  const flat=new Uint8ClampedArray(width*height*3);
  for(let i=0,j=0;i<source.length;i+=4,j+=3){
    const alpha=source[i+3]/255;
    for(let channel=0;channel<3;channel++)flat[j+channel]=source[i+channel]*alpha+255*(1-alpha);
  }
  const fade=context.createImageData(width,height), mask=context.createImageData(width,height);
  const aura=context.createImageData(width,height);
  const geometry=document.createElement('canvas');geometry.width=width;geometry.height=height;
  const pen=geometry.getContext('2d',{willReadFrequently:true});
  const stats={pixels:0,perFlow:{}};

  for(const flow of METHOD_FLOWS){
    const segments=segmentsFor(flow.d),last=segments.at(-1);
    const dx=Math.sign(last.nextX-last.x),dy=Math.sign(last.nextY-last.y);
    const head=flow.arrowhead===false?[]:[
      [last.nextX-dy*15.5,last.nextY+dx*15.5],
      [last.nextX+dx*28.5,last.nextY+dy*28.5],
      [last.nextX+dy*15.5,last.nextY-dx*15.5],
    ];
    const points=segments.flatMap(s=>[[s.x,s.y],[s.nextX,s.nextY]]).concat(head);
    const left=Math.max(0,Math.floor(Math.min(...points.map(p=>p[0]))-6));
    const top=Math.max(0,Math.floor(Math.min(...points.map(p=>p[1]))-6));
    const right=Math.min(width,Math.ceil(Math.max(...points.map(p=>p[0]))+6));
    const bottom=Math.min(height,Math.ceil(Math.max(...points.map(p=>p[1]))+6));
    const span=right-left;
    pen.clearRect(0,0,width,height);pen.strokeStyle=pen.fillStyle='#fff';pen.lineWidth=9;pen.lineJoin='miter';pen.lineCap='butt';
    pen.stroke(new Path2D(flow.d));
    if(head.length){pen.beginPath();head.forEach(([x,y],i)=>i?pen.lineTo(x,y):pen.moveTo(x,y));pen.closePath();pen.fill();}
    const bounds=pen.getImageData(left,top,span,bottom-top).data;
    const foreground=flow.color.slice(1).match(/../g).map(c=>parseInt(c,16));
    let count=0;
    const inside=(x,y)=>x>=left&&x<right&&y>=top&&y<bottom&&bounds[((y-top)*span+x-left)*4+3]>0;
    for(let y=top;y<bottom;y++)for(let x=left;x<right;x++){
      if(!inside(x,y))continue;
      const index=(y*width+x)*4, offset=(y*width+x)*3;
      let nearest=last,minimum=Infinity;
      for(const segment of segments){
        const px=Math.max(Math.min(segment.x,segment.nextX),Math.min(x,Math.max(segment.x,segment.nextX)));
        const py=Math.max(Math.min(segment.y,segment.nextY),Math.min(y,Math.max(segment.y,segment.nextY)));
        const distance=(x-px)**2+(y-py)**2;
        if(distance<minimum){minimum=distance;nearest=segment;}
      }
      const buckets=new Map();
      for(const radius of [10,12,18,22,26])for(const sign of [-1,1]){
        const bx=x+(nearest.horizontal?0:radius*sign),by=y+(nearest.horizontal?radius*sign:0);
        if(bx<0||bx>=width||by<0||by>=height||inside(bx,by))continue;
        const at=(by*width+bx)*3,rgb=[flat[at],flat[at+1],flat[at+2]],key=rgb.map(c=>Math.round(c/4)).join(',');
        const bucket=buckets.get(key)||{sum:[0,0,0],count:0};
        rgb.forEach((c,i)=>bucket.sum[i]+=c);bucket.count++;buckets.set(key,bucket);
      }
      const bucket=[...buckets.values()].sort((a,b)=>b.count-a.count)[0];
      if(!bucket)continue;
      const background=bucket.sum.map(c=>c/bucket.count), observed=[flat[offset],flat[offset+1],flat[offset+2]];
      const direction=foreground.map((c,i)=>c-background[i]);
      const divisor=direction.reduce((sum,c)=>sum+c*c,0);
      if(divisor<100)continue;
      const coverage=observed.reduce((sum,c,i)=>sum+(c-background[i])*direction[i],0)/divisor;
      const residual=Math.max(...observed.map((c,i)=>Math.abs(c-background[i]-coverage*direction[i])));
      // Reject nearby lettering, frame borders and background pixels, even inside the corridor.
      if(coverage<=.005||coverage>1.08||residual>8)continue;
      const alpha=Math.round(Math.min(1,coverage)*255);
      if(alpha>=mask.data[index+3]){
        for(let channel=0;channel<3;channel++){
          fade.data[index+channel]=background[channel]+.3*(observed[channel]-background[channel]);
          mask.data[index+channel]=255;
        }
        if(!fade.data[index+3])stats.pixels++;
        fade.data[index+3]=255;mask.data[index+3]=alpha;
      }
      count++;
      // Widen only perpendicular to the shaft, so original dash gaps stay open.
      // Admit background pixels matching the local panel, never lettering or borders.
      const along=nearest.horizontal?x:y;
      const start=nearest.horizontal?nearest.x:nearest.y,end=nearest.horizontal?nearest.nextX:nearest.nextY;
      if(along<Math.min(start,end)||along>Math.max(start,end))continue;
      // A line crossing a frame may sample that frame as its local "background".
      // All actual panel fills in this fixed figure are light; keep darker artwork protected.
      if(background.some(c=>c<223))continue;
      for(let step=-7;step<=7;step++){
        const ax=x+(nearest.horizontal?0:step),ay=y+(nearest.horizontal?step:0);
        if(ax<0||ax>=width||ay<0||ay>=height)continue;
        const sample=(ay*width+ax)*3,at=(ay*width+ax)*4;
        if(background.some((c,i)=>Math.abs(c-flat[sample+i])>3))continue;
        if(alpha>aura.data[at+3]){aura.data[at]=aura.data[at+1]=aura.data[at+2]=255;aura.data[at+3]=alpha;}
      }
    }
    stats.perFlow[flow.id]=count;
  }
  context.putImageData(fade,0,0);const fadeHref=canvas.toDataURL('image/png');
  context.putImageData(mask,0,0);const maskHref=canvas.toDataURL('image/png');
  for(let i=0;i<mask.data.length;i+=4)if(mask.data[i+3]>aura.data[i+3]){
    aura.data[i]=aura.data[i+1]=aura.data[i+2]=255;aura.data[i+3]=mask.data[i+3];
  }
  context.putImageData(aura,0,0);const auraHref=canvas.toDataURL('image/png');
  await Promise.all([fadeHref,maskHref,auraHref].map(async href=>{const ready=new Image();ready.src=href;await ready.decode();}));
  return {fadeHref,maskHref,auraHref,stats};
}
