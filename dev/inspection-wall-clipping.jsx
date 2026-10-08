import { Component, Suspense, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Canvas } from '@react-three/fiber';
import CorridorWalls from '../src/components/canvas/corridor/CorridorWalls';
class Boundary extends Component {
 state={error:null};
 static getDerivedStateFromError(error){return {error:error.message};}
 render(){return this.state.error?<p role="alert">{this.state.error}</p>:this.props.children;}
}
function Fixture(){
 const [clipped,setClipped]=useState(false);
 return <><button onClick={()=>setClipped(value=>!value)}>Toggle clipping</button><p data-testid="state">{clipped?'hidden':'visible'}</p><Boundary><Canvas style={{width:500,height:500}} camera={{position:[0,0,12]}}><Suspense fallback={null}><CorridorWalls zClip={clipped?-80:10}/></Suspense></Canvas></Boundary></>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
