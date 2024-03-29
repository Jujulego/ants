import { Vector } from '@ants/maths';
import { useEffect } from 'react';

import { SmartAnt } from '../ants';
import { needMap } from './needMap';
import { useAnts } from './MapLayers';

// Component
export const AutoCreateAnts = needMap(function AutoCreateAnts({ map }) {
  // Context
  const [, setAnts] = useAnts();

  // Effects
  useEffect(() => {
    const ants = [
      new SmartAnt('Smart I', map, 'pink', new Vector({ x: 5, y: 15 })),
      new SmartAnt('Smart II', map, 'blue', new Vector({ x: 31, y: 1 })),
    ];

    setAnts(ants);

    return () => ants.forEach(ant => ant.terminate());
  }, [map, setAnts]);

  return null;
});
