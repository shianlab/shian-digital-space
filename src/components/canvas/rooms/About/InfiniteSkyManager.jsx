import { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import SkyChunk from './SkyChunk';
import { IntroMilestone, AwardsMilestone, JourneyMilestone, SkillsMilestone } from './AboutMilestones';

const CHUNK_LENGTH = 40;
const STORY_CYCLE_LENGTH = 160;

export default function InfiniteSkyManager({ scrollProgressRef }) {
    const [activeChunks, setActiveChunks] = useState([-1, 0, 1, 2]);
    const [activeStoryCycles, setActiveStoryCycles] = useState([-1, 0, 1]);
    const world = useRef();
    useFrame(() => {
        if (!world.current) return;
        const progress = scrollProgressRef.current;
        world.current.position.z = progress;
        const chunk = Math.floor(progress / CHUNK_LENGTH);
        const cycle = Math.floor(progress / STORY_CYCLE_LENGTH);
        if (activeChunks[1] !== chunk) setActiveChunks([chunk - 1, chunk, chunk + 1, chunk + 2]);
        if (activeStoryCycles[1] !== cycle) setActiveStoryCycles([cycle - 1, cycle, cycle + 1]);
    });
    return <group ref={world} name="shian-about-world">
        {activeChunks.map(chunkIndex => <SkyChunk key={chunkIndex} chunkIndex={chunkIndex} seed={42} scrollProgressRef={scrollProgressRef} />)}
        {activeStoryCycles.map(cycle => <group key={cycle} name={`shian-about-cycle-${cycle}`}>
            <IntroMilestone z={-(cycle * STORY_CYCLE_LENGTH + 15)} scrollProgressRef={scrollProgressRef} />
            <AwardsMilestone z={-(cycle * STORY_CYCLE_LENGTH + 55)} scrollProgressRef={scrollProgressRef} />
            <JourneyMilestone z={-(cycle * STORY_CYCLE_LENGTH + 95)} scrollProgressRef={scrollProgressRef} />
            <SkillsMilestone z={-(cycle * STORY_CYCLE_LENGTH + 135)} scrollProgressRef={scrollProgressRef} />
        </group>)}
    </group>;
}
