import { Box } from '@mui/material';
import { FC } from 'react';

import { BiomeName, BIOMES } from '../../biomes';
import { Vector } from '../../math2d';

// Types
export interface ImgTileProps {
  pos: Vector;
  biome: BiomeName;
  onClick?: () => void;
}

// Component
export const ImgTile: FC<ImgTileProps> = (props) => {
  // Render
  const biome = BIOMES.find(biome => biome.name === props.biome);

  return (
    <Box
      component="img"
      height="100%"
      width="100%"
      gridRow={props.pos.y + 1}
      gridColumn={props.pos.x + 1}
      src={biome?.texture?.toString() || ''}
      alt={props.biome}
      onClick={props.onClick}
    />
  );
};